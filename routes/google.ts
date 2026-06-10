import type { Router } from "express";
import { Request, Response } from "express";

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import config from "../config";
import { knex } from "../db";
import { getUser } from "../request_helper";

const USER_COLUMNS = [
    "id",
    "name",
    "email",
    "admin",
    "past_matches_last_visited_at",
    "google_id as googleId",
    "facebook_id as facebookId",
];

const googleConfig = config.google;

interface GoogleProfile {
    id: string;
    displayName: string;
}

interface GoogleUser {
    id: number;
}

async function getOrCreateUser(profile: GoogleProfile) {
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

if (googleConfig) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: googleConfig.clientID,
                clientSecret: googleConfig.clientSecret,
                callbackURL: config.origin + "/auth/google/callback",
                passReqToCallback: true,
            },
            function (req: Request, accessToken, refreshToken, profile, cb) {
                getOrCreateUser(profile as GoogleProfile)
                    .then(({ user, created }) => {
                        if (created) {
                            req.flash("isNewUser", "1");
                        }
                        cb(null, user);
                    })
                    .catch((err) => {
                        cb(err);
                    });
            }
        )
    );
}

async function updateUserWithGoogleId(user: GoogleUser, profileId: string) {
    await knex("user_account")
        .update({
            google_id: profileId,
        })
        .where({
            id: user.id,
        });
}

if (googleConfig) {
    passport.use(
        "connect-google",
        new GoogleStrategy(
            {
                clientID: googleConfig.clientID,
                clientSecret: googleConfig.clientSecret,
                callbackURL: config.origin + "/connect/google/callback",
                passReqToCallback: true,
            },
            function (req: Request, accessToken, refreshToken, profile, cb) {
                const user = getUser(req);
                if (!user) {
                    cb("Not logged in");
                    return;
                }

                updateUserWithGoogleId(user, (profile as GoogleProfile).id)
                    .then(() => {
                        cb(null, user);
                    })
                    .catch((err) => {
                        cb(err);
                    });
            }
        )
    );
}

async function disconnectUserFromGoogleId(user: GoogleUser) {
    await knex("user_account")
        .update({
            google_id: null,
        })
        .where({
            id: user.id,
        });
}

export default function registerGoogleRoutes(app: Router) {
    if (!googleConfig) {
        return;
    }

    app.get(
        "/auth/google",
        passport.authenticate("google", { scope: ["profile"] })
    );

    app.get(
        "/auth/google/callback",
        passport.authenticate("google", {
            failureRedirect: "/login",
        }),
        (req: Request, res: Response) => {
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

    app.post("/disconnect/google", function (req: Request, res: Response) {
        const user = getUser(req);
        if (!user) {
            res.redirect("/login");
            return;
        }

        disconnectUserFromGoogleId(user)
            .then(() => {
                res.redirect("/settings");
            })
            .catch(() => {
                req.flash("error", "Could not disconnect Google account.");
                res.redirect("/settings");
            });
    });
}
