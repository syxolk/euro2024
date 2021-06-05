const bluebird = require('bluebird');
const instance = require('../models').instance;
const Bet = instance.model('Bet');
const User = instance.model('User');

module.exports = function(app) {
    app.get('/past', function(req, res) {
        instance.query(`
            SELECT "Match"."id" as id,
            "Match"."when" as when,
            (SELECT name FROM "MatchType" WHERE "MatchType"."id" = "Match"."MatchTypeId") as matchtype,
            (SELECT "scoreFactor" FROM "MatchType" WHERE "MatchType"."id" = "Match"."MatchTypeId") as score_factor,
             "Match"."goalsHome" as goalshome,
             "Match"."goalsAway" as goalsaway,
            (SELECT name FROM "Team" WHERE "Team"."id" = "Match"."HomeTeamId") as hometeam,
            (SELECT name FROM "Team" WHERE "Team"."id" = "Match"."AwayTeamId") as awayteam,
            array_agg("Bet"."goalsHome" order by "User".name asc) as listhome,
            array_agg("Bet"."goalsAway" order by "User".name asc) as listaway,
            array_agg("User"."name" order by "User".name asc) as listname,
            array_agg("User"."id" order by "User".name asc) as listid,
            array_agg(calc_bet_result("Match"."goalsHome", "Match"."goalsAway", "Bet"."goalsHome", "Bet"."goalsAway") order by "User".name asc) as listresult,
            array_agg("User"."id" in (SELECT "ToUserId" FROM "Friend" WHERE "FromUserId" = $id) order by "User".name asc) as listfriends,
            array_agg("User"."id" = $id order by "User".name asc) as listme,
            count("Bet"."id") as countbets,
            round(100.0 * count(CASE WHEN "Bet"."goalsHome" > "Bet"."goalsAway" THEN 1 END) / count("Bet"."id")) as winnerhome,
            round(100.0 * count(CASE WHEN "Bet"."goalsHome" < "Bet"."goalsAway" THEN 1 END) / count("Bet"."id")) as winneraway,
            avg("Bet"."goalsHome") as avghome,
            avg("Bet"."goalsAway") as avgaway,
            $logged_in and ("goalsInsertedAt" > $last_visited or $last_visited is null) as unseen,
            "goalsInsertedAt"
            FROM "Match"
             -- No LEFT JOIN here to discard matches without bets (and prevent division by zero)
            JOIN "Bet" ON "Match"."id" = "Bet"."MatchId"
            JOIN "User" ON "User"."id" = "Bet"."UserId"
            WHERE now() > "Match"."when" AND "Match"."goalsHome" IS NOT NULL AND "Match"."goalsAway" IS NOT NULL
            GROUP BY "Match"."id"
            ORDER BY "Match"."when" DESC
        `, {
            type: instance.QueryTypes.SELECT,
            bind: {
                id: (req.user ? req.user.id : 0),
                logged_in: !!req.user,
                last_visited: (req.user ? req.user.past_matches_last_visited_at : null),
            },
        })
        .then(function(matches) {
            for(var i = 0; i < matches.length; i++) {
                var match = matches[i];
                match.draw = 100 - match.winnerhome - match.winneraway;
                var bets = {'correct': [], 'diff': [], 'winner': [], 'wrong': []};
                for(var j = 0; j < match.listresult.length; j++) {
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
            if(req.user) {
                req.user.past_matches_last_visited_at = new Date();
                req.user.save().then(() => {
                    res.render('past', {matches});
                });
            } else {
                res.render('past', {matches});
            }
        });
    });
};
