const settings = require('./settings');
const logger = require('./logger');

const { Client, GatewayIntentBits } = require('discord.js');

if (!settings.token) {
    logger.error('BOOT', 'DISCORD_BOT_TOKEN is missing. Copy .env.example to .env and fill in your bot token.');
    process.exit(1);
}

// Open the SQLite database and run migrations before anything else
const db = require('./services/database');
const messageStore = require('./services/messageStore');
const { loadHandlers } = require('./tools/loader');
const { startHealthServer } = require('./tools/health');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

loadHandlers(client);

messageStore.scheduleRetention(settings.messageRetentionDays);

const healthServer = settings.healthPort ? startHealthServer(client, settings.healthPort) : null;

process.on('unhandledRejection', (error) => logger.error('PROCESS', 'Unhandled promise rejection', error));

let shuttingDown = false;
const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('BOOT', `${signal} received, shutting down...`);
    try {
        healthServer?.close();
        await client.destroy();
        db.close();
    } finally {
        process.exit(0);
    }
};
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

client.login(settings.token).catch((error) => {
    if (error?.message?.includes('disallowed intents')) {
        logger.error(
            'BOOT',
            'Discord refused the connection: enable "Message Content Intent" in the Developer Portal (Bot > Privileged Gateway Intents).'
        );
    } else {
        logger.error('BOOT', 'Unable to log in to Discord. Check DISCORD_BOT_TOKEN.', error);
    }
    process.exit(1);
});
