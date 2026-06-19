import {postActivateDemo} from '../../lib/licensing/activationClient.js';
import {verifyDemoActivationJwt} from '../../lib/licensing/verifyJwtRs256.js';
import {loadPaidAddonFromManifestUrl, clearAddonCache} from '../../lib/licensing/loadPaidAddon.js';
import paidAddonRegistry from '../../lib/licensing/paidAddonRegistry.js';
import {computeDeviceFingerprint, getCachedDeviceFingerprint, LS_FP_CACHE} from '../../lib/licensing/deviceFingerprint.js';
import {assertPremiumAutoUpdateCapability} from '../../lib/licensing/capabilityGateway.js';
import {
    LS_ACTIVATION_BASE,
    LS_TOKEN,
    LS_BOUND_FP,
    LICENSE_DEMO_ACTIVATE_START,
    LICENSE_DEMO_ACTIVATE_SUCCESS,
    LICENSE_DEMO_ACTIVATE_FAILURE,
    LICENSE_DEMO_ADDON_READY,
    LICENSE_DEMO_ADDON_FAILURE,
    LICENSE_DEMO_SET_ACTIVATION_BASE,
    LICENSE_DEMO_HYDRATE,
    LICENSE_DEMO_CLEAR,
    LICENSE_DEMO_PREMIUM_CHECK_RESULT,
    readPersistedActivationBase
} from '../reducers/license_demo.js';

function capabilitiesFromPayload (jwtPayload) {
    if (!jwtPayload || !Array.isArray(jwtPayload.capabilities)) {
        return [];
    }
    return jwtPayload.capabilities.slice();
}

function licenseContextFromPayload (jwtPayload) {
    return {
        licenseId: jwtPayload.licenseId || jwtPayload.sub || '',
        seatId: jwtPayload.seatId || '',
        capabilities: capabilitiesFromPayload(jwtPayload),
        expiresAt: jwtPayload.exp || null,
        deviceBindingValid: jwtPayload.deviceBindingValid !== false
    };
}

function persistLicenseToStorage (activationBaseUrl, token, fingerprint) {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(LS_ACTIVATION_BASE, activationBaseUrl);
            localStorage.setItem(LS_TOKEN, token);
            if (fingerprint) {
                localStorage.setItem(LS_BOUND_FP, fingerprint);
                localStorage.setItem(LS_FP_CACHE, fingerprint);
            }
        }
    } catch (e) { /* ignore */ }
}

export function removeDemoLicenseFromStorage () {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(LS_TOKEN);
            localStorage.removeItem(LS_BOUND_FP);
        }
    } catch (e) { /* ignore */ }
    clearAddonCache();
}

export function manifestUrlFromJwtOrBase (jwtPayload, activationBaseUrlTrimmed) {
    if (jwtPayload.addonManifestUrl && typeof jwtPayload.addonManifestUrl === 'string') {
        return jwtPayload.addonManifestUrl;
    }
    const base = activationBaseUrlTrimmed.replace(/\/$/, '');
    return `${base}/addon/manifest.json`;
}

function loadAddonDispatched (dispatch, manifestUrl, signedOfflineToken, licenseContext) {
    return loadPaidAddonFromManifestUrl(manifestUrl, {
        signedOfflineToken,
        licenseContext
    })
        .then(() => {
            dispatch({type: LICENSE_DEMO_ADDON_READY});
        })
        .catch(err => {
            dispatch({
                type: LICENSE_DEMO_ADDON_FAILURE,
                payload: {message: err.message || String(err)}
            });
        });
}

/**
 * Persist activation URL when user edits the field (localStorage + redux).
 * @param {string} activationBaseUrl
 * @returns {function}
 */
export function persistActivationBaseUrlDemoThunk (activationBaseUrl) {
    return function (dispatch) {
        const t = (activationBaseUrl || '').trim();
        dispatch({
            type: LICENSE_DEMO_SET_ACTIVATION_BASE,
            payload: t
        });
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(LS_ACTIVATION_BASE, t);
            }
        } catch (e) { /* ignore */ }
    };
}

/**
 * @param {string} licenseKeyTrimmed user-entered demo key
 * @returns {function}
 */
export function activateLicenseDemoThunk (licenseKeyTrimmed) {
    return function (dispatch, getState) {
        const state = getState();
        const base = (state.scratchGui.license_demo.activationBaseUrl || '').trim();
        if (!licenseKeyTrimmed || !licenseKeyTrimmed.trim()) {
            dispatch({
                type: LICENSE_DEMO_ACTIVATE_FAILURE,
                payload: {message: 'empty_license_key'}
            });
            return Promise.resolve();
        }
        dispatch({type: LICENSE_DEMO_ACTIVATE_START});
        const publicBaseForUrls = base.replace(/\/$/, '');
        return computeDeviceFingerprint()
            .then(fingerprint => postActivateDemo(base, {
                licenseKey: licenseKeyTrimmed.trim(),
                deviceFingerprint: fingerprint,
                publicBase: publicBaseForUrls
            }).then(resp => verifyDemoActivationJwt(resp.signedOfflineToken).then(jwtPayload => ({
                resp,
                jwtPayload,
                fingerprint
            }))))
            .then(({resp, jwtPayload, fingerprint}) => {
                const capList = capabilitiesFromPayload(jwtPayload);
                if (capList.length === 0) {
                    throw new Error('capability_denied');
                }

                const addonManifestUrl =
                    typeof resp.addonManifestUrl === 'string' &&
                    resp.addonManifestUrl.trim()
                        ? resp.addonManifestUrl.trim()
                        : manifestUrlFromJwtOrBase(jwtPayload, publicBaseForUrls);

                persistLicenseToStorage(base, resp.signedOfflineToken, fingerprint);

                const licenseContext = licenseContextFromPayload(jwtPayload);

                dispatch({
                    type: LICENSE_DEMO_ACTIVATE_SUCCESS,
                    payload: {
                        signedOfflineToken: resp.signedOfflineToken,
                        addonManifestUrl,
                        capabilities: capList,
                        licenseId: licenseContext.licenseId,
                        seatId: licenseContext.seatId,
                        deviceBindingValid: true
                    }
                });
                return loadAddonDispatched(
                    dispatch,
                    addonManifestUrl,
                    resp.signedOfflineToken,
                    licenseContext
                );
            })
            .catch(err => {
                dispatch({
                    type: LICENSE_DEMO_ACTIVATE_FAILURE,
                    payload: {message: err.message || String(err)}
                });
            });
    };
}

/**
 * Restore JWT + optionally warm addon cache from persisted storage at app start.
 * @returns {function}
 */
export function hydrateLicenseDemoThunk () {
    return function (dispatch) {
        try {
            if (typeof localStorage !== 'undefined') {
                const base = localStorage.getItem(LS_ACTIVATION_BASE) ||
                    readPersistedActivationBase();
                const token =
                    typeof localStorage.getItem === 'function'
                        ? localStorage.getItem(LS_TOKEN)
                        : '';
                const storedFp = localStorage.getItem(LS_BOUND_FP) || '';

                dispatch(persistActivationBaseUrlDemoThunk(base));

                if (!token || !token.trim()) {
                    dispatch({
                        type: LICENSE_DEMO_CLEAR,
                        payload: {activationBaseUrl: base}
                    });
                    return Promise.resolve();
                }

                return computeDeviceFingerprint()
                    .then(currentFp => {
                        if (storedFp && storedFp !== currentFp) {
                            removeDemoLicenseFromStorage();
                            paidAddonRegistry.reset();
                            dispatch({
                                type: LICENSE_DEMO_CLEAR,
                                payload: {activationBaseUrl: base}
                            });
                            return null;
                        }
                        return verifyDemoActivationJwt(token).then(jwtPayload => {
                            const caps = capabilitiesFromPayload(jwtPayload);
                            if (caps.length === 0) {
                                throw new Error('capability_denied');
                            }
                            const manifestUrl = manifestUrlFromJwtOrBase(
                                jwtPayload,
                                base.replace(/\/$/, '')
                            );
                            const licenseContext = licenseContextFromPayload(jwtPayload);
                            dispatch({
                                type: LICENSE_DEMO_HYDRATE,
                                payload: {
                                    activationBaseUrl: base,
                                    signedOfflineToken: token,
                                    capabilities: caps,
                                    addonManifestUrl: manifestUrl,
                                    licenseId: licenseContext.licenseId,
                                    seatId: licenseContext.seatId,
                                    deviceBindingValid: true,
                                    status: 'valid_offline',
                                    addonReady: false,
                                    addonError: ''
                                }
                            });
                            return loadAddonDispatched(
                                dispatch,
                                manifestUrl,
                                token,
                                licenseContext
                            );
                        });
                    })
                    .catch(() => {
                        removeDemoLicenseFromStorage();
                        paidAddonRegistry.reset();
                        dispatch({
                            type: LICENSE_DEMO_CLEAR,
                            payload: {activationBaseUrl: base}
                        });
                    });
            }
            return Promise.resolve();
        } catch (e) {
            return Promise.resolve();
        }
    };
}

/** @returns {function} */
export function clearDemoLicenseThunk () {
    return function (dispatch, getState) {
        const base =
            typeof getState().scratchGui.license_demo !== 'undefined'
                ? String(getState().scratchGui.license_demo.activationBaseUrl || '')
                    .trim() || readPersistedActivationBase()
                : readPersistedActivationBase();
        removeDemoLicenseFromStorage();
        paidAddonRegistry.reset();
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(LS_ACTIVATION_BASE, base);
            }
        } catch (e) { /* ignore */ }
        dispatch({
            type: LICENSE_DEMO_CLEAR,
            payload: {activationBaseUrl: base}
        });
    };
}

/** @returns {function} */
export function premiumAutoUpdateDemoCheckThunk () {
    return function (dispatch, getState) {
        const licenseState = getState().scratchGui.license_demo;
        const gate = assertPremiumAutoUpdateCapability(licenseState);
        if (!gate.ok) {
            const result = {
                error: gate.code || 'CAPABILITY_DENIED'
            };
            dispatch({
                type: LICENSE_DEMO_PREMIUM_CHECK_RESULT,
                payload: result
            });
            return Promise.resolve(result);
        }
        return paidAddonRegistry.invokePremiumAutoUpdateDemo(licenseContextFromPayload({
            licenseId: licenseState.licenseId,
            seatId: licenseState.seatId,
            capabilities: licenseState.capabilities,
            deviceBindingValid: licenseState.deviceBindingValid
        })).then(result => {
            dispatch({
                type: LICENSE_DEMO_PREMIUM_CHECK_RESULT,
                payload: result
            });

            console.info('[rs3-demo-license] Premium auto-update result:', result);
            return result;
        });
    };
}

export {getCachedDeviceFingerprint};
