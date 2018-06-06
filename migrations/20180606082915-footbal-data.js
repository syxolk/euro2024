'use strict';
const instance = require('../models').instance;
const Team = instance.model('Team');
const Match = instance.model('Match');
const moment = require('moment');
const data = require("../tools/fixtures-wc2018.json");
const Sequelize2 = require('sequelize');
const Op = Sequelize2.Op;

module.exports = {
  up: (queryInterface, Sequelize, seq) => {
    queryInterface.addColumn(
      'Match',
      'FixtureId',
      Sequelize.STRING
    );

    function getFixtureIdByTeamName(fixtures, homeTeam, awayTeam) {
      for (var i = 0; i < fixtures.length; i++) {
        if (fixtures[i].homeTeamName === homeTeam && fixtures[i].awayTeamName === awayTeam) {
          var result = fixtures[i]._links.self.href.match(/.*\/(.*)$/)[1];
          return result;
        }
      }
      return null;
    }

    Match.findAll({
      where: {
        goalsHome: null,
        goalsAway: null,
        HomeTeamId: {
          [Op.ne]: null
        },
        AwayTeamId: {
          [Op.ne]: null
        },
      },
      include: [{
        model: Team,
        as: 'HomeTeam'
      }, {
        model: Team,
        as: 'AwayTeam'
      }],
      order: [
        ['when', 'ASC']
      ]
    }).then(elements=> {
      var values = new Array();
      elements.forEach(element => {
        var fixtureId = getFixtureIdByTeamName(data.fixtures, element.HomeTeam.name, element.AwayTeam.name);
        var toPush = element.get({plain:true});
        delete toPush.HomeTeam;
        delete toPush.AwayTeam;
        toPush.FixtureId = fixtureId;
        values.push(toPush);
      });
      console.log('first element', values[0]);
      return [values];
    }).spread(function(matches){
      //console.log('first element', matches[0]);
      return seq.transaction((t) => {
        queryInterface.bulkDelete("Match", {
          goalsHome: null,
          goalsAway: null,
          HomeTeamId: {[Op.ne]: null},
          AwayTeamId: {[Op.ne]: null},
        }, {transaction: t});
        //console.log('matches:', matches);
        return queryInterface.bulkInsert("Match", matches, {transaction: t});
      });
  
    });
  },

  down: (queryInterface, Sequelize) => {
    queryInterface.removeColumn(
      'Match',
      'FixtureId',
      Sequelize.STRING
    );
  }
};