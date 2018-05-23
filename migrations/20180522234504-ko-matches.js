'use strict';

const data = require("../tools/worldcup2018-ko-matches.json");

module.exports = {
    up: (queryInterface, Sequelize, seq) => {
        function getMatchTypeByCode(matchTypes, code) {
            for(var i = 0; i < matchTypes.length; i++) {
                if(matchTypes[i].code === code) {
                    return matchTypes[i];
                }
            }
            return null;
        }

        return seq.transaction((t) => {
            return seq.query(`
                ALTER TABLE "Match"
                    ALTER COLUMN "HomeTeamId" DROP NOT NULL,
                    ALTER COLUMN "AwayTeamId" DROP NOT NULL,
                    ADD COLUMN "placeholderHome" TEXT,
                    ADD COLUMN "placeholderAway" TEXT;
            `, {raw: true, transaction: t}).then(() => {
                return seq.query('SELECT * FROM "MatchType"',
                    {transaction: t, type: seq.QueryTypes.SELECT});
            }).then((matchTypes) => {
                const matchesForInsert = data.map((match) => ({
                    when: new Date(match.when),
                    placeholderHome: match.placeholderHome,
                    placeholderAway: match.placeholderAway,
                    MatchTypeId: getMatchTypeByCode(matchTypes, match.type).id,
                }));

                return queryInterface.bulkInsert("Match", matchesForInsert, {transaction: t});
            });
        });
    },

    down: (queryInterface, Sequelize) => {
        // TODO
    }
};
