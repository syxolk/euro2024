import { Router } from "express";
import { knex } from "../db";
import { FifaApiMatchStatus } from "./autoupdate_tools/schema";
import { fetchFifaMatchResults } from "./autoupdate_tools/api";

const router = Router();

router.get("/autoupdate_match_result", async (req, res) => {
    const liveMatches = await knex("match")
        .select<{ id: number; fifa_id: string }[]>("id", "fifa_id")
        .whereNull("goals_away")
        .whereNull("goals_home")
        .whereRaw("now() >= match.starts_at + interval '90 minutes'");

    if (liveMatches.length === 0) {
        res.json({
            ok: true,
            message: "No live matches to update",
        });
        return;
    }

    const errors = [];
    const success = [];

    let matchList: Awaited<ReturnType<typeof fetchFifaMatchResults>>;
    try {
        matchList = await fetchFifaMatchResults();
    } catch (error) {
        res.json({
            ok: false,
            errors: [
                "Failed to fetch match results from FIFA API",
                error instanceof Error ? error.message : "unknown error",
            ],
        });
        return;
    }

    if (!Array.isArray(matchList) || matchList.length === 0) {
        errors.push("Match data is empty");
    }

    const matchMap = new Map<string, (typeof matchList)[number]>(
        matchList.map((matchItem) => [`${matchItem.IdMatch}`, matchItem])
    );

    for (const match of liveMatches) {
        const matchData = matchMap.get(match.fifa_id);

        if (matchData === undefined) {
            errors.push(`Match ${match.fifa_id} not found in result`);
            continue;
        }

        if (
            matchData.HomeTeamScore === null ||
            matchData.AwayTeamScore === null
        ) {
            errors.push(
                `Match ${match.fifa_id} has no final result yet (status ${matchData.MatchStatus})`
            );
            continue;
        }

        if (matchData.MatchStatus !== FifaApiMatchStatus.Finished) {
            errors.push(
                `Match ${match.fifa_id} is not finished yet (status ${matchData.MatchStatus})`
            );
            continue;
        }

        const goalsHome = matchData.HomeTeamScore;
        const goalsAway = matchData.AwayTeamScore;

        await knex("match")
            .update({
                goals_home: goalsHome,
                goals_away: goalsAway,
                goals_inserted_at: knex.fn.now(),
            })
            .where({
                id: match.id,
            });

        success.push(
            `Match ${match.fifa_id} result set as ${goalsHome}:${goalsAway}`
        );
    }

    res.json({
        ok: true,
        errors,
        success,
    });
});

export default router;
