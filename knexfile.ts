import type { Knex } from "knex";

export const development: Knex.Config = {
    client: "postgresql",
    connection: {
        host: process.env.PGHOST || "localhost",
        port: Number(process.env.PGPORT || 5432),
        database: "cup2026",
        user: "cup2026",
        password: "123456",
        application_name: "knex-development",
    },
    migrations: {
        tableName: "knex_migrations",
        loadExtensions: [".js", ".ts"],
    },
    debug: false,
    asyncStackTraces: true,
    pool: {
        min: 0,
        max: 1,
    },
};

export const production: Knex.Config = {
    client: "postgresql",
    connection: {
        host: process.env.PGHOST,
        port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        application_name: "knex-production",
    },
    pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        propagateCreateError: false,
    },
    migrations: {
        tableName: "knex_migrations",
        loadExtensions: [".js", ".ts"],
    },
};
