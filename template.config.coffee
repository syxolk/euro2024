module.exports =
    # URL origin of the web server
    origin: 'http://localhost:8080'

    # PostreSQL connection URL
    db: 'postgres://user:password@localhost:port/database'

    # Port to listen on
    httpPort: 8080

    # Used to secure session cookies. Set to a random string
    sessionSecret: 'octocat'

    # Facebook authentication
    facebook:
        clientID: 'FACEBOOK_APP_ID'
        clientSecret: 'FACEBOOK_APP_SECRET'

    google:
        clientID: 'GOOGLE_CLIENT_ID'
        clientSecret: 'GOOGLE_CLIENT_SECRET'
