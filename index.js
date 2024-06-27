const express = require("express");
const hbs = require("hbs");
const session = require("express-session");
const KnexSessionStore = require("connect-session-knex")(session);
const passport = require("passport");
const compression = require("compression");
const csrf = require("csurf");
const helmet = require("helmet");
const ms = require("ms");
const morgan = require("morgan");
const flash = require("connect-flash");
const config = require("./config");
const { knex } = require("./db");
const i18next = require("i18next");
const middleware = require("i18next-http-middleware");

i18next.use(middleware.LanguageDetector).init({
    fallbackLng: "en",
    resources: {
        en: {
            translation: require("./locales/en.json"),
        },
        de: {
            translation: require("./locales/de.json"),
        },
        'pt-BR': {
            translation: require("./locales/pt-BR.json"),
        },
    },
    detection: {
        order: ["header"],
    },
});

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    knex("user_account")
        .where({ id: id })
        .select(
            "id",
            "name",
            "email",
            "admin",
            "past_matches_last_visited_at",
            "google_id as googleId",
            "facebook_id as facebookId"
        )
        .first()
        .then((user) => done(null, user))
        .catch((err) => done(err, false));
});

hbs.registerPartials(__dirname + "/views/partials");

const app = express();
app.set("view engine", "hbs");
app.set("views", __dirname + "/views");
app.set("trust proxy", config.trustProxy);
app.disable("x-powered-by");
app.enable("strict routing");
app.enable("case sensitive routing");

app.use(
    middleware.handle(i18next, {
        removeLngFromUrl: false, // removes the language from the url when language detected in path
    })
);

app.locals.origin = config.origin;
hbs.localsAsTemplateData(app);

require("./hbs_helpers.js")();

app.use(compression());
require("./routes/static.js")(app);
app.use("/static", express.static(__dirname + "/static"));
app.use(express.static(__dirname + "/assets/images"));
app.use(express.static(__dirname + "/webroot"));

// Logging
if (process.env.NODE_ENV === "production") {
    app.use(morgan("combined"));
} else {
    app.use(morgan("dev"));
}

app.use(
    helmet.contentSecurityPolicy({
        directives: {
            baseUri: ["'self'"],
            defaultSrc: ["'none'"],
            scriptSrc: [
                "'self'",
                "https://www.google.com/recaptcha/",
                "https://www.gstatic.com/recaptcha/",
            ],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            formAction: ["'self'"],
            childSrc: ["https://www.google.com/recaptcha/"],
            frameAncestors: ["'none'"],
        },
        // setAllHeaders: false,
        // browserSniff: false,
    })
);
app.use(
    helmet.frameguard({
        action: "deny",
    })
);
app.use(helmet.noSniff());
app.use(helmet.xssFilter());
app.use(express.urlencoded({ extended: false }));

const store = new KnexSessionStore({
    knex,
    tablename: "session",
    createtable: false, // don't auto-create the table
    clearInterval: ms("10 min"),
});

app.use(
    session({
        name: "sid",
        secret: config.sessionSecret,
        store: store,
        resave: false,
        saveUninitialized: true,
        cookie: {
            // secure: !!config.https,
            maxAge: ms("30 days"),

            // sameSite=strict does not seem to work well with Google OAuth
            sameSite: "lax",
        },
    })
);
app.use(flash());
app.use(csrf());
app.use(passport.initialize());
app.use(passport.session());

app.use(require("./routes"));

app.listen(config.httpPort, function () {
    console.log("Visit %s", config.origin);
});
