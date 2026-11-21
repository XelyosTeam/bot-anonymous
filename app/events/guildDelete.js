const { Events } = require('discord.js');
const logger = require('../logger');

module.exports = {
    name: Events.GuildDelete,
    once: false,
    async execute(client, guild) {
        // Stored messages are kept: they are still available if the bot is invited again.
        logger.info(Events.GuildDelete, `Bot removed from server ${guild.name} (${guild.id})`);
    },
};
