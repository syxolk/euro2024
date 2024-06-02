const ms = require("ms");
const uuid = require("uuid");
const mustache = require("mustache");
const bcrypt = require("bcrypt");
const config = require("../config");
const sendRawMail = require("./send_mail.js").sendRawMail;

const { knex } = require("../db");

const router = require("express-promise-router")();
module.exports = router;

const BCRYPT_ROUNDS = 10;
// Minimum delay between creating a reset token and creating a new one
const PASSWORD_RESET_TOKEN_MIN_DELAY = ms("1h");
// Max age a reset token is valid after it was created
const PASSWORD_RESET_TOKEN_MAX_AGE = ms("24h");

const MAIL_TEMPLATE = `Hello {{{name}}},
you requested to reset your password.

Here's your password reset link:
{{{url}}}

It's valid for 24 hours. If you didn't expect this email you can safely ignore it.

Happy Betting!
the Game Master`;

function sendMail(user, token) {
    const mail = {
        from: config.mailFrom,
        to: user.email,
        subject: "Reset your Euro 2024 Password",
        text: mustache.render(MAIL_TEMPLATE, {
            name: user.name,
            url: config.origin + "/password_reset/" + token,
        }),
    };

    return sendRawMail(mail);
}

router.get("/password_recovery", (req, res) => {
    res.render("password_recovery", {
        email: req.flash("email"),
        message: req.flash("message"),
        error: req.flash("error"),
    });
});

router.post("/password_recovery", async (req, res) => {
    req.flash("email", req.body.email);

    const user = await knex("user_account")
        .where({
            email: "" + req.body.email,
        })
        .select(
            "id",
            "name",
            "email",
            "email_confirmed",
            "password_reset_created_at"
        )
        .first();

    if (user === undefined) {
        req.flash("error", "Email address not found.");
        res.redirect("/password_recovery");
        return;
    }

    if (user.email_confirmed !== true) {
        // User did not yet confirm his email address
        // -> Don't send any emails
        req.flash(
            "error",
            "Please confirm your email address before you recover your password."
        );
        res.redirect("/password_recovery");
        return;
    }

    if (
        user.password_reset_created_at !== null &&
        Date.now() - user.password_reset_created_at.getTime() <
            PASSWORD_RESET_TOKEN_MIN_DELAY
    ) {
        // Don't send another token if the last
        // token was created less than an 1 hour before
        req.flash("error", "Try again later.");
        res.redirect("/password_recovery");
        return;
    }

    // Create new token and memorize creation date
    const token = uuid.v4();

    await knex("user_account")
        .update({
            password_reset_token: token,
            password_reset_created_at: new Date(),
        })
        .where({
            id: user.id,
        });

    // Send a mail to the user's email address
    await sendMail(user, token);

    req.flash(
        "message",
        "You will receive a password reset link on your email address."
    );
    res.redirect("/password_recovery");
});

router.get("/password_reset/:code", (req, res) => {
    res.render("password_reset", {
        code: req.params.code,
        message: req.flash("message"),
        error: req.flash("error"),
    });
});

router.post("/password_reset/:code", async (req, res) => {
    const user = await knex("user_account")
        .select("id", "name", "password_reset_created_at")
        .where({
            password_reset_token: req.params.code,
        })
        .first();

    if (user === undefined) {
        req.flash(
            "error",
            "Password reset token is not valid or was already used."
        );
        res.redirect("/password_reset/" + req.params.code);
        return;
    }

    const hashedPassword = await bcrypt.hash(req.body.password, BCRYPT_ROUNDS);

    const age = Date.now() - user.password_reset_created_at.getTime();
    if (age > PASSWORD_RESET_TOKEN_MAX_AGE) {
        req.flash("error", "The password reset token is no longer valid.");
        res.redirect("/password_reset/" + req.params.code);
        return;
    }

    await knex("user_account")
        .update({
            password: hashedPassword,
            password_reset_token: null,
            password_reset_created_at: null,
        })
        .where({
            id: user.id,
        });

    req.flash("message", "You changed your password successfully.");
    res.redirect("/password_reset/" + req.params.code);
});
