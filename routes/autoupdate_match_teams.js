const axios = require("axios");
const { knex } = require("../db");

const router = require("express-promise-router")();
module.exports = router;

async function updateMatchTeam(trx, uefaMatchId, teamData, column) {
    const uefaTeamId = teamData.id;

    const team = await trx("team")
        .select("id")
        .where({ uefa_id: uefaTeamId })
        .first();

    if (team === undefined) {
        throw new Error(`Could not find team with id: ${uefaTeamId}`);
    }

    const match = await trx("match")
        .select("id", column)
        .where({ uefa_id: uefaMatchId })
        .first();

    if (match === undefined) {
        throw new Error(`Could not find match with id: ${uefaMatchId}`);
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
        .select("id", "uefa_id")
        .whereRaw("home_team_id is null OR away_team_id is null");

    if (matches.length === 0) {
        res.json({
            ok: true,
            message: "No matches with missing teams to update",
        });
        return;
    }

    const { data } = await axios.get(
        "https://match.uefa.com/v5/matches?competitionId=3&offset=0&limit=51"
    );
    const matchMap = new Map(data.map((x) => [x.id, x]));

    const result = [];

    await knex.transaction(async (trx) => {
        for (const m of matches) {
            const matchData = matchMap.get(m.uefa_id);

            if (matchData === undefined) {
                result.push(`Match not found for id=${m.uefa_id}`);
                continue;
            }

            if (matchData.homeTeam.typeTeam !== "PLACEHOLDER") {
                const ok = await updateMatchTeam(
                    trx,
                    m.uefa_id,
                    matchData.homeTeam,
                    "home_team_id"
                );

                if (ok) {
                    result.push(`Home team updated for match ${matchData.id}`);
                }
            }

            if (matchData.awayTeam.typeTeam !== "PLACEHOLDER") {
                const ok = await updateMatchTeam(
                    trx,
                    m.uefa_id,
                    matchData.awayTeam,
                    "away_team_id"
                );

                if (ok) {
                    result.push(`Away team updated for match ${matchData.id}`);
                }
            }
        }
    });

    res.json({
        ok: true,
        result,
    });
});
