const bluebird = require('bluebird');
const instance = require('../models').instance;
const Bet = instance.model('Bet');
const User = instance.model('User');
const Match = instance.model('Match');
const Team = instance.model('Team');
const MatchType = instance.model('MatchType');
const Op = require('sequelize').Sequelize.Op;

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
            (SELECT "scoreFactor" FROM "MatchType" WHERE "MatchType".id = "Match"."MatchTypeId") as score_factor,
            array_agg("Bet"."goalsHome" order by "User".name asc) as listhome,
            array_agg("Bet"."goalsAway" order by "User".name asc) as listaway,
            array_agg("User"."name" order by "User".name asc) as listname,
            array_agg("User"."id" order by "User".name asc) as listid,
            array_agg("User"."id" in (SELECT "ToUserId" FROM "Friend" WHERE "FromUserId" = $id) order by "User".name asc) as listfriends,
            array_agg("User"."id" = $id order by "User".name asc) as listme
            FROM "Match"
             -- No LEFT JOIN here to discard matches without bets (and prevent division by zero)
            JOIN "Bet" ON "Match"."id" = "Bet"."MatchId"
            JOIN "User" ON "User"."id" = "Bet"."UserId"
            WHERE now() > "Match"."when" AND "Match"."goalsHome" IS NULL AND "Match"."goalsAway" IS NULL
            GROUP BY "Match"."id";
        `, {
            type: instance.QueryTypes.SELECT,
            bind: {
                id: (req.user ? req.user.id : 0),
            },
        })
        .then(function(matches) {
            for(var i = 0; i < matches.length; i++) {
                var match = matches[i];
                match.draw = 100 - match.winnerhome - match.winneraway;
                match.bets = {'home': [], 'draw': [], 'away': []};
                for(var j = 0; j < match.listid.length; j++) {
                    const betType = match.listhome[j] > match.listaway[j] ? 'home' :
                        (match.listhome[j] < match.listaway[j] ? 'away': 'draw');
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

                Match.findAll({
                    where: {
                        when: { [Op.gt]: instance.fn('now') }
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
};
