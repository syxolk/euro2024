import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globalSetup: "./tests/setup.ts",
        pool: "forks",
        poolOptions: {
            forks: {
                singleFork: true,
            },
        },
        testTimeout: 30000,
    },
});
