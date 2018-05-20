const instance = require('../models').instance;
const Match = instance.model('Match');
const Bet = instance.model('Bet');
const Team = instance.model('Team');
const MatchType = instance.model('MatchType');
const User = instance.model('User');
const Op = require('sequelize').Sequelize.Op;

module.exports = function(app) {
    app.get('/mybets', function(req, res) {
        if(! req.user) {
            res.redirect('/login');
            return;
        }

        Match.findAll({
            when: {
                [Op.gt]: instance.fn('now')
            },
            include: [
                {
                    model: Bet,
                    required: false,
                    where : {
                        'UserId': req.user.id
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
        }).then((matches) => {
            res.render('mybets', {
                matches,
                csrfToken: req.csrfToken(),
                loggedIn: !!req.user,
                user: req.user,
            });
        });
    });
};
