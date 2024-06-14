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

    if (liveMatches.length === 0) {
        res.json({
            ok: true,
            message: "No live matches to update",
        });
        return;
    }

    const errors = [];
    const success = [];

    const { data } = await axios.get(
        "https://match.uefa.com/v5/matches?competitionId=3&offset=0&limit=51"
    );
    const matchList = data;

    if (matchList.length === 0) {
        errors.push("Match data is empty");
    }

    const matchMap = new Map(matchList.map((x) => [x.id, x]));

    for (const match of liveMatches) {
        const matchData = matchMap.get(match.uefa_id);

        if (matchData === undefined) {
            errors.push(`Match ${match.uefa_id} not found in result`);
            continue;
        }

        // Status
        // "FINISHED" - match finished successfully
        // "UPCOMING" - match will be played in the future
        if (matchData.status !== "FINISHED") {
            errors.push(
                `Match ${match.uefa_id} result type is ${matchData.status}`
            );
            continue;
        }


        // TODO I'm not sure if this is the number of goals after 90+30 minutes without penalty shoot-out
        const goalsHome = matchData.score.total.home;
        const goalsAway = matchData.score.total.away;

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
            `Match ${match.uefa_id} result set as ${goalsHome}:${goalsAway}`
        );
    }

    res.json({
        ok: true,
        errors,
        success,
    });
});
