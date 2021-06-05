'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.sequelize.transaction((t) => {
            return queryInterface.addColumn("User", "passwordResetToken", {
                type: Sequelize.UUID,
                unique: true,
            }, {transaction: t}).then(() => {
                return queryInterface.addColumn("User", "passwordResetCreatedAt", {
                    type: Sequelize.DATE
                }, {transaction: t});
            });
        });
    },

    down: (queryInterface, Sequelize) => {
        // TODO
    }
};
