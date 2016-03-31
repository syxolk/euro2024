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
AS SELECT (SElECT "name" FROM "User" WHERE "id" = "Bet"."UserId") as name,
"Bet"."UserId" as id,
sum(calc_score("Match"."goalsHome", "Match"."goalsAway", "Bet"."goalsHome", "Bet"."goalsAway")) as score
FROM "Match"
JOIN "Bet" ON ("Match"."id" = "Bet"."MatchId")
WHERE now() > "Match"."when" GROUP BY "Bet"."UserId";
