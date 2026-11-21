const fs = require('node:fs');
const path = require('node:path');
const { Collection } = require('discord.js');
const logger = require('../logger');

const APP_DIR = path.resolve(__dirname, '..');

const DIRECTORIES = {
    commands: path.join(APP_DIR, 'commands'),
    messageContext: path.join(APP_DIR, 'context', 'message'),
    events: path.join(APP_DIR, 'events'),
    buttons: path.join(APP_DIR, 'reactions', 'buttons'),
    selects: path.join(APP_DIR, 'reactions', 'selects'),
    modals: path.join(APP_DIR, 'reactions', 'modals'),
};

const requireAll = (directory) => {
    if (!fs.existsSync(directory)) return [];
    return fs
        .readdirSync(directory)
        .filter((file) => file.endsWith('.js'))
        .map((file) => require(path.join(directory, file)));
};

const toCollection = (modules, label) => {
    const collection = new Collection();
    for (const module of modules) {
        collection.set(module.data.name, module);
        logger.info('LOADER', `${label} ${module.data.name} => loaded`);
    }
    return collection;
};

/** Loads every command / event / reaction handler into the Discord client. */
const loadHandlers = (client) => {
    client.commands = toCollection(requireAll(DIRECTORIES.commands), 'Command');
    client.messageContext = toCollection(requireAll(DIRECTORIES.messageContext), 'Message context');
    client.buttonReactions = toCollection(requireAll(DIRECTORIES.buttons), 'Button');
    client.selectReactions = toCollection(requireAll(DIRECTORIES.selects), 'Select menu');
    client.modals = toCollection(requireAll(DIRECTORIES.modals), 'Modal');

    for (const event of requireAll(DIRECTORIES.events)) {
        const listener = async (...args) => {
            try {
                await event.execute(client, ...args);
            } catch (error) {
                logger.error('EVENT', `Unhandled error in event ${event.name}`, error);
            }
        };
        client[event.once ? 'once' : 'on'](event.name, listener);
        logger.info('LOADER', `Event ${event.name} => loaded`);
    }
};

/** Commands (slash + context menus) to register with Discord. */
const getApplicationCommandsPayload = () => {
    return [...requireAll(DIRECTORIES.commands), ...requireAll(DIRECTORIES.messageContext)]
        .filter((module) => typeof module.data?.toJSON === 'function' && module.data.name !== 'test')
        .map((module) => module.data.toJSON());
};

module.exports = {
    loadHandlers,
    getApplicationCommandsPayload,
};
