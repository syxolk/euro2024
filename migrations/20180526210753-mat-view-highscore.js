'use strict';

module.exports = {
    up: (queryInterface, Sequelize, seq) => {
        return seq.query(`
            CREATE VIEW highscore AS
            WITH
            last_match AS (
                SELECT "when"
                FROM "Match" m
                WHERE "goalsHome" IS NOT NULL
                    AND "goalsAway" IS NOT NULL
                ORDER BY "when" DESC
                LIMIT 1
            ),
            bets_past AS (
                SELECT b."UserId" as id,
                sum(calc_bet_score(calc_bet_result(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway"), mt."scoreFactor")) as score
                FROM "Bet" as b
                JOIN "Match" as m ON m."id" = b."MatchId"
                JOIN "MatchType" as mt ON m."MatchTypeId" = mt.id
                WHERE (SELECT "when" FROM last_match) - '24 hours'::interval > m."when"
                GROUP BY b."UserId"
            ),
            bets AS (
                SELECT b."UserId" as id,
                sum(calc_bet_score(calc_bet_result(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway"), mt."scoreFactor")) as score,
                count(CASE WHEN calc_bet_result(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway") = 'correct'::bet_result THEN 1 END) as count3,
                count(CASE WHEN calc_bet_result(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway") = 'diff'::bet_result THEN 1 END) as count2,
                count(CASE WHEN calc_bet_result(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway") = 'winner'::bet_result THEN 1 END) as count1,
                count(CASE WHEN calc_bet_result(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway") = 'wrong'::bet_result THEN 1 END) as count0,
                sum(CASE WHEN calc_bet_result(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway") = 'correct'::bet_result THEN calc_bet_score('correct'::bet_result, mt."scoreFactor") END) as total3,
                sum(CASE WHEN calc_bet_result(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway") = 'diff'::bet_result THEN calc_bet_score('diff'::bet_result, mt."scoreFactor") END) as total2,
                sum(CASE WHEN calc_bet_result(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway") = 'winner'::bet_result THEN calc_bet_score('winner'::bet_result , mt."scoreFactor") END) as total1
                FROM "Bet" as b
                JOIN "Match" as m ON m."id" = b."MatchId"
                JOIN "MatchType" as mt ON m."MatchTypeId" = mt.id
                WHERE now() > m."when"  -- check if match is expired
                GROUP BY b."UserId"
            )
            SELECT "User"."name" as name,
            "User"."id" as id,
            coalesce(bets.score, 0) as score,
            coalesce(bets_past.score, 0) as score_past,
            coalesce(count3, 0) as count3,
            coalesce(count2, 0) as count2,
            coalesce(count1, 0) as count1,
            coalesce(count0, 0) as count0,
            coalesce(total3, 0) as total3,
            coalesce(total2, 0) as total2,
            coalesce(total1, 0) as total1,
            rank() over (order by coalesce(bets.score, 0) desc, coalesce(count3, 0) desc, coalesce(count2, 0) desc, coalesce(count1, 0) desc, coalesce(count0, 0) desc) as "rank",
            rank() over (order by coalesce(bets_past.score, 0) desc, coalesce(count3, 0) desc, coalesce(count2, 0) desc, coalesce(count1, 0) desc, coalesce(count0, 0) desc) as "rank_past"
            FROM "User"
            LEFT JOIN bets ON "User"."id" = bets.id
            LEFT JOIN bets_past ON "User".id = bets_past.id
        `, {raw: true});
    },

    down: (queryInterface, Sequelize) => {
        // TODO
    }
};
