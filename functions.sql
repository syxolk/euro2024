CREATE OR REPLACE FUNCTION calc_score(integer, integer, integer, integer) RETURNS integer AS
$$
-- $1 matchHome, $2 matchAway, $3 betHome, $3 betAway
SELECT CASE
WHEN $1 = $3 AND $2 = $4 THEN 3            -- 3 points for correct result
WHEN $1 - $2 = $3 - $4 THEN 2              -- 2 points for correct goal difference
WHEN sign($1 - $2) = sign($3 - $4) THEN 1  -- 1 point for correct winner
ELSE 0
END
$$
LANGUAGE SQL IMMUTABLE RETURNS NULL ON NULL INPUT;

CREATE OR REPLACE VIEW score_table
AS WITH bets AS (
SELECT b."UserId" as id,
sum(calc_score(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway")) as score,
count(CASE WHEN calc_score(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway") = 3 THEN 1 END) as count3,
count(CASE WHEN calc_score(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway") = 2 THEN 1 END) as count2,
count(CASE WHEN calc_score(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway") = 1 THEN 1 END) as count1
FROM "Bet" as b
JOIN "Match" as m ON m."id" = b."MatchId"
WHERE now() > m."when"  -- check if match is expired
GROUP BY b."UserId"
)
SELECT "User"."name" as name,
"User"."id" as id, coalesce(bets.score, 0) as score,
coalesce(count3, 0) as count3, coalesce(count2, 0) as count2, coalesce(count1, 0) as count1
FROM "User" LEFT JOIN bets ON "User"."id" = bets.id;
