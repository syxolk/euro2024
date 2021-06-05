'use strict';

module.exports = {
    up: (queryInterface, Sequelize, seq) => {
        return seq.transaction(function (t) {
            return queryInterface.createTable("User", {
                id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false},
                facebookId: {type: Sequelize.STRING, unique: true},
                googleId: {type: Sequelize.STRING, unique: true},
                name: {type: Sequelize.STRING, allowNull: false},
                email: {type: Sequelize.STRING, unique: true},
                password: {type: Sequelize.STRING},
                emailConfirmed: {type: Sequelize.BOOLEAN},
                emailConfirmToken: {type: Sequelize.UUID, unique: true},
                admin: {type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false},
                createdAt: {type: Sequelize.DATE, allowNull: false},
                updatedAt: {type: Sequelize.DATE, allowNull: false},
            }, {transaction: t}).then(() =>
                queryInterface.createTable("Team", {
                    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false},
                    name: {type: Sequelize.STRING, allowNull: false},
                    code: {type: Sequelize.STRING, allowNull: false},
                }, {transaction: t})
            ).then(() =>
                queryInterface.createTable("MatchType", {
                    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false},
                    code: {type: Sequelize.STRING, allowNull: false},
                    name: {type: Sequelize.STRING, allowNull: false},
                }, {transaction: t})
            ).then(() =>
                queryInterface.createTable("Match", {
                    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false},
                    goalsHome: Sequelize.INTEGER,
                    goalsAway: Sequelize.INTEGER,
                    when: {type: Sequelize.DATE, allowNull: false},
                    tv: Sequelize.STRING,
                    HomeTeamId: {
                        type: Sequelize.INTEGER,
                        allowNull: false,
                        references: {
                            model: "Team",
                            key: "id",
                        },
                        onDelete: "cascade",
                    },
                    AwayTeamId: {
                        type: Sequelize.INTEGER,
                        allowNull: false,
                        references: {
                            model: "Team",
                            key: "id",
                        },
                        onDelete: "cascade",
                    },
                    MatchTypeId: {
                        type: Sequelize.INTEGER,
                        allowNull: false,
                        references: {
                            model: "MatchType",
                            key: "id",
                        },
                        onDelete: "cascade",
                    }
                }, {transaction: t})
            ).then(() =>
                queryInterface.createTable("Bet", {
                    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false},
                    goalsHome: {type: Sequelize.INTEGER, allowNull: false},
                    goalsAway: {type: Sequelize.INTEGER, allowNull: false},
                    UserId: {
                        type: Sequelize.INTEGER,
                        allowNull: false,
                        references: {
                            model: "User",
                            key: "id",
                        },
                        onDelete: "cascade",
                    },
                    MatchId: {
                        type: Sequelize.INTEGER,
                        allowNull: false,
                        references: {
                            model: "Match",
                            key: "id",
                        },
                        onDelete: "cascade",
                    },
                    createdAt: {type: Sequelize.DATE, allowNull: false},
                    updatedAt: {type: Sequelize.DATE, allowNull: false},
                }, {transaction: t})
            ).then(() =>
                queryInterface.createTable("News", {
                    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false},
                    headline: {type: Sequelize.TEXT, allowNull: false},
                    createdAt: {type: Sequelize.DATE, allowNull: false},
                    updatedAt: {type: Sequelize.DATE, allowNull: false},
                }, {transaction: t})
            ).then(() =>
                queryInterface.createTable("History", {
                    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false},
                    rank: {type: Sequelize.INTEGER, allowNull: false},
                    UserId: {
                        type: Sequelize.INTEGER,
                        allowNull: false,
                        references: {
                            model: "User",
                            key: "id",
                        },
                        onDelete: "cascade",
                    },
                    MatchId: {
                        type: Sequelize.INTEGER,
                        allowNull: false,
                        references: {
                            model: "Match",
                            key: "id",
                        },
                        onDelete: "cascade",
                    },
                }, {transaction: t})
            ).then(() =>
                queryInterface.createTable("Friend", {
                    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false},
                    FromUserId: {
                        type: Sequelize.INTEGER,
                        allowNull: false,
                        references: {
                            model: "User",
                            key: "id",
                        },
                        onDelete: "cascade",
                    },
                    ToUserId: {
                        type: Sequelize.INTEGER,
                        allowNull: false,
                        references: {
                            model: "User",
                            key: "id",
                        },
                        onDelete: "cascade",
                    },
                    createdAt: {type: Sequelize.DATE, allowNull: false},
                    updatedAt: {type: Sequelize.DATE, allowNull: false},
                }, {transaction: t})
            ).then(() =>
                queryInterface.createTable("Session", {
                    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false},
                    sid: {type: Sequelize.TEXT, allowNull: false},
                    data: {type: Sequelize.TEXT},
                    createdAt: {type: Sequelize.DATE, allowNull: false},
                    updatedAt: {type: Sequelize.DATE, allowNull: false},
                }, {transaction: t})
            );
        })
    },

    down: (queryInterface, Sequelize, seq) => {
        return seq.query(`
            DROP TABLE "Friend";
            DROP TABLE "History";
            DROP TABLE "News";
            DROP TABLE "Bet";
            DROP TABLE "Match";
            DROP TABLE "MatchType";
            DROP TABLE "Team";
            DROP TABLE "User";
        `, {raw: true});
    }
};
