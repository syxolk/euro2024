# Euro 2016 / WorldCup 2018 / Euro 2020 / WorldCup 2022 / Euro 2024

[![Code Climate](https://codeclimate.com/github/syxolk/euro2016/badges/gpa.svg)](https://codeclimate.com/github/syxolk/euro2016)
[![Codacy Badge](https://api.codacy.com/project/badge/grade/35f72d8dc9964c9389aa4937c98dd571)](https://www.codacy.com/app/hans-kirchner-info/euro2016)
[![David DM](https://david-dm.org/syxolk/euro2016.svg)](https://david-dm.org/syxolk/euro2016)

~~Euro 2016~~ ~~WorldCup 2018~~ ~~Euro 2020~~ ~~WorldCup 2022~~ Euro 2024 is a web service written in [Node.js][nodejs],
giving you and your friends :boy: :girl: a platform of competition: Who is the
better forecaster of football :soccer: matches? Make bets for football matches,
collect scores and win the crown :crown:.

**Scoring**
- ★★★★ (4 points) correct bet
- ★★★☆ (3 points) correct goal difference
- ★★☆☆ (2 points) correct winner
- ☆☆☆☆ (0 points) in any other case or if the user did not place a bet

Additionally, there's a match score factor that is multiplied with the points.

The [Uefa Euro 2024][uefa] is taking place in Germany from June 14 to July 14.
Happy betting!

## Running for Development
You need to have [PostgreSQL][postgres] :elephant: >= 14 installed and
configured with a new database. Node.js is required of course, recommended
versions are >= 20.

```
git clone https://github.com/syxolk/euro2024.git
cd euro2016
npm install

# Create a new development user in your PostgreSQL database
sudo -u postgres psql -c "create user cup2024 with encrypted password '123456';"

# Create a new development database
sudo -u postgres createdb cup2024 --owner=cup2024

# Run all database migrations
npm run migrate:latest
```

To start everything (with automatic code reload powered by `nodemon`):

```sh
npm start
```

Visit `http://localhost:8080` in your browser.

## Running for Production

We use Docker and Docker-Compose for running the code in production on a server.

```sh
git clone https://github.com/syxolk/euro2024.git
cd euro2024
```

Create a file `prod.env` with the following content:

```
ORIGIN=https://www.wetten2024.de
SESSION_SECRET=long-automatically-generated-string

MAIL_SOLUTION=mailjet
MAIL_FROM=no-reply@wetten2024.de
MAILJET_API_KEY=your-api-key
MAILJET_API_SECRET=your-api-secret
```

Tips:
- Set your own domain for `ORIGIN`.
- You can generate the `SESSION_SECRET` using `openssl rand -base64 36`.
- You probably have to edit `Caddyfile` and set your own domain there.
- You can use your own email solution, see below for SMTP or Mailgun

Finally start everything:

```
docker compose up --build -d
```

This starts 5 containers:
- `caddy` - Reverse proxy with automatic TLS certificate
- `web` - the main Javascript code
- `db` - PostgreSQL database
- `autoupdater` - runs a cronjob to update match results and set teams for matches
- `backup-daemon` - creates backups of the PostgreSQL database

## Configure
You can add additional environment variables for additional functionality.

### Trust Proxy
If your server runs behind a proxy that sets `X-Forwarded-*` headers, you should
set this:

```
export TRUST_PROXY=1
```

related docs: https://expressjs.com/de/guide/behind-proxies.html

This is enabled by default in our `Dockerfile` for production.

### Facebook Login (optional)
If you want to enable Facebook login you need to create a [Facebook App][facebookapp],
enable 'Facebook Login' for it and add valid OAuth Redirect URIs
(use your own domain of course):
```
https://www.wetten2024.de/auth/facebook/callback
https://www.wetten2024.de/connect/facebook/callback
```

Then add this in your run script (with your own app id and secret):
```
FACEBOOK_APP_ID=987654321
FACEBOOK_APP_SECRET=1234567890
```

You have to set the app's status to 'Live' so that other people can use it.

### Google Login (optional)
If you want to enable Google login you need to create a
[Google Cloud Platform Project][gcpproject], create an OAuth-Client-ID and
set the Redirection-URIs to (using your own domain):
```
https://www.wetten2024.de/auth/google/callback
https://www.wetten2024.de/connect/google/callback
```

Then add this in your run script:
```
GOOGLE_APP_ID=987654321.apps.googleusercontent.com
GOOGLE_APP_SECRET=abcdefgh
```

### SMTP (optional)
To send transactional emails (e.g. email confirmation), you need to configure
either an SMTP connection or a Mailgun account.

```
MAIL_SOLUTION=smtp
MAIL_FROM=no-reply@wetten2024.de
SMTP_HOST=localhost
SMTP_PORT=465
SMTP_USER=smtp_user
SMTP_PASSWORD=smtp_password
```

### Mailgun (optional)
Register an account on [Mailgun][mailgun], configure a new domain and set
this in your run script:

```
MAIL_SOLUTION=mailgun
MAIL_FROM=no-reply@wetten2024.de
MAILGUN_DOMAIN=wetten2024.de
MAILGUN_API_KEY=your-mailgun-api-key
```

### Mailjet (optional)

```
MAIL_SOLUTION=mailjet
MAIL_FROM=no-reply@wetten2024.de
MAILJET_API_KEY=your-api-key
MAILJET_API_SECRET=your-api-secret
```

## Update
How to update euro2024 to the newest version:

```
git pull
npm install

# For development: run migrations manually
npm run migrate:latest
```

## Credits
Icons made by [Papedesign][papedesign] from [www.flaticon.com][flaticon] is
licensed by [CC 3.0 BY][ccby]

[nodejs]: https://nodejs.org/en/
[uefa]: https://de.uefa.com/euro2024/
[postgres]: http://www.postgresql.org/
[papedesign]: http://www.flaticon.com/authors/papedesign
[flaticon]: http://www.flaticon.com
[ccby]: http://creativecommons.org/licenses/by/3.0/
[facebookapp]: https://developers.facebook.com/apps/
[gcpproject]: https://console.cloud.google.com/apis/
[mailgun]: https://www.mailgun.com/
