'use strict';

module.exports = {
    up: (queryInterface, Sequelize, seq) => {
        return seq.transaction((t) => {
            return queryInterface.addColumn("User", "pastMatchesLastVisitedAt", {
                type: Sequelize.DATE
            }, {
                transaction: t
            }).then(() => {
                return queryInterface.addColumn("Match", "goalsInsertedAt", {
                    type: Sequelize.DATE
                }, {
                    transaction: t
                });
            });
        });
    },

    down: (queryInterface, Sequelize) => {
        // TODO
    }
};
