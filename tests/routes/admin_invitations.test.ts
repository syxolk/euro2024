import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { knex } from "../../db";
import { authenticatedAgent, createTestUser, truncateTables } from "../helpers";

describe("GET /admin/invitations", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("returns 404 for anonymous users", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app).get("/admin/invitations");
        expect(res.status).toBe(404);
    });

    it("returns 404 for non-admin logged-in users", async () => {
        const user = await createTestUser(knex, { admin: false });
        const ag = await authenticatedAgent(user);

        const res = await ag.get("/admin/invitations");
        expect(res.status).toBe(404);
    });

    it("returns 200 for admin users with empty invitation list", async () => {
        const admin = await createTestUser(knex, { admin: true });
        const ag = await authenticatedAgent(admin);

        const res = await ag.get("/admin/invitations");
        expect(res.status).toBe(200);
        expect(res.text).toContain("No invitations recorded yet.");
    });

    it("shows invitation relationships for admin users", async () => {
        const inviter = await createTestUser(knex, {
            name: "Alice",
            email: "alice@example.com",
        });
        const invitee = await createTestUser(knex, {
            name: "Bob",
            email: "bob@example.com",
        });

        await knex("invitation").insert({
            inviter_id: inviter.id,
            invitee_id: invitee.id,
            created_at: new Date(),
        });

        const admin = await createTestUser(knex, {
            admin: true,
            email: "admin@example.com",
        });
        const ag = await authenticatedAgent(admin);

        const res = await ag.get("/admin/invitations");
        expect(res.status).toBe(200);
        expect(res.text).toContain("Alice");
        expect(res.text).toContain("Bob");
    });
});
