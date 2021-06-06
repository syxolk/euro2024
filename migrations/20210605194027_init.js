exports.up = async (knex) => {
    await knex.schema.createTable("session", (table) => {
        table.text("sid").primary().notNullable();
        table.jsonb("sess").notNullable();
        table.timestamp("expired").index().notNullable();
    });

    await knex.schema.raw(`
        create table user_account (
            id serial primary key not null,
            facebook_id text unique,
            google_id text unique,
            name text not null,
            email text not null unique,
            password text,
            email_confirmed boolean not null default false,
            email_confirm_token text unique,
            admin boolean not null default false,
            created_at timestamptz not null,
            past_matches_last_visited_at timestamptz not null,
            password_reset_token text unique,
            password_reset_created_at timestamptz
        )
    `);

    await knex.schema.raw(`
        create table team (
            id serial primary key not null,
            name text not null,
            code text not null,
            uefa_id text not null
        )
    `);

    await knex.schema.raw(`
        create table match_type (
            id serial primary key not null,
            code text not null,
            name text not null,
            score_factor integer not null default 1
        )
    `);

    await knex.schema.raw(`
        create table match (
            id serial primary key not null,
            goals_home integer,
            goals_away integer,
            starts_at timestamptz not null,
            tv text,
            home_team_id integer references team(id) on delete cascade,
            away_team_id integer references team(id) on delete cascade,
            match_type_id integer not null references match_type(id) on delete cascade,
            placeholder_home text,
            placeholder_away text,
            goals_inserted_at timestamptz,
            uefa_id text not null
        )
    `);

    await knex.schema.raw(`
        create table bet (
            id serial primary key not null,
            goals_home integer not null,
            goals_away integer not null,
            user_id integer not null references user_account(id) on delete cascade,
            match_id integer not null references match(id) on delete cascade,
            unique (user_id, match_id)
        )
    `);

    await knex.schema.raw(`
        create table friend (
            id serial primary key,
            from_user_id integer not null references user_account(id),
            to_user_id integer not null references user_account(id),
            unique (from_user_id, to_user_id)
        )
    `);

    await knex.schema.raw(`
        CREATE TYPE bet_result AS ENUM (
            'correct',  -- Correct bet (e.g. betted 4:3 and the match result was 4:3)
            'diff',     -- Correct goal difference (e.g. betted 4:3 and the match result was 1:0, 2:1, 3:2, 4:3 ...)
            'winner',   -- Correct match winner (e.g. betted 4:3 and the match winner was the home team)
            'wrong'     -- Anything else
        );
    `);

    await knex.schema.raw(`
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
    `);

    await knex.schema.raw(`
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
        )
        SELECT user_account.name as name,
        user_account.id as id,
        coalesce(bets.score, 0) as score,
        coalesce(bets_past.score, 0) as score_past,
        coalesce(bets.count3, 0) as count3,
        coalesce(bets.count2, 0) as count2,
        coalesce(bets.count1, 0) as count1,
        coalesce(bets.count0, 0) as count0,
        coalesce(total3, 0) as total3,
        coalesce(total2, 0) as total2,
        coalesce(total1, 0) as total1,
        rank() over (order by coalesce(bets.score, 0) desc, coalesce(bets.count3, 0) desc, coalesce(bets.count2, 0) desc, coalesce(bets.count1, 0) desc, coalesce(bets.count0, 0) desc) as rank,
        rank() over (order by coalesce(bets_past.score, 0) desc, coalesce(bets_past.count3, 0) desc, coalesce(bets_past.count2, 0) desc, coalesce(bets_past.count1, 0) desc, coalesce(bets_past.count0, 0) desc) as rank_past
        FROM user_account
        LEFT JOIN bets ON user_account.id = bets.id
        LEFT JOIN bets_past ON user_account.id = bets_past.id
    `);
};

exports.down = async (knex) => {
    throw new Error("Not implemented");
};
