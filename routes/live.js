const { knex } = require("../db");

const router = require("express-promise-router")();
module.exports = router;

router.get("/live", async (req, res) => {
    const matches = await knex.raw(
        `
        SELECT match.id as id,
        match.starts_at as starts_at,
        (SELECT name FROM match_type WHERE match_type.id = match.match_type_id) as matchtype,
        (SELECT name FROM team WHERE team.id = match.home_team_id) as hometeam,
        (SELECT name FROM team WHERE team.id = match.away_team_id) as awayteam,
        count(bet.id) as countbets,
        round(100.0 * count(CASE WHEN bet.goals_home > bet.goals_away THEN 1 END) / count(bet.id)) as winnerhome,
        round(100.0 * count(CASE WHEN bet.goals_home < bet.goals_away THEN 1 END) / count(bet.id)) as winneraway,
        avg(bet.goals_home) as avghome,
        avg(bet.goals_away) as avgaway,
        match.tv as tv,
        (SELECT score_factor FROM match_type WHERE match_type.id = match.match_type_id) as score_factor,
        array_agg(bet.goals_home order by user_account.name asc) as listhome,
        array_agg(bet.goals_away order by user_account.name asc) as listaway,
        array_agg(user_account.name order by user_account.name asc) as listname,
        array_agg(user_account.id order by user_account.name asc) as listid,
        array_agg(user_account.id in (SELECT to_user_id FROM friend WHERE from_user_id = :id) order by user_account.name asc) as listfriends,
        array_agg(user_account.id = :id order by user_account.name asc) as listme
        FROM match
        -- No LEFT JOIN here to discard matches without bets (and prevent division by zero)
        JOIN bet ON match.id = bet.match_id
        JOIN user_account ON user_account.id = bet.user_id
        WHERE now() > match.starts_at AND match.goals_home IS NULL AND match.goals_away IS NULL
        GROUP BY match.id;
    `,
        { id: req.user ? req.user.id : 0 }
    );

    for (const match of matches.rows) {
        match.draw = 100 - match.winnerhome - match.winneraway;
        match.bets = { home: [], draw: [], away: [] };
        for (var j = 0; j < match.listid.length; j++) {
            const betType =
                match.listhome[j] > match.listaway[j]
                    ? "home"
                    : match.listhome[j] < match.listaway[j]
                    ? "away"
                    : "draw";
            match.bets[betType].push({
                name: match.listname[j],
                goalsHome: match.listhome[j],
                goalsAway: match.listaway[j],
                id: match.listid[j],
                friend: match.listfriends[j],
                me: match.listme[j],
            });
        }
    }

    const nextMatches = await knex.raw(
        `
        select
            match_type.name as match_type_name,
            tv,
            match_type.score_factor as match_type_score_factor,
            starts_at,
            home_team.name as home_team_name,
            away_team.name as away_team_name,
            placeholder_home,
            placeholder_away,
            (
                select count(*)
                from bet
                where bet.match_id = match.id
            ) as bet_count,
            (
                select coalesce(array_agg(jsonb_build_object(
                    'id', user_account.id,
                    'name', user_account.name
                )), array[]::jsonb[])
                from user_account
                join friend on (friend.to_user_id = user_account.id)
                where friend.from_user_id = :id
                and
                    not exists (
                        select 1
                        from bet
                        where bet.user_id = user_account.id
                        and bet.match_id = match.id
                    )
            ) as friends_without_bet
        from match
        left join team as home_team on (home_team.id = match.home_team_id)
        left join team as away_team on (away_team.id = match.away_team_id)
        join match_type on (match_type.id = match.match_type_id)
        where starts_at > now()
        order by match.starts_at asc
        limit 4
    `,
        { id: req.user ? req.user.id : 0 }
    );

    res.render("live", {
        matches: matches.rows,
        nextMatches: nextMatches.rows,
        is_logged_in: !!req.user,
    });
});
