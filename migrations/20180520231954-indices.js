'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.addIndex("Bet", {
            unique: true,
            fields: ['UserId', 'MatchId']
        }).then(() => {
            return queryInterface.addIndex("History", {
                unique: true,
                fields: ['UserId', 'MatchId']
            });
        }).then(() => {
            return queryInterface.addIndex("Friend", {
                unique: true,
                fields: ['FromUserId', 'ToUserId']
            });
        });
    },

    down: (queryInterface, Sequelize) => {
    }
};
