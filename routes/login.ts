import bcrypt from "bcrypt";
import { Router } from "express";
import { Request, Response } from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

import config from "../config";
import { knex } from "../db";
import { getUser } from "../request_helper";

const router = Router();

passport.use(
    new LocalStrategy(
        {
            usernameField: "email",
            passwordField: "password",
            passReqToCallback: true,
        },
        function (req, email, password, done) {
            // Save email in flash
            req.flash("email", email);

            knex("user_account")
                .where({ email: email })
                .whereNotNull("email")
                .select(
                    "id",
                    "name",
                    "email",
                    "password",
                    "past_matches_last_visited_at",
                    "google_id as googleId"
                )
                .first()
                .then((user) => {
                    if (user === undefined) {
                        done(null, false, { message: "Wrong email address!" });
                        return;
                    }

                    if (user.password === null) {
                        done(null, false, { message: "User has no password!" });
                        return;
                    }

                    bcrypt.compare(
                        password,
                        user.password,
                        function (err, same) {
                            if (err) {
                                done(err);
                            } else if (same) {
                                done(null, user);
                            } else {
                                done(null, false, {
                                    message: "Wrong password!",
                                });
                            }
                        }
                    );
                })
                .catch((err) => {
                    console.error(err);
                });
        }
    )
);

router.get("/login", function (req: Request, res: Response) {
    res.redirect("/");
});

router.get("/", function (req: Request, res: Response) {
    if (getUser(req)) {
        res.redirect("/me");
        return;
    }

    res.render("login", {
        enabledGoogle: !!config.google,
        error: req.flash("error"),
        email: req.flash("email"),
    });
});

router.post(
    "/login",
    passport.authenticate("local", {
        successRedirect: "/me",
        failureRedirect: "/login",
        failureFlash: true,
    })
);

router.post("/logout", function (req: Request, res: Response) {
    req.logout(() => {
        res.redirect("/");
    });
});

// Redirect to my personal user page
router.get("/me", function (req: Request, res: Response) {
    const user = getUser(req);
    if (!user) {
        res.redirect("/login");
        return;
    }

    res.redirect("/user/" + user.id);
});

export default router;
