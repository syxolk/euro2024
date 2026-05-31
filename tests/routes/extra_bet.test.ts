import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { knex } from "../../db";
import {
    authenticatedAgent,
    createTestUser,
    seedExtraBet,
    seedTeam,
    truncateTables,
} from "../helpers";

describe("GET /extra_bet_list", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("renders 200 for anonymous users", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app).get("/extra_bet_list");
        expect(res.status).toBe(200);
    });

    it("renders 200 for authenticated users", async () => {
        const user = await createTestUser(knex);
        const ag = await authenticatedAgent(user);

        const res = await ag.get("/extra_bet_list");
        expect(res.status).toBe(200);
    });
});

describe("GET /extra_bet/:id", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("redirects to /login when not authenticated", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app).get("/extra_bet/1");
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/login");
    });

    it("returns 404 for non-existent extra_bet", async () => {
        const user = await createTestUser(knex);
        const ag = await authenticatedAgent(user);

        const res = await ag.get("/extra_bet/999999");
        expect(res.status).toBe(404);
    });

    it("renders 200 for existing extra_bet", async () => {
        const user = await createTestUser(knex);
        const ag = await authenticatedAgent(user);
        const extraBetId = await seedExtraBet(knex, {
            editable_until: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        const res = await ag.get(`/extra_bet/${extraBetId}`);
        expect(res.status).toBe(200);
    });
});

describe("POST /extra_bet/:id", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("redirects to /login when not authenticated", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app).post("/extra_bet/1").type("form").send({});
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/login");
    });

    it("returns 404 for non-existent extra_bet", async () => {
        const user = await createTestUser(knex);
        const ag = await authenticatedAgent(user);

        const res = await ag.post("/extra_bet/999999").type("form").send({});
        expect(res.status).toBe(404);
    });

    it("returns 404 when extra_bet is no longer editable", async () => {
        const user = await createTestUser(knex);
        const ag = await authenticatedAgent(user);
        const extraBetId = await seedExtraBet(knex, {
            editable_until: new Date(Date.now() - 60 * 1000), // already past
        });

        const res = await ag.post(`/extra_bet/${extraBetId}`).type("form").send({});
        expect(res.status).toBe(404);
    });

    it("saves selected teams and redirects to /mybets", async () => {
        const user = await createTestUser(knex);
        const ag = await authenticatedAgent(user);
        const teamId = await seedTeam(knex, { name: "Germany", code: "GER", fifa_id: "ger-1" });
        const extraBetId = await seedExtraBet(knex, {
            number_of_teams: 1,
            editable_until: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        const res = await ag
            .post(`/extra_bet/${extraBetId}`)
            .type("form")
            .send({ [`team_${teamId}`]: "1" });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/mybets");

        const saved = await knex("user_account_extra_bet")
            .where({ user_id: user.id, extra_bet_id: extraBetId })
            .first();
        expect(saved).toBeDefined();
        expect(saved.selected_team_ids).toContain(teamId);
    });
});
