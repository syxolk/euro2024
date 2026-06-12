import { Router } from "express";
import { Request, Response } from "express";
import { knex } from "../db";
import { getUser } from "../request_helper";
import { localizedExtraBetNameExpr, localizedTeamNameExpr } from "./localized_name";

const router = Router();

router.get("/admin_extra_bet/:id", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user || user.admin !== true) {
        res.status(404).render("404");
        return;
    }

    const extraBet = await knex("extra_bet")
        .select(
            "id",
            knex.raw(`:localized as name`, {
                localized: localizedExtraBetNameExpr(req.language, "extra_bet"),
            }),
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
            knex.raw(`:localized as name`, {
                localized: localizedTeamNameExpr(req.language, "team"),
            }),
            "code",
            knex.raw(`(id = any(:ids)) as "isSelected"`, {
                ids: extraBet.teamIds,
            })
        )
        .orderByRaw(localizedTeamNameExpr(req.language, "team"));

    res.render("admin_extra_bet", { extraBet, teams });
});

router.post("/admin_extra_bet/:id", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user || user.admin !== true) {
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

export default router;
