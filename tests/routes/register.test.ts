import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { knex } from "../../db";
import { authenticatedAgent, createTestUser, truncateTables } from "../helpers";

describe("GET /register", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("renders registration form for anonymous users", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app).get("/register");
        expect(res.status).toBe(200);
    });

    it("redirects to /me for logged-in users", async () => {
        const user = await createTestUser(knex);
        const ag = await authenticatedAgent(user);

        const res = await ag.get("/register");
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/me");
    });
});

describe("POST /register", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("creates user and redirects to /intro when no mail configured", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");
        const ag = supertest.agent(app);

        const res = await ag
            .post("/register")
            .type("form")
            .send({ name: "New User", email: "newuser@example.com", password: "secret123" });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/intro");

        const dbUser = await knex("user_account")
            .where({ email: "newuser@example.com" })
            .first();
        expect(dbUser).toBeDefined();
        expect(dbUser.name).toBe("New User");
    });

    it("redirects back to /register on duplicate email", async () => {
        await createTestUser(knex, { email: "taken@example.com" });

        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");
        const ag = supertest.agent(app);

        const res = await ag
            .post("/register")
            .type("form")
            .send({ name: "Duplicate", email: "taken@example.com", password: "secret123" });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/register");
    });
});

describe("GET /activate/:code", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("renders activate page with the code", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app).get("/activate/some-token-abc");
        expect(res.status).toBe(200);
    });
});

describe("POST /activate/:code", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("confirms email with valid token", async () => {
        const token = "valid-activation-token-123";
        await knex("user_account").insert({
            email: "unconfirmed@example.com",
            name: "Unconfirmed",
            password: "hashed",
            admin: false,
            email_confirmed: false,
            email_confirm_token: token,
            created_at: new Date(),
            past_matches_last_visited_at: new Date(),
        });

        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app).post(`/activate/${token}`).type("form").send({});
        expect(res.status).toBe(200);
        expect(res.text).toContain("alert-success");

        const dbUser = await knex("user_account")
            .where({ email: "unconfirmed@example.com" })
            .first();
        expect(dbUser.email_confirmed).toBe(true);
        expect(dbUser.email_confirm_token).toBeNull();
    });

    it("renders error page for invalid token", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app)
            .post("/activate/nonexistent-token")
            .type("form")
            .send({});
        expect(res.status).toBe(200);
        expect(res.text).toContain("alert-danger");
    });
});
