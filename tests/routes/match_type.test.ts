import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { knex } from "../../db";
import {
    createTestUser,
    seedMatch,
    seedMatchType,
    seedTeam,
    truncateTables,
} from "../helpers";

describe("GET /match_type/:code", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
    });

    it("returns 404 for an unknown match type code", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app).get("/match_type/UNKNOWN");

        expect(res.status).toBe(404);
    });

    it("shows all matches of one type but only shows bets after kickoff", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const matchTypeId = await seedMatchType(knex, {
            id: 7,
            code: "KO",
            name: "Knockout Stage",
            score_factor: 3,
        });
        const homeTeamId = await seedTeam(knex, {
            name: "Alpha",
            code: "ALP",
            fifa_id: "alpha-1",
        });
        const awayTeamId = await seedTeam(knex, {
            name: "Beta",
            code: "BET",
            fifa_id: "beta-1",
        });
        const futureHomeTeamId = await seedTeam(knex, {
            name: "Gamma",
            code: "GAM",
            fifa_id: "gamma-1",
        });
        const futureAwayTeamId = await seedTeam(knex, {
            name: "Delta",
            code: "DEL",
            fifa_id: "delta-1",
        });
        const startedMatchId = await seedMatch(knex, {
            starts_at: new Date(Date.now() - 60 * 1000),
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            match_type_id: matchTypeId,
            fifa_id: "started-match",
        });
        await seedMatch(knex, {
            starts_at: new Date(Date.now() + 60 * 60 * 1000),
            home_team_id: futureHomeTeamId,
            away_team_id: futureAwayTeamId,
            match_type_id: matchTypeId,
            fifa_id: "future-match",
        });

        const visibleUser = await createTestUser(knex, {
            email: "visible-match-type@example.com",
            name: "Visible Bettor",
        });
        await knex("bet").insert([
            {
                user_id: visibleUser.id,
                match_id: startedMatchId,
                goals_home: 2,
                goals_away: 1,
            },
        ]);

        const res = await supertest(app).get("/match_type/KO");

        expect(res.status).toBe(200);
        expect(res.text).toContain("Alpha");
        expect(res.text).toContain("Gamma");
        expect(res.text).toContain("Visible Bettor");
        expect(res.text).toContain("2:1");
        expect(res.text).toContain(
            "Bets will be shown once the match has started."
        );
    });
});
