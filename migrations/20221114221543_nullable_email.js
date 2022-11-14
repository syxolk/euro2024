exports.up = async (knex) => {
    await knex.schema.raw(`
        alter table user_account
        alter column email drop not null;
    `);
};

exports.down = async (knex) => {
    await knex.schema.raw(`
        alter table user_account
        alter column email drop set not null;
    `);
};
