FROM node:22.2.0-slim
RUN apt-get update && apt-get install -y postgresql-client

WORKDIR /app

COPY package.json /app
COPY package-lock.json /app
RUN npm install

COPY . /app

ENV NODE_ENV production
ENV TRUST_PROXY 1
CMD ["./entrypoint.sh"]