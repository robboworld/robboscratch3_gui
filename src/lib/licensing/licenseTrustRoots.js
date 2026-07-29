/**
 * JWT verification trust roots keyed by `kid`.
 * Production key is accepted in all builds; demo key only outside production.
 */

import DEMO_PUBLIC_KEY_PEM from './demoPublicKeyPem';
import PROD_PUBLIC_KEY_PEM from './prodPublicKeyPem';

export const DEMO_TRUST_KID = 'demo-rs3-1';
export const PROD_TRUST_KID = 'rs3-prod-1';

/**
 * @param {string} kid JWT header kid
 * @returns {string|null} PEM public key or null if untrusted
 */
export function getTrustRootPemForKid (kid) {
    if (kid === PROD_TRUST_KID) {
        return PROD_PUBLIC_KEY_PEM;
    }
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
