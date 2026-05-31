import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { knex } from "../../db";
import {
    authenticatedAgent,
    createTestUser,
    seedExtraBet,
    seedMatch,
    seedTeam,
    truncateTables,
} from "../helpers";

describe("GET /admin", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("returns 404 for anonymous users", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app).get("/admin");
        expect(res.status).toBe(404);
    });

    it("returns 404 for non-admin users", async () => {
        const user = await createTestUser(knex);
        const ag = await authenticatedAgent(user);

        const res = await ag.get("/admin");
        expect(res.status).toBe(404);
    });

    it("renders 200 for admin users", async () => {
        const admin = await createTestUser(knex, { email: "admin@example.com", admin: true });
        const ag = await authenticatedAgent(admin);

        const res = await ag.get("/admin");
        expect(res.status).toBe(200);
    });
});

describe("POST /admin", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("redirects non-admin to /admin", async () => {
        const user = await createTestUser(knex);
        const ag = await authenticatedAgent(user);

        const res = await ag
            .post("/admin")
            .type("form")
            .send({ command: "set_teams", match: "1", home: "1", away: "2" });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/admin");
    });

    it("admin can set teams on a match", async () => {
        const admin = await createTestUser(knex, { email: "admin2@example.com", admin: true });
        const ag = await authenticatedAgent(admin);

        const homeTeamId = await seedTeam(knex, { name: "Spain", code: "ESP", fifa_id: "esp-1" });
        const awayTeamId = await seedTeam(knex, { name: "Italy", code: "ITA", fifa_id: "ita-1" });
        const matchId = await seedMatch(knex, {
            home_team_id: null,
            away_team_id: null,
        });

        const res = await ag.post("/admin").type("form").send({
            command: "set_teams",
            match: String(matchId),
            home: String(homeTeamId),
            away: String(awayTeamId),
        });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/admin");

        const match = await knex("match").where({ id: matchId }).first();
        expect(match.home_team_id).toBe(homeTeamId);
        expect(match.away_team_id).toBe(awayTeamId);
    });
});

describe("GET /admin_extra_bet/:id", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("returns 404 for non-admin users", async () => {
        const user = await createTestUser(knex);
        const ag = await authenticatedAgent(user);

        const res = await ag.get("/admin_extra_bet/1");
        expect(res.status).toBe(404);
    });

    it("returns 404 for non-existent extra_bet", async () => {
        const admin = await createTestUser(knex, { email: "admin3@example.com", admin: true });
        const ag = await authenticatedAgent(admin);

        const res = await ag.get("/admin_extra_bet/999999");
        expect(res.status).toBe(404);
    });

    it("renders 200 for admin with a valid extra_bet", async () => {
        const admin = await createTestUser(knex, { email: "admin4@example.com", admin: true });
        const ag = await authenticatedAgent(admin);
        const extraBetId = await seedExtraBet(knex);

        const res = await ag.get(`/admin_extra_bet/${extraBetId}`);
        expect(res.status).toBe(200);
    });
});

describe("POST /admin_extra_bet/:id", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("redirects non-admin to /login", async () => {
        const user = await createTestUser(knex);
        const ag = await authenticatedAgent(user);

        const res = await ag.post("/admin_extra_bet/1").type("form").send({});
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/login");
    });

    it("admin can update extra_bet team ids", async () => {
        const admin = await createTestUser(knex, { email: "admin5@example.com", admin: true });
        const ag = await authenticatedAgent(admin);
        const teamId = await seedTeam(knex, { name: "Brazil", code: "BRA", fifa_id: "bra-1" });
        const extraBetId = await seedExtraBet(knex, { number_of_teams: 1 });

        const res = await ag
            .post(`/admin_extra_bet/${extraBetId}`)
            .type("form")
            .send({ [`team_${teamId}`]: "1" });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/admin");

        const extraBet = await knex("extra_bet").where({ id: extraBetId }).first();
        expect(extraBet.team_ids).toContain(teamId);
    });
});
