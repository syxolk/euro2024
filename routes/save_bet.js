const instance = require('../models').instance;
const Bet = instance.model('Bet');
const Match = instance.model('Match');

module.exports = function(app) {
    app.post('/save_bet', function(req, res) {
        if(! req.user) {
            res.status(401).json({ok: false, error: 'AUTH'});
            return;
        }

        Match.findById(req.body.match).then(function(match) {
            if(Date.now() < match.when.getTime()) {
                if(req.body.home && req.body.away) {
                    Bet.upsert({
                        UserId: req.user.id,
                        MatchId: req.body.match,
                        goalsHome: req.body.home,
                        goalsAway: req.body.away
                    }).then(function() {
                        res.json({ok: true});
                    }).catch(function() {
                        res.status(500).json({ok: false, error: 'DB'});
                    });
                } else {
                    Bet.destroy({
                        where: {
                            UserId: req.user.id,
                            MatchId: req.body.match,
                        }
                    }).then(() => {
                        res.json({ok: true});
                    }).catch((err) => {
                        res.status(500).json({ok: false, error: 'DB'});
                    });
                }
            } else {
                res.status(403).json({ok: false, error: 'MATCH_EXPIRED'});
            }
        }).catch(function() {
            res.status(404).json({ok: false, error: 'MATCH_NOT_FOUND'});
        });
    });
};
