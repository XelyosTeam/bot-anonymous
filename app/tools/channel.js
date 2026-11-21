const { PermissionsBitField } = require('discord.js');
const settings = require('../settings');

const checkChannelUserPermission = (channel, member, permissionList) => {
    if (!channel || !channel.guild) return false;

    const permissions = channel.permissionsFor(member);
    if (!permissions) return false;

    return permissions.has(permissionList);
};

/**
 * Check if the member has permission to send messages, attach files, and manage messages in the channel.
 * @param channel
 * @param member
 * @returns {boolean|*}
 */
const channelPermissionForAnonymousMessage = (channel, member) => {
    return checkChannelUserPermission(channel, member, [
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.ManageMessages,
    ]);
};

/**
 * Check if the member has permission to view the channel and send messages in the channel.
 * @param channel
 * @param member
 * @returns {boolean|*}
 */
const channelPermissionForAnonymousToSeeAndWrite = (channel, member) => {
    return checkChannelUserPermission(channel, member, [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
    ]);
};

/**
 * Checks that an anonymous command can be used in the interaction's channel
 * (RESTRICTED_CHANNELS from the .env + bot permissions).
 * @returns {string|null} error message, or null if everything is fine
 */
const checkAnonymousCommandChannel = (interaction) => {
    const { restrictedChannels } = settings;

    if (restrictedChannels.size > 0 && !restrictedChannels.has(interaction.channelId)) {
        return 'You are not authorized to use this command in this channel.';
    }

    if (!channelPermissionForAnonymousMessage(interaction.channel, interaction.guild.members.me)) {
        return 'I do not have permission to send anonymous messages in this channel.';
    }

    return null;
};

module.exports = {
    channelPermissionForAnonymousMessage,
    channelPermissionForAnonymousToSeeAndWrite,
    checkAnonymousCommandChannel,
};
