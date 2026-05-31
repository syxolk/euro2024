import bcrypt from "bcrypt";
import supertest from "supertest";
import app from "../app";

export const agent = () => supertest.agent(app);

const BCRYPT_ROUNDS = 4; // low cost for tests

export interface TestUser {
    id: number;
    email: string;
    password: string;
    name: string;
    admin?: boolean;
}

/**
 * Creates a user directly in the DB and returns their credentials.
 */
export async function createTestUser(
    knex: import("knex").Knex,
    overrides: Partial<TestUser> = {}
): Promise<TestUser> {
    const email = overrides.email ?? `test-${Date.now()}@example.com`;
    const password = overrides.password ?? "password123";
    const name = overrides.name ?? "Test User";
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const [user] = await knex("user_account")
        .insert({
            email,
            name,
            password: hash,
            admin: overrides.admin ?? false,
            email_confirmed: true,
            created_at: new Date(),
            past_matches_last_visited_at: new Date(),
        })
        .returning(["id", "email", "name"]);

    return { id: user.id, email, password, name };
}

/**
 * Returns a supertest agent that is already logged in as the given user.
 */
export async function authenticatedAgent(
    user: Pick<TestUser, "email" | "password">
): Promise<ReturnType<typeof supertest.agent>> {
    const ag = supertest.agent(app);
    const loginRes = await ag
        .post("/login")
        .type("form")
        .send({ email: user.email, password: user.password });

    if (loginRes.status !== 302 || loginRes.headers.location !== "/me") {
        throw new Error(
            `Login failed: status=${loginRes.status} location=${loginRes.headers.location}`
        );
    }
    return ag;
}

/**
 * Truncates all data tables to isolate tests. Preserves schema.
 */
export async function truncateTables(knex: import("knex").Knex): Promise<void> {
    await knex.raw(
        "TRUNCATE TABLE bet, friend, user_account, match, team, match_type, extra_bet, user_account_extra_bet RESTART IDENTITY CASCADE"
    );
}

/**
 * Seeds an extra_bet row and returns the id.
 */
export async function seedExtraBet(
    knex: import("knex").Knex,
    overrides: {
        name?: string;
        number_of_teams?: number;
        editable_until?: Date;
        score_factor?: number;
        team_ids?: number[];
    } = {}
): Promise<number> {
    const [row] = await knex("extra_bet")
        .insert({
            name: overrides.name ?? "Test Extra Bet",
            number_of_teams: overrides.number_of_teams ?? 1,
            editable_until: overrides.editable_until ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            score_factor: overrides.score_factor ?? 5,
            team_ids: overrides.team_ids ?? knex.raw("'{}'"),
        })
        .returning("id");
    return row.id;
}

/**
 * Seeds a match_type row (required FK for matches).
 */
export async function seedMatchType(
    knex: import("knex").Knex,
    overrides: { id?: number; code?: string; name?: string; score_factor?: number } = {}
): Promise<number> {
    const [row] = await knex("match_type")
        .insert({
            id: overrides.id ?? 1,
            code: overrides.code ?? "GS",
            name: overrides.name ?? "Group Stage",
            score_factor: overrides.score_factor ?? 1,
        })
        .onConflict("id")
        .merge()
        .returning("id");
    return row.id;
}

/**
 * Seeds a match row and returns the id.
 * Pass starts_at in the future to allow betting; in the past to block betting.
 */
export async function seedMatch(
    knex: import("knex").Knex,
    overrides: {
        starts_at?: Date;
        home_team_id?: number | null;
        away_team_id?: number | null;
        match_type_id?: number;
        fifa_id?: string;
    } = {}
): Promise<number> {
    const matchTypeId = overrides.match_type_id ?? 1;
    await seedMatchType(knex, { id: matchTypeId });

    const [row] = await knex("match")
        .insert({
            starts_at: overrides.starts_at ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
            home_team_id: overrides.home_team_id ?? null,
            away_team_id: overrides.away_team_id ?? null,
            match_type_id: matchTypeId,
            placeholder_home: "Home",
            placeholder_away: "Away",
            fifa_id: overrides.fifa_id ?? `test-${Date.now()}`,
        })
        .returning("id");
    return row.id;
}

/**
 * Seeds a team row and returns the id.
 */
export async function seedTeam(
    knex: import("knex").Knex,
    overrides: { name?: string; code?: string; fifa_id?: string } = {}
): Promise<number> {
    const [row] = await knex("team")
        .insert({
            name: overrides.name ?? "Team A",
            code: overrides.code ?? "AAA",
            fifa_id: overrides.fifa_id ?? `team-${Date.now()}`,
        })
        .returning("id");
    return row.id;
}
