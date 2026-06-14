import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { knex } from "../../db";
import {
    authenticatedAgent,
    createTestUser,
    seedMatch,
    seedTeam,
    truncateTables,
} from "../helpers";

describe("GET /live", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("renders 200 for anonymous users", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app).get("/live");
        expect(res.status).toBe(200);
    });

    it("renders 200 for authenticated users", async () => {
        const user = await createTestUser(knex);
        const ag = await authenticatedAgent(user);

        const res = await ag.get("/live");
        expect(res.status).toBe(200);
    });

    it("does not render bot users on the live matches page", async () => {
        const homeTeamId = await seedTeam(knex, { name: "Home Team", code: "HTM" });
        const awayTeamId = await seedTeam(knex, { name: "Away Team", code: "AWY" });
        const matchId = await seedMatch(knex, {
            starts_at: new Date(Date.now() - 60 * 1000),
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
        });

        const human = await createTestUser(knex, { name: "Visible Human" });
        const bot = await createTestUser(knex, {
            email: "bot-live@example.com",
            name: "Hidden Bot",
            is_bot: true,
        });

        await knex("bet").insert([
            { user_id: human.id, match_id: matchId, goals_home: 2, goals_away: 1 },
            { user_id: bot.id, match_id: matchId, goals_home: 0, goals_away: 3 },
        ]);

        const res = await authenticatedAgent(human).then((ag) => ag.get("/live"));

        expect(res.status).toBe(200);
        expect(res.text).toContain("Visible Human");
        expect(res.text).not.toContain("Hidden Bot");
    });
});
