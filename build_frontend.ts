import { build, context } from "esbuild";

const watchMode = process.argv.includes("--watch");
const production = process.env.NODE_ENV === "production";

const buildOptions = {
    bundle: true,
    entryPoints: ["frontend/index.ts"],
    format: "iife" as const,
    logLevel: "info" as const,
    minify: production,
    outfile: "static/dist/app.js",
    platform: "browser" as const,
    sourcemap: production ? false : ("linked" as const),
    target: ["es2020"],
};

async function run() {
    if (watchMode) {
        const buildContext = await context(buildOptions);
        await buildContext.watch();
        console.log("Watching frontend bundle...");
        return;
    }

    await build(buildOptions);
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
