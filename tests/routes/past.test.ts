import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { knex } from "../../db";
import {
    authenticatedAgent,
    createTestUser,
    seedMatch,
    seedTeam,
    truncateTables,
} from "../helpers";

describe("GET /past", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("renders 200 for anonymous users", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app).get("/past");
        expect(res.status).toBe(200);
    });

    it("renders 200 for authenticated users", async () => {
        const user = await createTestUser(knex);
        const ag = await authenticatedAgent(user);

        const res = await ag.get("/past");
        expect(res.status).toBe(200);
    });

    it("does not render bot users on the past matches page", async () => {
        const homeTeamId = await seedTeam(knex, {
            name: "Past Home",
            code: "PHM",
        });
        const awayTeamId = await seedTeam(knex, {
            name: "Past Away",
            code: "PAW",
        });
        const matchId = await seedMatch(knex, {
            starts_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
        });

        await knex("match").where({ id: matchId }).update({
            goals_home: 2,
            goals_away: 1,
            goals_inserted_at: new Date(),
        });

        const human = await createTestUser(knex, { name: "Past Human" });
        const bot = await createTestUser(knex, {
            email: "bot-past@example.com",
            name: "Past Bot",
            is_bot: true,
        });

        await knex("bet").insert([
            {
                user_id: human.id,
                match_id: matchId,
                goals_home: 2,
                goals_away: 1,
            },
            {
                user_id: bot.id,
                match_id: matchId,
                goals_home: 0,
                goals_away: 2,
            },
        ]);

        const res = await authenticatedAgent(human).then((ag) =>
            ag.get("/past")
        );

        expect(res.status).toBe(200);
        expect(res.text).toContain("Past Human");
        expect(res.text).not.toContain("Past Bot");
    });
});
