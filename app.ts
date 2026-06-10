import compression from "compression";
import connectFlash from "./lib/connect-flash";
import connectSessionKnex from "connect-session-knex";
import { csrfSync } from "csrf-sync";
import express from "express";
import session from "express-session";
import hbs from "hbs";
import helmet from "helmet";
import i18next from "i18next";
import middleware from "i18next-http-middleware";
import morgan from "morgan";
import ms from "ms";
import passport from "passport";

import config from "./config";
import { knex } from "./db";
import registerHbsHelpers from "./hbs_helpers";
import deTranslations from "./locales/de.json";
import enTranslations from "./locales/en.json";
import ptBrTranslations from "./locales/pt-BR.json";
import routes from "./routes/index";
import registerStaticAssets from "./routes/static";
import type { User } from "./request_helper";

const KnexSessionStore = connectSessionKnex(session);

function formatDateTime(
    value: unknown,
    lng: string | undefined,
    options: Intl.DateTimeFormatOptions
) {
    return new Intl.DateTimeFormat(lng ?? "en", {
        timeZone: config.timezone,
        ...options,
    }).format(new Date(value as string | Date));
}

function getZonedDateParts(value: unknown, lng: string | null) {
    const parts = new Intl.DateTimeFormat(lng ?? "en", {
        timeZone: config.timezone,
        weekday: "long",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date(value as string | Date));

    const lookup = Object.fromEntries(
        parts
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, part.value])
    );

    return {
        weekday: lookup.weekday,
        year: Number(lookup.year),
        month: Number(lookup.month),
        day: Number(lookup.day),
    };
}

function getCalendarDayDiff(value: unknown, lng: string | null) {
    const nowParts = getZonedDateParts(new Date(), lng);
    const valueParts = getZonedDateParts(value, lng);
    const nowDay = Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day);
    const valueDay = Date.UTC(
        valueParts.year,
        valueParts.month - 1,
        valueParts.day
    );

    return {
        diff: Math.round((valueDay - nowDay) / 86400000),
        weekday: valueParts.weekday,
    };
}

i18next.use(middleware.LanguageDetector).init({
    fallbackLng: "en",
    resources: {
        en: {
            translation: enTranslations,
        },
        de: {
            translation: deTranslations,
        },
        "pt-BR": {
            translation: ptBrTranslations,
        },
    },
    detection: {
        order: ["header"],
    },
    interpolation: {
        format(value, format, lng) {
            if (!format) {
                return String(value);
            }

            switch (format) {
                case "appDate":
                    return formatDateTime(value, lng, {
                        weekday: "short",
                        month: "long",
                        day: "numeric",
                    });
                case "appTime":
                    return formatDateTime(value, lng, {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                    });
                case "appDateTime":
                    return formatDateTime(value, lng, {
                        weekday: "short",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                    });
                case "appDateTimeShort":
                    return formatDateTime(value, lng, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                    });
                case "appNewsDate": {
                    const { diff, weekday } = getCalendarDayDiff(
                        value,
                        lng ?? null
                    );
                    const time = formatDateTime(value, lng, {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                    });

                    if (diff === 0) {
                        return i18next.t("format.news_date_today", {
                            lng,
                            time,
                        });
                    }

                    if (diff === 1) {
                        return i18next.t("format.news_date_tomorrow", {
                            lng,
                            time,
                        });
                    }

                    if (diff === -1) {
                        return i18next.t("format.news_date_yesterday", {
                            lng,
                            time,
                        });
                    }

                    if (diff > 1 && diff < 7) {
                        return i18next.t("format.news_date_next_week", {
                            lng,
                            weekday,
                            time,
                        });
                    }

                    if (diff < -1 && diff > -7) {
                        return i18next.t("format.news_date_last_week", {
                            lng,
                            weekday,
                            time,
                        });
                    }

                    return formatDateTime(value, lng, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                    });
                }
                default:
                    return String(value);
            }
        },
    },
});

passport.serializeUser(function (user, done) {
    done(null, (user as User).id);
});

passport.deserializeUser(function (id: number, done) {
    knex("user_account")
        .where({ id })
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
        removeLngFromUrl: false,
    })
);

app.locals.origin = config.origin;
hbs.localsAsTemplateData(app);

registerHbsHelpers();

const { csrfSynchronisedProtection } = csrfSync({
    getTokenFromRequest: (req) => req.body._csrf || req.headers["x-csrf-token"],
});

app.use(compression());
registerStaticAssets(app);
app.use("/static", express.static(__dirname + "/static"));
app.use(express.static(__dirname + "/assets/images"));
app.use(express.static(__dirname + "/webroot"));

// Logging — suppress in test environment
if (process.env.NODE_ENV === "production") {
    app.use(morgan("combined"));
} else if (process.env.NODE_ENV !== "test") {
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
app.use(express.json());

// Use a fast in-memory store for tests to avoid DB dependency on session table
const store =
    process.env.NODE_ENV === "test"
        ? new session.MemoryStore()
        : new KnexSessionStore({
              knex,
              tablename: "session",
              createtable: false,
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
            maxAge: ms("30 days"),
            sameSite: "lax",
        },
    })
);
app.use(connectFlash());

// Disable CSRF protection in test environment for easier integration testing
if (process.env.NODE_ENV !== "test") {
    app.use(csrfSynchronisedProtection);
}

app.use(passport.initialize());
app.use(passport.session());

app.use(routes);

export default app;
