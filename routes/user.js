const { knex } = require("../db");
const config = require("../config");
const moment = require("moment-timezone");
const router = require("express-promise-router")();

module.exports = router;

router.get("/user/:id", async (req, res) => {
    const user = parseInt(req.params.id);

    if (!Number.isInteger(user)) {
        res.status(404).render("404");
        return;
    }

    const displayedUser = await knex("highscore")
        .select("id", "name", "score", "rank")
        .where({
            id: user,
        })
        .first();

    if (displayedUser === undefined) {
        res.status(404).render("404");
        return;
    }

    const matches = await knex("match")
        .whereRaw("starts_at < now()")
        .select(
            "match.goals_home as match_goals_home",
            "match.goals_away as match_goals_away",
            "bet.goals_home as bet_goals_home",
            "bet.goals_away as bet_goals_away",
            "home_team.name as home_team_name",
            "away_team.name as away_team_name",
            "home_team.code as home_team_code",
            "away_team.code as away_team_code",
            "match_type.name as match_type_name",
            "match_type.code as match_type.code",
            "match_type.score_factor as match_type_score_factor",
            "starts_at",
            knex.raw(
                `coalesce(
                    calc_bet_result(match.goals_home, match.goals_away, bet.goals_home, bet.goals_away),
                    'wrong'::bet_result
                ) as result`
            ),
            knex.raw(`
                calc_bet_score(
                    calc_bet_result(
                        match.goals_home, match.goals_away, bet.goals_home, bet.goals_away
                    ),
                    match_type.score_factor
                ) as score
            `)
        )
        .joinRaw(
            `left join bet on (bet.match_id = match.id and bet.user_id = ?)`,
            [user]
        )
        .join("team as home_team", "home_team.id", "match.home_team_id")
        .join("team as away_team", "away_team.id", "match.away_team_id")
        .join("match_type", "match_type.id", "match.match_type_id")
        .orderBy("starts_at", "desc")
        .orderBy("match.id", "desc");

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
        .sort((a, b) => b.date.localeCompare(a.date));

    res.render("user", { displayedUser, matchesPerDayList });
});

router.get("/friend_history", async (req, res) => {
    if (!req.user) {
        return res.status(403).json({
            ok: false,
            error: "AUTH",
        });
    }

    const friends = await knex("friend")
        .where({ from_user_id: req.user.id })
        .select("to_user_id");

    const userIds = [req.user.id, ...friends.map((x) => x.to_user_id)];

    const users = await knex("user_account")
        .select("id", "name")
        .whereIn("id", userIds);

    const scoresList = await Promise.all(
        users.map((user) => {
            return knex("match")
                .select(
                    "home_team.code as home_team_code",
                    "away_team.code as away_team_code",
                    knex.raw(`
                        coalesce(
                            calc_bet_score(
                                calc_bet_result(match.goals_home, match.goals_away, bet.goals_home, bet.goals_away),
                                match_type.score_factor
                            ),
                            0
                        ) as score
                    `)
                )
                .whereRaw("match.starts_at < now()")
                .whereNotNull("match.goals_home")
                .whereNotNull("match.goals_away")
                .joinRaw(
                    `left join bet on (bet.match_id = match.id and bet.user_id = ?)`,
                    [user.id]
                )
                .join("team as home_team", "home_team.id", "match.home_team_id")
                .join("team as away_team", "away_team.id", "match.away_team_id")
                .join("match_type", "match_type.id", "match.match_type_id")
                .orderBy("match.starts_at")
                .orderBy("match.id");
        })
    );

    const result = {
        labels: scoresList[0].map(
            (row) => `${row.home_team_code} ${row.away_team_code}`
        ),
        data: users.map((user, index) => {
            return {
                id: user.id,
                name: user.name,
                scores: scoresList[index].map((row) => row.score),
            };
        }),
    };

    res.json({
        ok: true,
        data: result.data,
        labels: result.labels,
    });
});
