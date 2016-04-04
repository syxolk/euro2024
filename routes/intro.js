module.exports = function(app) {
    app.get('/intro', function(req, res) {
        if(! req.user) {
            res.redirect('/login');
            return;
        }

        res.render('intro');
    });
};
