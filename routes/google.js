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
    console.log(profile);
    User.findOrCreate({
        where: {
            googleId: profile.id
        },
        defaults: {
            name: profile.displayName
        }
    }).spread(function(user, created) {
        cb(null, user);
    }).catch(function(err) {
        cb(err);
    });
}));

module.exports = function(app) {
    app.get('/auth/google', passport.authenticate('google', {scope: ['profile']}));

    app.get('/auth/google/callback', passport.authenticate('google', {
        successRedirect: '/me',
        failureRedirect: '/login'
    }));
};
