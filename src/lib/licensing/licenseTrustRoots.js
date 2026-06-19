/**
 * JWT verification trust roots keyed by `kid`.
 * Demo key is accepted only outside production builds.
 */

import DEMO_PUBLIC_KEY_PEM from './demoPublicKeyPem';

export const DEMO_TRUST_KID = 'demo-rs3-1';

/**
 * @param {string} kid JWT header kid
 * @returns {string|null} PEM public key or null if untrusted
 */
export function getTrustRootPemForKid (kid) {
    if (kid === DEMO_TRUST_KID) {
        if (process.env.NODE_ENV === 'production') {
            return null;
        }
        return DEMO_PUBLIC_KEY_PEM;
    }
    return null;
}

/**
 * @param {string} kid
 * @returns {boolean}
 */
export function isTrustKidAllowed (kid) {
    return getTrustRootPemForKid(kid) !== null;
}
