const config = require('../config');
const instance = require('../models').instance;
const User = instance.model('User');
const request = require('request');
const bcrypt = require('bcrypt');
const mailgun = require('mailgun-js')({
    apiKey: config.mailgun.secretKey,
    domain: config.mailgun.domain
});
const uuid = require('uuid');
const mustache = require('mustache');

const RECAPTCHA_URL = 'https://www.google.com/recaptcha/api/siteverify';
const BCRYPT_ROUNDS = 10;

const MAIL_TEMPLATE =
`Hello {{{name}}},
thank you for registering on {{{domain}}}

Please confirm your email address:
{{{url}}}`;

module.exports = function(app) {
    app.get('/register', function(req, res) {
        res.render('register', {
            csrfToken: req.csrfToken(),
            key: config.recaptcha.key,
            loggedIn: !!req.user,
            error: req.flash('error')
        });
    });

    app.post('/register', function(req, res) {
        request.post({
            url: RECAPTCHA_URL,
            form: {
                secret: config.recaptcha.secret,
                response: req.body['g-recaptcha-response']
            }
        }, function(err, httpResponse, body) {
            if(JSON.parse(body).success === true) {
                bcrypt.hash(req.body.password, BCRYPT_ROUNDS, function(err, encrypted) {
                    const token = uuid.v4();
                    User.create({
                        name: req.body.name,
                        password: encrypted,
                        email: req.body.email,
                        emailConfirmed: false,
                        emailConfirmToken: token
                    }).then(function(user) {
                        var mail = {
                            from: config.mailgun.from,
                            to: req.body.email,
                            subject: 'Activate your Euro 2016 account',
                            text: mustache.render(MAIL_TEMPLATE, {
                                name: req.body.name,
                                domain: config.origin,
                                url: config.origin + '/activate/' + token
                            })
                        };
                        mailgun.messages().send(mail, function(err, body) {
                            if(err) {
                                req.flash('error', 'Could not send confirmation email.');
                                res.redirect('/register');
                            } else {
                                req.login(user, function(err) {
                                    res.redirect('/me');
                                });
                            }
                        });
                    }).catch(function(err) {
                        req.flash('error', 'Email address is already in use.');
                        res.redirect('/register');
                    });
                });
            } else {
                req.flash('error', 'Wrong captcha solution');
                res.redirect('/register');
            }
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
            res.render('activate', {
                success: true,
                loggedIn: !!req.user
            });
        }).catch(function() {
            res.render('activate', {
                success: false,
                loggedIn: !!req.user
            });
        });
    });
};
