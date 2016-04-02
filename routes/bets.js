const instance = require('../models').instance;
const Match = instance.model('Match');
const Bet = instance.model('Bet');
const Team = instance.model('Team');
const MatchType = instance.model('MatchType');

module.exports = function(app) {
    app.get('/bets', function(req, res) {
        if(! req.user) {
            res.redirect('/login');
            return;
        }

        Match.findAll({
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
        }).then(function(matches) {
            res.render('bets', {matches, csrfToken: req.csrfToken()});
        });
    });
};
