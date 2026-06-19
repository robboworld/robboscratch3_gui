import {postActivate, postDeactivateSeat} from '../../lib/licensing/activationClient.js';
import {verifyActivationJwt} from '../../lib/licensing/verifyJwtRs256.js';
import {loadPaidAddonFromManifestUrl, clearAddonCache} from '../../lib/licensing/loadPaidAddon.js';
import paidAddonRegistry from '../../lib/licensing/paidAddonRegistry.js';
import {computeDeviceFingerprint, getCachedDeviceFingerprint, LS_FP_CACHE} from '../../lib/licensing/deviceFingerprint.js';
import {assertPremiumAutoUpdateCapability} from '../../lib/licensing/capabilityGateway.js';
import {APP_VERSION} from '../AboutWindowComponent.js';
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
    LICENSE_PREMIUM_CHECK_RESULT,
    LICENSE_CHECK_STATUS,
    LICENSE_UPDATE_PHASE,
    LICENSE_UPDATE_PROGRESS,
    licenseUpdateInitialState,
    readPersistedActivationBase,
    readPersistedToken
} from '../reducers/license.js';

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
        const state = getState();
        const base = (state.scratchGui.license.activationBaseUrl || '').trim();
        if (!licenseKeyTrimmed || !licenseKeyTrimmed.trim()) {
            dispatch({
                type: LICENSE_ACTIVATE_FAILURE,
                payload: {message: 'empty_license_key'}
            });
            return Promise.resolve();
        }
        dispatch({type: LICENSE_ACTIVATE_START});
        const publicBaseForUrls = base.replace(/\/$/, '');
        return computeDeviceFingerprint()
            .then(fingerprint => postActivate(base, {
                licenseKey: licenseKeyTrimmed.trim(),
                deviceFingerprint: fingerprint,
                publicBase: publicBaseForUrls
            }).then(resp => verifyActivationJwt(resp.signedOfflineToken).then(jwtPayload => ({
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
                    type: LICENSE_ACTIVATE_SUCCESS,
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
                    type: LICENSE_ACTIVATE_FAILURE,
                    payload: {message: err.message || String(err)}
                });
            });
    };
}

/**
 * Restore JWT + optionally warm addon cache from persisted storage at app start.
 * @returns {function}
 */
export function hydrateLicenseThunk () {
    return function (dispatch) {
        try {
            if (typeof localStorage !== 'undefined') {
                const base = readPersistedActivationBase();
                const token = readPersistedToken();
                const storedFp = localStorage.getItem(LS_BOUND_FP) || '';

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
                            removeLicenseFromStorage();
                            paidAddonRegistry.reset();
                            dispatch({
                                type: LICENSE_CLEAR,
                                payload: {activationBaseUrl: base}
                            });
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
                        removeLicenseFromStorage();
                        paidAddonRegistry.reset();
                        dispatch({
                            type: LICENSE_CLEAR,
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
export function clearLicenseThunk () {
    return function (dispatch, getState) {
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

            console.info('[rs3-license] Premium auto-update result:', result);
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
