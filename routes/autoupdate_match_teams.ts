import { Router } from "express";
import type { Knex } from "knex";
import { knex } from "../db";
import { fetchFifaMatchResults } from "./autoupdate_tools/api";

const router = Router();

async function updateMatchTeam(
    trx: Knex.Transaction,
    fifaMatchId: string,
    teamData: { IdTeam: number },
    column: "home_team_id" | "away_team_id"
) {
    const fifaTeamId = teamData.IdTeam;

    const team = await trx("team")
        .select<{ id: number }[]>("id")
        .where({ fifa_id: fifaTeamId })
        .first();

    if (team === undefined) {
        throw new Error(`Could not find team with id: ${fifaTeamId}`);
    }

    const match = await trx("match")
        .select<
            {
                id: number;
                home_team_id?: number | null;
                away_team_id?: number | null;
            }[]
        >("id", column)
        .where({ fifa_id: fifaMatchId })
        .first();

    if (match === undefined) {
        throw new Error(`Could not find match with id: ${fifaMatchId}`);
    }

    if (match[column] !== null) {
        // team is already set -> skip it
        return false;
    }

    await trx("match")
        .update({ [column]: team.id })
        .where({ id: match.id });

    return true;
}

router.get("/autoupdate_match_teams", async (req, res) => {
    const matches = await knex("match")
        .select<{ id: number; fifa_id: string }[]>("id", "fifa_id")
        .whereRaw("home_team_id is null OR away_team_id is null");

    if (matches.length === 0) {
        res.json({
            ok: true,
            message: "No matches with missing teams to update",
        });
        return;
    }

    let matchList: Awaited<ReturnType<typeof fetchFifaMatchResults>>;
    try {
        matchList = await fetchFifaMatchResults();
    } catch (error) {
        res.json({
            ok: false,
            errors: [
                "Failed to fetch match data from FIFA API",
                error instanceof Error ? error.message : "unknown error",
            ],
        });
        return;
    }

    const matchMap = new Map<string, (typeof matchList)[number]>(
        matchList.map((matchItem) => [`${matchItem.IdMatch}`, matchItem])
    );

    const result: string[] = [];

    await knex.transaction(async (trx) => {
        for (const m of matches) {
            const matchData = matchMap.get(m.fifa_id);

            if (matchData === undefined) {
                result.push(`Match not found for id=${m.fifa_id}`);
                continue;
            }

            if (matchData.Home?.IdTeam) {
                const ok = await updateMatchTeam(
                    trx,
                    m.fifa_id,
                    matchData.Home,
                    "home_team_id"
                );

                if (ok) {
                    result.push(
                        `Home team updated for match ${matchData.IdMatch}`
                    );
                }
            }

            if (matchData.Away?.IdTeam) {
                const ok = await updateMatchTeam(
                    trx,
                    m.fifa_id,
                    matchData.Away,
                    "away_team_id"
                );

                if (ok) {
                    result.push(
                        `Away team updated for match ${matchData.IdMatch}`
                    );
                }
            }
        }
    });

    res.json({
        ok: true,
        result,
    });
});

export default router;
