/**
 * Verify signed paid-addon manifest (RS256 over canonical JSON).
 */

import {getTrustRootPemForKid} from './licenseTrustRoots';

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
 * Canonical manifest body for signature (sorted keys, no signature field).
 * @param {object} manifest
 * @returns {string}
 */
export function canonicalManifestJson (manifest) {
    const copy = Object.assign({}, manifest);
    delete copy.manifestSignature;
    delete copy.signatureKid;
    const keys = Object.keys(copy).sort();
    const ordered = {};
    keys.forEach(k => {
        ordered[k] = copy[k];
    });
    return JSON.stringify(ordered);
}

/**
 * @param {object} manifest parsed manifest.json
 * @returns {Promise<object>} manifest if valid
 */
export function verifySignedManifest (manifest) {
    if (!manifest || typeof manifest !== 'object') {
        return Promise.reject(new Error('manifest_invalid'));
    }
    const sig = manifest.manifestSignature;
    const kid = manifest.signatureKid;
    if (!sig || !kid) {
        return Promise.reject(new Error('manifest_unsigned'));
    }
    const pem = getTrustRootPemForKid(kid);
    if (!pem) {
        return Promise.reject(new Error('manifest_untrusted_kid'));
    }
    const canonical = canonicalManifestJson(manifest);
    const data = new TextEncoder().encode(canonical);
    const sigBytes = base64UrlToUint8Array(sig);
    return importRsaPublicFromPem(pem)
        .then(pk => crypto.subtle.verify(
            {name: 'RSASSA-PKCS1-v1_5'},
            pk,
            sigBytes,
            data
        ))
        .then(ok => {
            if (!ok) {
                throw new Error('manifest_invalid_signature');
            }
            return manifest;
        });
}
