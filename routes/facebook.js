const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const config = require('../config');
const instance = require('../models').instance;
const common = require('./common');

const User = instance.model('User');

passport.use(new FacebookStrategy({
    clientID: config.facebook.clientID,
    clientSecret: config.facebook.clientSecret,
    callbackURL: config.origin + '/auth/facebook/callback',
    enableProof: true
}, function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
        where: {
            facebookId: profile.id
        },
        defaults: {
            name: common.normalizeDisplayName(profile.displayName)
        }
    }).spread(function(user, created) {
        cb(null, user);
    }).catch(function(err) {
        cb(err);
    });
}));

module.exports = function(app) {
    app.get('/auth/facebook', passport.authenticate('facebook'));

    app.get('/auth/facebook/callback', passport.authenticate('facebook', {
        successRedirect: '/me',
        failureRedirect: '/login'
    }));
};
