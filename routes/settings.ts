import { Router } from "express";
import { Request, Response } from "express";

import config from "../config";
import { knex } from "../db";
import { getUser } from "../request_helper";

const router = Router();

router.get("/settings", (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user) {
        res.redirect("/login");
        return;
    }

    res.render("settings", {
        enabledFacebook: !!config.facebook,
        enabledGoogle: !!config.google,
        error: req.flash("error"),
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
