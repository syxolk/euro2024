const { knex } = require("../db");
const router = require("express-promise-router")();
const i18next = require("i18next");

router.use(async (req, res) => {
    res.locals.user = req.user;
    res.locals.loggedIn = !!req.user;
    res.locals.csrfToken = req.csrfToken();
    res.locals.websiteName = "Euro 2024";

    // We need our own helper function here so that we can call i18next's "t"-function with interpolation
    res.locals.tr = (key, options) => {
        return i18next.t(key, {
            ...options.hash,
            lng: req.language
        });
    };

    return "next";
});

router.use(async (req, res) => {
    if (!req.user) {
        // If not logged in there's nothing more to do
        return "next";
    }

    const result = await knex.raw(
        `
        WITH
        upcoming_matches AS (
            SELECT m.id, m.home_team_id, m.away_team_id
            FROM match m
            WHERE m.starts_at > now()
            ORDER BY m.starts_at ASC
            LIMIT 8)
        SELECT m.id as id
        FROM upcoming_matches m
        WHERE
            m.home_team_id IS NOT NULL AND
            m.away_team_id IS NOT NULL AND
            NOT EXISTS (SELECT 1 FROM bet b
                WHERE b.user_id = :user_id AND
                b.match_id = m.id)
    `,
        { user_id: req.user.id }
    );

    res.locals.upcomingMatchesWithoutBet = result.rows.length;
    res.locals.upcomingMatchesWithoutBetIds = result.rows.map((x) => x.id);

    return "next";
});

router.use(async (req, res) => {
    const result = await knex.raw(
        `
        SELECT count(1)
        FROM match
        WHERE now() > match.starts_at
            AND match.goals_home IS NULL
            AND match.goals_away IS NULL
    `
    );

    res.locals.hasLiveMatches = result.rows[0].count > 0;

    return "next";
});

router.use(async (req, res) => {
    if (!req.user) {
        // If not logged in there's nothing more to do
        return "next";
    }

    try {
        const result = await knex.raw(
            `
        SELECT count(1)
        FROM match
        WHERE now() > match.starts_at AND
            match.goals_home IS NOT NULL AND
            match.goals_away IS NOT NULL AND
            (goals_inserted_at > :last_visited or :last_visited::timestamptz is null)
    `,
            {
                last_visited: req.user
                    ? req.user.past_matches_last_visited_at
                    : null,
            }
        );

        res.locals.unseenPastMatches = result.rows[0].count;
    } catch (err) {
        console.error(err);
    }

    return "next";
});

module.exports = router;
