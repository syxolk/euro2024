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

    async function getInviterCode(
        knex: import("knex").Knex,
        inviterId: number
    ): Promise<string> {
        const row = await knex("user_account")
            .select("invite_code")
            .where({ id: inviterId })
            .first();
        return row.invite_code;
    }

    it("rejects registration without an invite code", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");
        const ag = supertest.agent(app);

        const res = await ag.post("/register").type("form").send({
            name: "New User",
            email: "newuser@example.com",
            password: "secret123",
        });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/register");

        const dbUser = await knex("user_account")
            .where({ email: "newuser@example.com" })
            .first();
        expect(dbUser).toBeUndefined();
    });

    it("rejects registration with an invalid invite code", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");
        const ag = supertest.agent(app);

        const res = await ag.post("/register").type("form").send({
            name: "New User",
            email: "newuser@example.com",
            password: "secret123",
            invite_code: "BADCODE1",
        });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/register");

        const dbUser = await knex("user_account")
            .where({ email: "newuser@example.com" })
            .first();
        expect(dbUser).toBeUndefined();
    });

    it("creates user and redirects to /intro with a valid invite code", async () => {
        const inviter = await createTestUser(knex);
        const inviteCode = await getInviterCode(knex, inviter.id);

        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");
        const ag = supertest.agent(app);

        const res = await ag.post("/register").type("form").send({
            name: "New User",
            email: "newuser@example.com",
            password: "secret123",
            invite_code: inviteCode,
        });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/intro");

        const dbUser = await knex("user_account")
            .where({ email: "newuser@example.com" })
            .first();
        expect(dbUser).toBeDefined();
        expect(dbUser.name).toBe("New User");
        expect(dbUser.invite_code).toBeDefined();
        expect(dbUser.invite_code).not.toBe(inviteCode);
    });

    it("records invitation relationship after successful registration", async () => {
        const inviter = await createTestUser(knex);
        const inviteCode = await getInviterCode(knex, inviter.id);

        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");
        const ag = supertest.agent(app);

        await ag.post("/register").type("form").send({
            name: "Invited User",
            email: "invited@example.com",
            password: "secret123",
            invite_code: inviteCode,
        });

        const invitee = await knex("user_account")
            .where({ email: "invited@example.com" })
            .first();
        const invitation = await knex("invitation")
            .where({ inviter_id: inviter.id, invitee_id: invitee.id })
            .first();

        expect(invitation).toBeDefined();
    });

    it("redirects back to /register on duplicate email", async () => {
        const inviter = await createTestUser(knex, {
            email: "taken@example.com",
        });
        const inviteCode = await getInviterCode(knex, inviter.id);

        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");
        const ag = supertest.agent(app);

        const res = await ag.post("/register").type("form").send({
            name: "Duplicate",
            email: "taken@example.com",
            password: "secret123",
            invite_code: inviteCode,
        });

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
            invite_code: "TESTCODE",
            created_at: new Date(),
            past_matches_last_visited_at: new Date(),
        });

        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app)
            .post(`/activate/${token}`)
            .type("form")
            .send({});
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
