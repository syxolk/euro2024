import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { knex } from "../../db";
import {
    createTestUser,
    seedMatch,
    seedTeam,
    truncateTables,
} from "../helpers";

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

    it("shows winner-or-draw accuracy and the bet distribution chart", async () => {
        const user = await createTestUser(knex, { name: "Stats User" });
        const homeTeamId = await seedTeam(knex, {
            name: "Home Team",
            code: "HOM",
        });
        const awayTeamId = await seedTeam(knex, {
            name: "Away Team",
            code: "AWY",
        });

        const createFinishedMatch = async (
            actualHome: number,
            actualAway: number,
            betHome: number,
            betAway: number,
            offsetHours: number
        ) => {
            const matchId = await seedMatch(knex, {
                starts_at: new Date(Date.now() - offsetHours * 60 * 60 * 1000),
                home_team_id: homeTeamId,
                away_team_id: awayTeamId,
                fifa_id: `finished-${offsetHours}`,
            });

            await knex("match").where({ id: matchId }).update({
                goals_home: actualHome,
                goals_away: actualAway,
                goals_inserted_at: new Date(),
            });

            await knex("bet").insert({
                user_id: user.id,
                match_id: matchId,
                goals_home: betHome,
                goals_away: betAway,
            });
        };

        await createFinishedMatch(2, 1, 2, 1, 2);
        await createFinishedMatch(3, 2, 2, 1, 3);
        await createFinishedMatch(0, 0, 1, 1, 4);
        await createFinishedMatch(0, 1, 2, 1, 5);
        await createFinishedMatch(1, 3, 0, 2, 6);

        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app).get(`/user/${user.id}`);

        expect(res.status).toBe(200);
        expect(res.text).toContain("Accuracy");
        expect(res.text).toContain("80%");
        expect(res.text).toContain(
            "4 out of 5 finished bets had the correct winner or draw."
        );
        expect(res.text).toContain("Bet distribution");
        expect(res.text).toContain('id="user-bets-chart"');
        const oneOneIndex = res.text.indexOf("1:1");
        const twoOneIndex = res.text.indexOf("2:1");
        const twoZeroIndex = res.text.indexOf("2:0");

        expect(oneOneIndex).toBeGreaterThanOrEqual(0);
        expect(twoOneIndex).toBeGreaterThan(oneOneIndex);
        expect(twoZeroIndex).toBeGreaterThan(twoOneIndex);
        expect(res.text).not.toContain("0:2");
        expect(res.text).toContain('"count":3');
        expect(res.text).toContain('"goalDifference":0');
        expect(res.text).toContain('"goalDifference":1');
        expect(res.text).toContain('"goalDifference":2');
    });
});
