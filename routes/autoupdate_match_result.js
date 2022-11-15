const axios = require("axios");
const { knex } = require("../db");

const router = require("express-promise-router")();
module.exports = router;

router.get("/autoupdate_match_result", async (req, res) => {
    const liveMatches = await knex("match")
        .select("id", "fifa_id")
        .whereNull("goals_away")
        .whereNull("goals_home")
        .whereRaw("now() > match.starts_at");

    const errors = [];
    const success = [];

    const { data } = await axios.get(
        "https://api.fifa.com/api/v3/calendar/matches?count=100&idSeason=255711"
    );
    const matchList = data.Results;

    if (matchList.length === 0) {
        errors.push("Match data is empty");
    }

    const matchMap = new Map(matchList.map((x) => [x.IdMatch, x]));

    for (const match of liveMatches) {
        const matchData = matchMap.get(match.fifa_id);

        if (matchData === undefined) {
            errors.push(`Match ${match.uefa_id} not found in result`);
            continue;
        }

        // TODO I'm not sure if the result type is correct here
        if (matchData.ResultType !== 1) {
            errors.push(
                `Match ${match.uefa_id} result type is ${matchData.ResultType}`
            );
            continue;
        }

        // TODO I'm not sure if this is the number of goals after 90+30 minutes without penalty shoot-out
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
