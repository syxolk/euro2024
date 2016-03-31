require('coffee-script').register();
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

    Team.bulkCreate(data.teams).then(function() {
        return Team.findAll();
    }).then(function(teams) {
        return Bluebird.map(data.matches, function(match) {
            return Match.create({
                when: new Date(match.when),
                'HomeTeamId': getTeamByCode(teams, match.home).id,
                'AwayTeamId': getTeamByCode(teams, match.away).id
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
