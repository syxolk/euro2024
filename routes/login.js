const bcrypt = require("bcrypt");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const config = require("../config");
const { knex } = require("../db");

const router = require("express-promise-router")();

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
                    "google_id as googleId",
                    "facebook_id as facebookId"
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

router.get("/login", function (req, res) {
    res.redirect("/");
});

router.get("/", function (req, res) {
    if (req.user) {
        res.redirect("/me");
        return;
    }

    res.render("login", {
        enabledFacebook: !!config.facebook,
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

router.post("/logout", function (req, res) {
    req.logout(() => {
        res.redirect("/");
    });
});

// Redirect to my personal user page
router.get("/me", function (req, res) {
    if (!req.user) {
        res.redirect("/login");
        return;
    }

    res.redirect("/user/" + req.user.id);
});

module.exports = router;
