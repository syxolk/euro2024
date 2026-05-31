/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // Add invite_code column to user_account (nullable first so we can backfill)
    await knex.schema.table("user_account", (table) => {
        table.text("invite_code").unique();
    });

    // Backfill existing users with randomly generated 8-char uppercase alphanumeric codes
    const users = await knex("user_account").select("id");
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    function generateCode() {
        let code = "";
        for (let i = 0; i < 8; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }

    for (const user of users) {
        let code;
        let unique = false;
        // Retry until we get a unique code (astronomically unlikely to collide)
        while (!unique) {
            code = generateCode();
            const existing = await knex("user_account")
                .where({ invite_code: code })
                .first();
            if (!existing) {
                unique = true;
            }
        }
        await knex("user_account").where({ id: user.id }).update({ invite_code: code });
    }

    // Now make the column NOT NULL
    await knex.schema.raw(
        `ALTER TABLE user_account ALTER COLUMN invite_code SET NOT NULL`
    );

    // Create invitation table to track who invited who
    await knex.schema.createTable("invitation", (table) => {
        table.increments("id").primary();
        table
            .integer("inviter_id")
            .notNullable()
            .references("id")
            .inTable("user_account")
            .onDelete("CASCADE");
        table
            .integer("invitee_id")
            .notNullable()
            .references("id")
            .inTable("user_account")
            .onDelete("CASCADE");
        table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
        table.unique(["invitee_id"]); // each user was invited by exactly one person
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.schema.dropTable("invitation");

    await knex.schema.table("user_account", (table) => {
        table.dropColumn("invite_code");
    });
};
