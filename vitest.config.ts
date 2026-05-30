import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globalSetup: "./tests/setup.ts",
        include: ["tests/**/*.test.ts"],
        pool: "forks",
        singleFork: true,
        fileParallelism: false,
        testTimeout: 30000,
    },
});
