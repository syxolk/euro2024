const { knex } = require("../db");
const moment = require("moment-timezone");
const config = require("../config");

const router = require("express-promise-router")();
module.exports = router;

router.get("/mybets", async (req, res) => {
    if (!req.user) {
        res.redirect("/login");
        return;
    }

    const matches = await knex("match")
        .select(
            "match.id as id",
            "home_team.name as home_team_name",
            "away_team.name as away_team_name",
            "home_team.code as home_team_code",
            "away_team.code as away_team_code",
            "placeholder_home",
            "placeholder_away",
            "starts_at",
            "bet.goals_home as bet_goals_home",
            "bet.goals_away as bet_goals_away",
            "match_type.code as match_type_code",
            "match_type.name as match_type_name",
            "match_type.score_factor as match_type_score_factor",
            knex.raw(
                `(
                    match.home_team_id is not null
                    and match.away_team_id is not null
                ) as has_teams`
            )
        )
        .whereRaw("starts_at > now()")
        .joinRaw(
            `left join bet on (bet.match_id = match.id and bet.user_id = ?)`,
            [req.user.id]
        )
        .leftJoin("team as home_team", "home_team.id", "match.home_team_id")
        .leftJoin("team as away_team", "away_team.id", "match.away_team_id")
        .join("match_type", "match_type.id", "match.match_type_id")
        .orderBy("starts_at")
        .orderBy("id");

    const matchesPerDayMap = new Map();

    for (const m of matches) {
        const date = moment
            .tz(m.starts_at, config.timezone)
            .format("YYYY-MM-DD");

        let list = matchesPerDayMap.get(date);
        if (list === undefined) {
            list = [];
            matchesPerDayMap.set(date, list);
        }
        list.push(m);
    }

    const matchesPerDayList = [...matchesPerDayMap.entries()]
        .map(([date, matches]) => ({ date, matches }))
        .sort((a, b) => a.date.localeCompare(b.date));

    res.render("mybets", { matchesPerDayList });
});
