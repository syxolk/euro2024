import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { knex } from "../../db";
import { authenticatedAgent, createTestUser, truncateTables } from "../helpers";

describe("GET /mybets", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("redirects to /login when not authenticated", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app).get("/mybets");
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/login");
    });

    it("renders 200 when authenticated", async () => {
        const user = await createTestUser(knex);
        const ag = await authenticatedAgent(user);

        const res = await ag.get("/mybets");
        expect(res.status).toBe(200);
    });
});
