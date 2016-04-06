const instance = require('../models').instance;

module.exports = function(app) {
    app.get('/highscore', function(req, res) {
        if(! req.user) {
            res.redirect('/login');
            return;
        }

        instance.query(`SELECT name, score, id, count3, count2, count1, count0,
            rank() over (order by score desc) as rank
            FROM score_table ORDER BY score DESC`, {type: instance.QueryTypes.SELECT})
        .then(function(results) {
            res.render('highscore', {users: results});
        });
    });
};
