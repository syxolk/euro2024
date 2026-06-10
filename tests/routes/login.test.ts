import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { knex } from "../../db";
import { authenticatedAgent, createTestUser, truncateTables } from "../helpers";

describe("POST /login", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("redirects to /me on valid credentials", async () => {
        const user = await createTestUser(knex);
        const ag = await authenticatedAgent(user);

        const res = await ag.get("/me");
        expect(res.status).toBe(302);
        expect(res.headers.location).toMatch(/^\/user\/\d+$/);
    });

    it("redirects back to /login on wrong password", async () => {
        await createTestUser(knex, {
            email: "user@example.com",
            password: "correct",
        });

        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");
        const ag = supertest.agent(app);

        const res = await ag
            .post("/login")
            .send("email=user%40example.com&password=wrong")
            .set("Content-Type", "application/x-www-form-urlencoded");
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/login");
    });

    it("redirects back to /login for unknown email", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");
        const ag = supertest.agent(app);

        const res = await ag
            .post("/login")
            .send("email=nobody%40example.com&password=anything")
            .set("Content-Type", "application/x-www-form-urlencoded");
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/login");
    });

    it("logs out and redirects to /", async () => {
        const user = await createTestUser(knex);
        const ag = await authenticatedAgent(user);

        const logoutRes = await ag
            .post("/logout")
            .set("Content-Type", "application/x-www-form-urlencoded");
        expect(logoutRes.status).toBe(302);
        expect(logoutRes.headers.location).toBe("/");

        // After logout, /me should redirect to /login
        const meRes = await ag.get("/me");
        expect(meRes.status).toBe(302);
        expect(meRes.headers.location).toBe("/login");
    });
});
