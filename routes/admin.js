const bluebird = require('bluebird');
const instance = require('../models').instance;
const Team = instance.model('Team');
const MatchType = instance.model('MatchType');
const Match = instance.model('Match');
const moment = require('moment');
const push = require('./push');

module.exports = function(app) {
    app.get('/admin', function(req, res) {
        if(!req.user || req.user.admin !== true) {
            res.status(404).render('404');
            return;
        }

        const now = new Date();

        bluebird.join(
            Match.findAll({
                where: {
                    "HomeTeamId": null,
                    "AwayTeamId": null,
                },
                include: [
                    {
                        model: MatchType
                    }
                ]
            }),
            Team.findAll({order: [['code', 'ASC']]}),
            Match.findAll({
                where: {
                    when: { $lt: instance.fn('now') },
                    goalsHome: null,
                    goalsAway: null
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
                order: [['when', 'ASC']]
            }),
            function(matchesWithoutTeams, teams, liveMatches) {
            res.render('admin', {
                matchesWithoutTeams,
                teams,
                liveMatches,
                message: req.flash('message'),
                error: req.flash('error')
            });
        });
    });

    app.post('/admin', function(req, res) {
        if(!req.user || req.user.admin !== true) {
            res.redirect('/admin');
            return;
        }

        if(req.body.command === 'set_teams') {
            const matchId = parseInt(req.body.match);
            Match.update({
                HomeTeamId: parseInt(req.body.home),
                AwayTeamId: parseInt(req.body.away),
            }, {
                where: {
                    id: matchId
                }
            }).then(() => {
                pushMatchCreate(matchId);
                req.flash('message', 'Match ' + matchId + ' created.');
                res.redirect('/admin');
            }).catch(function(err) {
                req.flash('error', 'Failed to set teams.');
                res.redirect('/admin');
            });
        } else if(req.body.command === 'match_result') {
            instance.query('SELECT set_match_result($id,$home,$away)', {
                raw: true,
                bind: {
                    id: parseInt(req.body.match),
                    home: parseInt(req.body.home),
                    away: parseInt(req.body.away)
                }
            }).then(function() {
                pushMatchResult(req.body.match);
                req.flash('message', 'Match ' + req.body.match + ' was updated.');
                res.redirect('/admin');
            }).catch(function() {
                req.flash('error', 'Failed to set match result');
                res.redirect('/admin');
            });
        } else if(req.body.command === 'publish_news') {
            push(req.body.headline).then(function() {
                req.flash('message', 'Published News.');
                res.redirect('/admin');
            }).catch(function() {
                req.flash('error', 'Failed to publish news');
                res.redirect('/admin');
            });
        } else {
            req.flash('error', 'Unknown command');
            res.redirect('/admin');
        }
    });
};

function pushMatchCreate(matchId) {
    Match.findOne({
        where: {
            id: matchId
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
        ]
    }).then(function(match) {
        const headline = 'New match: ' + match.HomeTeam.name +
            ' vs ' + match.AwayTeam.name + ' (' + match.MatchType.name +
            ') taking place ' + moment(match.when).calendar();
        push(headline);
    });
}

function pushMatchResult(matchId) {
    Match.findOne({
        where: {
            id: matchId
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
        ]
    }).then(function(match) {
        var headline = '';
        if(match.goalsHome > match.goalsAway) {
            headline = match.HomeTeam.name + ' wins against ' +
                match.AwayTeam.name + ' ' + match.goalsHome + ' : ' +
                match.goalsAway;
        } else if(match.goalsAway > match.goalsHome) {
            headline = match.AwayTeam.name + ' wins against ' +
                match.HomeTeam.name + ' ' + match.goalsAway + ' : ' +
                match.goalsHome;
        } else {
            headline = match.HomeTeam.name + ' vs ' + match.AwayTeam.name +
                ' ends up in a tie ' + match.goalsHome + ' : ' + match.goalsAway;
        }

        push(headline);
    });
}
