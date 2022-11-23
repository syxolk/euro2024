exports.up = async (knex) => {
    await knex.raw(`
        UPDATE match_type SET score_factor = 2 WHERE code = 'Round of 16';
        UPDATE match_type SET score_factor = 3 WHERE code = 'Quarter-final';
        UPDATE match_type SET score_factor = 4 WHERE code = 'Semi-final';
        UPDATE match_type SET score_factor = 5 WHERE code = 'Play-off for third place';
        UPDATE match_type SET score_factor = 5 WHERE code = 'Final';
    `);
};

exports.down = async (knex) => {};
