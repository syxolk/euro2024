const bluebird = require('bluebird');
const instance = require('../models').instance;
const Team = instance.model('Team');
const MatchType = instance.model('MatchType');
const Match = instance.model('Match');
const moment = require('moment');

module.exports = function(app) {
    app.get('/admin', function(req, res) {
        if(!req.user || req.user.admin !== true) {
            res.status(404).render('404', {loggedIn : !!req.user});
            return;
        }

        const now = new Date();

        bluebird.join(
            Team.findAll({order: [['code', 'ASC']]}),
            MatchType.findAll(),
            instance.query('SELECT * FROM admin_match_table', {type: instance.QueryTypes.SELECT}),
            function(teams, matchTypes, liveMatches) {
            res.render('admin', {
                teams,
                matchTypes,
                liveMatches,
                date: moment().format('YYYY-MM-DD'),
                time: moment().format('HH:mm'),
                loggedIn: !!req.user,
                csrfToken: req.csrfToken(),
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

        if(req.body.command === 'create_match') {
            Match.create({
                HomeTeamId: req.body.home,
                AwayTeamId: req.body.away,
                MatchTypeId: req.body.type,
                when: moment(req.body.date + ' ' + req.body.time, 'YYYY-MM-DD HH:mm').toDate()
            }).then(function(match) {
                req.flash('message', 'Match ' + match.id + ' created.');
                res.redirect('/admin');
            }).catch(function(err) {
                req.flash('error', 'Failed to create match.');
                res.redirect('/admin');
            });
        } else if(req.body.command === 'match_result') {
            Match.update({
                goalsHome: parseInt(req.body.home),
                goalsAway: parseInt(req.body.away)
            }, {
                where: {
                    id: req.body.match
                }
            }).then(function() {
                req.flash('message', 'Match ' + req.body.match + ' was updated.');
                res.redirect('/admin');
            }).catch(function() {
                req.flash('error', 'Failed to set match result');
                res.redirect('/admin');
            });
        } else {
            req.flash('error', 'Unknown command');
            res.redirect('/admin');
        }
    });
};
