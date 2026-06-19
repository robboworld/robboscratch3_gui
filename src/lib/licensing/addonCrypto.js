/**
 * Per-device addon bundle decryption (AES-256-GCM).
 * Key = SHA-256(fingerprint + ':' + licenseId) — matches mock/production server.
 */

function sha256Bytes (input) {
    const data = new TextEncoder().encode(input);
    return crypto.subtle.digest('SHA-256', data);
}

/**
 * @param {string} fingerprint device fingerprint hex
 * @param {string} licenseId from JWT payload
 * @returns {Promise<CryptoKey>}
 */
function deriveAesKey (fingerprint, licenseId) {
    const material = `${fingerprint}:${licenseId || ''}`;
    return sha256Bytes(material).then(raw =>
        crypto.subtle.importKey('raw', raw, {name: 'AES-GCM'}, false, ['decrypt'])
    );
}

/**
 * @param {string} encryptedBase64 iv(12)+tag(16)+ciphertext as base64
 * @param {string} fingerprint
 * @param {string} licenseId
 * @returns {Promise<string>} UTF-8 JS source
 */
export function decryptAddonBundle (encryptedBase64, fingerprint, licenseId) {
    if (!encryptedBase64 || !fingerprint) {
        return Promise.reject(new Error('addon_decrypt_missing_params'));
    }
    const subtle = typeof crypto !== 'undefined' && crypto.subtle;
    if (!subtle) {
        return Promise.reject(new Error('crypto_subtle_missing'));
    }
    const bin = atob(encryptedBase64);
    const all = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
        all[i] = bin.charCodeAt(i);
    }
    if (all.length < 28) {
        return Promise.reject(new Error('addon_decrypt_bad_blob'));
    }
    const iv = all.slice(0, 12);
    const tag = all.slice(12, 28);
    const ciphertext = all.slice(28);
    const cipherWithTag = new Uint8Array(ciphertext.length + tag.length);
    cipherWithTag.set(ciphertext);
    cipherWithTag.set(tag, ciphertext.length);

    return deriveAesKey(fingerprint, licenseId).then(key =>
        subtle.decrypt({name: 'AES-GCM', iv}, key, cipherWithTag)
    ).then(plainBuf =>
        new TextDecoder().decode(plainBuf)
    );
}

/**
 * @param {string} source UTF-8 JS
 * @returns {Promise<string>} lowercase hex sha256
 */
export function sha256HexOfString (source) {
    const data = new TextEncoder().encode(source);
    return crypto.subtle.digest('SHA-256', data).then(buf => {
        const arr = new Uint8Array(buf);
        let hex = '';
        for (let i = 0; i < arr.length; i++) {
            hex += arr[i].toString(16).padStart(2, '0');
        }
        return hex;
    });
}
