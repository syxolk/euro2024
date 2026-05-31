import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { knex } from "../../db";
import { authenticatedAgent, createTestUser, truncateTables } from "../helpers";

describe("GET /friend", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("returns 401 when not authenticated", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app).get("/friend");
        expect(res.status).toBe(401);
        expect(res.body).toMatchObject({ ok: false, error: "AUTH" });
    });

    it("returns empty friend list when authenticated with no friends", async () => {
        const user = await createTestUser(knex);
        const ag = await authenticatedAgent(user);

        const res = await ag.get("/friend");
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ ok: true, data: [] });
    });

    it("returns list of friend ids", async () => {
        const user = await createTestUser(knex);
        const friend = await createTestUser(knex, { email: "friend@example.com" });
        await knex("friend").insert({ from_user_id: user.id, to_user_id: friend.id });

        const ag = await authenticatedAgent(user);
        const res = await ag.get("/friend");
        expect(res.status).toBe(200);
        expect(res.body.data).toContain(friend.id);
    });
});

describe("POST /friend", () => {
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
            .post("/friend")
            .send({ id: 1 })
            .set("Content-Type", "application/json");
        expect(res.status).toBe(401);
        expect(res.body).toMatchObject({ ok: false, error: "AUTH" });
    });

    it("adds a friend", async () => {
        const user = await createTestUser(knex);
        const friend = await createTestUser(knex, { email: "friend2@example.com" });
        const ag = await authenticatedAgent(user);

        const res = await ag
            .post("/friend")
            .send({ id: friend.id })
            .set("Content-Type", "application/json");
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ ok: true });

        const row = await knex("friend")
            .where({ from_user_id: user.id, to_user_id: friend.id })
            .first();
        expect(row).toBeDefined();
    });
});

describe("DELETE /friend/:id", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("returns 401 when not authenticated", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app).delete("/friend/1");
        expect(res.status).toBe(401);
        expect(res.body).toMatchObject({ ok: false, error: "AUTH" });
    });

    it("removes a friend", async () => {
        const user = await createTestUser(knex);
        const friend = await createTestUser(knex, { email: "friend3@example.com" });
        await knex("friend").insert({ from_user_id: user.id, to_user_id: friend.id });

        const ag = await authenticatedAgent(user);
        const res = await ag.delete(`/friend/${friend.id}`);
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ ok: true });

        const row = await knex("friend")
            .where({ from_user_id: user.id, to_user_id: friend.id })
            .first();
        expect(row).toBeUndefined();
    });
});
