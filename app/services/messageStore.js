const db = require('./database');
const logger = require('../logger');

const DAY_MS = 24 * 60 * 60 * 1000;

const statements = {
    insert: db.prepare(
        `INSERT OR REPLACE INTO messages
            (message_id, guild_id, channel_id, source, author_id, encryption_key, content, reply_of_message_id, attachments, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ),
    find: db.prepare('SELECT * FROM messages WHERE guild_id = ? AND message_id = ?'),
    purge: db.prepare('DELETE FROM messages WHERE created_at < ?'),
};

/** Stores the anonymous message -> real author mapping. */
const save = ({
    messageId,
    guildId,
    channelId,
    source,
    authorId,
    encryptionKey,
    content,
    replyOfMessageId,
    attachments,
}) => {
    statements.insert.run(
        messageId,
        guildId,
        channelId,
        source ?? null,
        authorId,
        encryptionKey || null,
        content ?? null,
        replyOfMessageId ?? null,
        JSON.stringify(attachments ?? []),
        Date.now()
    );
};

const find = (guildId, messageId) => {
    const row = statements.find.get(guildId, messageId);
    if (!row) return null;

    return {
        messageId: row.message_id,
        guildId: row.guild_id,
        channelId: row.channel_id,
        source: row.source,
        authorId: row.author_id,
        encryptionKey: row.encryption_key,
        content: row.content,
        replyOfMessageId: row.reply_of_message_id,
        attachments: JSON.parse(row.attachments ?? '[]'),
        createdAt: new Date(row.created_at),
    };
};

/** Deletes messages older than `days` days. */
const purgeOlderThan = (days) => {
    const { changes } = statements.purge.run(Date.now() - days * DAY_MS);
    return changes;
};

/** Purges on startup then every 24h. Does nothing when retention is 0 (unlimited). */
const scheduleRetention = (days) => {
    if (!days) return null;

    const run = () => {
        try {
            const removed = purgeOlderThan(days);
            if (removed) logger.info('MessageStore', `${removed} message(s) older than ${days} day(s) purged`);
        } catch (error) {
            logger.error('MessageStore', 'Retention purge failed', error);
        }
    };

    run();
    return setInterval(run, DAY_MS).unref();
};

module.exports = {
    save,
    find,
    purgeOlderThan,
    scheduleRetention,
};
