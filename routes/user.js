const bluebird = require('bluebird');
const instance = require('../models').instance;
const Match = instance.model('Match');
const Bet = instance.model('Bet');
const Team = instance.model('Team');
const MatchType = instance.model('MatchType');

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
                        [instance.where(instance.col('when'), '<', instance.fn('now')), 'expired']
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
};
