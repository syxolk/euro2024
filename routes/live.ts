import { Router } from "express";
import { Request, Response } from "express";

import { knex } from "../db";
import { getUser } from "../request_helper";
import {
    localizedMatchTypeNameExpr,
    localizedTeamNameExpr,
} from "./localized_name";

const router = Router();

interface MatchBetEntry {
    name: string;
    goalsHome: number;
    goalsAway: number;
    id: number;
    friend: boolean;
    me: boolean;
}

interface LiveMatchRow {
    id: number;
    starts_at: Date;
    matchtype: string;
    hometeam: string;
    awayteam: string;
    home_team_code: string | null;
    away_team_code: string | null;
    countbets: string | number;
    winnerhome: number;
    winneraway: number;
    avghome: number | null;
    avgaway: number | null;
    tv: string | null;
    score_factor: number;
    listhome: number[];
    listaway: number[];
    listname: string[];
    listid: number[];
    listfriends: boolean[];
    listme: boolean[];
    draw?: number;
    bets?: {
        home: MatchBetEntry[];
        draw: MatchBetEntry[];
        away: MatchBetEntry[];
    };
}

interface FriendWithoutBet {
    id: number;
    name: string;
}

interface NextMatchRow {
    match_type_name: string;
    tv: string | null;
    match_type_score_factor: number;
    starts_at: Date;
    home_team_name: string | null;
    away_team_name: string | null;
    home_team_code: string | null;
    away_team_code: string | null;
    placeholder_home: string | null;
    placeholder_away: string | null;
    bet_count: string | number;
    friends_without_bet: FriendWithoutBet[];
}

router.get("/live", async (req: Request, res: Response) => {
    const user = getUser(req);
    const userId = user?.id ?? 0;

    const matchesResult = (await knex.raw(
        `
        SELECT match.id as id,
        match.starts_at as starts_at,
        (SELECT :localizedMatchType FROM match_type WHERE match_type.id = match.match_type_id) as matchtype,
        (SELECT :localizedHomeTeam FROM team WHERE team.id = match.home_team_id) as hometeam,
        (SELECT :localizedAwayTeam FROM team WHERE team.id = match.away_team_id) as awayteam,
        (SELECT code FROM team WHERE team.id = match.home_team_id) as home_team_code,
        (SELECT code FROM team WHERE team.id = match.away_team_id) as away_team_code,
        count(bet.id) as countbets,
        round(100.0 * count(CASE WHEN bet.goals_home > bet.goals_away THEN 1 END) / count(bet.id)) as winnerhome,
        round(100.0 * count(CASE WHEN bet.goals_home < bet.goals_away THEN 1 END) / count(bet.id)) as winneraway,
        avg(bet.goals_home) as avghome,
        avg(bet.goals_away) as avgaway,
        match.tv as tv,
        (SELECT score_factor FROM match_type WHERE match_type.id = match.match_type_id) as score_factor,
        array_agg(bet.goals_home order by user_account.name asc) as listhome,
        array_agg(bet.goals_away order by user_account.name asc) as listaway,
        array_agg(user_account.name order by user_account.name asc) as listname,
        array_agg(user_account.id order by user_account.name asc) as listid,
        array_agg(user_account.id in (SELECT to_user_id FROM friend WHERE from_user_id = :id) order by user_account.name asc) as listfriends,
        array_agg(user_account.id = :id order by user_account.name asc) as listme
        FROM match
        -- No LEFT JOIN here to discard matches without bets (and prevent division by zero)
        JOIN bet ON match.id = bet.match_id
        JOIN user_account ON user_account.id = bet.user_id
        WHERE now() > match.starts_at
        AND match.goals_home IS NULL
        AND match.goals_away IS NULL
        AND NOT user_account.is_bot
        GROUP BY match.id;
    `,
        {
            id: userId,
            localizedMatchType: localizedMatchTypeNameExpr(
                req.language,
                "match_type"
            ),
            localizedHomeTeam: localizedTeamNameExpr(req.language, "team"),
            localizedAwayTeam: localizedTeamNameExpr(req.language, "team"),
        }
    )) as { rows: LiveMatchRow[] };

    for (const match of matchesResult.rows) {
        match.draw = 100 - match.winnerhome - match.winneraway;
        match.bets = { home: [], draw: [], away: [] };

        for (let index = 0; index < match.listid.length; index += 1) {
            const betType =
                match.listhome[index] > match.listaway[index]
                    ? "home"
                    : match.listhome[index] < match.listaway[index]
                      ? "away"
                      : "draw";

            match.bets[betType].push({
                name: match.listname[index],
                goalsHome: match.listhome[index],
                goalsAway: match.listaway[index],
                id: match.listid[index],
                friend: match.listfriends[index],
                me: match.listme[index],
            });
        }
    }

    const nextMatchesResult = (await knex.raw(
        `
        select
            :localizedMatchType as match_type_name,
            tv,
            match_type.score_factor as match_type_score_factor,
            starts_at,
            :localizedHomeTeam as home_team_name,
            :localizedAwayTeam as away_team_name,
            home_team.code as home_team_code,
            away_team.code as away_team_code,
            placeholder_home,
            placeholder_away,
            (
                select count(*)
                from bet
                join user_account on (user_account.id = bet.user_id)
                where bet.match_id = match.id
                and not user_account.is_bot
            ) as bet_count,
            (
                select coalesce(array_agg(jsonb_build_object(
                    'id', user_account.id,
                    'name', user_account.name
                )), array[]::jsonb[])
                from user_account
                join friend on (friend.to_user_id = user_account.id)
                where friend.from_user_id = :id
                and not user_account.is_bot
                and
                    not exists (
                        select 1
                        from bet
                        where bet.user_id = user_account.id
                        and bet.match_id = match.id
                    )
            ) as friends_without_bet
        from match
        left join team as home_team on (home_team.id = match.home_team_id)
        left join team as away_team on (away_team.id = match.away_team_id)
        join match_type on (match_type.id = match.match_type_id)
        where starts_at > now()
        order by match.starts_at asc
        limit 4
    `,
        {
            id: userId,
            localizedMatchType: localizedMatchTypeNameExpr(
                req.language,
                "match_type"
            ),
            localizedHomeTeam: localizedTeamNameExpr(req.language, "home_team"),
            localizedAwayTeam: localizedTeamNameExpr(req.language, "away_team"),
        }
    )) as { rows: NextMatchRow[] };

    res.render("live", {
        matches: matchesResult.rows,
        nextMatches: nextMatchesResult.rows,
        is_logged_in: Boolean(user),
    });
});

export default router;
