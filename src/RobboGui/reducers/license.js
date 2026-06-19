import {immutable_copy} from '../lib/lib.js';

export const CAPABILITY_PREMIUM_AUTO_UPDATE = 'premium.auto_update';

export const LS_ACTIVATION_BASE = 'rs3_activation_base_url';
export const LS_TOKEN = 'rs3_signed_token';
export const LS_BOUND_FP = 'rs3_license_bound_fingerprint';

/** Legacy localStorage keys (pre-3.126 migration). */
const LS_ACTIVATION_BASE_LEGACY = 'rs3_demo_activation_base_url';
const LS_TOKEN_LEGACY = 'rs3_demo_signed_token';

export const LICENSE_SET_ACTIVATION_BASE = 'LICENSE_SET_ACTIVATION_BASE';
export const LICENSE_ACTIVATE_START = 'LICENSE_ACTIVATE_START';
export const LICENSE_ACTIVATE_SUCCESS = 'LICENSE_ACTIVATE_SUCCESS';
export const LICENSE_ACTIVATE_FAILURE = 'LICENSE_ACTIVATE_FAILURE';
export const LICENSE_ADDON_READY = 'LICENSE_ADDON_READY';
export const LICENSE_ADDON_FAILURE = 'LICENSE_ADDON_FAILURE';
export const LICENSE_HYDRATE = 'LICENSE_HYDRATE';
export const LICENSE_CLEAR = 'LICENSE_CLEAR';
export const LICENSE_PREMIUM_CHECK_RESULT = 'LICENSE_PREMIUM_CHECK_RESULT';
export const LICENSE_CHECK_STATUS = 'LICENSE_CHECK_STATUS';
export const LICENSE_UPDATE_PHASE = 'LICENSE_UPDATE_PHASE';
export const LICENSE_UPDATE_PROGRESS = 'LICENSE_UPDATE_PROGRESS';

export function licenseCheckInitialState () {
    return {
        status: 'unknown',
        latestVersion: '',
        currentVersion: '',
        downloadUrl: '',
        errorCode: '',
        errorMessage: ''
    };
}

export function licenseUpdateInitialState () {
    return {
        phase: 'idle',
        progress: 0,
        latestVersion: '',
        currentVersion: '',
        downloadUrl: '',
        errorMessage: '',
        errorCode: ''
    };
}

function readLocalStorageItem (key, legacyKey) {
    try {
        if (typeof localStorage === 'undefined') {
            return '';
        }
        const value = localStorage.getItem(key);
        if (value) {
            return value;
        }
        if (legacyKey) {
            const legacy = localStorage.getItem(legacyKey);
            if (legacy) {
                localStorage.setItem(key, legacy);
                localStorage.removeItem(legacyKey);
                return legacy;
            }
        }
    } catch (e) { /* ignore */ }
    return '';
}

export function readPersistedActivationBase () {
    const value = readLocalStorageItem(LS_ACTIVATION_BASE, LS_ACTIVATION_BASE_LEGACY);
    return value || 'http://127.0.0.1:9876';
}

export function readPersistedToken () {
    return readLocalStorageItem(LS_TOKEN, LS_TOKEN_LEGACY);
}

export function licenseInitialState () {
    return {
        activationBaseUrl: typeof window !== 'undefined' ? readPersistedActivationBase() :
            'http://127.0.0.1:9876',
        status: 'inactive',
        capabilities: [],
        signedOfflineToken: '',
        addonManifestUrl: '',
        licenseId: '',
        seatId: '',
        deviceBindingValid: false,
        addonReady: false,
        addonError: '',
        activationError: '',
        lastPremiumCheckResult: null,
        isActivating: false,
        check: licenseCheckInitialState(),
        update: licenseUpdateInitialState()
    };
}

const initialState = licenseInitialState();

export default function reducer (state, action) {
    if (typeof state === 'undefined') {
        state = initialState;
    }

    let next;

    switch (action.type) {
    case LICENSE_SET_ACTIVATION_BASE:
        next = immutable_copy(state);
        next.activationBaseUrl = typeof action.payload === 'string'
            ? action.payload
            : state.activationBaseUrl;
        return next;

    case LICENSE_ACTIVATE_START:
        next = immutable_copy(state);
        next.isActivating = true;
        next.activationError = '';
        return next;

    case LICENSE_ACTIVATE_SUCCESS:
        next = immutable_copy(state);
        next.isActivating = false;
        next.signedOfflineToken = action.payload.signedOfflineToken;
        next.addonManifestUrl = action.payload.addonManifestUrl;
        next.capabilities = action.payload.capabilities.slice();
        next.licenseId = action.payload.licenseId || '';
        next.seatId = action.payload.seatId || '';
        next.deviceBindingValid = action.payload.deviceBindingValid !== false;
        next.status = 'valid_offline';
        next.activationError = '';
        next.addonReady = false;
        next.addonError = '';
        next.check = licenseCheckInitialState();
        return next;

    case LICENSE_ACTIVATE_FAILURE:
        next = immutable_copy(state);
        next.isActivating = false;
        next.activationError = action.payload.message || 'activation_failed';
        return next;

    case LICENSE_ADDON_READY:
        next = immutable_copy(state);
        next.addonReady = true;
        next.addonError = '';
        return next;

    case LICENSE_ADDON_FAILURE:
        next = immutable_copy(state);
        next.addonReady = false;
        next.addonError = action.payload.message || 'addon_failed';
        return next;

    case LICENSE_HYDRATE:
        next = immutable_copy(state);
        next.activationBaseUrl =
            typeof action.payload.activationBaseUrl === 'string'
                ? action.payload.activationBaseUrl
                : next.activationBaseUrl;
        next.signedOfflineToken = action.payload.signedOfflineToken || '';
        next.addonManifestUrl = action.payload.addonManifestUrl || '';
        next.capabilities = Array.isArray(action.payload.capabilities)
            ? action.payload.capabilities.slice()
            : [];
        next.licenseId = action.payload.licenseId || '';
        next.seatId = action.payload.seatId || '';
        next.deviceBindingValid = action.payload.deviceBindingValid !== false;
        next.status =
            typeof action.payload.status === 'string'
                ? action.payload.status
                : next.status;
        next.addonReady = Boolean(action.payload.addonReady);
        next.addonError = typeof action.payload.addonError === 'string'
            ? action.payload.addonError
            : '';
        next.activationError = '';
        return next;

    case LICENSE_CLEAR:
        next = licenseInitialState();
        next.activationBaseUrl = typeof action.payload === 'object' &&
          typeof action.payload.activationBaseUrl === 'string'
            ? action.payload.activationBaseUrl
            : readPersistedActivationBase();
        return next;

    case LICENSE_PREMIUM_CHECK_RESULT:
        next = immutable_copy(state);
        next.lastPremiumCheckResult = action.payload;
        return next;

    case LICENSE_CHECK_STATUS:
        next = immutable_copy(state);
        next.check = Object.assign({}, state.check, action.payload || {});
        return next;

    case LICENSE_UPDATE_PHASE:
        next = immutable_copy(state);
        next.update = Object.assign({}, state.update, action.payload || {});
        return next;

    case LICENSE_UPDATE_PROGRESS:
        next = immutable_copy(state);
        next.update = Object.assign({}, state.update, {
            progress: typeof action.payload === 'number' ? action.payload : state.update.progress
        });
        return next;

    default:
        return state;
    }
}

export {initialState as license_InitialState};
