module.exports =
    # URL origin of the web server
    origin: 'http://localhost:8080'

    # PostreSQL connection URL
    db: 'postgres://user:password@localhost:port/database'

    # When using HTTPS put the key and certificate path here
    key: '/path/to/key.pem'
    cert: '/path/to/cert.pem'
    ca: '/path/to/chain.pem'

    # Port to listen on
    httpPort: 8080
    httpsPort: 3000

    # Used to secure session cookies. Set to a random string
    sessionSecret: 'octocat'

    # Facebook authentication
    facebook:
        clientID: 'FACEBOOK_APP_ID'
        clientSecret: 'FACEBOOK_APP_SECRET'

    # Google authentication
    google:
        clientID: 'GOOGLE_CLIENT_ID'
        clientSecret: 'GOOGLE_CLIENT_SECRET'

    # Password registration captcha
    recaptcha:
        key: 'WEBSITE_KEY'
        secret: 'SECRET_KEY'

    mailgun:
        secretKey: 'SECRET_API_KEY'
        domain: 'VERIFIED_DOMAIN'
        from: 'noreply@DOMAIN'

    telegram:
        link: 'https://telegram.me/MY_BOT'
        token: 'TOKEN'
        channelId: '@CHANNEL_ID'
