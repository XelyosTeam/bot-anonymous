const path = require('node:path');

// Project root (folder containing app/, .env, data/, logs/)
const ROOT_DIR = path.resolve(__dirname, '..');

// Load the .env file (optional: under Docker, variables are injected by docker compose)
try {
    process.loadEnvFile(path.join(ROOT_DIR, '.env'));
} catch (error) {
    if (error.code !== 'ENOENT') throw error;
}

const env = (name, fallback = null) => {
    const value = process.env[name]?.trim();
    return value ? value : fallback;
};

/** "123, 456,789" -> Set { '123', '456', '789' } */
const parseIdList = (value) =>
    new Set(
        (value ?? '')
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean)
    );

const parseColor = (value, fallback) => {
    if (!value) return fallback;
    const parsed = Number.parseInt(value.replace(/^#/, ''), 16);
    return Number.isNaN(parsed) ? fallback : parsed;
};

module.exports = {
    rootDir: ROOT_DIR,
    token: env('DISCORD_BOT_TOKEN'),
    dataDir: path.resolve(ROOT_DIR, env('DATA_DIR', 'data')),
    logDir: path.resolve(ROOT_DIR, env('LOG_DIR', 'logs')),
    healthPort: Number(env('HEALTH_PORT')) || null,
    deployCommandsOnStart: env('DEPLOY_COMMANDS_ON_START', 'true') !== 'false',
    messageRetentionDays: Math.max(0, Number(env('MESSAGE_RETENTION_DAYS', '0')) || 0),
    color: parseColor(env('EMBED_COLOR'), 0x5906da),

    // --- Bot configuration ---
    // (Private) channel where the real authors of anonymous messages are logged. Required.
    logChannelId: env('LOG_CHANNEL_ID'),
    // Text displayed above and below each anonymous message (optional)
    frame: process.env.FRAME?.trim() || null,
    // Channels where anonymous commands are allowed (empty = everywhere)
    restrictedChannels: parseIdList(process.env.RESTRICTED_CHANNELS),
    // Channels where every message is automatically made anonymous
    autoMaskChannels: parseIdList(process.env.AUTOMASK_CHANNELS),
};
