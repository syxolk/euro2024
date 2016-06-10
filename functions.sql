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
count(CASE WHEN calc_score(m."goalsHome", m."goalsAway", b."goalsHome", b."goalsAway") = 1 THEN 1 END) as count1,
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

CREATE OR REPLACE FUNCTION set_match_result(integer, integer, integer) RETURNS void AS
$$
-- $1 match ID, $2 goals home, $3 goals away
UPDATE "Match" SET "goalsHome" = $2, "goalsAway" = $3 WHERE id = $1;
DELETE FROM "History" WHERE "MatchId" = $1;
INSERT INTO "History"("UserId","MatchId",rank)
SELECT id, $1, rank() over (order by score desc) as rank FROM score_table
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
round(100.0 * count(CASE WHEN "Bet"."goalsHome" = "Bet"."goalsAway" THEN 1 END) / count("Bet"."id")) as draw,
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
round(100.0 * count(CASE WHEN "Bet"."goalsHome" = "Bet"."goalsAway" THEN 1 END) / count("Bet"."id")) as draw,
avg("Bet"."goalsHome") as avghome,
avg("Bet"."goalsAway") as avgaway
FROM "Match"
 -- No LEFT JOIN here to discard matches without bets (and prevent division by zero)
JOIN "Bet" ON "Match"."id" = "Bet"."MatchId"
JOIN "User" ON "User"."id" = "Bet"."UserId"
WHERE now() > "Match"."when" AND "Match"."goalsHome" IS NOT NULL AND "Match"."goalsAway" IS NOT NULL
GROUP BY "Match"."id";
