const config = require("../config");
const bcrypt = require("bcrypt");
const uuid = require("uuid");
const mustache = require("mustache");
const sendRawMail = require("./send_mail.js").sendRawMail;
const BCRYPT_ROUNDS = 10;
const { knex } = require("../db");
const router = require("express-promise-router")();

const MAIL_TEMPLATE = `Hello {{{name}}},
thank you for registering for the Euro 2024 Betting Game.

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
        subject: "Activate your Euro 2024 Account",
        text: mustache.render(MAIL_TEMPLATE, {
            name: user.name,
            url: config.origin + "/activate/" + user.email_confirm_token,
        }),
    };

    return sendRawMail(mail);
}

router.get("/register", function (req, res) {
    if (req.user) {
        res.redirect("/me");
        return;
    }

    res.render("register", {
        error: req.flash("error"),
        name: req.flash("name"),
        email: req.flash("email"),
        disabled: config.disableUserRegistration,
    });
});

router.post("/register", async (req, res) => {
    if (config.disableUserRegistration) {
        req.flash("error", "User registration disabled!");
        res.redirect("/register");
        return;
    }

    // Save name and email in flash
    req.flash("name", req.body.name);
    req.flash("email", req.body.email);

    const encrypted = await bcrypt.hash(req.body.password, BCRYPT_ROUNDS);

    const token = uuid.v4();

    let user = null;

    try {
        const result = await knex("user_account")
            .insert({
                name: req.body.name,
                password: encrypted,
                email: req.body.email,
                email_confirmed: false,
                email_confirm_token: token,
                created_at: knex.fn.now(),
                past_matches_last_visited_at: knex.fn.now(),
            })
            .returning([
                "id",
                "name",
                "email",
                "admin",
                "past_matches_last_visited_at",
                "email_confirm_token",
            ]);

        user = result[0];
    } catch (err) {
        console.error(err);
        req.flash("error", "Email address is already in use.");
        res.redirect("/register");
        return;
    }

    if (config.mail) {
        sendMail(user)
            .then(() => {
                req.login(user, function (err) {
                    res.redirect("/intro");
                });
            })
            .catch((err) => {
                console.error(err);
                req.flash("error", "Could not send confirmation email.");
                res.redirect("/register");
            });
    } else {
        req.login(user, function (err) {
            res.redirect("/intro");
        });
    }
});

router.get("/activate/:code", function (req, res) {
    res.render("activate", {
        button: true,
        code: req.params.code,
    });
});

router.post("/activate/:code", async (req, res) => {
    const user = await knex("user_account")
        .select("id")
        .where({
            email_confirm_token: req.params.code,
        })
        .first();

    if (user === undefined) {
        res.render("activate", { error: true });
        return;
    }

    await knex("user_account")
        .update({
            email_confirm_token: null, // delete token, may be used only once
            email_confirmed: true,
        })
        .where({
            id: user.id,
        });

    res.render("activate", { success: true });
});

module.exports = router;
