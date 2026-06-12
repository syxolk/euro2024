import germanTeamNames from "../tools/worldcup2026/german_team_names.json";

const germanMatchTypeNames = {
    Final: "Finale",
    "Group A": "Gruppe A",
    "Group B": "Gruppe B",
    "Group C": "Gruppe C",
    "Group D": "Gruppe D",
    "Group E": "Gruppe E",
    "Group F": "Gruppe F",
    "Group G": "Gruppe G",
    "Group H": "Gruppe H",
    "Group I": "Gruppe I",
    "Group J": "Gruppe J",
    "Group K": "Gruppe K",
    "Group L": "Gruppe L",
    "Play-off for third place": "Spiel um Platz drei",
    "Quarter-final": "Viertelfinale",
    "Round of 16": "Achtelfinale",
    "Round of 32": "Sechzehntelfinale",
    "Semi-final": "Halbfinale",
};

const germanExtraBetNames = {
    Winner: "Sieger",
    "Semi-Finalists": "Halbfinalisten",
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.schema.table("team", (table) => {
        table.text("name_de");
    });

    await knex.schema.table("match_type", (table) => {
        table.text("name_de");
    });

    await knex.schema.table("extra_bet", (table) => {
        table.text("name_de");
    });

    const teamEntries = Object.entries(germanTeamNames.teams);

    for (const [code, nameDe] of teamEntries) {
        await knex("team").where({ code }).update({ name_de: nameDe });
    }

    const matchTypeEntries = Object.entries(germanMatchTypeNames);

    for (const [code, nameDe] of matchTypeEntries) {
        await knex("match_type").where({ code }).update({ name_de: nameDe });
    }

    const extraBetEntries = Object.entries(germanExtraBetNames);
    for (const [name, nameDe] of extraBetEntries) {
        await knex("extra_bet").where({ name }).update({ name_de: nameDe });
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.schema.table("match_type", (table) => {
        table.dropColumn("name_de");
    });

    await knex.schema.table("team", (table) => {
        table.dropColumn("name_de");
    });

    await knex.schema.table("extra_bet", (table) => {
        table.dropColumn("name_de");
    });
};
