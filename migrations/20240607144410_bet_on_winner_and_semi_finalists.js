exports.up = async (knex) => {
    await knex.schema.createTable("extra_bet", (table) => {
        table.increments("id");
        table.text("name").notNullable();
        table.integer("number_of_teams").notNullable();
        table.timestamp("editable_until").notNullable();
        table.integer("score_factor").notNullable();
    });

    await knex("extra_bet").insert([
        {
            name: "Winner",
            number_of_teams: 1,
            editable_until: "2024-06-14T19:00:00Z",
            score_factor: 10,
        },
        {
            name: "Semi-Finalists",
            number_of_teams: 4,
            editable_until: "2024-06-14T19:00:00Z",
            score_factor: 6,
        },
    ]);

    await knex.schema.createTable("user_account_extra_bet", (table) => {
        table.integer("user_id").notNullable();
        table.integer("extra_bet_id").notNullable();
        table.primary(["user_id", "extra_bet_id"]);
        table.specificType("selected_team_ids", "integer[]");
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable("user_account_extra_bet");
    await knex.schema.dropTable("extra_bet");
};
