import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { knex } from "../../db";
import {
    authenticatedAgent,
    createTestUser,
    seedMatch,
    seedTeam,
    truncateTables,
} from "../helpers";

describe("POST /save_bet", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("returns 401 when not authenticated", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app)
            .post("/save_bet")
            .send({ match: 1, home: 1, away: 0 })
            .set("Content-Type", "application/json");

        expect(res.status).toBe(401);
        expect(res.body).toMatchObject({ ok: false, error: "AUTH" });
    });

    it("saves a bet for an upcoming match", async () => {
        const user = await createTestUser(knex);
        const ag = await authenticatedAgent(user);

        const homeTeamId = await seedTeam(knex, {
            name: "Germany",
            code: "GER",
            fifa_id: "ger",
        });
        const awayTeamId = await seedTeam(knex, {
            name: "France",
            code: "FRA",
            fifa_id: "fra",
        });
        const matchId = await seedMatch(knex, {
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            starts_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        const res = await ag
            .post("/save_bet")
            .send({ match: matchId, home: 2, away: 1 })
            .set("Content-Type", "application/json");

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ ok: true });

        const bet = await knex("bet")
            .where({ user_id: user.id, match_id: matchId })
            .first();
        expect(bet).toBeDefined();
        expect(bet.goals_home).toBe(2);
        expect(bet.goals_away).toBe(1);
    });

    it("saves a zero-goal bet for an upcoming match", async () => {
        const user = await createTestUser(knex);
        const ag = await authenticatedAgent(user);

        const homeTeamId = await seedTeam(knex, {
            name: "Netherlands",
            code: "NED",
            fifa_id: "ned",
        });
        const awayTeamId = await seedTeam(knex, {
            name: "England",
            code: "ENG",
            fifa_id: "eng",
        });
        const matchId = await seedMatch(knex, {
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            starts_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        const res = await ag
            .post("/save_bet")
            .send({ match: matchId, home: 0, away: 0 })
            .set("Content-Type", "application/json");

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ ok: true });

        const bet = await knex("bet")
            .where({ user_id: user.id, match_id: matchId })
            .first();
        expect(bet).toBeDefined();
        expect(bet.goals_home).toBe(0);
        expect(bet.goals_away).toBe(0);
    });

    it("updates an existing bet (upsert)", async () => {
        const user = await createTestUser(knex);
        const ag = await authenticatedAgent(user);

        const homeTeamId = await seedTeam(knex, {
            name: "Spain",
            code: "ESP",
            fifa_id: "esp",
        });
        const awayTeamId = await seedTeam(knex, {
            name: "Italy",
            code: "ITA",
            fifa_id: "ita",
        });
        const matchId = await seedMatch(knex, {
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
        });

        await ag
            .post("/save_bet")
            .send({ match: matchId, home: 1, away: 0 })
            .set("Content-Type", "application/json");

        const res = await ag
            .post("/save_bet")
            .send({ match: matchId, home: 3, away: 2 })
            .set("Content-Type", "application/json");

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ ok: true });

        const bet = await knex("bet")
            .where({ user_id: user.id, match_id: matchId })
            .first();
        expect(bet.goals_home).toBe(3);
        expect(bet.goals_away).toBe(2);
    });

    it("deletes a bet when home/away are not provided", async () => {
        const user = await createTestUser(knex);
        const ag = await authenticatedAgent(user);

        const homeTeamId = await seedTeam(knex, {
            name: "Brazil",
            code: "BRA",
            fifa_id: "bra",
        });
        const awayTeamId = await seedTeam(knex, {
            name: "Argentina",
            code: "ARG",
            fifa_id: "arg",
        });
        const matchId = await seedMatch(knex, {
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
        });

        await ag
            .post("/save_bet")
            .send({ match: matchId, home: 1, away: 1 })
            .set("Content-Type", "application/json");

        const res = await ag
            .post("/save_bet")
            .send({ match: matchId })
            .set("Content-Type", "application/json");

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ ok: true });

        const bet = await knex("bet")
            .where({ user_id: user.id, match_id: matchId })
            .first();
        expect(bet).toBeUndefined();
    });

    it("returns 403 when match has already started", async () => {
        const user = await createTestUser(knex);
        const ag = await authenticatedAgent(user);

        const homeTeamId = await seedTeam(knex, {
            name: "Portugal",
            code: "POR",
            fifa_id: "por",
        });
        const awayTeamId = await seedTeam(knex, {
            name: "Belgium",
            code: "BEL",
            fifa_id: "bel",
        });
        const matchId = await seedMatch(knex, {
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            starts_at: new Date(Date.now() - 60 * 1000), // 1 minute ago
        });

        const res = await ag
            .post("/save_bet")
            .send({ match: matchId, home: 1, away: 0 })
            .set("Content-Type", "application/json");

        expect(res.status).toBe(403);
        expect(res.body).toMatchObject({ ok: false, error: "MATCH_EXPIRED" });
    });

    it("returns 403 when teams are not yet known", async () => {
        const user = await createTestUser(knex);
        const ag = await authenticatedAgent(user);

        const matchId = await seedMatch(knex, {
            home_team_id: null,
            away_team_id: null,
        });

        const res = await ag
            .post("/save_bet")
            .send({ match: matchId, home: 1, away: 0 })
            .set("Content-Type", "application/json");

        expect(res.status).toBe(403);
        expect(res.body).toMatchObject({
            ok: false,
            error: "MATCH_TEAMS_UNKNOWN",
        });
    });

    it("returns 404 for a non-existent match", async () => {
        const user = await createTestUser(knex);
        const ag = await authenticatedAgent(user);

        const res = await ag
            .post("/save_bet")
            .send({ match: 999999, home: 1, away: 0 })
            .set("Content-Type", "application/json");

        expect(res.status).toBe(404);
        expect(res.body).toMatchObject({ ok: false, error: "MATCH_NOT_FOUND" });
    });
});
