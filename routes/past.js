const { knex } = require("../db");
const router = require("express-promise-router")();
module.exports = router;

router.get("/past", async (req, res) => {
    const matches = await knex.raw(
        `
            SELECT match.id as id,
            match.starts_at as starts_at,
            (SELECT name FROM match_type WHERE match_type.id = match.match_type_id) as matchtype,
            (SELECT score_factor FROM match_type WHERE match_type.id = match.match_type_id) as score_factor,
             match.goals_home as goalshome,
             match.goals_away as goalsaway,
            (SELECT name FROM team WHERE team.id = match.home_team_id) as hometeam,
            (SELECT name FROM team WHERE team.id = match.away_team_id) as awayteam,
            array_agg(bet.goals_home order by user_account.name asc) as listhome,
            array_agg(bet.goals_away order by user_account.name asc) as listaway,
            array_agg(user_account.name order by user_account.name asc) as listname,
            array_agg(user_account.id order by user_account.name asc) as listid,
            array_agg(calc_bet_result(match.goals_home, match.goals_away, bet.goals_home, bet.goals_away)::text order by user_account.name asc) as listresult,
            array_agg(user_account.id in (SELECT to_user_id FROM friend WHERE from_user_id = :id) order by user_account.name asc) as listfriends,
            array_agg(user_account.id = :id order by user_account.name asc) as listme,
            count(bet.id) as countbets,
            round(100.0 * count(CASE WHEN bet.goals_home > bet.goals_away THEN 1 END) / count(bet.id)) as winnerhome,
            round(100.0 * count(CASE WHEN bet.goals_home < bet.goals_away THEN 1 END) / count(bet.id)) as winneraway,
            avg(bet.goals_home) as avghome,
            avg(bet.goals_away) as avgaway,
            :logged_in and (goals_inserted_at > :last_visited or :last_visited::timestamptz is null) as unseen,
            goals_inserted_at
            FROM match
             -- No LEFT JOIN here to discard matches without bets (and prevent division by zero)
            JOIN bet ON match.id = bet.match_id
            JOIN user_account ON user_account.id = bet.user_id
            WHERE now() > match.starts_at AND match.goals_home IS NOT NULL AND match.goals_away IS NOT NULL
            GROUP BY match.id
            ORDER BY match.starts_at DESC
        `,
        {
            id: req.user ? req.user.id : 0,
            logged_in: !!req.user,
            last_visited: req.user
                ? req.user.past_matches_last_visited_at
                : null,
        }
    );

    for (var i = 0; i < matches.rows.length; i++) {
        var match = matches.rows[i];
        match.draw = 100 - match.winnerhome - match.winneraway;
        var bets = { correct: [], diff: [], winner: [], wrong: [] };
        for (var j = 0; j < match.listresult.length; j++) {
            bets[match.listresult[j]].push({
                name: match.listname[j],
                goalsHome: match.listhome[j],
                goalsAway: match.listaway[j],
                id: match.listid[j],
                friend: match.listfriends[j],
                me: match.listme[j],
            });
        }
        match.bets = bets;
    }

    // Last step: Update the timestamp when the past matches page was last visited.
    if (req.user) {
        await knex("user_account")
            .update({ past_matches_last_visited_at: knex.fn.now() })
            .where({ id: req.user.id });
    }

    res.render("past", { matches: matches.rows });
});
