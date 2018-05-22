'use strict';

module.exports = {
    up: (queryInterface, Sequelize, seq) => {
        return seq.transaction((t) => {
            return queryInterface.addColumn("MatchType", "scoreFactor", {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 1
            }, {transaction: t}).then(() => {
                return seq.query(`
                    UPDATE "MatchType" SET "scoreFactor" = 2 WHERE code = 'R16';
                    UPDATE "MatchType" SET "scoreFactor" = 3 WHERE code = 'QF';
                    UPDATE "MatchType" SET "scoreFactor" = 4 WHERE code = 'SF';
                    UPDATE "MatchType" SET "scoreFactor" = 6 WHERE code = 'TP';
                    UPDATE "MatchType" SET "scoreFactor" = 6 WHERE code = 'F';
                `, {raw: true, transaction: t});
            }).then(() => {
                return seq.query(`
                    CREATE TYPE bet_result AS ENUM (
                        'correct',  -- Correct bet (e.g. betted 4:3 and the match result was 4:3)
                        'diff',     -- Correct goal difference (e.g. betted 4:3 and the match result was 1:0, 2:1, 3:2, 4:3 ...)
                        'winner',   -- Correct match winner (e.g. betted 4:3 and the match winner was the home team)
                        'wrong'     -- Anything else
                    );

                    CREATE OR REPLACE FUNCTION calc_bet_result(match_home integer, match_away integer, bet_home integer, bet_away integer) RETURNS bet_result AS
                    $$
                    SELECT CASE
                    WHEN match_home = bet_home AND match_away = bet_away THEN 'correct'::bet_result
                    WHEN match_home - match_away = bet_home - bet_away THEN 'diff'::bet_result
                    WHEN sign(match_home - match_away) = sign(bet_home - bet_away) THEN 'winner'::bet_result
                    ELSE 'wrong'::bet_result
                    END
                    $$
                    LANGUAGE SQL IMMUTABLE RETURNS NULL ON NULL INPUT;

                    CREATE OR REPLACE FUNCTION calc_bet_score(res bet_result, score_factor integer) RETURNS integer AS
                    $$
                    SELECT CASE res
                    WHEN 'correct'::bet_result THEN 4 * score_factor
                    WHEN 'diff'::bet_result    THEN 3 * score_factor
                    WHEN 'winner'::bet_result  THEN 2 * score_factor
                    ELSE 0
                    END
                    $$
                    LANGUAGE SQL IMMUTABLE RETURNS NULL ON NULL INPUT;

                    CREATE OR REPLACE VIEW score_table
                    AS WITH bets AS (
                    SELECT b."UserId" as id,
                    sum(calc_bet_score(calc_bet_result(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway"), mt."scoreFactor")) as score,
                    count(CASE WHEN calc_bet_result(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway") = 'correct'::bet_result THEN 1 END) as count3,
                    count(CASE WHEN calc_bet_result(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway") = 'diff'::bet_result THEN 1 END) as count2,
                    count(CASE WHEN calc_bet_result(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway") = 'winner'::bet_result THEN 1 END) as count1,
                    count(CASE WHEN calc_bet_result(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway") = 'wrong'::bet_result THEN 1 END) as count0,
                    sum(CASE WHEN calc_bet_result(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway") = 'correct'::bet_result THEN mt."scoreFactor" END) as total3,
                    sum(CASE WHEN calc_bet_result(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway") = 'diff'::bet_result THEN mt."scoreFactor" END) as total2,
                    sum(CASE WHEN calc_bet_result(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway") = 'winner'::bet_result THEN mt."scoreFactor" END) as total1,
                    sum(CASE WHEN calc_bet_result(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway") = 'wrong'::bet_result THEN mt."scoreFactor" END) as total0
                    FROM "Bet" as b
                    JOIN "Match" as m ON m."id" = b."MatchId"
                    JOIN "MatchType" as mt ON m."MatchTypeId" = mt.id
                    WHERE now() > m."when"  -- check if match is expired
                    GROUP BY b."UserId"
                    )
                    SELECT "User"."name" as name,
                    "User"."id" as id, coalesce(bets.score, 0) as score,
                    coalesce(count3, 0) as count3,
                    coalesce(count2, 0) as count2,
                    coalesce(count1, 0) as count1,
                    coalesce(count0, 0) as count0,
                    coalesce(total3, 0) as total3,
                    coalesce(total2, 0) as total2,
                    coalesce(total1, 0) as total1,
                    coalesce(total0, 0) as total0
                    FROM "User" LEFT JOIN bets ON "User"."id" = bets.id;
                `, {raw: true, transaction: t});
            });
        });
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.removeColumn("MatchType", "scoreFactor");
    }
};
