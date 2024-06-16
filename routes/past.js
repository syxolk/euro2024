const { knex } = require("../db");
const router = require("express-promise-router")();
module.exports = router;

router.get("/past", async (req, res) => {
    const orderByGain = req.query.gain === "1";

    const orderBy = orderByGain
        ? "my_gain DESC, match.starts_at DESC"
        : "match.starts_at DESC";

    const matches = await knex.raw(
        `
            SELECT match.id as id,
            match.starts_at as starts_at,
            match_type.name as matchtype,
            match_type.score_factor as score_factor,
            match.goals_home as goalshome,
            match.goals_away as goalsaway,
            home_team.name as hometeam,
            away_team.name as awayteam,
            (
                select coalesce(array_agg(
                    jsonb_build_object(
                        'goals_home', bet.goals_home,
                        'goals_away', bet.goals_away,
                        'name', user_account.name,
                        'id', user_account.id,
                        'result', calc_bet_result(match.goals_home, match.goals_away, bet.goals_home, bet.goals_away)::text,
                        'is_friend', user_account.id in (SELECT to_user_id FROM friend WHERE from_user_id = :id),
                        'is_me', user_account.id = :id
                    )
                ), array[]::jsonb[])
                from bet
                join user_account on (bet.user_id = user_account.id)
                where bet.match_id = match.id
            ) as all_bets,

            (
                select jsonb_build_object(
                    'total', count(1),
                    'home', count(1) filter (where bet.goals_home > bet.goals_away),
                    'away', count(1) filter (where bet.goals_home < bet.goals_away),
                    'draw', count(1) filter (where bet.goals_home = bet.goals_away)
                )
                from bet
                where bet.match_id = match.id
            ) as bet_counts,

            :logged_in and (goals_inserted_at > :last_visited or :last_visited::timestamptz is null) as unseen,
            goals_inserted_at,

            (
                select round(avg(calc_bet_score(
                    calc_bet_result(
                        match.goals_home, match.goals_away, friend_bet.goals_home, friend_bet.goals_away
                    ),
                    match_type.score_factor
                    )), 1)
                from friend
                join bet as friend_bet on (friend_bet.user_id = friend.to_user_id)
                where friend.from_user_id = :id
                and friend_bet.match_id = match.id
            ) as avg_friend_score,

            calc_bet_score(
                calc_bet_result(
                    match.goals_home, match.goals_away, my_bet.goals_home, my_bet.goals_away
                ),
                match_type.score_factor
            ) as my_score,

            (
                calc_bet_score(
                    calc_bet_result(
                        match.goals_home, match.goals_away, my_bet.goals_home, my_bet.goals_away
                    ),
                    match_type.score_factor
                )
                -
                (
                    select round(avg(calc_bet_score(
                        calc_bet_result(
                            match.goals_home, match.goals_away, friend_bet.goals_home, friend_bet.goals_away
                        ),
                        match_type.score_factor
                        )), 1)
                    from friend
                    join bet as friend_bet on (friend_bet.user_id = friend.to_user_id)
                    where friend.from_user_id = :id
                    and friend_bet.match_id = match.id
                )
            ) as my_gain

            FROM match
            JOIN match_type ON (match_type.id = match.match_type_id)
            JOIN team as home_team ON (home_team.id = match.home_team_id)
            JOIN team as away_team ON (away_team.id = match.away_team_id)
            LEFT JOIN bet as my_bet ON (my_bet.match_id = match.id AND my_bet.user_id = :id)
            WHERE now() > match.starts_at AND match.goals_home IS NOT NULL AND match.goals_away IS NOT NULL
            ORDER BY ${orderBy}
        `,
        {
            id: req.user ? req.user.id : 0,
            logged_in: !!req.user,
            last_visited: req.user
                ? req.user.past_matches_last_visited_at
                : null,
        }
    );

    for (const match of matches.rows) {
        match.percent = {
            home: Math.round(
                (match.bet_counts.home / match.bet_counts.total) * 100
            ),
            away: Math.round(
                (match.bet_counts.away / match.bet_counts.total) * 100
            ),
        };
        match.percent.draw = 100 - match.percent.home - match.percent.away;

        const bets = { correct: [], diff: [], winner: [], wrong: [] };
        for (const bet of match.all_bets) {
            bets[bet.result].push(bet);
        }
        match.bets = bets;
    }

    // Last step: Update the timestamp when the past matches page was last visited.
    if (req.user) {
        await knex("user_account")
            .update({ past_matches_last_visited_at: knex.fn.now() })
            .where({ id: req.user.id });
    }

    res.render("past", {
        matches: matches.rows,
        is_logged_in: !!req.user,
        order_by_gain: orderByGain,
    });
});
