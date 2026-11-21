FROM node:26-alpine

ENV NODE_ENV=production \
    TZ=Europe/Paris \
    DATA_DIR=/data \
    LOG_DIR=/data/logs \
    HEALTH_PORT=3000

# tzdata: allows changing the timezone at runtime with the TZ variable
RUN apk add --no-cache tzdata

WORKDIR /usr/src/app

COPY app/package.json app/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY app/ ./

# Persistent data (SQLite database + logs): mount as a volume
RUN mkdir -p /data && chown -R node:node /data
VOLUME ["/data"]

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD wget -q -O /dev/null "http://127.0.0.1:${HEALTH_PORT}/health" || exit 1

CMD ["node", "app.js"]
