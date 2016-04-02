const bluebird = require('bluebird');
const instance = require('../models').instance;
const Match = instance.model('Match');
const Bet = instance.model('Bet');
const Team = instance.model('Team');
const MatchType = instance.model('MatchType');

module.exports = function(app) {
    app.get('/user/:id', function(req, res) {
        if(! req.user) {
            res.redirect('/login');
            return;
        }

        const user = parseInt(req.params.id);

        if(! Number.isInteger(user)) {
            res.status(404).render('user_not_found');
            return;
        }

        // for other users only show expired matches
        var where = {};
        if(user !== req.user.id) {
            where = {
                when: {lt: instance.fn('now')}
            };
        }

        bluebird.join(
            instance.query('SELECT * FROM score_table WHERE id = :id', {
                raw: true,
                plain: true,
                replacements: {
                    id: user
                }
            }),
            Match.findAll({
                where,
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
                res.render('user', {user, matches, csrfToken: req.csrfToken()});
            } else {
                res.status(404).render('user_not_found');
            }
        });
    });
};
