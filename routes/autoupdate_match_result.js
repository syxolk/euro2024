const axios = require("axios");
const { knex } = require("../db");

const router = require("express-promise-router")();
module.exports = router;

router.get("/autoupdate_match_result", async (req, res) => {
    const liveMatches = await knex("match")
        .select("id", "uefa_id")
        .whereNull("goals_away")
        .whereNull("goals_home")
        .whereRaw("now() > match.starts_at");

    const errors = [];
    const success = [];

    for (const match of liveMatches) {
        const { data } = await axios.get("https://match.uefa.com/v2/matches", {
            params: {
                offset: "0",
                limit: "1",
                matchId: match.uefa_id,
            },
        });

        if (data.length === 0) {
            errors.push(`HTTP Response is empty for ${match.uefa_id}`);
            continue;
        }

        const matchData = data.find((x) => x.id === match.uefa_id);

        if (matchData === undefined) {
            errors.push(`Match ${match.uefa_id} not found in result`);
            continue;
        }

        if (matchData.status !== "FINISHED") {
            errors.push(`Match ${match.uefa_id} status is ${matchData.status}`);
            continue;
        }

        const goals = matchData.score.regular;

        await knex("match")
            .update({
                goals_home: goals.home,
                goals_away: goals.away,
                goals_inserted_at: knex.fn.now(),
            })
            .where({
                id: match.id,
            });

        success.push(
            `Match ${match.uefa_id} result set as ${goals.home}:${goals.away}`
        );
    }

    res.json({
        ok: true,
        errors,
        success,
    });
});
