import {
    postActivate,
    postDeviceLinkStart,
    postDeviceLinkPoll,
    postSeatRelease,
    postTokenRefresh
} from '../../lib/licensing/activationClient.js';
import {
    LICENSE_REASON_EXPIRED,
    LICENSE_REASON_INVALID,
    LICENSE_REASON_NOT_YET_VALID,
    LICENSE_REASON_OTHER_DEVICE,
    LICENSE_REASONS_DROPPING_TOKEN
} from '../../lib/licensing/licenseReasons.js';
import {verifyActivationJwt} from '../../lib/licensing/verifyJwtRs256.js';
import {loadPaidAddonFromManifestUrl, clearAddonCache} from '../../lib/licensing/loadPaidAddon.js';
import paidAddonRegistry from '../../lib/licensing/paidAddonRegistry.js';
import {computeDeviceFingerprint, getCachedDeviceFingerprint, LS_FP_CACHE} from '../../lib/licensing/deviceFingerprint.js';
import {assertPremiumAutoUpdateCapability} from '../../lib/licensing/capabilityGateway.js';
import {isDesktopWithBluetooth, openExternalUrl} from '../../lib/platform.js';
import {APP_VERSION} from '../AboutWindowComponent.js';
import log from '../../lib/log';
import {
    LS_ACTIVATION_BASE,
    LS_TOKEN,
    LS_BOUND_FP,
    LICENSE_ACTIVATE_START,
    LICENSE_ACTIVATE_SUCCESS,
    LICENSE_ACTIVATE_FAILURE,
    LICENSE_ADDON_READY,
    LICENSE_ADDON_FAILURE,
    LICENSE_SET_ACTIVATION_BASE,
    LICENSE_HYDRATE,
    LICENSE_CLEAR,
    LICENSE_DEVICE_LINK_START,
    LICENSE_DEVICE_LINK_CANCEL,
    LICENSE_PREMIUM_CHECK_RESULT,
    LICENSE_CHECK_STATUS,
    LICENSE_UPDATE_PHASE,
    LICENSE_UPDATE_PROGRESS,
    LICENSE_FEEDBACK_SHOW,
    LICENSE_FEEDBACK_DISMISS,
    LICENSE_LAPSED,
    LICENSE_REFRESH_START,
    LICENSE_REFRESH_END,
    licenseUpdateInitialState,
    licenseFeedbackInitialState,
    readPersistedActivationBase,
    readPersistedToken
} from '../reducers/license.js';

const DEVICE_LINK_POLL_MS = 3000;

/** @type {number|null} */
let deviceLinkPollTimer = null;
/** @type {number} generation token so stale polls ignore results after cancel */
let deviceLinkGeneration = 0;

function clearDeviceLinkPollTimer () {
    if (deviceLinkPollTimer !== null) {
        clearTimeout(deviceLinkPollTimer);
        deviceLinkPollTimer = null;
    }
}

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
        tariff: jwtPayload.tariff || '',
        ownerName: jwtPayload.ownerName || '',
        deviceBindingValid: jwtPayload.deviceBindingValid !== false,
        currentAppVersion: APP_VERSION
    };
}

function licenseContextFromState (licenseState, extra) {
    return Object.assign({
        licenseId: licenseState.licenseId,
        seatId: licenseState.seatId,
        capabilities: licenseState.capabilities,
        deviceBindingValid: licenseState.deviceBindingValid,
        currentAppVersion: APP_VERSION
    }, extra || {});
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

export function removeLicenseFromStorage () {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(LS_TOKEN);
            localStorage.removeItem(LS_BOUND_FP);
            localStorage.removeItem('rs3_demo_signed_token');
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
            dispatch({type: LICENSE_ADDON_READY});
            dispatch(premiumAutoUpdateCheckThunk());
        })
        .catch(err => {
            dispatch({
                type: LICENSE_ADDON_FAILURE,
                payload: {message: err.message || String(err)}
            });
        });
}

/**
 * Shared success path after /v1/activate or device-link poll returns a token.
 * @param {function} dispatch
 * @param {string} base
 * @param {object} resp
 * @param {string} fingerprint
 * @returns {Promise}
 */
function dispatchActivationErrorFeedback (dispatch, err) {
    const code = (err && (err.errorCode || err.message)) || 'activation_failed';
    dispatch({
        type: LICENSE_FEEDBACK_SHOW,
        payload: {
            phase: 'error',
            capabilities: [],
            errorCode: String(code),
            errorMessage: (err && err.message) ? String(err.message) : String(code)
        }
    });
}

function finishActivationFromResponse (dispatch, base, resp, fingerprint) {
    const publicBaseForUrls = base.replace(/\/$/, '');
    return verifyActivationJwt(resp.signedOfflineToken).then(jwtPayload => {
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
            type: LICENSE_ACTIVATE_SUCCESS,
            payload: {
                signedOfflineToken: resp.signedOfflineToken,
                addonManifestUrl,
                capabilities: capList,
                licenseId: licenseContext.licenseId,
                seatId: licenseContext.seatId,
                expiresAt: licenseContext.expiresAt,
                tariff: licenseContext.tariff,
                ownerName: licenseContext.ownerName,
                deviceBindingValid: true
            }
        });
        dispatch({
            type: LICENSE_FEEDBACK_SHOW,
            payload: {
                phase: 'success',
                capabilities: capList.slice(),
                errorCode: '',
                errorMessage: ''
            }
        });
        return loadAddonDispatched(
            dispatch,
            addonManifestUrl,
            resp.signedOfflineToken,
            licenseContext
        );
    });
}

/**
 * Persist activation URL when user edits the field (localStorage + redux).
 * @param {string} activationBaseUrl
 * @returns {function}
 */
export function persistActivationBaseUrlThunk (activationBaseUrl) {
    return function (dispatch) {
        const t = (activationBaseUrl || '').trim();
        dispatch({
            type: LICENSE_SET_ACTIVATION_BASE,
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
 * @param {string} licenseKeyTrimmed user-entered license key
 * @returns {function}
 */
export function activateLicenseThunk (licenseKeyTrimmed) {
    return function (dispatch, getState) {
        if (!isDesktopWithBluetooth()) {
            return Promise.resolve();
        }
        const state = getState();
        const base = (state.scratchGui.license.activationBaseUrl || '').trim();
        if (!licenseKeyTrimmed || !licenseKeyTrimmed.trim()) {
            dispatch({
                type: LICENSE_ACTIVATE_FAILURE,
                payload: {message: 'empty_license_key'}
            });
            return Promise.resolve();
        }
        clearDeviceLinkPollTimer();
        deviceLinkGeneration += 1;
        dispatch({type: LICENSE_ACTIVATE_START});
        const publicBaseForUrls = base.replace(/\/$/, '');
        return computeDeviceFingerprint()
            .then(fingerprint => postActivate(base, {
                licenseKey: licenseKeyTrimmed.trim(),
                deviceFingerprint: fingerprint,
                publicBase: publicBaseForUrls
            }).then(resp => ({resp, fingerprint})))
            .then(({resp, fingerprint}) => finishActivationFromResponse(dispatch, base, resp, fingerprint))
            .catch(err => {
                dispatch({
                    type: LICENSE_ACTIVATE_FAILURE,
                    payload: {message: err.message || String(err)}
                });
                dispatchActivationErrorFeedback(dispatch, err);
            });
    };
}

/**
 * Cancel an in-progress device-link poll.
 * @returns {function}
 */
export function cancelDeviceLinkThunk () {
    return function (dispatch) {
        clearDeviceLinkPollTimer();
        deviceLinkGeneration += 1;
        dispatch({type: LICENSE_DEVICE_LINK_CANCEL});
    };
}

/**
 * Start Robbo ID device-link: open verification URL, poll until confirmed.
 * @returns {function}
 */
export function startDeviceLinkThunk () {
    return function (dispatch, getState) {
        if (!isDesktopWithBluetooth()) {
            return Promise.resolve();
        }
        const state = getState();
        const base = (state.scratchGui.license.activationBaseUrl || '').trim();
        if (!base) {
            dispatch({
                type: LICENSE_ACTIVATE_FAILURE,
                payload: {message: 'empty_activation_base'}
            });
            return Promise.resolve();
        }

        clearDeviceLinkPollTimer();
        const generation = ++deviceLinkGeneration;
        const publicBaseForUrls = base.replace(/\/$/, '');

        return computeDeviceFingerprint()
            .then(fingerprint => postDeviceLinkStart(base, {
                deviceFingerprint: fingerprint
            }).then(startResp => {
                if (generation !== deviceLinkGeneration) {
                    return null;
                }
                const userCode = String(startResp.user_code || '');
                const verificationUri = String(startResp.verification_uri || '');
                const deviceCode = String(startResp.device_code || '');
                const expiresIn = typeof startResp.expiresIn === 'number'
                    ? startResp.expiresIn
                    : 600;
                const deadline = Date.now() + (expiresIn * 1000);

                dispatch({
                    type: LICENSE_DEVICE_LINK_START,
                    payload: {
                        userCode,
                        verificationUri
                    }
                });

                const openUrl = userCode
                    ? `${verificationUri.replace(/\/$/, '')}?code=${encodeURIComponent(userCode)}`
                    : verificationUri;
                if (openUrl) {
                    openExternalUrl(openUrl);
                }

                const schedulePoll = () => {
                    if (generation !== deviceLinkGeneration) {
                        return;
                    }
                    deviceLinkPollTimer = setTimeout(runPoll, DEVICE_LINK_POLL_MS);
                };

                const runPoll = () => {
                    if (generation !== deviceLinkGeneration) {
                        return;
                    }
                    if (Date.now() > deadline) {
                        const expiredErr = new Error('device_link_expired');
                        expiredErr.errorCode = 'device_link_expired';
                        dispatch({
                            type: LICENSE_ACTIVATE_FAILURE,
                            payload: {message: 'device_link_expired'}
                        });
                        dispatchActivationErrorFeedback(dispatch, expiredErr);
                        return;
                    }
                    postDeviceLinkPoll(base, {
                        deviceCode,
                        deviceFingerprint: fingerprint,
                        publicBase: publicBaseForUrls
                    })
                        .then(pollResp => {
                            if (generation !== deviceLinkGeneration) {
                                return;
                            }
                            if (pollResp && pollResp.signedOfflineToken) {
                                clearDeviceLinkPollTimer();
                                return finishActivationFromResponse(
                                    dispatch,
                                    base,
                                    pollResp,
                                    fingerprint
                                );
                            }
                            const status = pollResp && pollResp.status;
                            if (status && status !== 'pending') {
                                throw new Error(status);
                            }
                            schedulePoll();
                        })
                        .catch(err => {
                            if (generation !== deviceLinkGeneration) {
                                return;
                            }
                            clearDeviceLinkPollTimer();
                            dispatch({
                                type: LICENSE_ACTIVATE_FAILURE,
                                payload: {message: err.message || String(err)}
                            });
                            dispatchActivationErrorFeedback(dispatch, err);
                        });
                };

                schedulePoll();
                return null;
            }))
            .catch(err => {
                if (generation !== deviceLinkGeneration) {
                    return;
                }
                dispatch({
                    type: LICENSE_ACTIVATE_FAILURE,
                    payload: {message: err.message || String(err)}
                });
                dispatchActivationErrorFeedback(dispatch, err);
            });
    };
}

/** @returns {function} */
export function clearLicenseThunk () {
    return function (dispatch, getState) {
        clearDeviceLinkPollTimer();
        deviceLinkGeneration += 1;
        const base =
            typeof getState().scratchGui.license !== 'undefined'
                ? String(getState().scratchGui.license.activationBaseUrl || '')
                    .trim() || readPersistedActivationBase()
                : readPersistedActivationBase();
        removeLicenseFromStorage();
        paidAddonRegistry.reset();
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(LS_ACTIVATION_BASE, base);
            }
        } catch (e) { /* ignore */ }
        dispatch({
            type: LICENSE_CLEAR,
            payload: {activationBaseUrl: base}
        });
    };
}

/** The reason last told at start-up (`reason:exp`), so an expired licence is not announced on every start. */
const LS_LAPSE_NOTICE = 'rs3_license_lapse_notice';

/** How often a running editor asks the ЛК for the licence's current terms. */
const LICENSE_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;
let lastLicenseRefreshAt = 0;
let licenseRefreshTimer = null;

/**
 * Tell once why the licence stopped applying (start-up modal); the License window shows it too.
 * @param {function} dispatch redux dispatch
 * @param {string} reason LICENSE_REASON_*
 * @param {?number} date expiry (s) for an expired licence
 */
function showLapseNotice (dispatch, reason, date) {
    const key = `${reason}:${date || ''}`;
    try {
        if (typeof localStorage !== 'undefined') {
            if (localStorage.getItem(LS_LAPSE_NOTICE) === key) return;
            localStorage.setItem(LS_LAPSE_NOTICE, key);
        }
    } catch (e) { /* ignore */ }
    dispatch({
        type: LICENSE_FEEDBACK_SHOW,
        payload: {phase: 'lapsed', capabilities: [], errorCode: reason, errorMessage: '', date: date || null}
    });
}

/**
 * Remove a licence that cannot apply on this computer any more and say why.
 * @param {function} dispatch redux dispatch
 * @param {string} base activation server
 * @param {string} reason LICENSE_REASON_*
 */
function dropLicense (dispatch, base, reason) {
    removeLicenseFromStorage();
    paidAddonRegistry.reset();
    dispatch({type: LICENSE_CLEAR, payload: {activationBaseUrl: base, reason}});
    showLapseNotice(dispatch, reason, null);
}

/**
 * Keep a licence that does not apply right now (expired / not yet valid): the ЛК may renew it.
 * @param {function} dispatch redux dispatch
 * @param {string} token the offline token
 * @param {object} payload its verified claims
 * @param {string} status 'expired' | 'not_yet_valid'
 */
function lapseLicense (dispatch, token, payload, status) {
    paidAddonRegistry.reset();
    const context = licenseContextFromPayload(payload);
    dispatch({
        type: LICENSE_LAPSED,
        payload: {
            status,
            reason: status === 'expired' ? LICENSE_REASON_EXPIRED : LICENSE_REASON_NOT_YET_VALID,
            signedOfflineToken: token,
            expiresAt: payload.exp || null,
            notBefore: payload.nbf || null,
            tariff: context.tariff,
            ownerName: context.ownerName,
            licenseId: context.licenseId,
            seatId: context.seatId
        }
    });
    if (status === 'expired') {
        showLapseNotice(dispatch, LICENSE_REASON_EXPIRED, payload.exp || null);
    }
}

/**
 * Renew the offline token from the ЛК: a renewal or new terms reach the computer, a revocation or a
 * removed seat ends the licence here with its reason. Offline nothing changes.
 * @param {object} [options] force: skip the 12-hour pause (start-up of an expired licence, "Check
 *     again"); manual: report a failure to reach the server
 * @returns {function} thunk resolving to 'renewed' | 'ended' | 'unchanged'
 */
export function refreshLicenseThunk (options) {
    const force = Boolean(options && (options.force || options.manual));
    const manual = Boolean(options && options.manual);
    return function (dispatch, getState) {
        if (!isDesktopWithBluetooth()) {
            return Promise.resolve('unchanged');
        }
        const now = Date.now();
        if (!force && now - lastLicenseRefreshAt < LICENSE_REFRESH_INTERVAL_MS) {
            return Promise.resolve('unchanged');
        }
        const state = getState().scratchGui.license;
        const token = readPersistedToken() || state.signedOfflineToken;
        const base = (state.activationBaseUrl || readPersistedActivationBase()).trim();
        if (!token || !base) {
            return Promise.resolve('unchanged');
        }
        lastLicenseRefreshAt = now;
        dispatch({type: LICENSE_REFRESH_START});
        const done = result => {
            dispatch({type: LICENSE_REFRESH_END});
            return result;
        };
        return computeDeviceFingerprint()
            .then(fingerprint => postTokenRefresh(base, {
                signedOfflineToken: token,
                deviceFingerprint: fingerprint,
                publicBase: base.replace(/\/$/, '')
            })
                .then(resp => verifyActivationJwt(resp.signedOfflineToken).then(jwtPayload => {
                    const caps = capabilitiesFromPayload(jwtPayload);
                    if (caps.length === 0) {
                        throw new Error('capability_denied');
                    }
                    const before = getState().scratchGui.license;
                    const manifestUrl = typeof resp.addonManifestUrl === 'string' && resp.addonManifestUrl.trim() ?
                        resp.addonManifestUrl.trim() :
                        manifestUrlFromJwtOrBase(jwtPayload, base.replace(/\/$/, ''));
                    persistLicenseToStorage(base, resp.signedOfflineToken, fingerprint);
                    const context = licenseContextFromPayload(jwtPayload);
                    dispatch({
                        type: LICENSE_HYDRATE,
                        payload: {
                            activationBaseUrl: base,
                            signedOfflineToken: resp.signedOfflineToken,
                            capabilities: caps,
                            addonManifestUrl: manifestUrl,
                            licenseId: context.licenseId,
                            seatId: context.seatId,
                            expiresAt: context.expiresAt,
                            tariff: context.tariff,
                            ownerName: context.ownerName,
                            deviceBindingValid: true,
                            status: 'valid_offline',
                            addonReady: before.addonReady && before.status === 'valid_offline',
                            addonError: ''
                        }
                    });
                    try {
                        if (typeof localStorage !== 'undefined') localStorage.removeItem(LS_LAPSE_NOTICE);
                    } catch (e) { /* ignore */ }
                    // A licence that was not working (expired, addon failed) gets its addon now.
                    if (!(before.addonReady && before.status === 'valid_offline')) {
                        return loadAddonDispatched(dispatch, manifestUrl, resp.signedOfflineToken, context)
                            .then(() => 'renewed');
                    }
                    return 'renewed';
                })))
            .catch(err => {
                if (err && LICENSE_REASONS_DROPPING_TOKEN.indexOf(err.reason) >= 0) {
                    dropLicense(dispatch, base, err.reason);
                    return 'ended';
                }
                if (err && err.reason === LICENSE_REASON_EXPIRED) {
                    const current = getState().scratchGui.license;
                    if (current.status !== 'expired') {
                        // Ended early in the ЛК while the token still runs.
                        lapseLicense(dispatch, token, {
                            exp: Math.floor(Date.now() / 1000),
                            tariff: current.tariff,
                            ownerName: current.ownerName,
                            licenseId: current.licenseId,
                            seatId: current.seatId
                        }, 'expired');
                    }
                    return 'ended';
                }
                log.warn('licence refresh failed', err);
                if (manual) {
                    dispatchActivationErrorFeedback(dispatch, err && err.offline ? new Error('Failed') : err);
                }
                return 'unchanged';
            })
            .then(done, err => {
                done();
                throw err;
            });
    };
}

/**
 * The stored offline token did not pass the start-up check.
 * @param {function} dispatch redux dispatch
 * @param {string} base activation server
 * @param {string} token the offline token
 * @param {Error} err verifyActivationJwt failure
 * @returns {?Promise} a renewal attempt for an expired licence
 */
function handleStoredTokenError (dispatch, base, token, err) {
    const code = err && err.message;
    if (code === 'license_expired' && err.payload) {
        lapseLicense(dispatch, token, err.payload, 'expired');
        // Renewed in the ЛК? Then a new token comes back.
        return dispatch(refreshLicenseThunk({force: true}));
    }
    if (code === 'license_not_yet_valid' && err.payload) {
        lapseLicense(dispatch, token, err.payload, 'not_yet_valid');
        return null;
    }
    if (code === 'crypto_subtle_missing') {
        // This runtime cannot check signatures: not the token's fault, keep it.
        dispatch({type: LICENSE_CLEAR, payload: {activationBaseUrl: base}});
        return null;
    }
    log.warn('stored licence rejected', err);
    dropLicense(dispatch, base,
        code === 'device_binding_mismatch' ? LICENSE_REASON_OTHER_DEVICE : LICENSE_REASON_INVALID);
    return null;
}

/**
 * Ask the ЛК for the licence's current terms now and then (at start and every 12 h while open).
 * @param {function} dispatch redux dispatch
 */
function scheduleLicenseRefresh (dispatch) {
    if (!licenseRefreshTimer && typeof setInterval === 'function') {
        licenseRefreshTimer = setInterval(() => dispatch(refreshLicenseThunk()), LICENSE_REFRESH_INTERVAL_MS);
        // Node timers (tests) must not keep the process alive; a browser returns a number.
        if (licenseRefreshTimer && typeof licenseRefreshTimer.unref === 'function') licenseRefreshTimer.unref();
    }
    dispatch(refreshLicenseThunk());
}

/**
 * "Deactivate": give the seat back to the licence in the ЛК, then forget the licence here.
 * @returns {function} thunk resolving to 'released', or 'offline' when the ЛК could not be reached
 *     (nothing is changed then; clearLicenseThunk forgets the licence on this computer only)
 */
export function releaseLicenseThunk () {
    return function (dispatch, getState) {
        const state = getState().scratchGui.license;
        const token = readPersistedToken() || state.signedOfflineToken;
        const base = (state.activationBaseUrl || readPersistedActivationBase()).trim();
        if (!token || !base) {
            dispatch(clearLicenseThunk());
            return Promise.resolve('released');
        }
        return computeDeviceFingerprint()
            .then(fingerprint => postSeatRelease(base, {signedOfflineToken: token, deviceFingerprint: fingerprint}))
            .then(() => 'released', err => {
                // Answered by the ЛК (seat already free, licence gone, token not usable): nothing to give
                // back. A bare 404 is not that: a ЛК without this request must not drop the licence here.
                if (err && (err.reason || err.errorCode === 'SEAT_NOT_FOUND')) {
                    return 'released';
                }
                log.warn('seat release failed', err);
                return 'offline';
            })
            .then(result => {
                if (result === 'released') {
                    dispatch(clearLicenseThunk());
                }
                return result;
            });
    };
}

/**
 * Restore JWT + optionally warm addon cache from persisted storage at app start.
 * @returns {function}
 */
export function hydrateLicenseThunk () {
    return function (dispatch, getState) {
        // Device-bound JWT / paid-addon hydrate is Desktop-only.
        // Web uses account session (robboAccount) for cloud subscription features.
        if (!isDesktopWithBluetooth()) {
            return Promise.resolve();
        }
        try {
            if (typeof localStorage !== 'undefined') {
                const base = readPersistedActivationBase();
                const token = readPersistedToken();
                const storedFp = localStorage.getItem(LS_BOUND_FP) || '';

                // Called again on every device search: when this licence is already loaded,
                // do not reload the addon (that restarts the update check in "About").
                const current = typeof getState === 'function' && getState().scratchGui &&
                    getState().scratchGui.license;
                // A failed addon load (addonError) is still retried.
                if (current && token && current.signedOfflineToken === token &&
                    (current.addonReady || (current.status === 'valid_offline' && !current.addonError))) {
                    scheduleLicenseRefresh(dispatch);
                    return Promise.resolve();
                }

                dispatch(persistActivationBaseUrlThunk(base));

                if (!token || !token.trim()) {
                    dispatch({
                        type: LICENSE_CLEAR,
                        payload: {activationBaseUrl: base}
                    });
                    return Promise.resolve();
                }

                return computeDeviceFingerprint()
                    .then(currentFp => {
                        if (storedFp && storedFp !== currentFp) {
                            dropLicense(dispatch, base, LICENSE_REASON_OTHER_DEVICE);
                            return null;
                        }
                        return verifyActivationJwt(token).then(jwtPayload => {
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
                                type: LICENSE_HYDRATE,
                                payload: {
                                    activationBaseUrl: base,
                                    signedOfflineToken: token,
                                    capabilities: caps,
                                    addonManifestUrl: manifestUrl,
                                    licenseId: licenseContext.licenseId,
                                    seatId: licenseContext.seatId,
                                    expiresAt: licenseContext.expiresAt,
                                    tariff: licenseContext.tariff,
                                    ownerName: licenseContext.ownerName,
                                    deviceBindingValid: true,
                                    status: 'valid_offline',
                                    addonReady: false,
                                    addonError: ''
                                }
                            });
                            scheduleLicenseRefresh(dispatch);
                            return loadAddonDispatched(
                                dispatch,
                                manifestUrl,
                                token,
                                licenseContext
                            );
                        }, err => handleStoredTokenError(dispatch, base, token, err));
                    })
                    .catch(err => {
                        log.warn('stored licence rejected', err);
                        dropLicense(dispatch, base, LICENSE_REASON_INVALID);
                    });
            }
            return Promise.resolve();
        } catch (e) {
            return Promise.resolve();
        }
    };
}


/** @returns {function} */
export function licenseFeedbackDismissThunk () {
    return function (dispatch) {
        dispatch({
            type: LICENSE_FEEDBACK_DISMISS,
            payload: licenseFeedbackInitialState()
        });
    };
}

/** @returns {function} */
export function premiumUpdateDismissThunk () {
    return function (dispatch) {
        dispatch({
            type: LICENSE_UPDATE_PHASE,
            payload: licenseUpdateInitialState()
        });
    };
}

/** @returns {function} */
export function premiumUpdateConfirmThunk () {
    return function (dispatch, getState) {
        const update = getState().scratchGui.license.update;
        return dispatch(premiumDownloadAndInstallThunk({
            downloadUrl: update.downloadUrl,
            latestVersion: update.latestVersion
        }));
    };
}

function localizedPremiumError (errorCode) {
    const codes = {
        LICENSE_INACTIVE: 'LICENSE_INACTIVE',
        DEVICE_BINDING_MISMATCH: 'DEVICE_BINDING_MISMATCH',
        CAPABILITY_DENIED: 'CAPABILITY_DENIED',
        ADDON_NOT_LOADED: 'ADDON_NOT_LOADED',
        DESKTOP_ONLY: 'DESKTOP_ONLY'
    };
    return codes[errorCode] || errorCode || 'CHECK_FAILED';
}

/** @returns {function} */
export function premiumAutoUpdateCheckThunk () {
    return function (dispatch, getState) {
        const licenseState = getState().scratchGui.license;
        const gate = assertPremiumAutoUpdateCapability(licenseState);
        if (!gate.ok) {
            const result = {
                error: gate.code || 'CAPABILITY_DENIED'
            };
            dispatch({
                type: LICENSE_PREMIUM_CHECK_RESULT,
                payload: result
            });
            dispatch({
                type: LICENSE_CHECK_STATUS,
                payload: {
                    status: 'error',
                    errorCode: localizedPremiumError(result.error),
                    errorMessage: result.error
                }
            });
            return Promise.resolve(result);
        }

        dispatch({
            type: LICENSE_CHECK_STATUS,
            payload: Object.assign({}, {status: 'checking'}, {
                latestVersion: '',
                downloadUrl: '',
                errorCode: '',
                errorMessage: ''
            })
        });

        return paidAddonRegistry.invokePremiumAutoUpdateCheck(
            licenseContextFromState(licenseState)
        ).then(result => {
            dispatch({
                type: LICENSE_PREMIUM_CHECK_RESULT,
                payload: result
            });

            if (result.error) {
                dispatch({
                    type: LICENSE_CHECK_STATUS,
                    payload: {
                        status: 'error',
                        errorCode: localizedPremiumError(result.error),
                        errorMessage: result.message || result.error
                    }
                });
            } else if (result.updatesAvailable) {
                dispatch({
                    type: LICENSE_CHECK_STATUS,
                    payload: {
                        status: 'available',
                        latestVersion: result.latestVersion || '',
                        currentVersion: result.currentVersion || '',
                        downloadUrl: result.downloadUrl || '',
                        errorCode: '',
                        errorMessage: ''
                    }
                });
            } else {
                dispatch({
                    type: LICENSE_CHECK_STATUS,
                    payload: {
                        status: 'uptodate',
                        currentVersion: result.currentVersion || APP_VERSION,
                        latestVersion: result.latestVersion || '',
                        downloadUrl: '',
                        errorCode: '',
                        errorMessage: ''
                    }
                });
            }

            return result;
        }).catch(err => {
            dispatch({
                type: LICENSE_CHECK_STATUS,
                payload: {
                    status: 'error',
                    errorCode: 'CHECK_FAILED',
                    errorMessage: err.message || String(err)
                }
            });
            throw err;
        });
    };
}

/** @returns {function} */
export function premiumStartUpdateThunk () {
    return function (dispatch, getState) {
        const check = getState().scratchGui.license.check;
        return dispatch(premiumDownloadAndInstallThunk({
            downloadUrl: check.downloadUrl,
            latestVersion: check.latestVersion
        }));
    };
}

/** @param {{ downloadUrl: string, latestVersion: string }} checkResult @returns {function} */
export function premiumDownloadAndInstallThunk (checkResult) {
    return function (dispatch, getState) {
        const licenseState = getState().scratchGui.license;
        const gate = assertPremiumAutoUpdateCapability(licenseState);
        if (!gate.ok) {
            const result = {
                error: gate.code || 'CAPABILITY_DENIED'
            };
            dispatch({
                type: LICENSE_UPDATE_PHASE,
                payload: {
                    phase: 'error',
                    errorMessage: result.error
                }
            });
            return Promise.resolve(result);
        }

        const downloadUrl = checkResult && checkResult.downloadUrl;
        const latestVersion = checkResult && checkResult.latestVersion;
        if (!downloadUrl || !latestVersion) {
            const result = {
                error: 'MISSING_DOWNLOAD_INFO'
            };
            dispatch({
                type: LICENSE_UPDATE_PHASE,
                payload: {
                    phase: 'error',
                    errorMessage: result.error
                }
            });
            return Promise.resolve(result);
        }

        dispatch({
            type: LICENSE_UPDATE_PHASE,
            payload: {
                phase: 'downloading',
                progress: 0,
                latestVersion,
                downloadUrl,
                errorMessage: ''
            }
        });

        return paidAddonRegistry.invokePremiumDownloadAndInstall(
            licenseContextFromState(licenseState, {downloadUrl, latestVersion}),
            {
                downloadUrl,
                latestVersion,
                onProgress (percent) {
                    dispatch({
                        type: LICENSE_UPDATE_PROGRESS,
                        payload: percent
                    });
                    if (percent >= 100) {
                        dispatch({
                            type: LICENSE_UPDATE_PHASE,
                            payload: {phase: 'installing'}
                        });
                    }
                }
            }
        ).then(result => {
            if (result && result.error) {
                dispatch({
                    type: LICENSE_UPDATE_PHASE,
                    payload: {
                        phase: 'error',
                        errorMessage: result.message || result.error
                    }
                });
            } else {
                dispatch({
                    type: LICENSE_UPDATE_PHASE,
                    payload: licenseUpdateInitialState()
                });
            }
            console.info('[rs3-license] Premium download/install result:', result);
            return result;
        });
    };
}

export {getCachedDeviceFingerprint};
