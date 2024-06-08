const { knex } = require("../db");

const router = require("express-promise-router")();
module.exports = router;

router.post("/extra_bet/:id", async (req, res) => {
    if (!req.user) {
        res.redirect("/login");
        return;
    }

    const extraBet = await knex("extra_bet")
        .select(
            "number_of_teams as numberOfTeams",
            knex.raw(`(editable_until > now()) as "isEditable"`)
        )
        .where({
            id: req.params.id,
        })
        .first();

    if (extraBet === undefined) {
        res.status(404).json({ error: "not found" });
        return;
    }

    if (!extraBet.isEditable) {
        res.status(404).json({ error: "not editable anymore" });
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

    await knex("user_account_extra_bet")
        .insert({
            user_id: req.user.id,
            extra_bet_id: req.params.id,
            selected_team_ids: teamIdsToSelect,
        })
        .onConflict(["user_id", "extra_bet_id"])
        .merge(["selected_team_ids"]);

    res.redirect("/mybets");
});

router.get("/extra_bet/:id", async (req, res) => {
    if (!req.user) {
        res.redirect("/login");
        return;
    }

    const extraBet = await knex("extra_bet")
        .joinRaw(
            `
            left join user_account_extra_bet on (
                user_account_extra_bet.extra_bet_id = extra_bet.id
                and user_account_extra_bet.user_id = :userId
            )
        `,
            {
                userId: req.user.id,
            }
        )
        .select(
            "id",
            "name",
            "number_of_teams as numberOfTeams",
            "score_factor as scoreFactor",
            knex.raw(`(editable_until > now()) as "isEditable"`),
            knex.raw(`selected_team_ids as "selectedTeamIds"`)
        )
        .where({
            id: req.params.id,
        })
        .first();

    if (extraBet === undefined) {
        res.status(404).json({ error: "not found" });
        return;
    }

    const teams = await knex("team")
        .select(
            "id",
            "name",
            "code",
            knex.raw(`(id = any(:ids)) as "isSelected"`, {
                ids: extraBet.selectedTeamIds,
            })
        )
        .orderBy("name");

    res.render("extra_bet", { extraBet, teams });
});
