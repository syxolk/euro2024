import { Router } from "express";
import { Request, Response } from "express";

import { getLocalDateKey } from "../date_time";
import { knex } from "../db";
import { getUser } from "../request_helper";
import {
    localizedExtraBetNameExpr,
    localizedMatchTypeNameExpr,
    localizedTeamNameExpr,
} from "./localized_name";

const router = Router();

router.get("/mybets", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user) {
        res.redirect("/login");
        return;
    }

    const matches = await knex("match")
        .select(
            "match.id as id",
            knex.raw(`:localized as home_team_name`, {
                localized: localizedTeamNameExpr(req.language, "home_team"),
            }),
            knex.raw(`:localized as away_team_name`, {
                localized: localizedTeamNameExpr(req.language, "away_team"),
            }),
            "home_team.code as home_team_code",
            "away_team.code as away_team_code",
            "placeholder_home",
            "placeholder_away",
            "starts_at",
            "bet.goals_home as bet_goals_home",
            "bet.goals_away as bet_goals_away",
            "match_type.code as match_type_code",
            knex.raw(`:localized as match_type_name`, {
                localized: localizedMatchTypeNameExpr(req.language, "match_type"),
            }),
            "match_type.score_factor as match_type_score_factor",
            knex.raw(
                `(
                    match.home_team_id is not null
                    and match.away_team_id is not null
                ) as has_teams`
            )
        )
        .whereRaw("starts_at > now()")
        .joinRaw(
            `left join bet on (bet.match_id = match.id and bet.user_id = ?)`,
            [user.id]
        )
        .leftJoin("team as home_team", "home_team.id", "match.home_team_id")
        .leftJoin("team as away_team", "away_team.id", "match.away_team_id")
        .join("match_type", "match_type.id", "match.match_type_id")
        .orderBy("starts_at")
        .orderBy("id");

    const matchesPerDayMap = new Map();

    for (const m of matches) {
        const date = getLocalDateKey(m.starts_at);

        let list = matchesPerDayMap.get(date);
        if (list === undefined) {
            list = [];
            matchesPerDayMap.set(date, list);
        }
        list.push(m);
    }

    const matchesPerDayList = [...matchesPerDayMap.entries()]
        .map(([date, matches]) => ({ date, matches }))
        .sort((a, b) => a.date.localeCompare(b.date));

    const extraBets = await knex("extra_bet")
        .joinRaw(
            `
            left join user_account_extra_bet on (
                user_account_extra_bet.extra_bet_id = extra_bet.id
                and user_account_extra_bet.user_id = :userId
            )
        `,
            {
                userId: user.id,
            }
        )
        .select(
            "id",
            knex.raw(`:localized as name`, {
                localized: localizedExtraBetNameExpr(req.language, "extra_bet"),
            }),
            "number_of_teams as numberOfTeams",
            "editable_until as editableUntil",
            "score_factor as scoreFactor",
            knex.raw(`(editable_until > now()) as "isEditable"`),
            knex.raw(`
            (
                select coalesce(array_agg(jsonb_build_object(
                    'id', team.id,
                    'name', :localized,
                    'code', team.code
                ) order by :localized), array[]::jsonb[])
                from team
                join unnest(selected_team_ids) as st(id) on (
                    team.id = st.id
                )
            ) as "selectedTeams"
            `, {
                localized: localizedTeamNameExpr(req.language, "team"),
            })
        )
        .whereRaw("editable_until > now()");

    res.render("mybets", { matchesPerDayList, extraBets });
});

export default router;
