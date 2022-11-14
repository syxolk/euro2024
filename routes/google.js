const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const config = require("../config");
const { knex } = require("../db");

const USER_COLUMNS = [
    "id",
    "name",
    "email",
    "admin",
    "past_matches_last_visited_at",
    "google_id as googleId",
    "facebook_id as facebookId"
];

async function getOrCreateUser(profile) {
    const result = await knex.transaction(async (trx) => {
        const user = await trx("user_account")
            .select(...USER_COLUMNS)
            .where({
                google_id: profile.id,
            })
            .first();

        if (user !== undefined) {
            return { user: user, created: false };
        }

        const [newUser] = await trx("user_account")
            .insert({
                google_id: profile.id,
                name: profile.displayName,
                created_at: trx.fn.now(),
                past_matches_last_visited_at: trx.fn.now(),
            })
            .returning(USER_COLUMNS);

        return { user: newUser, created: true };
    });

    return result;
}

passport.use(
    new GoogleStrategy(
        {
            clientID: config.google.clientID,
            clientSecret: config.google.clientSecret,
            callbackURL: config.origin + "/auth/google/callback",
            passReqToCallback: true,
        },
        function (req, accessToken, refreshToken, profile, cb) {
            getOrCreateUser(profile)
                .then(({ user, created }) => {
                    if (created) {
                        // Use a hack here to memorize if the a new user was created or not
                        req.flash("isNewUser", created);
                    }
                    cb(null, user);
                })
                .catch((err) => {
                    cb(err);
                });
        }
    )
);

async function updateUserWithGoogleId(user, profileId) {
    await knex("user_account")
        .update({
            google_id: profileId,
        })
        .where({
            id: user.id,
        });
}

passport.use(
    "connect-google",
    new GoogleStrategy(
        {
            clientID: config.google.clientID,
            clientSecret: config.google.clientSecret,
            callbackURL: config.origin + "/connect/google/callback",
            passReqToCallback: true,
        },
        function (req, accessToken, refreshToken, profile, cb) {
            if (!req.user) {
                cb("Not logged in");
                return;
            }

            updateUserWithGoogleId(req.user, profile.id)
                .then(() => {
                    cb(null, req.user);
                })
                .catch((err) => {
                    cb(err);
                });
        }
    )
);

async function disconnectUserFromGoogleId(user) {
    await knex("user_account")
        .update({
            google_id: null,
        })
        .where({
            id: user.id,
        });
}

module.exports = function (app) {
    app.get(
        "/auth/google",
        passport.authenticate("google", { scope: ["profile"] })
    );

    app.get(
        "/auth/google/callback",
        passport.authenticate("google", {
            failureRedirect: "/login",
        }),
        (req, res) => {
            const isNewUser = req.flash("isNewUser").length > 0; // flash returns an array
            if (isNewUser) {
                res.redirect("/intro");
            } else {
                res.redirect("/me");
            }
        }
    );

    app.get(
        "/connect/google",
        passport.authenticate("connect-google", { scope: ["profile"] })
    );

    app.get(
        "/connect/google/callback",
        passport.authenticate("connect-google", {
            successRedirect: "/settings",
            failureRedirect: "/settings",
        })
    );

    app.post("/disconnect/google", function (req, res) {
        if (!req.user) {
            res.redirect("/login");
            return;
        }

        disconnectUserFromGoogleId(req.user)
            .then(() => {
                res.redirect("/settings");
            })
            .catch((err) => {
                req.flash("error", "Could not disconnect Google account.");
                res.redirect("/settings");
            });
    });
};
