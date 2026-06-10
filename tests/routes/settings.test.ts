import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { knex } from "../../db";
import { authenticatedAgent, createTestUser, truncateTables } from "../helpers";

describe("GET /settings", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("redirects to /login when not authenticated", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app).get("/settings");
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/login");
    });

    it("renders 200 when authenticated", async () => {
        const user = await createTestUser(knex);
        const ag = await authenticatedAgent(user);

        const res = await ag.get("/settings");
        expect(res.status).toBe(200);
    });
});

describe("POST /settings", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("redirects to /login when not authenticated", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app)
            .post("/settings")
            .type("form")
            .send({ name: "New Name" });
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/login");
    });

    it("updates the display name and redirects to /settings", async () => {
        const user = await createTestUser(knex, { name: "OldName" });
        const ag = await authenticatedAgent(user);

        const res = await ag
            .post("/settings")
            .type("form")
            .send({ name: "New Display Name" });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/settings");

        const dbUser = await knex("user_account")
            .where({ id: user.id })
            .first();
        expect(dbUser.name).toBe("New Display Name");
    });
});
