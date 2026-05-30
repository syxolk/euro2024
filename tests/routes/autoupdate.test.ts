import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { knex } from "../../db";
import { seedMatch, seedTeam, truncateTables } from "../helpers";

vi.mock("axios");

describe("GET /autoupdate_match_result", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
        vi.resetAllMocks();
    });

    it("returns ok when there are no live matches to update", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app).get("/autoupdate_match_result");
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ ok: true });
    });

    it("updates match results from FIFA API (mocked)", async () => {
        const axios = await import("axios");
        const homeTeamId = await seedTeam(knex, { name: "France", code: "FRA", fifa_id: "fra-1" });
        const awayTeamId = await seedTeam(knex, { name: "Germany", code: "GER", fifa_id: "ger-1" });
        const fifaId = 42001;
        await seedMatch(knex, {
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            starts_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            fifa_id: String(fifaId),
        });

        vi.mocked(axios.default.get).mockResolvedValue({
            data: {
                Results: [
                    {
                        IdMatch: fifaId,
                        HomeTeamScore: 2,
                        AwayTeamScore: 1,
                        MatchStatus: "Finished",
                    },
                ],
            },
        } as any);

        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app).get("/autoupdate_match_result");
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);

        const match = await knex("match").where({ fifa_id: String(fifaId) }).first();
        expect(match.goals_home).toBe(2);
        expect(match.goals_away).toBe(1);
    });
});

describe("GET /autoupdate_match_teams", () => {
    beforeEach(async () => {
        await truncateTables(knex);
    });

    afterEach(async () => {
        await truncateTables(knex);
        vi.resetAllMocks();
    });

    it("returns ok when there are no matches with missing teams", async () => {
        const homeTeamId = await seedTeam(knex, { name: "Spain", code: "ESP", fifa_id: "esp-1" });
        const awayTeamId = await seedTeam(knex, { name: "Italy", code: "ITA", fifa_id: "ita-1" });
        await seedMatch(knex, { home_team_id: homeTeamId, away_team_id: awayTeamId });

        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app).get("/autoupdate_match_teams");
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ ok: true });
    });

    it("updates team assignments from FIFA API (mocked)", async () => {
        const axios = await import("axios");
        const fifaTeamId = 75001;
        const teamId = await seedTeam(knex, {
            name: "Portugal",
            code: "POR",
            fifa_id: String(fifaTeamId),
        });
        const fifaMatchId = 55001;
        await seedMatch(knex, {
            home_team_id: null,
            away_team_id: null,
            fifa_id: String(fifaMatchId),
        });

        vi.mocked(axios.default.get).mockResolvedValue({
            data: {
                Results: [
                    {
                        IdMatch: fifaMatchId,
                        Home: { IdTeam: fifaTeamId },
                        Away: undefined,
                    },
                ],
            },
        } as any);

        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const res = await supertest(app).get("/autoupdate_match_teams");
        expect(res.status).toBe(200);

        const match = await knex("match").where({ fifa_id: String(fifaMatchId) }).first();
        expect(match.home_team_id).toBe(teamId);
    });
});
