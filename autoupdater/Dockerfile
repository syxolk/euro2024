FROM alpine:3.20.0
RUN apk update && apk upgrade && apk add curl
COPY ./crontab /etc/crontabs/root

# start crond with log level 8 in foreground, output to stderr
CMD ["crond", "-f", "-d", "8"]