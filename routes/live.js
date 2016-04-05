const bluebird = require('bluebird');
const instance = require('../models').instance;
const Bet = instance.model('Bet');
const User = instance.model('User');

module.exports = function(app) {
    app.get('/live', function(req, res) {
        if(! req.user) {
            res.redirect('/login');
            return;
        }

        instance.query('SELECT * FROM match_table', {type: instance.QueryTypes.SELECT})
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
                }

                res.render('live', {matches});
            });
        });
    });
};
