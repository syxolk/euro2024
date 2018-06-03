const config = require('../config');
const instance = require('../models').instance;
const User = instance.model('User');
const bcrypt = require('bcrypt');
const uuid = require('uuid');
const mustache = require('mustache');

const RECAPTCHA_URL = 'https://www.google.com/recaptcha/api/siteverify';
const BCRYPT_ROUNDS = 10;

module.exports = function(app) {
    app.get('/register', function(req, res) {
        if(req.user) {
            res.redirect('/me');
            return;
        }

        res.render('register', {
            error: req.flash('error'),
            name: req.flash('name'),
            email: req.flash('email')
        });
    });

    app.post('/register', function(req, res) {
        // Save name and email in flash
        req.flash('name', req.body.name);
        req.flash('email', req.body.email);

        bcrypt.hash(req.body.password, BCRYPT_ROUNDS, function(err, encrypted) {
            const token = uuid.v4();
            User.create({
                name: req.body.name,
                password: encrypted,
                email: req.body.email,
                emailConfirmed: false,
                emailConfirmToken: token
            }).then(function(user) {
                req.login(user, function(err) {
                    res.redirect('/intro');
                });
            }).catch(function(err) {
                req.flash('error', 'Email address is already in use.');
                res.redirect('/register');
            });
        });
    });

    app.get('/activate/:code', function(req, res) {
        User.findOne({
            where: {
                emailConfirmToken: req.params.code
            }
        }).then(function(user) {
            user.emailConfirmToken = null; // delete token, may be used only once
            user.emailConfirmed = true;
            return user.save();
        }).then(function(user) {
            res.render('activate', {success: true});
        }).catch(function() {
            res.render('activate', {success: false});
        });
    });
};
