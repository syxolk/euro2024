module.exports = function(app) {
    require('./login')(app);
    require('./facebook')(app);
    require('./google')(app);
    require('./user')(app);
    require('./save_bet')(app);
    require('./highscore')(app);
    require('./settings')(app);
    require('./intro')(app);
    require('./live')(app);

    app.use(function (req, res, next) {
        res.status(404).render('404');
    });
};
