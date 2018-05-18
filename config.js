module.exports = {
    origin: process.env.ORIGIN || 'http://localhost:8080',
    db: process.env.DB_URL || 'postgres://wm2018:123456@localhost:5432/wm2018',
    httpPort: process.env.PORT || 8080,
    sessionSecret: process.env.SESSION_SECRET || 'octocat',
};
