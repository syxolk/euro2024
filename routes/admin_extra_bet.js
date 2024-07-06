const { knex } = require("../db");
const router = require("express-promise-router")();

module.exports = router;

router.get("/admin_extra_bet/:id", async (req, res) => {
    if (!req.user || req.user.admin !== true) {
        res.status(404).render("404");
        return;
    }

    const extraBet = await knex("extra_bet")
        .select(
            "id",
            "name",
            "number_of_teams as numberOfTeams",
            "score_factor as scoreFactor",
            knex.raw(`(editable_until > now()) as "isEditable"`),
            knex.raw(`team_ids as "teamIds"`)
        )
        .where({
            id: req.params.id,
        })
        .first();

    if (extraBet === undefined) {
        res.status(404).render("404");
        return;
    }

    const teams = await knex("team")
        .select(
            "id",
            "name",
            "code",
            knex.raw(`(id = any(:ids)) as "isSelected"`, {
                ids: extraBet.teamIds,
            })
        )
        .orderBy("name");

    res.render("admin_extra_bet", { extraBet, teams });
});

router.post("/admin_extra_bet/:id", async (req, res) => {
    if (!req.user || req.user.admin !== true) {
        res.redirect("/login");
        return;
    }

    const extraBet = await knex("extra_bet")
        .select("number_of_teams as numberOfTeams")
        .where({
            id: req.params.id,
        })
        .first();

    if (extraBet === undefined) {
        res.status(404).json({ error: "not found" });
        return;
    }

    let teamIdsToSelect = [];

    const PREFIX = "team_";

    for (const key of Object.keys(req.body)) {
        if (key.startsWith(PREFIX)) {
            teamIdsToSelect.push(parseInt(key.slice(PREFIX.length), 10));
        }
    }

    teamIdsToSelect = teamIdsToSelect.slice(0, extraBet.numberOfTeams);

    await knex("extra_bet")
        .update({
            team_ids: teamIdsToSelect,
        })
        .where({
            id: req.params.id,
        });

    res.redirect("/admin");
});
