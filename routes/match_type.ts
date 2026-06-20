import { Router } from "express";
import { Request, Response } from "express";

import { knex } from "../db";
import { getUser } from "../request_helper";
import {
    localizedMatchTypeNameExpr,
    localizedTeamNameExpr,
} from "./localized_name";

const router = Router();

interface MatchTypeBet {
    id: number;
    name: string;
    goals_home: number;
    goals_away: number;
    is_friend: boolean;
    is_me: boolean;
    score: number | null;
}

interface MatchTypeBetGroup {
    score: number;
    bets: MatchTypeBet[];
}

interface MatchTypeMatch {
    id: number;
    starts_at: Date;
    goals_home: number | null;
    goals_away: number | null;
    tv: string | null;
    placeholder_home: string | null;
    placeholder_away: string | null;
    home_team_name: string | null;
    away_team_name: string | null;
    home_team_code: string | null;
    away_team_code: string | null;
    is_started: boolean;
    all_bets: MatchTypeBet[];
    bet_groups?: MatchTypeBetGroup[];
}

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

    const matchesResult = (await knex.raw(
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
                    'score', case
                        when match.goals_home is not null and match.goals_away is not null
                            then calc_bet_score(
                                calc_bet_result(
                                    match.goals_home,
                                    match.goals_away,
                                    bet.goals_home,
                                    bet.goals_away
                                ),
                                match_type.score_factor
                            )
                        else null
                    end,
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
    )) as { rows: MatchTypeMatch[] };

    for (const match of matchesResult.rows) {
        if (match.goals_home === null || match.goals_away === null) {
            continue;
        }

        const groups = new Map<number, MatchTypeBet[]>();

        for (const bet of match.all_bets) {
            const score = bet.score ?? 0;
            const bets = groups.get(score) ?? [];
            bets.push(bet);
            groups.set(score, bets);
        }

        match.bet_groups = [...groups.entries()]
            .sort((a, b) => b[0] - a[0])
            .map(([score, bets]) => ({ score, bets }));
    }

    res.render("match_type", {
        matchType,
        matches: matchesResult.rows,
    });
});

export default router;
