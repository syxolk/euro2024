import { execSync, spawnSync } from "child_process";
import path from "path";

const COMPOSE_FILE = path.resolve(__dirname, "../docker-compose.test.yml");

function waitForPostgres(maxAttempts = 30, intervalMs = 1000): void {
    for (let i = 0; i < maxAttempts; i++) {
        const result = spawnSync(
            "docker",
            [
                "compose",
                "-f",
                COMPOSE_FILE,
                "exec",
                "-T",
                "db_test",
                "pg_isready",
                "-U",
                "cup2026_test",
            ],
            { stdio: "pipe" }
        );
        if (result.status === 0) return;
        execSync(`sleep ${intervalMs / 1000}`);
    }
    throw new Error("PostgreSQL did not become ready in time");
}

export async function setup(): Promise<void> {
    process.env.NODE_ENV = "test";

    console.log("Starting test database...");
    execSync(`docker compose -f "${COMPOSE_FILE}" up -d`, { stdio: "inherit" });

    console.log("Waiting for PostgreSQL...");
    waitForPostgres();

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
    console.log("Stopping test database...");
    execSync(`docker compose -f "${COMPOSE_FILE}" down`, { stdio: "inherit" });
}
