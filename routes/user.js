const { knex } = require("../db");
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
        .joinRaw(`left join bet on (bet.match_id = match.id and bet.user_id = ?)`, [
            user,
        ])
        .join("team as home_team", "home_team.id", "match.home_team_id")
        .join("team as away_team", "away_team.id", "match.away_team_id")
        .join("match_type", "match_type.id", "match.match_type_id")
        .orderBy("starts_at", "desc")
        .orderBy("match.id", "desc");

    res.render("user", { displayedUser, matches });
});

router.get("/friend_history", function (req, res) {
    if (!req.user) {
        return res.status(403).json({
            ok: false,
            error: "AUTH",
        });
    }

    Friend.findAll({
        where: {
            FromUserId: req.user.id,
        },
    })
        .then(function (friends) {
            return bluebird.resolve(
                [req.user.id].concat(
                    friends.map((friend) => {
                        return friend.ToUserId;
                    })
                )
            );
        })
        .then(function (users) {
            return bluebird.join(
                bluebird.all(
                    users.map((user) => {
                        return User.findById(user);
                    })
                ),
                bluebird.all(
                    users.map((user) => {
                        return Match.findAll({
                            where: {
                                when: { [Op.lt]: instance.fn("now") },
                                goalsHome: { [Op.ne]: null },
                                goalsAway: { [Op.ne]: null },
                            },
                            attributes: [
                                [
                                    instance.fn(
                                        "coalesce",
                                        instance.fn(
                                            "calc_bet_score",
                                            instance.fn(
                                                "calc_bet_result",
                                                instance.col("Match.goalsHome"),
                                                instance.col("Match.goalsAway"),
                                                instance.col("Bets.goalsHome"),
                                                instance.col("Bets.goalsAway")
                                            ),
                                            instance.col(
                                                "MatchType.scoreFactor"
                                            )
                                        ),
                                        0
                                    ),
                                    "score",
                                ],
                            ],
                            include: [
                                {
                                    model: Bet,
                                    required: false,
                                    where: {
                                        UserId: user,
                                    },
                                },
                                {
                                    model: Team,
                                    as: "HomeTeam",
                                },
                                {
                                    model: Team,
                                    as: "AwayTeam",
                                },
                                {
                                    model: MatchType,
                                },
                            ],
                            order: [["when", "ASC"]],
                        });
                    })
                ),
                function (users, scoresList) {
                    return {
                        // the first scoresList entry is the current user
                        // and should always be there
                        labels: scoresList[0].map(
                            (row) => row.HomeTeam.code + " " + row.AwayTeam.code
                        ),
                        data: users.map((user, index) => {
                            return {
                                id: user.id,
                                name: user.name,
                                scores: scoresList[index].map((row) =>
                                    row.get("score")
                                ),
                            };
                        }),
                    };
                }
            );
        })
        .then(function (result) {
            res.json({
                ok: true,
                data: result.data,
                labels: result.labels,
            });
        })
        .catch(function (error) {
            res.status(500).json({
                ok: false,
                error: "INTERNAL",
            });
        });
});
