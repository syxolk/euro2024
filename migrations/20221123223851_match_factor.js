exports.up = async (knex) => {
    await knex.raw(`
        UPDATE match_type SET score_factor = 2 WHERE code = 'R16';
        UPDATE match_type SET score_factor = 3 WHERE code = 'QF';
        UPDATE match_type SET score_factor = 4 WHERE code = 'SF';
        UPDATE match_type SET score_factor = 5 WHERE code = 'Final';
    `);
};

exports.down = async (knex) => {};
