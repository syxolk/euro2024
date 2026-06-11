import axios from "axios";
import { Router } from "express";

import { knex } from "../db";

const router = Router();

interface FifaMatchResult {
    IdMatch: number;
    HomeTeamScore: number | null;
    AwayTeamScore: number | null;
    MatchStatus: number; // 0 = finished, 1 = not started, 3 = live
}

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

    const { data } = await axios.get<{ Results?: FifaMatchResult[] }>(
        "https://api.fifa.com/api/v3/calendar/matches",
        {
            params: {
                count: 200,
                idSeason: 285023,
            },
            headers: {
                Accept: "application/json",
                "User-Agent":
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:151.0) Gecko/20100101 Firefox/151.0",
            },
            timeout: 30000,
        }
    );
    const matchList = Array.isArray(data.Results) ? data.Results : [];

    if (!Array.isArray(matchList) || matchList.length === 0) {
        errors.push("Match data is empty");
    }

    const matchMap = new Map<string, FifaMatchResult>(
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

        if(matchData.MatchStatus !== 0) {
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
