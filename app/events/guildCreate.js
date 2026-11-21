const { Events } = require('discord.js');
const logger = require('../logger');

module.exports = {
    name: Events.GuildCreate,
    once: false,
    async execute(client, guild) {
        logger.info(Events.GuildCreate, `Bot added to server ${guild.name} (${guild.id})`);
    },
};
