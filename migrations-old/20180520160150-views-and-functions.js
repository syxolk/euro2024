'use strict';

module.exports = {
    up: (queryInterface, Sequelize, seq) => {
        return seq.query(`
            CREATE OR REPLACE FUNCTION calc_score(match_home integer, match_away integer, bet_home integer, bet_away integer) RETURNS integer AS
            $$
            SELECT CASE
            WHEN match_home = bet_home AND match_away = bet_away THEN 4            -- 4 points for correct result
            WHEN match_home - match_away = bet_home - bet_away THEN 3              -- 3 points for correct goal difference
            WHEN sign(match_home - match_away) = sign(bet_home - bet_away) THEN 2  -- 2 point for correct winner
            ELSE 0
            END
            $$
            LANGUAGE SQL IMMUTABLE RETURNS NULL ON NULL INPUT;

            CREATE OR REPLACE FUNCTION user_rank_history(user_id integer, lookback integer) RETURNS integer AS
            $$
            WITH ranks as (SELECT array(
            SELECT rank FROM "History"
            JOIN "Match" ON ("History"."MatchId" = "Match".id)
            WHERE "History"."UserId" = user_id ORDER BY "Match"."when" DESC LIMIT lookback) AS x)
            SELECT x[array_length(x,1)] - x[1]  FROM ranks;
            $$
            LANGUAGE SQL STABLE RETURNS NULL ON NULL INPUT;

            CREATE OR REPLACE VIEW score_table
            AS WITH bets AS (
            SELECT b."UserId" as id,
            sum(calc_score(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway")) as score,
            count(CASE WHEN calc_score(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway") = 4 THEN 1 END) as count3,
            count(CASE WHEN calc_score(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway") = 3 THEN 1 END) as count2,
            count(CASE WHEN calc_score(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway") = 2 THEN 1 END) as count1,
            count(CASE WHEN calc_score(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway") = 0 THEN 1 END) as count0
            FROM "Bet" as b
            JOIN "Match" as m ON m."id" = b."MatchId"
            WHERE now() > m."when"  -- check if match is expired
            GROUP BY b."UserId"
            )
            SELECT "User"."name" as name,
            "User"."id" as id, coalesce(bets.score, 0) as score,
            coalesce(count3, 0) as count3, coalesce(count2, 0) as count2,
            coalesce(count1, 0) as count1, coalesce(count0, 0) as count0
            FROM "User" LEFT JOIN bets ON "User"."id" = bets.id;

            CREATE OR REPLACE FUNCTION set_match_result(match_id integer, goals_home integer, goals_away integer) RETURNS void AS
            $$
            UPDATE "Match" SET "goalsHome" = goals_home, "goalsAway" = goals_away WHERE id = match_id;
            DELETE FROM "History" WHERE "MatchId" = match_id;
            INSERT INTO "History"("UserId","MatchId",rank)
            SELECT id, match_id, rank() over (order by score desc) as rank FROM score_table
            $$
            LANGUAGE SQL;

            CREATE OR REPLACE VIEW match_table
            AS SELECT "Match"."id" as id,
            "Match"."when" as when,
            (SELECT name FROM "MatchType" WHERE "MatchType"."id" = "Match"."MatchTypeId") as matchtype,
            (SELECT name FROM "Team" WHERE "Team"."id" = "Match"."HomeTeamId") as hometeam,
            (SELECT name FROM "Team" WHERE "Team"."id" = "Match"."AwayTeamId") as awayteam,
            count("Bet"."id") as countbets,
            round(100.0 * count(CASE WHEN "Bet"."goalsHome" > "Bet"."goalsAway" THEN 1 END) / count("Bet"."id")) as winnerhome,
            round(100.0 * count(CASE WHEN "Bet"."goalsHome" < "Bet"."goalsAway" THEN 1 END) / count("Bet"."id")) as winneraway,
            avg("Bet"."goalsHome") as avghome,
            avg("Bet"."goalsAway") as avgaway,
            "Match"."tv" as tv
            FROM "Match"
             -- No LEFT JOIN here to discard matches without bets (and prevent division by zero)
            JOIN "Bet" ON "Match"."id" = "Bet"."MatchId"
            WHERE now() > "Match"."when" AND "Match"."goalsHome" IS NULL AND "Match"."goalsAway" IS NULL
            GROUP BY "Match"."id";

            CREATE OR REPLACE VIEW past_match_table
            AS SELECT "Match"."id" as id,
            "Match"."when" as when,
            (SELECT name FROM "MatchType" WHERE "MatchType"."id" = "Match"."MatchTypeId") as matchtype,
             "Match"."goalsHome" as goalshome,
             "Match"."goalsAway" as goalsaway,
            (SELECT name FROM "Team" WHERE "Team"."id" = "Match"."HomeTeamId") as hometeam,
            (SELECT name FROM "Team" WHERE "Team"."id" = "Match"."AwayTeamId") as awayteam,
            array_agg("Bet"."goalsHome") as listhome,
            array_agg("Bet"."goalsAway") as listaway,
            array_agg("User"."name") as listname,
            array_agg("User"."id") as listid,
            array_agg(calc_score("Match"."goalsHome", "Match"."goalsAway", "Bet"."goalsHome", "Bet"."goalsAway")) as listscore,
            count("Bet"."id") as countbets,
            round(100.0 * count(CASE WHEN "Bet"."goalsHome" > "Bet"."goalsAway" THEN 1 END) / count("Bet"."id")) as winnerhome,
            round(100.0 * count(CASE WHEN "Bet"."goalsHome" < "Bet"."goalsAway" THEN 1 END) / count("Bet"."id")) as winneraway,
            avg("Bet"."goalsHome") as avghome,
            avg("Bet"."goalsAway") as avgaway
            FROM "Match"
             -- No LEFT JOIN here to discard matches without bets (and prevent division by zero)
            JOIN "Bet" ON "Match"."id" = "Bet"."MatchId"
            JOIN "User" ON "User"."id" = "Bet"."UserId"
            WHERE now() > "Match"."when" AND "Match"."goalsHome" IS NOT NULL AND "Match"."goalsAway" IS NOT NULL
            GROUP BY "Match"."id"
            ORDER BY "Match"."when" DESC;
        `, {raw: true});
    },

    down: (queryInterface, Sequelize, seq) => {
        // Remove in reversed order
        return seq.query(`
            DROP VIEW past_match_table;
            DROP VIEW match_table;
            DROP FUNCTION set_match_result;
            DROP VIEW score_table;
            DROP FUNCTION user_rank_history;
            DROP FUNCTION calc_score;
        `, {raw: true});
    }
};
