const data = require("../tools/euro2024/euro2024.json");

exports.up = async (knex) => {
    const teams = await knex("team").insert(data.teams).returning(["id"]);
    const types = await knex("match_type").insert(data.types).returning(["id"]);

    await knex("match").insert(
        data.matches.map((x) => ({
            ...x,
            home_team_id:
                x.home_team_id === null ? null : teams[x.home_team_id].id,
            away_team_id:
                x.away_team_id === null ? null : teams[x.away_team_id].id,
            match_type_id: types[x.match_type_id].id,
        }))
    );
};

exports.down = function (knex) {};
