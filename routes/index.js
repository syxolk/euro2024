module.exports = function(app) {
    require('./login')(app);
    require('./facebook')(app);
    require('./bets')(app);
    require('./save_bet')(app);
    require('./highscore')(app);
    require('./user')(app);
};
