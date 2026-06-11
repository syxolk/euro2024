interface OAuthConfig {
    clientID: string;
    clientSecret: string;
}

interface SmtpMailParams {
    host?: string;
    port: number;
    auth: {
        user?: string;
        pass?: string;
    };
}

interface MailgunParams {
    domain?: string;
    apiKey?: string;
    host?: string;
}

interface MailjetParams {
    apiKey?: string;
    apiSecret?: string;
}

type MailParams = SmtpMailParams | MailgunParams | MailjetParams;

interface AppConfig {
    origin: string;
    httpPort: string | number;
    sessionSecret: string;
    timezone: string;
    trustProxy: boolean;
    google?: OAuthConfig;
    mail?: string;
    mailFrom?: string;
    mailParams?: MailParams;
    disableUserRegistration: boolean;
}

const config: AppConfig = {
    origin: process.env.ORIGIN || "http://localhost:8080",
    httpPort: process.env.PORT || 8080,
    sessionSecret: process.env.SESSION_SECRET || "octocat",

    // IANA timezone used for all datetime outputs and local day grouping
    // Defaults to CEST (Central European Summer Time)
    timezone: "Europe/Berlin",

    // Set to true if the node runs behind a proxy that sets X-Forwarded-* headers
    trustProxy: process.env.TRUST_PROXY === "1",
    mail: process.env.MAIL_SOLUTION,
    mailFrom: process.env.MAIL_FROM,
    disableUserRegistration: process.env.DISABLE_USER_REGISTRATION === "1",
};

if (process.env.GOOGLE_APP_ID && process.env.GOOGLE_APP_SECRET) {
    config.google = {
        clientID: process.env.GOOGLE_APP_ID,
        clientSecret: process.env.GOOGLE_APP_SECRET,
    };
}

if (process.env.MAIL_SOLUTION === "smtp") {
    config.mailParams = {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
    };
} else if (process.env.MAIL_SOLUTION === "mailgun") {
    config.mailParams = {
        domain: process.env.MAILGUN_DOMAIN,
        apiKey: process.env.MAILGUN_API_KEY,
        host: process.env.MAILGUN_HOST,
    };
} else if (process.env.MAIL_SOLUTION === "mailjet") {
    config.mailParams = {
        apiKey: process.env.MAILJET_API_KEY,
        apiSecret: process.env.MAILJET_API_SECRET,
    };
}

export default config;
