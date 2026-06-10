import { knex } from "../db";
import { Router } from "express";
import { Request, Response } from "express";
import { getUser } from "../request_helper";

const router = Router();

router.get("/friend", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user) {
        res.status(401).json({ ok: false, error: "AUTH" });
        return;
    }

    const friends = await knex("friend")
        .where({
            from_user_id: user.id,
        })
        .select("to_user_id");

    res.json({
        ok: true,
        data: friends.map((x) => x.to_user_id),
    });
});

router.post("/friend", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user) {
        res.status(401).json({ ok: false, error: "AUTH" });
        return;
    }

    await knex("friend").insert({
        from_user_id: user.id,
        to_user_id: req.body.id,
    });

    res.json({ ok: true });
});

router.delete("/friend/:id", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user) {
        res.status(401).json({ ok: false, error: "AUTH" });
        return;
    }

    await knex("friend")
        .where({
            from_user_id: user.id,
            to_user_id: req.params.id,
        })
        .del();

    res.json({ ok: true });
});

export default router;
