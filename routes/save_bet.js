const instance = require('../models').instance;
const Bet = instance.model('Bet');
const Match = instance.model('Match');

module.exports = function(app) {
    app.post('/save_bet', function(req, res) {
        if(! req.user) {
            res.json({ok: false, error: 'AUTH'});
            return;
        }

        Match.findById(req.body.match).then(function(match) {
            if(Date.now() < match.when.getTime()) {
                Bet.upsert({
                    UserId: req.user.id,
                    MatchId: req.body.match,
                    goalsHome: req.body.home,
                    goalsAway: req.body.away
                }).then(function() {
                    res.json({ok: true});
                }).catch(function() {
                    res.json({ok: false, error: 'DB'});
                });
            } else {
                res.json({ok: false, error: 'MATCH_EXPIRED'});
            }
        }).catch(function() {
            res.json({ok: false, error: 'MATCH_NOT_FOUND'});
        });
    });
};
