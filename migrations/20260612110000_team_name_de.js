import germanTeamNames from "../tools/worldcup2026/german_team_names.json";

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.schema.table("team", (table) => {
        table.text("name_de");
    });

    const entries = Object.entries(germanTeamNames.teams);

    for (const [code, nameDe] of entries) {
        await knex("team").where({ code }).update({ name_de: nameDe });
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.schema.table("team", (table) => {
        table.dropColumn("name_de");
    });
};