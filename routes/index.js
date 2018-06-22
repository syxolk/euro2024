const config = require('../config');

module.exports = function(app) {
    require('./login')(app);
    require('./register')(app);
    if(config.facebook) { require('./facebook')(app); }
    if(config.google) { require('./google')(app); }
    require('./user')(app);
    require('./save_bet')(app);
    require('./highscore')(app);
    require('./settings')(app);
    require('./intro')(app);
    require('./live')(app);
    require('./past')(app);
    require('./admin')(app);
    require('./friend')(app);
    require('./mybets')(app);
    require('./password_recovery')(app);

    app.use(function (req, res, next) {
        res.status(404).render('404');
    });
};
