const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Isolated database and logs in a temp folder (must be set BEFORE loading the modules)
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-anonymous-test-'));
process.env.DATA_DIR = tmpDir;
process.env.LOG_DIR = path.join(tmpDir, 'logs');

const db = require('../services/database');
const messageStore = require('../services/messageStore');
const { encapsulateMessage } = require('../tools/anonymous');

test.after(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('message store saves, finds and purges messages', () => {
    messageStore.save({
        messageId: 'm1',
        guildId: 'g1',
        channelId: 'c1',
        source: 'ano',
        authorId: 'u1',
        encryptionKey: null,
        content: 'secret',
        attachments: ['https://cdn/file.png'],
    });

    const found = messageStore.find('g1', 'm1');
    assert.equal(found.authorId, 'u1');
    assert.equal(found.content, 'secret');
    assert.deepEqual(found.attachments, ['https://cdn/file.png']);
    assert.equal(messageStore.find('other-guild', 'm1'), null);

    assert.equal(messageStore.purgeOlderThan(1), 0);
    assert.equal(messageStore.purgeOlderThan(-1), 1);
    assert.equal(messageStore.find('g1', 'm1'), null);
});

test('frames are applied within the 2000 characters limit', () => {
    assert.equal(encapsulateMessage(null, 'hi'), 'hi');
    assert.equal(encapsulateMessage('==', 'hi'), '==\nhi\n==');
    assert.equal(encapsulateMessage('==', 'x'.repeat(5000)).length, 2000);
    assert.equal(encapsulateMessage(null, 'x'.repeat(5000)).length, 2000);
});
