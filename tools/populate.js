const fs = require('fs');
const Bluebird = require('bluebird');
const instance = require('../models').instance;

if(process.argv.length !== 3) {
    console.log("Usage: node populate.js <file>");
    process.exit(1);
}

instance.sync({force: true}).then(function () {
    var data = JSON.parse(fs.readFileSync(process.argv[2]));

    const Team = instance.model('Team');
    const Match = instance.model('Match');
    const MatchType = instance.model('MatchType');

    Team.bulkCreate(data.teams).then(function() {
        return MatchType.bulkCreate(data.types);
    }).then(function() {
        return [Team.findAll(), MatchType.findAll()];
    }).spread(function(teams, matchTypes) {
        return Bluebird.map(data.matches, function(match) {
            return Match.create({
                when: new Date(match.when),
                'HomeTeamId': getTeamByCode(teams, match.home).id,
                'AwayTeamId': getTeamByCode(teams, match.away).id,
                'MatchTypeId': getMatchTypeByCode(matchTypes, match.type).id
            });
        });
    }).then(function() {
        console.log('Yay');
        process.exit(0);
    });
});

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
