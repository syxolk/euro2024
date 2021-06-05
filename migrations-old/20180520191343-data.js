'use strict';

const fs = require("fs");
const data = require("../tools/worldcup2018.json");

module.exports = {
    up: (queryInterface, Sequelize, seq) => {
        function getTeamByCode(teams, code) {
            for(var i = 0; i < teams.length; i++) {
                if(teams[i].code === code) {
                    return teams[i];
                }
            }
            return null;
        }

        function getMatchTypeByCode(matchTypes, code) {
            for(var i = 0; i < matchTypes.length; i++) {
                if(matchTypes[i].code === code) {
                    return matchTypes[i];
                }
            }
            return null;
        }

        return seq.transaction((t) => {
            return queryInterface.bulkInsert("Team", data.teams, {transaction: t}).then(function() {
                return queryInterface.bulkInsert("MatchType", data.types, {transaction: t});
            }).then(function() {
                return [
                    seq.query('SELECT * FROM "Team"', {transaction: t, type: seq.QueryTypes.SELECT}),
                    seq.query('SELECT * FROM "MatchType"', {transaction: t, type: seq.QueryTypes.SELECT}),
                ];
            }).spread(function(teams, matchTypes) {
                console.log(teams);
                const matchesForInsert = data.matches.map((match) => ({
                    when: new Date(match.when),
                    HomeTeamId: getTeamByCode(teams, match.home).id,
                    AwayTeamId: getTeamByCode(teams, match.away).id,
                    MatchTypeId: getMatchTypeByCode(matchTypes, match.type).id,
                }));

                return queryInterface.bulkInsert("Match", matchesForInsert, {transaction: t});
            });
        });
    },

    down: (queryInterface, Sequelize) => {
        // Better not delete anything
        /*return seq.query(`
            DELETE FROM "Match";
            DELETE FROM "MatchType";
            DELETE FROM "Team";
        `, {raw: true});*/
    }
};
