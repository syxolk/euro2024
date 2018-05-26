const instance = require('../models').instance;
const User = instance.model('User');
const config = require('../config');

module.exports = function(app) {
    app.get('/settings', function(req, res) {
        if(! req.user) {
            res.redirect('/login');
            return;
        }

        res.render('settings', {
            enabledFacebook: !!config.facebook,
            enabledGoogle: !!config.google,
            error: req.flash("error"),
        });
    });

    app.post('/settings', function(req, res) {
        if(! req.user) {
            res.redirect('/login');
            return;
        }

        req.user.name = req.body.name;
        req.user.save().then(function() {
            res.redirect('/settings');
        }).catch(function() {
            req.flash("error", "Could not set name.");
            res.redirect('/settings');
        });
    });
};
