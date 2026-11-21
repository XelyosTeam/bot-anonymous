const test = require('node:test');
const assert = require('node:assert/strict');

process.env.LOG_CHANNEL_ID = ' 111 ';
process.env.FRAME = '═══';
process.env.RESTRICTED_CHANNELS = '222, 333,,444 ';
process.env.AUTOMASK_CHANNELS = '';

const settings = require('../settings');

test('bot configuration is read from the environment', () => {
    assert.equal(settings.logChannelId, '111');
    assert.equal(settings.frame, '═══');
    assert.deepEqual([...settings.restrictedChannels], ['222', '333', '444']);
    assert.equal(settings.autoMaskChannels.size, 0);
});
