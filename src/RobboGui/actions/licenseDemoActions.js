import {postActivateDemo} from '../../lib/licensing/activationClient.js';
import {verifyDemoActivationJwt} from '../../lib/licensing/verifyJwtRs256.js';
import {loadPaidAddonFromManifestUrl} from '../../lib/licensing/loadPaidAddon.js';
import paidAddonRegistry from '../../lib/licensing/paidAddonRegistry.js';
import {
    LS_ACTIVATION_BASE,
    LS_TOKEN,
    LICENSE_DEMO_ACTIVATE_START,
    LICENSE_DEMO_ACTIVATE_SUCCESS,
    LICENSE_DEMO_ACTIVATE_FAILURE,
    LICENSE_DEMO_ADDON_READY,
    LICENSE_DEMO_ADDON_FAILURE,
    LICENSE_DEMO_SET_ACTIVATION_BASE,
    LICENSE_DEMO_HYDRATE,
    LICENSE_DEMO_CLEAR,
    LICENSE_DEMO_PREMIUM_CHECK_RESULT,
    CAPABILITY_PREMIUM_AUTO_UPDATE,
    readPersistedActivationBase
} from '../reducers/license_demo.js';

const LS_DEVICE = 'rs3_demo_device_id';
const LS_ADDON_CACHE_MANIFEST = 'rs3_demo_addon_manifest_url';
const LS_ADDON_CACHE_BUNDLE = 'rs3_demo_addon_bundle';

function getOrCreateDemoDeviceId () {
    try {
        if (typeof localStorage !== 'undefined') {
            let id = localStorage.getItem(LS_DEVICE);
            if (!id) {
                id =
                    typeof crypto !== 'undefined' &&
                    crypto.randomUUID
                        ? crypto.randomUUID()
                        : `dev-${Date.now()}-${Math.random()
                            .toString(36)
                            .slice(2)}`;
                localStorage.setItem(LS_DEVICE, id);
            }
            return id;
        }
    } catch (e) { /* ignore */ }
    return 'dev-fallback';
}

function persistLicenseToStorage (activationBaseUrl, token) {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(LS_ACTIVATION_BASE, activationBaseUrl);
            localStorage.setItem(LS_TOKEN, token);
        }
    } catch (e) { /* ignore */ }
}

export function removeDemoLicenseFromStorage () {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(LS_TOKEN);
            localStorage.removeItem(LS_ADDON_CACHE_MANIFEST);
            localStorage.removeItem(LS_ADDON_CACHE_BUNDLE);
        }
    } catch (e) { /* ignore */ }
}

export function manifestUrlFromJwtOrBase (jwtPayload, activationBaseUrlTrimmed) {
    if (jwtPayload.addonManifestUrl && typeof jwtPayload.addonManifestUrl === 'string') {
        return jwtPayload.addonManifestUrl;
    }
    const base = activationBaseUrlTrimmed.replace(/\/$/, '');
    return `${base}/addon/manifest.json`;
}

function loadAddonDispatched (dispatch, manifestUrl) {
    return loadPaidAddonFromManifestUrl(manifestUrl)
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
        return postActivateDemo(base, {
            licenseKey: licenseKeyTrimmed.trim(),
            deviceId: getOrCreateDemoDeviceId(),
            publicBase: publicBaseForUrls
        })
            .then(resp => verifyDemoActivationJwt(resp.signedOfflineToken).then(jwtPayload => ({
                resp,
                jwtPayload
            })))
            .then(({resp, jwtPayload}) => {
                const capList = Array.isArray(jwtPayload.capabilities) &&
                    jwtPayload.capabilities.length > 0
                    ? jwtPayload.capabilities.slice()
                    : jwtPayload.demo === true
                        ? [CAPABILITY_PREMIUM_AUTO_UPDATE]
                        : [];

                const addonManifestUrl =
                    typeof resp.addonManifestUrl === 'string' &&
                    resp.addonManifestUrl.trim()
                        ? resp.addonManifestUrl.trim()
                        : manifestUrlFromJwtOrBase(jwtPayload, publicBaseForUrls);

                persistLicenseToStorage(base, resp.signedOfflineToken);

                dispatch({
                    type: LICENSE_DEMO_ACTIVATE_SUCCESS,
                    payload: {
                        signedOfflineToken: resp.signedOfflineToken,
                        addonManifestUrl,
                        capabilities: capList.length > 0
                            ? capList
                            : [CAPABILITY_PREMIUM_AUTO_UPDATE]
                    }
                });
                return loadAddonDispatched(dispatch, addonManifestUrl);
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

                dispatch(persistActivationBaseUrlDemoThunk(base));

                if (!token || !token.trim()) {
                    dispatch({
                        type: LICENSE_DEMO_CLEAR,
                        payload: {activationBaseUrl: base}
                    });
                    return Promise.resolve();
                }

                return verifyDemoActivationJwt(token)
                    .then(jwtPayload => {
                        let caps =
                            Array.isArray(jwtPayload.capabilities) &&
                            jwtPayload.capabilities.length > 0
                                ? jwtPayload.capabilities.slice()
                                : jwtPayload.demo
                                    ? [CAPABILITY_PREMIUM_AUTO_UPDATE]
                                    : [];
                        const manifestUrl = manifestUrlFromJwtOrBase(
                            jwtPayload,
                            base.replace(/\/$/, '')
                        );
                        dispatch({
                            type: LICENSE_DEMO_HYDRATE,
                            payload: {
                                activationBaseUrl: base,
                                signedOfflineToken: token,
                                capabilities: caps,
                                addonManifestUrl: manifestUrl,
                                status: 'valid_offline',
                                addonReady: false,
                                addonError: ''
                            }
                        });

                        /**
                         * If cached bundle hits, addon load works offline.
                         */
                        return loadAddonDispatched(dispatch, manifestUrl);
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
        void getState();
        return paidAddonRegistry.invokePremiumAutoUpdateDemo().then(result => {
            dispatch({
                type: LICENSE_DEMO_PREMIUM_CHECK_RESULT,
                payload: result
            });

            console.info('[rs3-demo-license] Premium auto-update result:', result);
            if (typeof window !== 'undefined' && window.alert) {
                const text = result.error
                    ? `${result.error}\n${result.message || ''}`
                    : (result.message || JSON.stringify(result, null, 2));
                window.alert(text);
            }
            return result;
        });
    };
}
