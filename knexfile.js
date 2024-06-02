module.exports = {
    development: {
        client: "postgresql",
        connection: {
            host: process.env.PGHOST || "localhost",
            port: process.env.PGPORT || 5432,
            database: "cup2024",
            user: "cup2024",
            password: "123456",
            application_name: "knex-development",
        },
        migrations: {
            tableName: "knex_migrations",
        },
        debug: false,
        asyncStackTraces: true,
        pool: {
            min: 0,
            max: 1,
        },
    },
    production: {
        client: "postgresql",
        connection: {
            host: process.env.PGHOST,
            port: process.env.PGPORT,
            database: process.env.PGDATABASE,
            user: process.env.PGUSER,
            password: process.env.PGPASSWORD,
            application_name: "knex-production",
        },
        pool: {
            // See here for all config options:
            // https://github.com/vincit/tarn.js/

            min: 2,
            max: 10,

            // acquire promises are rejected after this many milliseconds
            // if a resource cannot be acquired
            acquireTimeoutMillis: 30000,

            // create operations are cancelled after this many milliseconds
            // if a resource cannot be acquired
            createTimeoutMillis: 30000,

            // If true, when a create fails, the first pending acquire is
            // rejected with the error. If this is false (the default) then
            // create is retried until acquireTimeoutMillis milliseconds has
            // passed.
            propagateCreateError: false,
        },
        migrations: {
            tableName: "knex_migrations",
        },
    },
};
