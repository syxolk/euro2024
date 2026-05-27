import bcrypt from "bcrypt";
import { Router } from "express";
import { Request, Response } from "express";
import mustache from "mustache";
import { v4 as uuidv4 } from "uuid";

import config from "../config";
import { knex } from "../db";
import { getUser } from "../request_helper";
import { sendRawMail } from "./send_mail";

const BCRYPT_ROUNDS = 10;
const router = Router();

const MAIL_TEMPLATE = `Hello {{{name}}},
thank you for registering for the Worldcup 2026 Betting Game.

Place your bets on the first matches!
You can place bets as long as a match has not started already.
After a match begins, you can see the bets of all other users.

You are free to invite your friends, colleagues and family!
We welcome anybody on our service.

Please confirm your email address:
{{{url}}}


Happy Betting!
the Game Master`;

interface RegistrationUser {
    id: number;
    name: string;
    email: string;
    admin?: boolean;
    past_matches_last_visited_at?: Date | null;
    email_confirm_token: string;
}

function sendMail(user: RegistrationUser) {
    const mail = {
        from: config.mailFrom ?? "",
        to: user.email,
        subject: "Activate your Worldcup 2026 Account",
        text: mustache.render(MAIL_TEMPLATE, {
            name: user.name,
            url: config.origin + "/activate/" + user.email_confirm_token,
        }),
    };

    return sendRawMail(mail);
}

router.get("/register", function (req: Request, res: Response) {
    if (getUser(req)) {
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

    const token = uuidv4();

    let user: RegistrationUser | null = null;

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

    if (!user) {
        req.flash("error", "Could not create user.");
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

export default router;
