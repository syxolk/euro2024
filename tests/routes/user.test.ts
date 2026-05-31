import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { knex } from "../../db";
import { createTestUser, truncateTables } from "../helpers";

describe("GET /user/:id", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("returns 404 for a non-existent user", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app).get("/user/999999");
        expect(res.status).toBe(404);
    });

    it("renders 200 for an existing user", async () => {
        const user = await createTestUser(knex);

        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app).get(`/user/${user.id}`);
        expect(res.status).toBe(200);
        expect(res.text).toContain(user.name);
    });
});
