import { Router } from "express";
import { Request, Response } from "express";
import { knex } from "../db";
import { getUser } from "../request_helper";
import {
    localizedExtraBetNameExpr,
    localizedMatchTypeNameExpr,
    localizedTeamNameExpr,
} from "./localized_name";

const router = Router();

router.get("/admin", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user || user.admin !== true) {
        res.status(404).render("404");
        return;
    }

    const matchesWithoutTeams = await knex("match")
        .join("match_type", "match_type.id", "match.match_type_id")
        .select(
            "match.id",
            "placeholder_home",
            "placeholder_away",
            "starts_at",
            knex.raw(`:localized as match_type_name`, {
                localized: localizedMatchTypeNameExpr(
                    req.language,
                    "match_type"
                ),
            })
        )
        .whereNull("home_team_id")
        .whereNull("away_team_id")
        .orderBy("starts_at");

    const teams = await knex("team")
        .select(
            "id",
            knex.raw(`:localized as name`, {
                localized: localizedTeamNameExpr(req.language, "team"),
            }),
            "code"
        )
        .orderBy("code");

    const liveMatches = await knex("match")
        .select(
            "match.id as id",
            knex.raw(`:localized as home_team_name`, {
                localized: localizedTeamNameExpr(req.language, "home_team"),
            }),
            knex.raw(`:localized as away_team_name`, {
                localized: localizedTeamNameExpr(req.language, "away_team"),
            }),
            "starts_at",
            knex.raw(`:localized as match_type_name`, {
                localized: localizedMatchTypeNameExpr(req.language, "match_type"),
            })
        )
        .whereRaw("starts_at < now()")
        .whereNull("goals_home")
        .whereNull("goals_away")
        .join("team as home_team", "home_team.id", "match.home_team_id")
        .join("team as away_team", "away_team.id", "match.away_team_id")
        .join("match_type", "match_type.id", "match.match_type_id")
        .orderBy("match.starts_at");

    const extraBets = await knex("extra_bet")
        .select(
            "id",
            knex.raw(`:localized as name`, {
                localized: localizedExtraBetNameExpr(req.language, "extra_bet"),
            }),
            knex.raw(
                `
                (
                    select coalesce(array_agg(row_to_json(t)), array[]::json[]) from (
                        select id, :localized as name
                        from team
                        where team.id = any(extra_bet.team_ids)
                        order by :localized
                    ) t
                ) as teams
                `,
                {
                    localized: localizedTeamNameExpr(req.language, "team"),
                }
            )
        )
        .orderBy("id");

    res.render("admin", {
        matchesWithoutTeams,
        teams,
        liveMatches,
        extraBets,
        message: req.flash("message"),
        error: req.flash("error"),
    });
});

router.post("/admin", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user || user.admin !== true) {
        res.redirect("/admin");
        return;
    }

    if (req.body.command === "set_teams") {
        const matchId = parseInt(req.body.match);

        await knex("match")
            .update({
                home_team_id: parseInt(req.body.home),
                away_team_id: parseInt(req.body.away),
            })
            .where({
                id: matchId,
            });

        req.flash("message", "Match " + matchId + " teams set.");
        res.redirect("/admin");
    } else if (req.body.command === "match_result") {
        await knex("match")
            .update({
                goals_home: parseInt(req.body.home),
                goals_away: parseInt(req.body.away),
                goals_inserted_at: knex.fn.now(),
            })
            .where({
                id: parseInt(req.body.match),
            });

        req.flash("message", "Match " + req.body.match + " was updated.");
        res.redirect("/admin");
    } else {
        req.flash("error", "Unknown command");
        res.redirect("/admin");
    }
});

export default router;
