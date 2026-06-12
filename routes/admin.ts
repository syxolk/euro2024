import { Router } from "express";
import { Request, Response } from "express";
import { knex } from "../db";
import { getUser } from "../request_helper";
import { localizedTeamNameExpr } from "./team_name";

const router = Router();

router.get("/admin", async (req: Request, res: Response) => {
    const teamNameExpr = localizedTeamNameExpr(req.language, "team");
    const homeTeamNameExpr = localizedTeamNameExpr(req.language, "home_team");
    const awayTeamNameExpr = localizedTeamNameExpr(req.language, "away_team");
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
            "match_type.name as match_type_name"
        )
        .whereNull("home_team_id")
        .whereNull("away_team_id")
        .orderBy("starts_at");

    const teams = await knex("team")
        .select("id", knex.raw(`${teamNameExpr} as name`), "code")
        .orderBy("code");

    const liveMatches = await knex("match")
        .select(
            "match.id as id",
            knex.raw(`${homeTeamNameExpr} as home_team_name`),
            knex.raw(`${awayTeamNameExpr} as away_team_name`),
            "starts_at",
            "match_type.name as match_type_name"
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
            "name",
            knex.raw(`
            (
                select coalesce(array_agg(row_to_json(t)), array[]::json[]) from (
                    select id, ${teamNameExpr} as name
                    from team
                    where team.id = any(extra_bet.team_ids)
                    order by ${teamNameExpr}
                ) t
            ) as teams
        `)
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
