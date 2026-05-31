import knexFactory, { type Knex } from "knex";
import {development, production, test} from "./knexfile";

function getConfig(): Knex.Config {
    const environment = process.env.NODE_ENV || "development";
    if (environment === "production") {
        return production;
    } else if (environment === "test") {
        return test;
    } else {
        return development;
    }
}

export const knex = knexFactory(getConfig());

