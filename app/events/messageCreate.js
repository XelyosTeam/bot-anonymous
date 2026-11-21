const { Events, RESTJSONErrorCodes } = require('discord.js');

const settings = require('../settings');
const { sendAnonymousMessage, anonymousDownloadImages } = require('../tools/anonymous');
const { channelPermissionForAnonymousMessage } = require('../tools/channel');

const notifyAuthor = (message, content) => message.author.send(content).catch(() => {});

module.exports = {
    name: Events.MessageCreate,
    once: false,
    async execute(client, message) {
        // Ignore bots and direct messages
        if (message.author.bot || !message.inGuild()) return;

        // Is this an automask channel?
        if (!settings.autoMaskChannels.has(message.channelId)) return;

        // Make sure the bot can write in this channel
        if (!channelPermissionForAnonymousMessage(message.channel, message.guild.members.me)) return;

        const {
            files: attachments,
            skipped,
            maxFileSizeMB,
        } = await anonymousDownloadImages(message.guild, message.attachments.values());

        try {
            await message.delete();
        } catch (error) {
            // 10008 = Unknown Message (already deleted)
            if (error?.code !== RESTJSONErrorCodes.UnknownMessage) throw error;
        }

        if (skipped.length > 0) {
            const skippedList = skipped.map((f) => `• **${f.name}** (${f.sizeMB} MB)`).join('\n');
            notifyAuthor(
                message,
                `Some attachments from your anonymous message in **${message.guild.name}** were too large and could not be sent (max ${maxFileSizeMB} MB):\n${skippedList}`
            );
        }

        const response = await sendAnonymousMessage({
            guild: message.guild,
            author: message.author,
            source: 'automask',
            messageChannel: message.channel,
            messageContent: message.content,
            messageAttachments: attachments,
            replyToMessageId: message.reference?.messageId ?? null,
        });

        // The original message is gone: DM the author if the anonymous message could not be sent
        if (!response.ok) {
            notifyAuthor(
                message,
                `Your anonymous message in **${message.guild.name}** could not be sent: ${response.content}`
            );
        }
    },
};
