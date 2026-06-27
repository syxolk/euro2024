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

function isBetPlacedAndMatchFinished(match: {
    bet_goals_home: number | null;
    bet_goals_away: number | null;
    match_goals_home: number | null;
    match_goals_away: number | null;
}) {
    return (
        match.bet_goals_home !== null &&
        match.bet_goals_away !== null &&
        match.match_goals_home !== null &&
        match.match_goals_away !== null
    );
}

function isCorrectWinnerOrDraw(result: string) {
    return result === "correct" || result === "diff" || result === "winner";
}

router.get("/user/:id", async (req: Request, res: Response) => {
    const user = parseInt(String(req.params.id), 10);

    if (!Number.isInteger(user)) {
        res.status(404).render("404");
        return;
    }

    const displayedUser = await knex("highscore")
        .select("id", "name", "score", "rank")
        .where({
            id: user,
        })
        .first();

    if (displayedUser === undefined) {
        res.status(404).render("404");
        return;
    }

    const matches = await knex("match")
        .whereRaw("starts_at < now()")
        .select(
            "match.goals_home as match_goals_home",
            "match.goals_away as match_goals_away",
            "bet.goals_home as bet_goals_home",
            "bet.goals_away as bet_goals_away",
            knex.raw(`:localized as home_team_name`, {
                localized: localizedTeamNameExpr(req.language, "home_team"),
            }),
            knex.raw(`:localized as away_team_name`, {
                localized: localizedTeamNameExpr(req.language, "away_team"),
            }),
            "home_team.code as home_team_code",
            "away_team.code as away_team_code",
            knex.raw(`:localized as match_type_name`, {
                localized: localizedMatchTypeNameExpr(
                    req.language,
                    "match_type"
                ),
            }),
            "match_type.code as match_type_code",
            "match_type.score_factor as match_type_score_factor",
            "starts_at",
            knex.raw(
                `coalesce(
                    calc_bet_result(match.goals_home, match.goals_away, bet.goals_home, bet.goals_away),
                    'wrong'::bet_result
                ) as result`
            ),
            knex.raw(`
                calc_bet_score(
                    calc_bet_result(
                        match.goals_home, match.goals_away, bet.goals_home, bet.goals_away
                    ),
                    match_type.score_factor
                ) as score
            `)
        )
        .joinRaw(
            `left join bet on (bet.match_id = match.id and bet.user_id = ?)`,
            [user]
        )
        .join("team as home_team", "home_team.id", "match.home_team_id")
        .join("team as away_team", "away_team.id", "match.away_team_id")
        .join("match_type", "match_type.id", "match.match_type_id")
        .orderBy("starts_at", "desc")
        .orderBy("match.id", "desc");

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
        .sort((a, b) => b.date.localeCompare(a.date));

    const placedBets = matches.filter(isBetPlacedAndMatchFinished);
    const accurateBets = placedBets.filter((match) =>
        isCorrectWinnerOrDraw(match.result)
    );
    const accuracy =
        placedBets.length === 0
            ? null
            : {
                  correct: accurateBets.length,
                  total: placedBets.length,
                  percent: Number(
                      ((accurateBets.length / placedBets.length) * 100).toFixed(1)
                  ),
              };

    const commonBetsMap = new Map<string, number>();
    for (const match of placedBets) {
        const betKey = `${match.bet_goals_home}:${match.bet_goals_away}`;
        commonBetsMap.set(betKey, (commonBetsMap.get(betKey) ?? 0) + 1);
    }

    const betDistribution = [...commonBetsMap.entries()]
        .map(([bet, count]) => {
            const [goalsHome, goalsAway] = bet.split(":").map(Number);

            return {
                bet,
                count,
                goalsHome,
                goalsAway,
            };
        })
        .sort((a, b) => {
            if (b.count !== a.count) {
                return b.count - a.count;
            }
            if (a.goalsHome !== b.goalsHome) {
                return a.goalsHome - b.goalsHome;
            }
            return a.goalsAway - b.goalsAway;
        });

    const extraBets = await knex("extra_bet")
        .join(
            "user_account_extra_bet",
            "user_account_extra_bet.extra_bet_id",
            "extra_bet.id"
        )
        .where({
            "user_account_extra_bet.user_id": user,
        })
        .whereRaw("editable_until < now()")
        .select(
            "id",
            knex.raw(`:localized as name`, {
                localized: localizedExtraBetNameExpr(req.language, "extra_bet"),
            }),
            "score_factor as scoreFactor",
            knex.raw(`
                cardinality(array_intersect(extra_bet.team_ids, user_account_extra_bet.selected_team_ids)) as "numberOfCorrectTeams"
            `),
            knex.raw(`
                cardinality(array_intersect(extra_bet.team_ids, user_account_extra_bet.selected_team_ids)) * score_factor as "totalScore"
            `),
            knex.raw(
                `(
                select coalesce(array_agg(row_to_json(t)), array[]::json[]) from (
                    select id, :localized as name, code, (team.id = any(extra_bet.team_ids)) as "isCorrect"
                    from team
                    where team.id = any(user_account_extra_bet.selected_team_ids)
                    order by :localized
                ) t
            ) as teams`,
                {
                    localized: localizedTeamNameExpr(req.language, "team"),
                }
            )
        )
        .orderBy("id");

    res.render("user", {
        displayedUser,
        matchesPerDayList,
        accuracy,
        betDistribution,
        extraBets,
    });
});

router.get("/friend_history", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user) {
        return res.status(403).json({
            ok: false,
            error: "AUTH",
        });
    }

    const friends = await knex("friend")
        .where({ from_user_id: user.id })
        .select("to_user_id");

    const userIds = [user.id, ...friends.map((x) => x.to_user_id)];

    const users = await knex("user_account")
        .select("id", "name")
        .whereIn("id", userIds);

    const scoresList = await Promise.all(
        users.map((user) => {
            return knex("match")
                .select(
                    "home_team.code as home_team_code",
                    "away_team.code as away_team_code",
                    knex.raw(`
                        coalesce(
                            calc_bet_score(
                                calc_bet_result(match.goals_home, match.goals_away, bet.goals_home, bet.goals_away),
                                match_type.score_factor
                            ),
                            0
                        ) as score
                    `)
                )
                .whereRaw("match.starts_at < now()")
                .whereNotNull("match.goals_home")
                .whereNotNull("match.goals_away")
                .joinRaw(
                    `left join bet on (bet.match_id = match.id and bet.user_id = ?)`,
                    [user.id]
                )
                .join("team as home_team", "home_team.id", "match.home_team_id")
                .join("team as away_team", "away_team.id", "match.away_team_id")
                .join("match_type", "match_type.id", "match.match_type_id")
                .orderBy("match.starts_at")
                .orderBy("match.id");
        })
    );

    const extraBets = await knex("extra_bet")
        .select(
            "id",
            knex.raw(`:localized as name`, {
                localized: localizedExtraBetNameExpr(req.language, "extra_bet"),
            })
        )
        .whereRaw("editable_until < now()")
        .whereRaw("cardinality(team_ids) > 0")
        .orderBy("score_factor");

    const extraBetScores = await knex("extra_bet")
        .join(
            "user_account_extra_bet",
            "user_account_extra_bet.extra_bet_id",
            "extra_bet.id"
        )
        .whereIn("user_account_extra_bet.user_id", userIds)
        .whereIn(
            "extra_bet.id",
            extraBets.map((x) => x.id)
        )
        .groupBy("user_account_extra_bet.user_id", "extra_bet.id")
        .select(
            "user_account_extra_bet.user_id as userId",
            "extra_bet.id as extraBetId",
            knex.raw(
                `sum(cardinality(array_intersect(user_account_extra_bet.selected_team_ids, extra_bet.team_ids)) * score_factor)::integer as total`
            )
        );

    const extraBetScoresMap = new Map(
        extraBetScores.map((u) => [`${u.userId}|${u.extraBetId}`, u.total])
    );

    const result = {
        labels: [
            ...scoresList[0].map(
                (row) => `${row.home_team_code} ${row.away_team_code}`
            ),
            ...extraBets.map((x) => x.name),
        ],
        data: users.map((user, index) => {
            return {
                id: user.id,
                name: user.name,
                scores: [
                    ...scoresList[index].map((row) => row.score),
                    ...extraBets.map(
                        (b) => extraBetScoresMap.get(`${user.id}|${b.id}`) ?? 0
                    ),
                ],
            };
        }),
    };

    res.json({
        ok: true,
        data: result.data,
        labels: result.labels,
    });
});

export default router;
