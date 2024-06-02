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

## Install
You need to have [PostgreSQL][postgres] :elephant: >= 9.6 installed and
configured with a new database. Node.js is required of course, recommended
versions are >=8.

    git clone https://github.com/syxolk/euro2016.git
    cd euro2016
    npm install

Now create a shell script (e.g. `run.sh`):
```sh
#!/usr/bin/env bash

# Set publicly available domain name (without trailing slash)
export ORIGIN=http://localhost:8080

# PostgreSQL connection
export DB_HOST=localhost
export DB_USER=my_postgres_user
export DB_PASSWORD=my_postgres_password
export DB_NAME=my_postgres_database_name

# Used by express-session to secure the session cookies
export SESSION_SECRET=s0me_r4ndom_str1ng

npm start
```

You should make your run script executable:
```
chmod +x run.sh
```

## Run
The database structure will be created and migrated automatically.

Use your own run script:
```
./run.sh
```

or just use `npm start` if you set the environment variables with another method.

## Configure
You can add additional environment variables for additional functionality.

### Time Zone
All match dates and other time related stuff is saved in UTC in the database. If
you want to show all dates in another timezone than the default one
(Central European Summer Time) you can add this in your run script:
```
export UTC_OFFSET="+0200"
```

Related docs: https://momentjs.com/docs/#/manipulating/utc-offset/

### Trust Proxy
If your server runs behind a proxy that sets `X-Forwarded-*` headers, you should
set this:

```
export TRUST_PROXY=1
```

related docs: https://expressjs.com/de/guide/behind-proxies.html

### Redirect to HTTPS
If your server is available over HTTPS and you always want to redirect your users
to be redirected to the HTTPS-version you can set this:

```
export REDIRECT_HTTPS=1
```

### Facebook Login (optional)
If you want to enable Facebook login you need to create a [Facebook App][facebookapp],
enable 'Facebook Login' for it and add valid OAuth Redirect URIs
(use your own domain of course):
```
https://www.wetten2022.de/auth/facebook/callback
https://www.wetten2022.de/connect/facebook/callback
```

Then add this in your run script (with your own app id and secret):
```
export FACEBOOK_APP_ID=987654321
export FACEBOOK_APP_SECRET=1234567890
```

You have to set the app's status to 'Live' so that other people can use it.

### Google Login (optional)
If you want to enable Google login you need to create a
[Google Cloud Platform Project][gcpproject], create an OAuth-Client-ID and
set the Redirection-URIs to (using your own domain):
```
https://www.wetten2022.de/auth/google/callback
https://www.wetten2022.de/connect/google/callback
```

Then add this in your run script:
```
export GOOGLE_APP_ID=987654321.apps.googleusercontent.com
export GOOGLE_APP_SECRET=abcdefgh
```

### SMTP (optional)
To send transactional emails (e.g. email confirmation), you need to configure
either an SMTP connection or a Mailgun account.

```
export MAIL_SOLUTION=smtp
export MAIL_FROM=no-reply@wetten2022.de
export SMTP_HOST=localhost
export SMTP_PORT=465
export SMTP_USER=smtp_user
export SMTP_PASSWORD=smtp_password
```

### Mailgun (optional)
Register an account on [Mailgun][mailgun], configure a new domain and set
this in your run script:

```
export MAIL_SOLUTION=mailgun
export MAIL_FROM=no-reply@wetten2022.de
export MAILGUN_DOMAIN=wetten2022.de
export MAILGUN_API_KEY=your-mailgun-api-key
```

## Update
How to update euro2016 to the newest version:

    git pull
    npm install

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
