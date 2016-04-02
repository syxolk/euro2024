module.exports = function(app) {
    require('./login')(app);
    require('./facebook')(app);
    require('./user')(app);
    require('./save_bet')(app);
    require('./highscore')(app);
};
