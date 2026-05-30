import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { knex } from "../../db";
import { authenticatedAgent, createTestUser, truncateTables } from "../helpers";

describe("GET /highscore", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("renders highscore for unauthenticated users", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app).get("/highscore");
        expect(res.status).toBe(200);
    });

    it("renders 200 for authenticated users", async () => {
        const user = await createTestUser(knex);
        const ag = await authenticatedAgent(user);

        const res = await ag.get("/highscore");
        expect(res.status).toBe(200);
        expect(res.text).toContain("highscore");
    });
});
