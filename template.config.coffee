module.exports =
    # URL origin of the web server
    origin: 'http://localhost:8080'

    # PostreSQL connection URL
    db: 'postgres://user:password@localhost:port/database'

    # Set to true to enable HTTPS mode
    # HTTPS enables the HTTPS server and an HTTP redirect to HTTPS
    https: false

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

    google:
        clientID: 'GOOGLE_CLIENT_ID'
        clientSecret: 'GOOGLE_CLIENT_SECRET'
