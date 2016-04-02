const Sequelize = require('sequelize');
const config = require('./config');

const instance = new Sequelize(config.db, {
    define: {
        freezeTableName: true
    }
});
module.exports.instance = instance;

// Model definitions
const User = instance.define('User', {
    facebookId: {type: Sequelize.STRING, unique: true},
    name: {type: Sequelize.STRING, allowNull: false, validate: {len: [3, 40]}}
});

const Team = instance.define('Team', {
    name: {type: Sequelize.STRING, allowNull: false, validate: {len: [1, 100]}},
    code: {type: Sequelize.STRING, allowNull: false, validate: {len: [1,10]}}
}, {
    timestamps: false
});

const Match = instance.define('Match', {
    goalsHome: Sequelize.INTEGER,
    goalsAway: Sequelize.INTEGER,
    when: {type: Sequelize.DATE, allowNull: false}
}, {
    instanceMethods: {
        isExpired: function() {
            return new Date() >= this.when;
        }
    }
});

const MatchType = instance.define('MatchType', {
    code: {type: Sequelize.STRING, allowNull: false, validate: {len: [1, 10]}},
    name: {type: Sequelize.STRING, allowNull: false, validate: {len: [1, 100]}}
}, {
    timestamps: false
});

const Bet = instance.define('Bet', {
    goalsHome: {type: Sequelize.INTEGER, allowNull: false},
    goalsAway: {type: Sequelize.INTEGER, allowNull: false}
}, {
    indexes : [
        {
            unique: true,
            fields: ['UserId', 'MatchId']
        }
    ]
});

// Associations
Bet.belongsTo(User);
User.hasMany(Bet);

Bet.belongsTo(Match);
Match.hasMany(Bet);

Match.belongsTo(Team, {as: 'HomeTeam'});
Match.belongsTo(Team, {as: 'AwayTeam'});
Match.belongsTo(MatchType);
