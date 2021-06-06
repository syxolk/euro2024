const { knex } = require("../db");

const router = require("express-promise-router")();
module.exports = router;

router.post("/save_bet", async (req, res) => {
    if (!req.user) {
        res.status(401).json({ ok: false, error: "AUTH" });
        return;
    }

    const match = await knex("match")
        .select("id", "starts_at", "home_team_id", "away_team_id")
        .where({
            id: req.body.match,
        })
        .first();

    if (match === undefined) {
        res.status(404).json({ ok: false, error: "MATCH_NOT_FOUND" });
        return;
    }

    if (Date.now() > match.starts_at.getTime()) {
        res.status(403).json({ ok: false, error: "MATCH_EXPIRED" });
        return;
    }

    if (match.home_team_id === null || match.away_team_id === null) {
        res.status(403).json({
            ok: false,
            error: "MATCH_TEAMS_UNKNOWN",
        });
        return;
    }

    if (req.body.home && req.body.away) {
        await knex("bet")
            .insert({
                user_id: req.user.id,
                match_id: req.body.match,
                goals_home: req.body.home,
                goals_away: req.body.away,
            })
            .onConflict(["user_id", "match_id"])
            .merge();

        res.json({ ok: true });
    } else {
        await knex("bet")
            .where({
                user_id: req.user.id,
                match_id: req.body.match,
            })
            .del();

        res.json({ ok: true });
    }
});
