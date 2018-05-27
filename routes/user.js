const bluebird = require('bluebird');
const instance = require('../models').instance;
const Match = instance.model('Match');
const Bet = instance.model('Bet');
const Team = instance.model('Team');
const MatchType = instance.model('MatchType');
const History = instance.model('History');
const Friend = instance.model('Friend');
const User = instance.model('User');
const Op = require('sequelize').Sequelize.Op;

module.exports = function(app) {
    app.get('/user/:id', function(req, res) {
        const user = parseInt(req.params.id);

        if(! Number.isInteger(user)) {
            res.status(404).render('404');
            return;
        }

        bluebird.join(
            instance.query(`SELECT id, name, score, rank FROM highscore WHERE id = $id`, {
                raw: true,
                plain: true,
                bind: {
                    id: user
                }
            }),
            Match.findAll({
                where: {
                    when: {[Op.lt]: instance.fn('now')}
                },
                attributes: {
                    include: [
                        [instance.fn('coalesce',
                            instance.fn('calc_bet_result',
                                instance.col('Match.goalsHome'),
                                instance.col('Match.goalsAway'),
                                instance.col('Bets.goalsHome'),
                                instance.col('Bets.goalsAway')),
                            instance.cast('wrong', 'bet_result')),
                        'result'],
                        [instance.fn('calc_bet_score',
                            instance.fn('calc_bet_result',
                                instance.col('Match.goalsHome'),
                                instance.col('Match.goalsAway'),
                                instance.col('Bets.goalsHome'),
                                instance.col('Bets.goalsAway')),
                            instance.col('MatchType.scoreFactor')),
                        'score'],
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
                order: [['when', 'DESC']]
            })
        ).spread(function(displayedUser, matches) {
            if(displayedUser) {
                res.render('user', {displayedUser, matches});
            } else {
                res.status(404).render('404');
            }
        });
    });

    app.get('/friend_history', function(req, res) {
        if(! req.user) {
            return res.status(403).json({
                ok: false,
                error: 'AUTH'
            });
        }

        Friend.findAll({
            where: {
                FromUserId: req.user.id
            }
        }).then(function(friends) {
            return bluebird.resolve([req.user.id].concat(friends.map((friend) => {
                return friend.ToUserId;
            })));
        }).then(function(users) {
            return bluebird.join(
                bluebird.all(users.map((user) => {
                    return User.findById(user);
                })),
                bluebird.all(users.map((user) => {
                    return Match.findAll({
                        where: {
                            when: {$lt: instance.fn('now')},
                            goalsHome: {$ne: null},
                            goalsAway: {$ne: null}
                        },
                        attributes: [
                            [instance.fn('coalesce',
                                instance.fn('calc_bet_score',
                                    instance.fn('calc_bet_result',
                                        instance.col('Match.goalsHome'),
                                        instance.col('Match.goalsAway'),
                                        instance.col('Bets.goalsHome'),
                                        instance.col('Bets.goalsAway')
                                    ),
                                instance.col('MatchType.scoreFactor')),
                            0), 'score']
                        ],
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
                                model: MatchType,
                            }
                        ],
                        order: [['when', 'ASC']]
                    });
                })), function(users, scoresList) {
                    return {
                        // the first scoresList entry is the current user
                        // and should always be there
                        labels: scoresList[0].map(row => row.HomeTeam.code + ' ' + row.AwayTeam.code),
                        data: users.map((user, index) => {
                            return {
                                id: user.id,
                                name: user.name,
                                scores: scoresList[index].map(row => row.get('score'))
                            };
                        })
                    };
                }
            );
        }).then(function(result) {
            res.json({
                ok: true,
                data: result.data,
                labels: result.labels
            });
        }).catch(function(error) {
            res.status(500).json({
                ok: false,
                error: 'INTERNAL'
            });
        });
    });
};
