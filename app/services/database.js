const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const settings = require('../settings');

fs.mkdirSync(settings.dataDir, { recursive: true });

const db = new DatabaseSync(path.join(settings.dataDir, 'anonymous.sqlite'));
db.exec('PRAGMA journal_mode = WAL;');

// Each entry is a migration applied exactly once (tracked with PRAGMA user_version).
// Never edit an existing migration: append a new one at the end.
const MIGRATIONS = [
    `
    CREATE TABLE messages (
        message_id          TEXT PRIMARY KEY,
        guild_id            TEXT NOT NULL,
        channel_id          TEXT NOT NULL,
        source              TEXT,
        author_id           TEXT NOT NULL,
        encryption_key      TEXT,
        content             TEXT,
        reply_of_message_id TEXT,
        attachments         TEXT,
        created_at          INTEGER NOT NULL
    );

    CREATE INDEX messages_created_at ON messages (created_at);
    `,
];

const migrate = () => {
    const { user_version: current } = db.prepare('PRAGMA user_version').get();
    for (let version = current; version < MIGRATIONS.length; version++) {
        db.exec('BEGIN');
        try {
            db.exec(MIGRATIONS[version]);
            db.exec(`PRAGMA user_version = ${version + 1}`);
            db.exec('COMMIT');
        } catch (error) {
            db.exec('ROLLBACK');
            throw error;
        }
    }
};

migrate();

module.exports = db;
