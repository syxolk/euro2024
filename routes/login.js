module.exports = function(app) {
    app.get('/', function(req, res) {
        res.redirect('/login');
    });

    app.get('/login', function(req, res) {
        res.render('login', {loggedIn: !!req.user});
    });

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

    // Redirect to my personal user page
    app.get('/me', function(req, res) {
        if(! req.user) {
            res.redirect('/login');
            return;
        }

        res.redirect('/user/' + req.user.id);
    });
};
