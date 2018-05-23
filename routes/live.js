const bluebird = require('bluebird');
const instance = require('../models').instance;
const Bet = instance.model('Bet');
const User = instance.model('User');
const Match = instance.model('Match');
const Team = instance.model('Team');
const MatchType = instance.model('MatchType');

module.exports = function(app) {
    app.get('/live', function(req, res) {
        instance.query(`
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
            (SELECT "scoreFactor" FROM "MatchType" WHERE "MatchType".id = "Match"."MatchTypeId") as score_factor
            FROM "Match"
             -- No LEFT JOIN here to discard matches without bets (and prevent division by zero)
            JOIN "Bet" ON "Match"."id" = "Bet"."MatchId"
            WHERE now() > "Match"."when" AND "Match"."goalsHome" IS NULL AND "Match"."goalsAway" IS NULL
            GROUP BY "Match"."id";
        `, {type: instance.QueryTypes.SELECT})
        .then(function(matches) {
            bluebird.map(matches, function(match) {
                return Bet.findAll({
                    where: {
                        MatchId: match.id
                    },
                    include: [ User ],
                    order: [[User, 'name', 'ASC']]
                });
            }).then(function(bets) {
                for(var i = 0; i < matches.length; i++) {
                    matches[i].bets = bets[i];
                    matches[i].draw = 100 - matches[i].winnerhome - matches[i].winneraway;
                }

                Match.findAll({
                    where: {
                        when: { $gt: instance.fn('now') }
                    },
                    include: [
                        {
                            model: Team,
                            as: 'HomeTeam'
                        }, {
                            model: Team,
                            as: 'AwayTeam'
                        }, {
                            model: MatchType
                        }
                    ],
                    order: [['when', 'ASC']],
                    limit: 3
                }).then(function(nextMatches) {
                    res.render('live', {matches, nextMatches});
                });
            });
        });
    });
};
