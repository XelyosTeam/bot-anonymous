class ShiftCipher {
    /**
     * @param {string|null} keys
     */
    constructor(keys = null) {
        this.keyA = null;
        this.keyB = null;

        if (typeof keys === 'string' && keys.length >= 2) {
            this.keyA = keys.charAt(0);
            this.keyB = keys.charAt(1);
        }

        this.invalidKey = null;
    }

    /* =========================
       🔐 Validation & helpers
       ========================= */

    _hasKeys() {
        return this.keyA !== null && this.keyB !== null;
    }

    _isValidKey(key) {
        if (!key || key.length !== 1) return false;
        const ascii = key.charCodeAt(0);
        return (ascii >= 97 && ascii <= 122) || (ascii >= 65 && ascii <= 90); // a-z or A-Z
    }

    _getShift() {
        if (!this._hasKeys()) return null;
        return this.keyB.charCodeAt(0) - this.keyA.charCodeAt(0) + 1;
    }

    validateKeys() {
        // 🔁 No keys → no encryption (pass-through)
        if (!this._hasKeys()) {
            this.invalidKey = null;
            return false;
        }

        this.invalidKey = null;

        if (!this._isValidKey(this.keyA)) {
            this.invalidKey = this.keyA;
            return false;
        }

        if (!this._isValidKey(this.keyB)) {
            this.invalidKey = this.keyB;
            return false;
        }

        return true;
    }

    /**
     * Returns the combined key or null if inactive
     * @returns {string|null}
     */
    getKey() {
        return this._hasKeys() && this.validateKeys() ? `${this.keyA}${this.keyB}` : null;
    }

    /* =========================
       🔒 Encryption / Decryption
       ========================= */

    encrypt(content = '') {
        if (!this.validateKeys()) return content;

        const shift = this._getShift();
        return [...content].map((char) => String.fromCodePoint(char.codePointAt(0) + shift)).join('');
    }

    decrypt(content = '') {
        // 🔓 No keys → return original content
        if (!this.validateKeys()) return content;

        const shift = this._getShift();
        for (const char of content) {
            const cp = char.codePointAt(0) - shift;
            if (cp < 0 || cp > 0x10ffff) throw new RangeError('Invalid decryption key');
        }
        return [...content].map((char) => String.fromCodePoint(char.codePointAt(0) - shift)).join('');
    }

    /* =========================
       🎭 Masking
       ========================= */

    mask(content = '', separator = '') {
        return `${separator}\n${content}\n${separator}`;
    }
}

module.exports = ShiftCipher;
