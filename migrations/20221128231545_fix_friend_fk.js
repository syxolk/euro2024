exports.up = async (knex) => {
    await knex.raw(`
        alter table friend
        drop constraint friend_from_user_id_fkey,
        drop constraint friend_to_user_id_fkey;
    `);

    await knex.raw(`
        alter table friend
        add constraint friend_from_user_id_fkey foreign key (from_user_id)
        references user_account(id) on delete cascade;
    `);

    await knex.raw(`
        alter table friend
        add constraint friend_to_user_id_fkey foreign key (to_user_id)
        references user_account(id) on delete cascade;
    `);
};

exports.down = async (knex) => {
    // rollback is not needed
};
