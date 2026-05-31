import { Router } from "express";
import { Request, Response } from "express";

import config from "../config";
import { knex } from "../db";
import { getUser } from "../request_helper";

const router = Router();

router.get("/settings", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user) {
        res.redirect("/login");
        return;
    }

    const dbUser = await knex("user_account")
        .select("invite_code")
        .where({ id: user.id })
        .first();

    res.render("settings", {
        enabledFacebook: !!config.facebook,
        enabledGoogle: !!config.google,
        error: req.flash("error"),
        inviteCode: dbUser?.invite_code ?? null,
        inviteLink: dbUser?.invite_code
            ? config.origin + "/register?invite=" + dbUser.invite_code
            : null,
    });
});

router.post("/settings", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user) {
        res.redirect("/login");
        return;
    }

    await knex("user_account")
        .update({
            // Remove any leading/trailing whitespace
            name: req.body.name.trim(),
        })
        .where({ id: user.id });

    res.redirect("/settings");
});

export default router;
