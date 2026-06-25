import { z } from "zod";

export enum FifaApiMatchStatus {
    Finished = 0,
    NotStarted = 1,
    Live = 3,
    Interrupted = 11,
}

export const FifaApiTeamSchema = z.object({
    IdTeam: z.string(),
});

export const FifaApiMatchSchema = z.object({
    IdMatch: z.string(),
    HomeTeamScore: z.int().nullable(),
    AwayTeamScore: z.int().nullable(),
    MatchStatus: z.int(),
    Home: FifaApiTeamSchema.nullable().optional(),
    Away: FifaApiTeamSchema.nullable().optional(),
});

export const FifaApiResponseSchema = z.object({
    Results: z.array(FifaApiMatchSchema),
});
