const { ActivityType, Events, OAuth2Scopes, PermissionFlagsBits } = require('discord.js');
const { version } = require('../package.json');
const settings = require('../settings');
const logger = require('../logger');
const { getApplicationCommandsPayload } = require('../tools/loader');
const {
    channelPermissionForAnonymousMessage,
    channelPermissionForAnonymousToSeeAndWrite,
} = require('../tools/channel');

const INVITE_PERMISSIONS = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.SendMessagesInThreads,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.ManageMessages,
];

/** Checks that the channels set in the .env exist and are usable by the bot. */
const checkConfiguration = (client) => {
    const findChannel = (id) => client.channels.cache.get(id) ?? null;

    if (!settings.logChannelId) {
        logger.warn('CONFIG', 'LOG_CHANNEL_ID is not set: anonymous messages are disabled until it is configured.');
    } else {
        const logChannel = findChannel(settings.logChannelId);
        if (!logChannel) {
            logger.warn(
                'CONFIG',
                `LOG_CHANNEL_ID ${settings.logChannelId}: channel not found (is the bot on this server?)`
            );
        } else if (!channelPermissionForAnonymousToSeeAndWrite(logChannel, logChannel.guild.members.me)) {
            logger.warn(
                'CONFIG',
                `LOG_CHANNEL_ID: missing View Channel / Send Messages permission in #${logChannel.name}`
            );
        } else {
            logger.info('CONFIG', `Log channel: #${logChannel.name} (${logChannel.guild.name})`);
        }
    }

    for (const [name, ids] of [
        ['AUTOMASK_CHANNELS', settings.autoMaskChannels],
        ['RESTRICTED_CHANNELS', settings.restrictedChannels],
    ]) {
        for (const id of ids) {
            const channel = findChannel(id);
            if (!channel) logger.warn('CONFIG', `${name}: channel ${id} not found`);
        }
        if (ids.size) logger.info('CONFIG', `${name}: ${ids.size} channel(s)`);
    }

    for (const id of settings.autoMaskChannels) {
        const channel = findChannel(id);
        if (channel && !channelPermissionForAnonymousMessage(channel, channel.guild.members.me)) {
            logger.warn(
                'CONFIG',
                `AUTOMASK_CHANNELS: missing Send Messages / Attach Files / Manage Messages permission in #${channel.name}`
            );
        }
    }
};

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        client.user.setPresence({
            activities: [{ name: `Version ${version}`, type: ActivityType.Custom }],
            status: 'online',
        });

        logger.info(Events.ClientReady, `Logged in as ${client.user.tag} on ${client.guilds.cache.size} server(s)`);

        if (settings.deployCommandsOnStart) {
            try {
                // Global PUT: overwrites existing commands while keeping their IDs (and therefore the
                // permissions set by admins in Server Settings > Integrations)
                const commands = await client.application.commands.set(getApplicationCommandsPayload());
                logger.info(Events.ClientReady, `${commands.size} application command(s) deployed`);
            } catch (error) {
                logger.error(Events.ClientReady, 'Unable to deploy application commands', error);
            }
        }

        checkConfiguration(client);

        const invite = client.generateInvite({
            scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
            permissions: INVITE_PERMISSIONS,
        });
        logger.info(Events.ClientReady, `Invite link: ${invite}`);
    },
};
