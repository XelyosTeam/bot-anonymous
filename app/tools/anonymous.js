const {
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SectionBuilder,
    RESTJSONErrorCodes,
    GuildPremiumTier,
} = require('discord.js');

const settings = require('../settings');
const logger = require('../logger');
const messageStore = require('../services/messageStore');
const ShiftCipher = require('./cipher');
const { channelPermissionForAnonymousToSeeAndWrite } = require('./channel');

const DISCORD_MESSAGE_LIMIT = 2000;
const LOG_CONTENT_LIMIT = 1900;

const truncate = (text, limit) => (text.length > limit ? `${text.slice(0, limit - 3)}...` : text);

const getAnonymousGuildChannelLog = (guild) => {
    if (!settings.logChannelId) return null;
    return guild.channels.cache.get(settings.logChannelId) ?? null;
};

/** Wraps the message with the configured frame, within Discord's 2000 characters limit. */
const encapsulateMessage = (frame, messageContent) => {
    if (!frame) return truncate(messageContent, DISCORD_MESSAGE_LIMIT);

    const maxContentLength = DISCORD_MESSAGE_LIMIT - 2 * frame.length - 2; // 2 frames + 2 line breaks
    return `${frame}\n${truncate(messageContent, maxContentLength)}\n${frame}`;
};

// Discord upload limits depending on the server boost level
// (https://discord.com/developers/docs/resources/guild#guild-object-premium-tier)
const DISCORD_UPLOAD_LIMIT_MB_BY_TIER = {
    [GuildPremiumTier.None]: 10,
    [GuildPremiumTier.Tier1]: 10,
    [GuildPremiumTier.Tier2]: 50,
    [GuildPremiumTier.Tier3]: 100,
};

const getGuildMaxFileSizeMB = (guild) => DISCORD_UPLOAD_LIMIT_MB_BY_TIER[guild.premiumTier] ?? 10;

/**
 * Downloads attachments into memory so they can be re-sent anonymously
 * (the original message is deleted, so its CDN URL must not be reused).
 * @param guild
 * @param {Iterable<import('discord.js').Attachment>} attachments
 */
const anonymousDownloadImages = async (guild, attachments) => {
    const maxFileSizeMB = getGuildMaxFileSizeMB(guild);
    const maxFileSize = maxFileSizeMB * 1024 * 1024;
    const files = [];
    const skipped = [];

    for (const attachment of attachments) {
        if (!attachment) continue;
        const sizeMB = Math.round(attachment.size / 1024 / 1024);

        if (attachment.size > maxFileSize) {
            logger.warn(
                'anonymous::anonymousDownloadImages',
                `Attachment too large (${sizeMB}MB > ${maxFileSizeMB}MB), skipping: ${attachment.name}`
            );
            skipped.push({ name: attachment.name, sizeMB });
            continue;
        }

        try {
            const response = await fetch(attachment.url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            files.push({
                attachment: Buffer.from(await response.arrayBuffer()),
                name: attachment.name,
            });
        } catch (error) {
            logger.warn(
                'anonymous::anonymousDownloadImages',
                `Failed to download attachment, skipping: ${attachment.name}`,
                error.message
            );
        }
    }

    return { files, skipped, maxFileSizeMB };
};

const writeLogAnonymousMessage = async ({ logChannel, author, messageContent, newMessage, encryptionKey }) => {
    const section = new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### New message in <#${newMessage.channelId}>`))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Author:** ${author.toString()}`))
        .setThumbnailAccessory((thumbnail) => thumbnail.setDescription(author.tag).setURL(author.displayAvatarURL()));

    if (messageContent) {
        const keyLine = encryptionKey ? `**Encryption Key:** \`${encryptionKey}\`\n` : '';
        section.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `${keyLine}**Content:**\n${truncate(messageContent, LOG_CONTENT_LIMIT)}`
            )
        );
    }

    const container = new ContainerBuilder().setAccentColor(settings.color).addSectionComponents(section);

    if (newMessage.attachments.size > 0) {
        const gallery = new MediaGalleryBuilder();
        for (const attachment of newMessage.attachments.values()) {
            gallery.addItems(new MediaGalleryItemBuilder().setURL(attachment.url).setDescription(attachment.name));
        }
        container.addMediaGalleryComponents(gallery);
    }

    const linkButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setURL(newMessage.url).setLabel('Show message').setStyle(ButtonStyle.Link)
    );

    await logChannel.send({
        components: [container, linkButton],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] }, // Never ping anyone
    });
};

const fail = (content) => ({ ok: false, content });

/**
 * Sends an anonymous message to `messageChannel`, logs it in the log channel and stores it in the database.
 * @returns {Promise<{ ok: boolean, content: string }>} message to show to the user
 */
const sendAnonymousMessage = async ({
    guild,
    author,
    source,
    messageChannel,
    messageContent,
    messageAttachments = [],
    encryptionKey = null,
    replyToMessageId = null,
}) => {
    if (!messageContent && messageAttachments.length === 0) {
        return fail('No content to send anonymously.');
    }

    const me = guild.members.me;
    if (!channelPermissionForAnonymousToSeeAndWrite(messageChannel, me)) {
        return fail(
            `Missing permissions to send messages in <#${messageChannel.id}>. Please check the bot's permissions.`
        );
    }

    // The log channel is mandatory: check it BEFORE sending anything
    const logChannel = getAnonymousGuildChannelLog(guild);
    if (!logChannel) {
        return fail(
            'No log channel is configured for this server. The bot administrator must set `LOG_CHANNEL_ID` in the `.env` file.'
        );
    }
    if (!channelPermissionForAnonymousToSeeAndWrite(logChannel, me)) {
        return fail(
            `Missing permissions to send messages in the log channel <#${logChannel.id}>. Please check the bot's permissions.`
        );
    }

    const finalOptions = { allowedMentions: { parse: [] } };

    if (messageContent) {
        const cipher = new ShiftCipher(encryptionKey || null);
        if (encryptionKey && !cipher.validateKeys()) {
            return fail(`Invalid encryption key. Please provide a valid key.\n> Invalid key: \`${cipher.invalidKey}\``);
        }
        finalOptions.content = encapsulateMessage(settings.frame, cipher.encrypt(messageContent));
    }

    if (messageAttachments.length > 0) {
        finalOptions.files = messageAttachments;
    }

    if (replyToMessageId) {
        finalOptions.reply = {
            messageReference: replyToMessageId,
            failIfNotExists: false,
        };
    }

    const newMessage = await messageChannel.send(finalOptions);

    try {
        await writeLogAnonymousMessage({
            logChannel,
            author,
            messageContent,
            newMessage,
            encryptionKey,
        });
    } catch (error) {
        // No log = no anonymous message (moderation guarantee)
        logger.error('sendAnonymousMessage', 'Unable to write to log channel, anonymous message removed', {
            guildId: guild.id,
            logChannelId: logChannel.id,
            error: error.message,
        });
        await newMessage.delete().catch((deleteError) => {
            if (deleteError?.code !== RESTJSONErrorCodes.UnknownMessage) {
                logger.error('sendAnonymousMessage', 'Unable to delete anonymous message', deleteError);
            }
        });
        return fail(
            'Unable to write to the log channel, your message was not sent. Please contact a server administrator.'
        );
    }

    try {
        messageStore.save({
            messageId: newMessage.id,
            guildId: guild.id,
            channelId: messageChannel.id,
            source,
            authorId: author.id,
            encryptionKey,
            content: messageContent,
            replyOfMessageId: replyToMessageId,
            attachments: newMessage.attachments.map((attachment) => attachment.url),
        });
    } catch (error) {
        logger.error('sendAnonymousMessage', 'Unable to save anonymous message in database', error);
    }

    return {
        ok: true,
        content: 'Your anonymous message has been sent successfully!',
    };
};

const decryptAnonymousMessage = async ({ messageContent, encryptionKey }) => {
    if (!messageContent) {
        return { content: 'No content to decrypt.' };
    }

    const cipher = new ShiftCipher(encryptionKey);
    if (!encryptionKey || !cipher.validateKeys()) {
        return {
            content: `Invalid encryption key. Please provide a valid key.\n> Invalid key: \`${cipher.invalidKey}\``,
        };
    }

    try {
        return { content: cipher.decrypt(messageContent) };
    } catch {
        return { content: 'Invalid key: unable to decrypt this message.' };
    }
};

module.exports = {
    getAnonymousGuildChannelLog,
    sendAnonymousMessage,
    anonymousDownloadImages,
    decryptAnonymousMessage,
    getGuildMaxFileSizeMB,
    encapsulateMessage,
};
