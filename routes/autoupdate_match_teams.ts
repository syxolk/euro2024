import axios from "axios";
import { Router } from "express";
import type { Knex } from "knex";

import { knex } from "../db";

const router = Router();

interface FifaTeamRef {
    IdTeam: number;
}

interface FifaMatchTeams {
    IdMatch: number;
    Home?: FifaTeamRef;
    Away?: FifaTeamRef;
}

async function updateMatchTeam(
    trx: Knex.Transaction,
    fifaMatchId: string,
    teamData: FifaTeamRef,
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

    const { data } = (await axios.get(
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
    )) as { data: { Results?: FifaMatchTeams[] } };
    const matchList = Array.isArray(data.Results) ? data.Results : [];
    const matchMap = new Map<string, FifaMatchTeams>(
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
