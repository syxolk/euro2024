const instance = require('../models').instance;
const User = instance.model('User');
const ms = require('ms');
const uuid = require('uuid');
const mustache = require('mustache');
const bcrypt = require('bcrypt');
const bluebird = require('bluebird');
const config = require('../config');
const sendRawMail = require('./send_mail.js').sendRawMail;

const BCRYPT_ROUNDS = 10;
// Minimum delay between creating a reset token and creating a new one
const PASSWORD_RESET_TOKEN_MIN_DELAY = ms('1h');
// Max age a reset token is valid after it was created
const PASSWORD_RESET_TOKEN_MAX_AGE = ms('24h');

const MAIL_TEMPLATE =
`Hello {{{name}}},
you requested to reset your password.

Here's your password reset link:
{{{url}}}

It's valid for 24 hours. If you didn't expect this email you can safely ignore it.

Happy Betting!
the Game Master`;

function sendMail(user) {
    const mail = {
        from: config.mailFrom,
        to: user.email,
        subject: "Reset your Euro 2020 Password",
        text: mustache.render(MAIL_TEMPLATE, {
            name: user.name,
            url: config.origin + "/password_reset/" + user.passwordResetToken,
        }),
    };

    return sendRawMail(mail);
}

module.exports = (app) => {
    app.get('/password_recovery', (req, res) => {
        res.render('password_recovery', {
            email: req.flash('email'),
            message: req.flash('message'),
            error: req.flash('error'),
        });
    });

    app.post('/password_recovery', (req, res) => {
        req.flash('email', req.body.email);

        User.findOne({
            where: {
                email: '' + req.body.email
            }
        }).then((user) => {
            if(user.emailConfirmed !== true) {
                // User did not yet confirm his email address
                // -> Don't send any emails
                req.flash('error', "Please confirm your email address before you recover your password.");
                res.redirect('/password_recovery');
                return;
            }
            if(user.passwordResetCreatedAt !== null &&
                    (Date.now() - user.passwordResetCreatedAt.getTime() < PASSWORD_RESET_TOKEN_MIN_DELAY)) {
                // Don't send another token if the last
                // token was created less than an 1 hour before
                req.flash('error', 'Try again later.');
                res.redirect('/password_recovery');
                return;
            }

            // Create new token and memorize creation date
            const token = uuid.v4();
            user.passwordResetToken = token;
            user.passwordResetCreatedAt = new Date();
            return user.save();
        }).then((user) => {
            // Send a mail to the user's email address
            sendMail(user).then(() => {
                req.flash("message", "You will receive a password reset link on your email address.");
                res.redirect('/password_recovery');
            }).catch((err) => {
                console.error(err);
                req.flash("error", "Could not send email.");
                res.redirect('/password_recovery');
            });
        }).catch((err) => {
            console.error(err);
            req.flash('error', 'Email address not found.');
            res.redirect('/password_recovery');
        });
    });

    app.get('/password_reset/:code', (req, res) => {
        res.render('password_reset', {
            code: req.params.code,
            message: req.flash('message'),
            error: req.flash('error'),
        });
    });

    app.post('/password_reset/:code', (req, res) => {
        return bluebird.Promise.all([
            User.findOne({
                where: {passwordResetToken: req.params.code}
            }),
            bcrypt.hash(req.body.password, BCRYPT_ROUNDS),
        ]).spread((user, encrypted) => {
            const age = Date.now() - user.passwordResetCreatedAt.getTime();
            if(age > PASSWORD_RESET_TOKEN_MAX_AGE) {
                req.flash('error', "The password reset token is no longer valid.");
                res.redirect('/password_reset/' + req.params.code);
                return;
            }

            user.password = encrypted;
            user.passwordResetToken = null;
            user.passwordResetCreatedAt = null;
            return user.save();
        }).then(() => {
            req.flash("message", "You changed your password successfully.");
            res.redirect('/password_reset/' + req.params.code);
        }).catch((err) => {
            console.error(err);
            req.flash('error', "Password reset token is not valid or was already used.");
            res.redirect('/password_reset/' + req.params.code);
        });
    });
};
