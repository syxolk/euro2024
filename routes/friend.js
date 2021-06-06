const { knex } = require("../db");

const router = require("express-promise-router")();
module.exports = router;

router.get("/friend", async (req, res) => {
    if (!req.user) {
        res.status(401).json({ ok: false, error: "AUTH" });
        return;
    }

    const friends = await knex("friend")
        .where({
            from_user_id: req.user.id,
        })
        .select("to_user_id");

    res.json({
        ok: true,
        data: friends.map((x) => x.to_user_id),
    });
});

router.post("/friend", async (req, res) => {
    if (!req.user) {
        res.status(401).json({ ok: false, error: "AUTH" });
        return;
    }

    await knex("friend").insert({
        from_user_id: req.user.id,
        to_user_id: req.body.id,
    });

    res.json({ ok: true });
});

router.delete("/friend/:id", async (req, res) => {
    if (!req.user) {
        res.status(401).json({ ok: false, error: "AUTH" });
        return;
    }

    await knex("friend").where({
        from_user_id: req.user.id,
        to_user_id: req.params.id,
    }).del();

    res.json({ ok: true });
});
