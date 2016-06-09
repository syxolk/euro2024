const bluebird = require('bluebird');
const instance = require('../models').instance;
const Match = instance.model('Match');
const Bet = instance.model('Bet');
const Team = instance.model('Team');
const MatchType = instance.model('MatchType');
const History = instance.model('History');

module.exports = function(app) {
    app.get('/user/:id', function(req, res) {
        const user = parseInt(req.params.id);

        if(! Number.isInteger(user)) {
            res.status(404).render('404', {loggedIn : true});
            return;
        }

        // for other users only show expired matches
        var where = {};
        if(!req.user || user !== req.user.id) {
            where = {
                when: {lt: instance.fn('now')}
            };
        }

        bluebird.join(
            instance.query(`WITH ranking AS (SELECT name, score, id,
                rank() over (order by score desc) as rank FROM score_table)
                SELECT name, score, rank FROM ranking WHERE id = $id`, {
                raw: true,
                plain: true,
                bind: {
                    id: user
                }
            }),
            Match.findAll({
                where,
                attributes: {
                    include: [
                        [instance.where(instance.col('when'), '<', instance.fn('now')), 'expired'],
                        [instance.fn('coalesce', instance.fn('calc_score',
                            instance.col('Match.goalsHome'), instance.col('Match.goalsAway'),
                            instance.col('Bets.goalsHome'), instance.col('Bets.goalsAway'), instance.col('MatchType.coef')), 0), 'score']
                    ]
                },
                include: [
                    {
                        model: Bet,
                        required: false,
                        where : {
                            'UserId': user
                        }
                    }, {
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
            })
        ).spread(function(user, matches) {
            if(user) {
                res.render('user', {user, matches, csrfToken: req.csrfToken(), loggedIn: !!req.user});
            } else {
                res.status(404).render('404', {loggedIn: !!req.user});
            }
        });
    });

    app.get('/user/:id/history', function(req, res) {
        const user = parseInt(req.params.id);

        if(! Number.isInteger(user)) {
            res.status(404).json({
                ok: false,
                error: 'NOT_FOUND'
            });
            return;
        }

        History.findAll({
            attributes: ['score', 'rank', 'count3', 'count2', 'count1', 'count0'],
            where: {
                UserId: user
            },
            include: [
                {
                    model: Match,
                    attributes: ['when', 'goalsHome', 'goalsAway'],
                    include: [
                        {
                            model: Team,
                            as: 'HomeTeam',
                            attributes: ['code', 'name']
                        }, {
                            model: Team,
                            as: 'AwayTeam',
                            attributes: ['code', 'name']
                        }, {
                            model: MatchType,
                            attributes: ['code', 'name']
                        }
                    ]
                }
            ],
            order: [[instance.col('Match.when'), 'ASC']]
        }).then(function(history) {
            res.json({
                ok: true,
                data: history
            });
        }).catch(function(err) {
            console.log(err);
            res.status(500).json({
                ok: false,
                error: 'INTERNAL'
            });
        });
    });
};
