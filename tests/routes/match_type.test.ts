import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { knex } from "../../db";
import {
    authenticatedAgent,
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
            starts_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            match_type_id: matchTypeId,
            fifa_id: "started-match",
        });
        await seedMatch(knex, {
            starts_at: new Date(Date.now() + 2 * 60 * 60 * 1000),
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
        expect(res.text).toContain('data-bs-toggle="collapse" href="#match-1"');
        expect(res.text).toContain('data-bs-toggle="collapse" href="#match-2"');
        expect(res.text).toContain('id="match-2" class="collapse show"');
        expect(res.text).toContain(
            "Bets will be shown once the match has started."
        );
    });

    it("shows editable inputs for the logged-in user's bet before kickoff", async () => {
        const user = await createTestUser(knex, {
            email: "editable-match-type@example.com",
            name: "Editable User",
        });
        const ag = await authenticatedAgent(user);

        const matchTypeId = await seedMatchType(knex, {
            id: 9,
            code: "SEM",
            name: "Semi Finals",
            score_factor: 2,
        });
        const homeTeamId = await seedTeam(knex, {
            name: "North",
            code: "NOR",
            fifa_id: "north-1",
        });
        const awayTeamId = await seedTeam(knex, {
            name: "South",
            code: "SOU",
            fifa_id: "south-1",
        });
        const matchId = await seedMatch(knex, {
            starts_at: new Date(Date.now() + 60 * 60 * 1000),
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            match_type_id: matchTypeId,
            fifa_id: "editable-match",
        });

        await knex("bet").insert([
            {
                user_id: user.id,
                match_id: matchId,
                goals_home: 3,
                goals_away: 1,
            },
            {
                user_id: (
                    await createTestUser(knex, {
                        email: "hidden-match-type@example.com",
                        name: "Hidden User",
                    })
                ).id,
                match_id: matchId,
                goals_home: 0,
                goals_away: 0,
            },
        ]);

        const res = await ag.get("/match_type/SEM");

        expect(res.status).toBe(200);
        expect(res.text).toContain('name="_action" value="/save_bet"');
        expect(res.text).toContain(`name="match" value="${matchId}"`);
        expect(res.text).toContain('name="home" value="3"');
        expect(res.text).toContain('name="away" value="1"');
        expect(res.text).not.toContain("Hidden User");
        expect(res.text).toContain(
            "Bets will be shown once the match has started."
        );
    });

    it("groups bets by bet result when the match result is known", async () => {
        const { default: supertest } = await import("supertest");
        const { default: app } = await import("../../app");

        const matchTypeId = await seedMatchType(knex, {
            id: 8,
            code: "FIN",
            name: "Final",
            score_factor: 1,
        });
        const homeTeamId = await seedTeam(knex, {
            name: "Home",
            code: "HOM",
            fifa_id: "home-score-1",
        });
        const awayTeamId = await seedTeam(knex, {
            name: "Away",
            code: "AWY",
            fifa_id: "away-score-1",
        });
        const matchId = await seedMatch(knex, {
            starts_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            match_type_id: matchTypeId,
            fifa_id: "finished-match",
        });

        await knex("match").where({ id: matchId }).update({
            goals_home: 2,
            goals_away: 1,
            goals_inserted_at: new Date(),
        });

        const exactUser = await createTestUser(knex, {
            email: "exact-match-type@example.com",
            name: "Exact User",
        });
        const winnerUser = await createTestUser(knex, {
            email: "winner-match-type@example.com",
            name: "Winner User",
        });
        const wrongUser = await createTestUser(knex, {
            email: "wrong-match-type@example.com",
            name: "Wrong User",
        });

        await knex("bet").insert([
            {
                user_id: exactUser.id,
                match_id: matchId,
                goals_home: 2,
                goals_away: 1,
            },
            {
                user_id: winnerUser.id,
                match_id: matchId,
                goals_home: 3,
                goals_away: 2,
            },
            {
                user_id: wrongUser.id,
                match_id: matchId,
                goals_home: 0,
                goals_away: 1,
            },
        ]);

        const res = await supertest(app).get("/match_type/FIN");

        expect(res.status).toBe(200);
        expect(res.text).toContain("Exact User");
        expect(res.text).toContain("Winner User");
        expect(res.text).toContain("Wrong User");
        expect(res.text.indexOf("Exact User")).toBeLessThan(
            res.text.indexOf("Winner User")
        );
        expect(res.text.indexOf("Winner User")).toBeLessThan(
            res.text.indexOf("Wrong User")
        );
    });
});
