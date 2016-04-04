const bluebird = require('bluebird');
const instance = require('../models').instance;
const Match = instance.model('Match');
const Bet = instance.model('Bet');
const Team = instance.model('Team');
const MatchType = instance.model('MatchType');

module.exports = function(app) {
    app.get('/live', function(req, res) {
        if(! req.user) {
            res.redirect('/login');
            return;
        }

        instance.query('SELECT * FROM match_table', {type: instance.QueryTypes.SELECT})
        .then(function(matches) {
            res.render('live', {matches});
        });
    });
};
