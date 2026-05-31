import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { knex } from "../../db";
import { createTestUser, truncateTables } from "../helpers";

describe("GET /password_recovery", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("renders the recovery form", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app).get("/password_recovery");
        expect(res.status).toBe(200);
    });
});

describe("POST /password_recovery", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("redirects with error for unknown email", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");
        const ag = supertest.agent(app);

        const res = await ag
            .post("/password_recovery")
            .type("form")
            .send({ email: "nobody@example.com" });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/password_recovery");
    });

    it("sets a reset token and redirects for known email", async () => {
        const user = await createTestUser(knex, { email: "recover@example.com" });

        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");
        const ag = supertest.agent(app);

        const res = await ag
            .post("/password_recovery")
            .type("form")
            .send({ email: "recover@example.com" });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/password_recovery");

        const dbUser = await knex("user_account").where({ id: user.id }).first();
        expect(dbUser.password_reset_token).toBeTruthy();
        expect(dbUser.password_reset_created_at).toBeTruthy();
    });
});

describe("GET /password_reset/:code", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("renders the reset form for any code", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app).get("/password_reset/some-code-here");
        expect(res.status).toBe(200);
    });
});

describe("POST /password_reset/:code", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("redirects with error for invalid token", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");
        const ag = supertest.agent(app);

        const res = await ag
            .post("/password_reset/invalid-token-xyz")
            .type("form")
            .send({ password: "newpassword" });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/password_reset/invalid-token-xyz");
    });

    it("resets the password with a valid token", async () => {
        const user = await createTestUser(knex, { email: "resetme@example.com" });
        const token = "valid-reset-token-abc";
        await knex("user_account")
            .update({
                password_reset_token: token,
                password_reset_created_at: new Date(),
            })
            .where({ id: user.id });

        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");
        const ag = supertest.agent(app);

        const res = await ag
            .post(`/password_reset/${token}`)
            .type("form")
            .send({ password: "brandnewpassword" });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe(`/password_reset/${token}`);

        const dbUser = await knex("user_account").where({ id: user.id }).first();
        expect(dbUser.password_reset_token).toBeNull();
        expect(dbUser.password_reset_created_at).toBeNull();
    });
});
