const test = require('node:test');
const assert = require('node:assert/strict');
const ShiftCipher = require('../tools/cipher');

test('encrypt then decrypt returns the original text', () => {
    const cipher = new ShiftCipher('ad');
    const original = 'Bonjour à tous ! 🎭';
    const encrypted = cipher.encrypt(original);
    assert.notEqual(encrypted, original);
    assert.equal(cipher.decrypt(encrypted), original);
});

test('no key means pass-through', () => {
    const cipher = new ShiftCipher(null);
    assert.equal(cipher.validateKeys(), false);
    assert.equal(cipher.encrypt('hello'), 'hello');
});

test('invalid key characters are reported', () => {
    const cipher = new ShiftCipher('a1');
    assert.equal(cipher.validateKeys(), false);
    assert.equal(cipher.invalidKey, '1');
});
