const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const config = require('../config');
const instance = require('../models').instance;

const User = instance.model('User');

passport.use(new FacebookStrategy({
    clientID: config.facebook.clientID,
    clientSecret: config.facebook.clientSecret,
    callbackURL: config.origin + '/auth/facebook/callback',
    enableProof: true,
    passReqToCallback: true,
}, function(req, accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
        where: {
            facebookId: profile.id
        },
        defaults: {
            name: "Anonymous"
        }
    }).spread(function(user, created) {
        if(created) {
            // Use a hack here to memorize if the a new user was created or not
            req.flash("isNewUser", created);
        }
        cb(null, user);
    }).catch(function(err) {
        cb(err);
    });
}));

passport.use('connect-facebook', new FacebookStrategy({
    clientID: config.facebook.clientID,
    clientSecret: config.facebook.clientSecret,
    callbackURL: config.origin + '/connect/facebook/callback',
    enableProof: true,
    passReqToCallback: true,
}, function(req, accessToken, refreshToken, profile, cb) {
    if(!req.user) {
        cb('Not logged in');
        return;
    }

    req.user.facebookId = profile.id;
    req.user.save().then(() => {
        cb(null, req.user);
    }).catch((err) => {
        cb(err);
    });
}));

module.exports = function(app) {
    app.get('/auth/facebook', passport.authenticate('facebook'));

    app.get('/auth/facebook/callback', passport.authenticate('facebook', {
        failureRedirect: '/login'
    }), (req, res) => {
        const isNewUser = req.flash("isNewUser").length > 0; // flash returns an array
        if(isNewUser) {
            res.redirect("/intro");
        } else {
            res.redirect("/me");
        }
    });

    app.get('/connect/facebook', passport.authenticate('connect-facebook'));

    app.get('/connect/facebook/callback', passport.authenticate('connect-facebook', {
        successRedirect: '/settings',
        failureRedirect: '/settings'
    }));

    app.post('/disconnect/facebook', function(req, res) {
        if(!req.user) {
            res.redirect('/login');
            return;
        }

        req.user.facebookId = null;
        req.user.save().then(() => {
            res.redirect('/settings');
        }).catch((err) => {
            req.flash("error", "Could not disconnect Facebook account.");
            res.redirect('/settings');
        });
    });
};
