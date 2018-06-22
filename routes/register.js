const config = require('../config');
const instance = require('../models').instance;
const User = instance.model('User');
const bcrypt = require('bcrypt');
const uuid = require('uuid');
const mustache = require('mustache');
const sendRawMail = require('./send_mail.js').sendRawMail;
const BCRYPT_ROUNDS = 10;

const MAIL_TEMPLATE =
`Hello {{{name}}},
thank you for registering for the WorldCup 2018 Betting Game.

Place your bets on the first matches!
You can place bets as long as a match has not started already.
After a match begins, you can see the bets of all other users.

You are free to invite your friends, colleagues and family!
We welcome anybody on our service.

Please confirm your email address:
{{{url}}}


Happy Betting!
the Game Master`;

function sendMail(user) {
    const mail = {
        from: config.mailFrom,
        to: user.email,
        subject: "Activate your WorldCup 2018 Account",
        text: mustache.render(MAIL_TEMPLATE, {
            name: user.name,
            url: config.origin + "/activate/" + user.emailConfirmToken,
        }),
    };

    return sendRawMail(mail);
}

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
                if(config.mail) {
                    sendMail(user).then(() => {
                        req.login(user, function(err) {
                            res.redirect('/intro');
                        });
                    }).catch((err) => {
                        console.error(err);
                        req.flash('error', 'Could not send confirmation email.');
                        res.redirect('/register');
                    });
                } else {
                    req.login(user, function(err) {
                        res.redirect('/intro');
                    });
                }
            }).catch(function(err) {
                console.error(err);
                req.flash('error', 'Email address is already in use.');
                res.redirect('/register');
            });
        });
    });

    app.get('/activate/:code', function(req, res) {
        res.render('activate', {
            button: true,
            code: req.params.code,
        });
    });

    app.post("/activate/:code", (req, res) => {
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
            res.render('activate', {error: true});
        });
    });
};
