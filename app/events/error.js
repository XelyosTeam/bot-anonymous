const { Events } = require('discord.js');
const logger = require('../logger');

module.exports = {
    name: Events.Error,
    once: false,
    async execute(client, error) {
        logger.error(Events.Error, 'Discord client error', error);
    },
};
