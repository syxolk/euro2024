/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.schema.table("extra_bet", (table) => {
        table
            .specificType("team_ids", "integer[]")
            .notNullable()
            .defaultTo("{}");
    });

    await knex.raw(`
        CREATE FUNCTION array_intersect(anyarray, anyarray)
        RETURNS anyarray
        language sql
        as $FUNCTION$
            SELECT ARRAY(
                SELECT UNNEST($1)
                INTERSECT
                SELECT UNNEST($2)
            );
        $FUNCTION$;
    `);

    await knex.schema.raw(`
        drop view highscore;    
    `);

    await knex.schema.raw(`
        CREATE OR REPLACE VIEW highscore AS
        WITH
        last_match AS (
            SELECT starts_at
            FROM match m
            WHERE goals_home IS NOT NULL
                AND goals_away IS NOT NULL
            ORDER BY starts_at DESC
            LIMIT 1
        ),
        bets_past AS (
            SELECT b.user_id as id,
            sum(calc_bet_score(calc_bet_result(m.goals_home, m.goals_away, b.goals_home, b.goals_away), mt.score_factor)) as score,
            count(CASE WHEN calc_bet_result(m.goals_home, m.goals_away, b.goals_home, b.goals_away) = 'correct'::bet_result THEN 1 END) as count3,
            count(CASE WHEN calc_bet_result(m.goals_home, m.goals_away, b.goals_home, b.goals_away) = 'diff'::bet_result THEN 1 END) as count2,
            count(CASE WHEN calc_bet_result(m.goals_home, m.goals_away, b.goals_home, b.goals_away) = 'winner'::bet_result THEN 1 END) as count1,
            count(CASE WHEN calc_bet_result(m.goals_home, m.goals_away, b.goals_home, b.goals_away) = 'wrong'::bet_result THEN 1 END) as count0
            FROM bet as b
            JOIN match as m ON m.id = b.match_id
            JOIN match_type as mt ON m.match_type_id = mt.id
            WHERE (SELECT starts_at FROM last_match) - '24 hours'::interval > m.starts_at
            GROUP BY b.user_id
        ),
        bets AS (
            SELECT b.user_id as id,
            sum(calc_bet_score(calc_bet_result(m.goals_home, m.goals_away, b.goals_home, b.goals_away), mt.score_factor)) as score,
            count(CASE WHEN calc_bet_result(m.goals_home, m.goals_away, b.goals_home, b.goals_away) = 'correct'::bet_result THEN 1 END) as count3,
            count(CASE WHEN calc_bet_result(m.goals_home, m.goals_away, b.goals_home, b.goals_away) = 'diff'::bet_result THEN 1 END) as count2,
            count(CASE WHEN calc_bet_result(m.goals_home, m.goals_away, b.goals_home, b.goals_away) = 'winner'::bet_result THEN 1 END) as count1,
            count(CASE WHEN calc_bet_result(m.goals_home, m.goals_away, b.goals_home, b.goals_away) = 'wrong'::bet_result THEN 1 END) as count0,
            sum(CASE WHEN calc_bet_result(m.goals_home, m.goals_away, b.goals_home, b.goals_away) = 'correct'::bet_result THEN calc_bet_score('correct'::bet_result, mt.score_factor) END) as total3,
            sum(CASE WHEN calc_bet_result(m.goals_home, m.goals_away, b.goals_home, b.goals_away) = 'diff'::bet_result THEN calc_bet_score('diff'::bet_result, mt.score_factor) END) as total2,
            sum(CASE WHEN calc_bet_result(m.goals_home, m.goals_away, b.goals_home, b.goals_away) = 'winner'::bet_result THEN calc_bet_score('winner'::bet_result , mt.score_factor) END) as total1
            FROM bet as b
            JOIN match as m ON m.id = b.match_id
            JOIN match_type as mt ON m.match_type_id = mt.id
            WHERE now() > m.starts_at  -- check if match is expired
            GROUP BY b.user_id
        ),
        extra_bets as (
            select
                b.user_id,
                sum(cardinality(array_intersect(b.selected_team_ids, extra_bet.team_ids)) * extra_bet.score_factor) as "score"
            from user_account_extra_bet b
            join extra_bet on (extra_bet.id = b.extra_bet_id)
            group by b.user_id
        )
        SELECT user_account.name as name,
        user_account.id as id,
        coalesce(bets.score, 0) + coalesce(extra_bets.score, 0) as score,
        coalesce(bets_past.score, 0) + coalesce(extra_bets.score, 0) as score_past,
        coalesce(bets.count3, 0) as count3,
        coalesce(bets.count2, 0) as count2,
        coalesce(bets.count1, 0) as count1,
        coalesce(bets.count0, 0) as count0,
        coalesce(total3, 0) as total3,
        coalesce(total2, 0) as total2,
        coalesce(total1, 0) as total1,
        coalesce(extra_bets.score, 0) as extra_bet_total,
        rank() over (order by (coalesce(bets.score, 0) + coalesce(extra_bets.score, 0)) desc, coalesce(bets.count3, 0) desc, coalesce(bets.count2, 0) desc, coalesce(bets.count1, 0) desc, coalesce(bets.count0, 0) desc) as rank,
        rank() over (order by (coalesce(bets_past.score, 0) + coalesce(extra_bets.score, 0)) desc, coalesce(bets_past.count3, 0) desc, coalesce(bets_past.count2, 0) desc, coalesce(bets_past.count1, 0) desc, coalesce(bets_past.count0, 0) desc) as rank_past
        FROM user_account
        LEFT JOIN bets ON user_account.id = bets.id
        LEFT JOIN bets_past ON user_account.id = bets_past.id
        LEFT JOIN extra_bets ON extra_bets.user_id = user_account.id
    `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.raw(`
        DROP FUNCTION array_intersect;
    `);

    await knex.schema.table("extra_bet", (table) => {
        table.dropColumn("team_ids");
    });
};
