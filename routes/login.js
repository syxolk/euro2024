module.exports = function(app) {
    app.get('/', function(req, res) {
        res.redirect('/login');
    });

    app.get('/login', function(req, res) {
        res.render('login');
    });

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });
};
