exports.up = async (knex) => {
    await knex.schema.alterTable("user_account", (table) => {
        table.boolean("is_bot").notNullable().defaultTo(false);
    });
};

exports.down = async (knex) => {
    await knex.schema.alterTable("user_account", (table) => {
        table.dropColumn("is_bot");
    });
};
