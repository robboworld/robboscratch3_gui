import DEMO_PUBLIC_KEY_PEM from './demoPublicKeyPem';

/**
 * @param {string} b64url
 * @returns {Uint8Array}
 */
function base64UrlToUint8Array (b64url) {
    let base64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) {
        base64 += '='.repeat(4 - pad);
    }
    const bin = atob(base64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
        out[i] = bin.charCodeAt(i);
    }
    return out;
}

/**
 * Standard Base64 PEM body (not base64url).
 * @param {string} pemBody
 * @returns {Uint8Array}
 */
function pemBase64ToUint8Array (pemBody) {
    let base64 = pemBody.replace(/\s+/g, '');
    const pad = base64.length % 4;
    if (pad) {
        base64 += '='.repeat(4 - pad);
    }
    const bin = atob(base64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
        out[i] = bin.charCodeAt(i);
    }
    return out;
}

/**
 * @param {string} pem
 * @returns {Promise<CryptoKey>}
 */
function importRsaPublicFromPem (pem) {
    const pemContents = pem
        .replace('-----BEGIN PUBLIC KEY-----', '')
        .replace('-----END PUBLIC KEY-----', '')
        .replace(/\s+/g, '');
    const der = pemBase64ToUint8Array(pemContents);
    return crypto.subtle.importKey(
        'spki',
        der,
        {name: 'RSASSA-PKCS1-v1_5', hash: {name: 'SHA-256'}},
        false,
        ['verify']
    );
}

/**
 * Decode RS256 JWT and verify signature (demo key).
 *
 * @param {string} token JWT compact form
 * @returns {Promise<object>} Parsed payload object
 */
export function verifyDemoActivationJwt (token) {
    try {
        if (typeof token !== 'string' || !token || token.split('.').length !== 3) {
            return Promise.reject(new Error('invalid_token_shape'));
        }
        const [h64, pl64, sig64] = token.split('.');
        const algHeader = JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(h64)));
        if (!algHeader || algHeader.alg !== 'RS256') {
            return Promise.reject(new Error('unsupported_jwt_alg'));
        }
        const subtle = typeof crypto !== 'undefined' && crypto.subtle;
        if (!subtle) {
            return Promise.reject(new Error('crypto_subtle_missing'));
        }
        return importRsaPublicFromPem(DEMO_PUBLIC_KEY_PEM)
            .then(pk => {
                const data = new TextEncoder().encode(`${h64}.${pl64}`);
                const sig = base64UrlToUint8Array(sig64);
                return subtle.verify({name: 'RSASSA-PKCS1-v1_5'}, pk, sig, data);
            })
            .then(ok => {
                if (!ok) {
                    throw new Error('invalid_signature');
                }
                const payload = JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(pl64)));
                const now = Math.floor(Date.now() / 1000);
                if (payload.exp != null && now >= payload.exp) {
                    throw new Error('license_expired');
                }
                return payload;
            });
    } catch (e) {
        return Promise.reject(e);
    }
}
