const instance = require('../models').instance;
const User = instance.model('User');
const bcrypt  = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

passport.use(new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
    }, function(email, password, done) {
        User.findOne({
            where: {email}
        }).then(function(user) {
            bcrypt.compare(password, user.password, function(err, same) {
                if(err) {
                    done(err);
                } else if(same) {
                    done(null, user);
                } else {
                    done(null, false, {message: 'Wrong password!'});
                }
            });
        }).catch(function(err) {
            done(null, false, {message: 'Wrong email address!'});
        });
    }
));

module.exports = function(app) {
    app.get('/', function(req, res) {
        res.redirect('/login');
    });

    app.get('/login', function(req, res) {
        res.render('login', {
            csrfToken: req.csrfToken(),
            loggedIn: !!req.user,
            error: req.flash('error')
        });
    });

    app.post('/login', passport.authenticate('local', {
        successRedirect: '/me',
        failureRedirect: '/login',
        failureFlash: true
    }));

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
