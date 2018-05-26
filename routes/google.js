const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const config = require('../config');
const instance = require('../models').instance;

const User = instance.model('User');

passport.use(new GoogleStrategy({
    clientID: config.google.clientID,
    clientSecret: config.google.clientSecret,
    callbackURL: config.origin + '/auth/google/callback'
}, function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
        where: {
            googleId: profile.id
        },
        defaults: {
            name: "Anonymous"
        }
    }).spread(function(user, created) {
        cb(null, user);
    }).catch(function(err) {
        cb(err);
    });
}));

passport.use("connect-google", new GoogleStrategy({
    clientID: config.google.clientID,
    clientSecret: config.google.clientSecret,
    callbackURL: config.origin + '/connect/google/callback',
    passReqToCallback: true,
}, function(req, accessToken, refreshToken, profile, cb) {
    if(!req.user) {
        cb('Not logged in');
        return;
    }

    req.user.googleId = profile.id;
    req.user.save().then(() => {
        cb(null, req.user);
    }).catch((err) => {
        cb(err);
    });
}));

module.exports = function(app) {
    app.get('/auth/google', passport.authenticate('google', {scope: ['profile']}));

    app.get('/auth/google/callback', passport.authenticate('google', {
        successRedirect: '/me',
        failureRedirect: '/login'
    }));

    app.get('/connect/google', passport.authenticate('connect-google', {scope: ['profile']}));

    app.get('/connect/google/callback', passport.authenticate('connect-google', {
        successRedirect: '/settings',
        failureRedirect: '/settings'
    }));

    app.post('/disconnect/google', function(req, res) {
        if(!req.user) {
            res.redirect('/login');
            return;
        }

        req.user.googleId = null;
        req.user.save().then(() => {
            res.redirect('/settings');
        }).catch((err) => {
            req.flash("error", "Could not disconnect Google account.");
            res.redirect('/settings');
        });
    });
};
