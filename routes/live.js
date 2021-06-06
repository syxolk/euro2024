const { knex } = require("../db");

const router = require("express-promise-router")();
module.exports = router;

app.get("/live", async (req, res) => {
    const matches = await knex.raw(
        `
        SELECT "Match"."id" as id,
        "Match"."when" as when,
        (SELECT name FROM "MatchType" WHERE "MatchType"."id" = "Match"."MatchTypeId") as matchtype,
        (SELECT name FROM "Team" WHERE "Team"."id" = "Match"."HomeTeamId") as hometeam,
        (SELECT name FROM "Team" WHERE "Team"."id" = "Match"."AwayTeamId") as awayteam,
        count("Bet"."id") as countbets,
        round(100.0 * count(CASE WHEN "Bet"."goalsHome" > "Bet"."goalsAway" THEN 1 END) / count("Bet"."id")) as winnerhome,
        round(100.0 * count(CASE WHEN "Bet"."goalsHome" < "Bet"."goalsAway" THEN 1 END) / count("Bet"."id")) as winneraway,
        avg("Bet"."goalsHome") as avghome,
        avg("Bet"."goalsAway") as avgaway,
        "Match"."tv" as tv,
        (SELECT "scoreFactor" FROM "MatchType" WHERE "MatchType".id = "Match"."MatchTypeId") as score_factor,
        array_agg("Bet"."goalsHome" order by "User".name asc) as listhome,
        array_agg("Bet"."goalsAway" order by "User".name asc) as listaway,
        array_agg("User"."name" order by "User".name asc) as listname,
        array_agg("User"."id" order by "User".name asc) as listid,
        array_agg("User"."id" in (SELECT "ToUserId" FROM "Friend" WHERE "FromUserId" = :id) order by "User".name asc) as listfriends,
        array_agg("User"."id" = :id order by "User".name asc) as listme
        FROM "Match"
        -- No LEFT JOIN here to discard matches without bets (and prevent division by zero)
        JOIN "Bet" ON "Match"."id" = "Bet"."MatchId"
        JOIN "User" ON "User"."id" = "Bet"."UserId"
        WHERE now() > "Match"."when" AND "Match"."goalsHome" IS NULL AND "Match"."goalsAway" IS NULL
        GROUP BY "Match"."id";
    `,
        { id: req.user ? req.user.id : 0 }
    );

    for (const match of matches) {
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

    const nextMatches = await knex.raw(`
        select
        from match
        join team as home_team on (home_team.id = match.home_team_id)
        join team as away_team on (away_team.id = match.away_team_id)
        join match_type on (match_type.id = match.match_type_id)
        where starts_at > now()
        order by match.starts_at asc
        limit 3
    `);

    res.render("live", { matches, nextMatches: nextMatches.rows });
});
