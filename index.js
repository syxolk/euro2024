require('coffee-script').register();
const express = require('express');
const hbs = require('hbs');
const session = require('express-session');
const Store = require('express-sequelize-session')(session.Store);
const passport = require('passport');
const bodyParser = require('body-parser');
const compression = require('compression');
const moment = require('moment');
const csrf = require('csurf');
const fs = require('fs');
const routes = require('./routes');
const config = require('./config');
const instance = require('./models').instance;

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    instance.model('User').findById(id).then(function(user) {
        done(null, user);
    }).catch(function(err) {
        done(err, false);
    });
});

hbs.registerPartials(__dirname + '/views/partials');

const app = express();
app.set('view engine', 'hbs');
app.set('views', __dirname + '/views');
app.disable('x-powered-by');
app.enable('strict routing');
app.enable('case sensitive routing');

app.locals.origin = config.origin;
hbs.localsAsTemplateData(app);

hbs.registerHelper('calendar', function(when) {
    return moment(when).format('dddd, MMMM Do, H:mm');
});

hbs.registerHelper('calendarShort', function(when) {
    return moment(when).format('MMM D, H:mm');
});

hbs.registerHelper('expired', function(match) {
    return match.isExpired();
});

hbs.registerHelper('scoreClass', function(match) {
    const betHome = this.Bets && this.Bets[0] ? this.Bets[0].goalsHome : NaN;
    const betAway = this.Bets && this.Bets[0] ? this.Bets[0].goalsAway : NaN;

    if(Number.isInteger(betHome) && Number.isInteger(betAway) &&
        Number.isInteger(this.goalsHome) && Number.isInteger(this.goalsAway)) {

        if(betHome === this.goalsHome && betAway === this.goalsAway) {
            return 'score-3';
        } else if(betHome - betAway === this.goalsHome - this.goalsAway) {
            return 'score-2';
        } else if(Math.sign(betHome - betAway) === Math.sign(this.goalsHome - this.goalsAway)) {
            return 'score-1';
        }
    }

    return 'score-0';
});

app.use(compression());
app.use(express.static(__dirname + '/bower_components', { maxAge: '1d' }));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(session({
    name: 'sid',
    secret: config.sessionSecret,
    store: new Store(instance),
    resave: false,
    saveUninitialized: true
}));
app.use(csrf());
app.use(passport.initialize());
app.use(passport.session());

routes(app);

instance.sync().then(function() {
    return instance.query(fs.readFileSync(__dirname + '/functions.sql').toString('utf8'), {raw: true});
}).then(function () {
    app.listen(config.httpPort, function() {
        console.log('Visit %s', config.origin);
    });
});
