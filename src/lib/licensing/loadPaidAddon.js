import paidAddonRegistry from './paidAddonRegistry';
import {addonAuthHeaders} from './activationClient';
import {verifySignedManifest} from './manifestVerify';
import {decryptAddonBundle, sha256HexOfString} from './addonCrypto';
import {computeDeviceFingerprint, getCachedDeviceFingerprint} from './deviceFingerprint';

const LS_MANIFEST = 'rs3_license_addon_manifest_url';
const LS_BUNDLE_ENC = 'rs3_license_addon_bundle_enc';
const LS_BOUND_FP = 'rs3_license_bound_fingerprint';

function readBoundFingerprint () {
    try {
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem(LS_BOUND_FP) || '';
        }
    } catch (e) { /* ignore */ }
    return '';
}

function persistAddonCache (manifestUrl, encBundle, fingerprint) {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(LS_MANIFEST, manifestUrl);
            localStorage.setItem(LS_BUNDLE_ENC, encBundle);
            localStorage.setItem(LS_BOUND_FP, fingerprint);
        }
    } catch (e) { /* ignore */ }
}

function clearAddonCache () {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(LS_MANIFEST);
            localStorage.removeItem(LS_BUNDLE_ENC);
            localStorage.removeItem(LS_BOUND_FP);
        }
    } catch (e) { /* ignore */ }
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('rs3_demo_addon_bundle');
            localStorage.removeItem('rs3_demo_addon_manifest_url');
        }
    } catch (e) { /* ignore */ }
}

/**
 * @param {string} bundleSource plain JS
 * @param {object} licenseContext passed to addon factory
 * @returns {Promise<void>}
 */
function runInject (bundleSource, licenseContext) {
    return new Promise((resolve, reject) => {
        paidAddonRegistry.reset();
        const blob = new Blob([bundleSource], {type: 'text/javascript'});
        const url = URL.createObjectURL(blob);
        const s = document.createElement('script');
        s.async = false;
        s.src = url;
        s.onload = () => {
            URL.revokeObjectURL(url);
            try {
                if (typeof window.__RS3_PAID_ADDON_FACTORY__ !== 'function') {
                    throw new Error('addon_factory_missing');
                }
                const ctx = licenseContext || {};
                paidAddonRegistry.setLicenseContext(ctx);
                window.__RS3_PAID_ADDON_FACTORY__(
                    paidAddonRegistry.getHooksForBootstrap(),
                    ctx
                );
            } catch (err) {
                reject(err);
                return;
            }
            resolve(undefined);
        };
        s.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('addon_script_inject_failed'));
        };
        document.head.appendChild(s);
    });
}

/**
 * @param {object} manifest
 * @param {string} manifestUrl
 * @param {string} signedOfflineToken
 * @param {string} deviceFingerprint
 * @param {object} licenseContext
 * @returns {Promise<void>}
 */
function fetchAndDecryptBundle (manifest, manifestUrl, signedOfflineToken, deviceFingerprint, licenseContext) {
    const bundlePath = manifest.bundle || manifest.bundlePath;
    if (!bundlePath) {
        return Promise.reject(new Error('manifest_no_bundle_field'));
    }
    const bundleUrl = new URL(bundlePath, manifestUrl).href;
    const headers = addonAuthHeaders(signedOfflineToken, deviceFingerprint);
    return fetch(bundleUrl, {cache: 'no-store', headers})
        .then(bRes => {
            if (!bRes.ok) {
                throw new Error(`bundle_fetch_${bRes.status}`);
            }
            return bRes.text();
        })
        .then(encText => {
            const licenseId = licenseContext.licenseId || '';
            return decryptAddonBundle(encText.trim(), deviceFingerprint, licenseId).then(plain => {
                if (manifest.bundleSha256) {
                    return sha256HexOfString(plain).then(hex => {
                        if (hex !== manifest.bundleSha256.toLowerCase()) {
                            throw new Error('addon_bundle_hash_mismatch');
                        }
                        return {plain, encText};
                    });
                }
                return {plain, encText};
            });
        })
        .then(({plain, encText}) => {
            persistAddonCache(manifestUrl, encText, deviceFingerprint);
            return runInject(plain, licenseContext);
        });
}

/**
 * Fetch manifest + encrypted bundle (or use per-device cache), verify, decrypt, inject.
 *
 * @param {string} manifestUrl absolute URL
 * @param {object} options
 * @param {string} options.signedOfflineToken JWT for addon auth
 * @param {object} options.licenseContext context for addon factory
 * @returns {Promise<void>}
 */
export function loadPaidAddonFromManifestUrl (manifestUrl, options) {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
        return Promise.reject(new Error('no_dom'));
    }

    const opts = options || {};
    const token = opts.signedOfflineToken || '';
    const licenseContext = opts.licenseContext || {};

    return computeDeviceFingerprint().then(deviceFingerprint => {
        const bound = readBoundFingerprint();
        if (bound && bound !== deviceFingerprint) {
            clearAddonCache();
        }

        let encCached = null;
        try {
            if (typeof localStorage !== 'undefined') {
                const m = localStorage.getItem(LS_MANIFEST);
                const b = localStorage.getItem(LS_BUNDLE_ENC);
                if (m === manifestUrl && b && b.length > 20 && bound === deviceFingerprint) {
                    encCached = b;
                }
            }
        } catch (e) { /* ignore */ }

        if (encCached && token) {
            const licenseId = licenseContext.licenseId || '';
            return decryptAddonBundle(encCached, deviceFingerprint, licenseId)
                .then(plain => runInject(plain, licenseContext))
                .catch(() => {
                    clearAddonCache();
                    return loadPaidAddonFromManifestUrl(manifestUrl, options);
                });
        }

        if (!token) {
            return Promise.reject(new Error('addon_auth_token_required'));
        }

        const headers = addonAuthHeaders(token, deviceFingerprint);
        return fetch(manifestUrl, {cache: 'no-store', headers})
            .then(manRes => {
                if (!manRes.ok) {
                    throw new Error(`manifest_fetch_${manRes.status}`);
                }
                return manRes.json();
            })
            .then(manifest => verifySignedManifest(manifest))
            .then(manifest =>
                fetchAndDecryptBundle(
                    manifest,
                    manifestUrl,
                    token,
                    deviceFingerprint,
                    licenseContext
                )
            );
    });
}

export {clearAddonCache, LS_BOUND_FP, LS_BUNDLE_ENC, LS_MANIFEST};
