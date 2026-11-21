const http = require('node:http');
const { version } = require('../package.json');
const logger = require('../logger');

/**
 * Tiny monitoring HTTP server: GET /health
 * 200 when the bot is connected to Discord, 503 otherwise.
 * Used by the Docker HEALTHCHECK or a monitoring tool (Uptime Kuma, etc.).
 */
const startHealthServer = (client, port) => {
    const server = http.createServer((req, res) => {
        if (req.method !== 'GET' || req.url !== '/health') {
            res.writeHead(404).end();
            return;
        }

        const ready = client.isReady();
        res.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' });
        res.end(
            JSON.stringify({
                status: ready ? 'ok' : 'starting',
                version,
                guilds: ready ? client.guilds.cache.size : 0,
                ping: client.ws.ping,
            })
        );
    });

    server.listen(port, () => logger.info('HEALTH', `Health endpoint listening on :${port}/health`));
    server.on('error', (error) => logger.error('HEALTH', 'Health server error', error));

    return server;
};

module.exports = { startHealthServer };
