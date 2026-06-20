import { Router } from "express";
import { Request, Response } from "express";

import { knex } from "../db";
import { getUser } from "../request_helper";
import {
    localizedMatchTypeNameExpr,
    localizedTeamNameExpr,
} from "./localized_name";

const router = Router();

router.get("/match_type/:code", async (req: Request, res: Response) => {
    const user = getUser(req);
    const matchTypeCode = String(req.params.code).trim();

    const matchType = await knex("match_type")
        .select(
            "code",
            knex.raw(`:localized as name`, {
                localized: localizedMatchTypeNameExpr(
                    req.language,
                    "match_type"
                ),
            }),
            "score_factor as scoreFactor"
        )
        .where({ code: matchTypeCode })
        .first();

    if (!matchType) {
        res.status(404).render("404");
        return;
    }

    const matchesResult = await knex.raw(
        `
        select
            match.id,
            match.starts_at,
            match.goals_home,
            match.goals_away,
            match.tv,
            placeholder_home,
            placeholder_away,
            :localizedHomeTeam as home_team_name,
            :localizedAwayTeam as away_team_name,
            home_team.code as home_team_code,
            away_team.code as away_team_code,
            (match.starts_at < now()) as is_started,
            (
                select coalesce(array_agg(jsonb_build_object(
                    'id', user_account.id,
                    'name', user_account.name,
                    'goals_home', bet.goals_home,
                    'goals_away', bet.goals_away,
                    'is_friend', user_account.id in (
                        select to_user_id from friend where from_user_id = :userId
                    ),
                    'is_me', user_account.id = :userId
                ) order by user_account.name asc), array[]::jsonb[])
                from bet
                join user_account on (user_account.id = bet.user_id)
                where bet.match_id = match.id
                and not user_account.is_bot
                and match.starts_at < now()
            ) as all_bets
        from match
        join match_type on (match_type.id = match.match_type_id)
        left join team as home_team on (home_team.id = match.home_team_id)
        left join team as away_team on (away_team.id = match.away_team_id)
        where match_type.code = :matchTypeCode
        order by match.starts_at asc, match.id asc
    `,
        {
            matchTypeCode,
            userId: user?.id ?? 0,
            localizedHomeTeam: localizedTeamNameExpr(req.language, "home_team"),
            localizedAwayTeam: localizedTeamNameExpr(req.language, "away_team"),
        }
    );

    res.render("match_type", {
        matchType,
        matches: matchesResult.rows,
    });
});

export default router;