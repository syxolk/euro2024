import { execSync } from "child_process";
import path from "path";

const COMPOSE_FILE = path.resolve(__dirname, "../docker-compose.test.yml");

export async function setup(): Promise<void> {
    process.env.NODE_ENV = "test";

    console.log("Starting test database...");
    // --wait blocks until all services with healthchecks are healthy
    execSync(`docker compose -f "${COMPOSE_FILE}" up -d --wait`, { stdio: "inherit" });

    console.log("Running migrations...");
    execSync(
        `NODE_ENV=test tsx ./node_modules/knex/bin/cli.js --knexfile knexfile.ts migrate:latest`,
        {
            stdio: "inherit",
            cwd: path.resolve(__dirname, ".."),
        }
    );

    console.log("Test database ready.");
}

export async function teardown(): Promise<void> {
    // Don't teardown for faster test iterations during development.
    // console.log("Stopping test database...");
    // execSync(`docker compose -f "${COMPOSE_FILE}" down`, { stdio: "inherit" });
}
