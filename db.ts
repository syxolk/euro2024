import knexFactory, { type Knex } from "knex";
import {development, production} from "./knexfile";

function getConfig(): Knex.Config {
    const environment = process.env.NODE_ENV || "development";
    if (environment === "production") {
        return production;
    } else {
        return development;
    }
}

export const knex = knexFactory(getConfig());

