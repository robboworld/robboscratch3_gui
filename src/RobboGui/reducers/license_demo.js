import {immutable_copy} from '../lib/lib.js';

export const CAPABILITY_PREMIUM_AUTO_UPDATE = 'premium.auto_update';

export const LS_ACTIVATION_BASE = 'rs3_demo_activation_base_url';
export const LS_TOKEN = 'rs3_demo_signed_token';

export const LICENSE_DEMO_SET_ACTIVATION_BASE = 'LICENSE_DEMO_SET_ACTIVATION_BASE';
export const LICENSE_DEMO_ACTIVATE_START = 'LICENSE_DEMO_ACTIVATE_START';
export const LICENSE_DEMO_ACTIVATE_SUCCESS = 'LICENSE_DEMO_ACTIVATE_SUCCESS';
export const LICENSE_DEMO_ACTIVATE_FAILURE = 'LICENSE_DEMO_ACTIVATE_FAILURE';
export const LICENSE_DEMO_ADDON_READY = 'LICENSE_DEMO_ADDON_READY';
export const LICENSE_DEMO_ADDON_FAILURE = 'LICENSE_DEMO_ADDON_FAILURE';
export const LICENSE_DEMO_HYDRATE = 'LICENSE_DEMO_HYDRATE';
export const LICENSE_DEMO_CLEAR = 'LICENSE_DEMO_CLEAR';
export const LICENSE_DEMO_PREMIUM_CHECK_RESULT = 'LICENSE_DEMO_PREMIUM_CHECK_RESULT';

export function readPersistedActivationBase () {
    try {
        if (typeof localStorage !== 'undefined') {
            const x = localStorage.getItem(LS_ACTIVATION_BASE);
            if (x) {
                return x;
            }
        }
    } catch (e) { /* ignore */ }
    return 'http://127.0.0.1:9876';
}

export function demoLicenseInitialState () {
    return {
        activationBaseUrl: typeof window !== 'undefined' ? readPersistedActivationBase() :
            'http://127.0.0.1:9876',
        status: 'inactive',
        capabilities: [],
        signedOfflineToken: '',
        addonManifestUrl: '',
        addonReady: false,
        addonError: '',
        activationError: '',
        lastPremiumCheckResult: null,
        isActivating: false
    };
}

const initialState = demoLicenseInitialState();

export default function reducer (state, action) {
    if (typeof state === 'undefined') {
        state = initialState;
    }

    let next;

    switch (action.type) {
    case LICENSE_DEMO_SET_ACTIVATION_BASE:
        next = immutable_copy(state);
        next.activationBaseUrl = typeof action.payload === 'string'
            ? action.payload
            : state.activationBaseUrl;
        return next;

    case LICENSE_DEMO_ACTIVATE_START:
        next = immutable_copy(state);
        next.isActivating = true;
        next.activationError = '';
        return next;

    case LICENSE_DEMO_ACTIVATE_SUCCESS:
        next = immutable_copy(state);
        next.isActivating = false;
        next.signedOfflineToken = action.payload.signedOfflineToken;
        next.addonManifestUrl = action.payload.addonManifestUrl;
        next.capabilities = action.payload.capabilities.slice();
        next.status = 'valid_offline';
        next.activationError = '';
        next.addonReady = false;
        next.addonError = '';
        return next;

    case LICENSE_DEMO_ACTIVATE_FAILURE:
        next = immutable_copy(state);
        next.isActivating = false;
        next.activationError = action.payload.message || 'activation_failed';
        return next;

    case LICENSE_DEMO_ADDON_READY:
        next = immutable_copy(state);
        next.addonReady = true;
        next.addonError = '';
        return next;

    case LICENSE_DEMO_ADDON_FAILURE:
        next = immutable_copy(state);
        next.addonReady = false;
        next.addonError = action.payload.message || 'addon_failed';
        return next;

    case LICENSE_DEMO_HYDRATE:
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

    case LICENSE_DEMO_CLEAR:
        next = demoLicenseInitialState();
        next.activationBaseUrl = typeof action.payload === 'object' &&
          typeof action.payload.activationBaseUrl === 'string'
            ? action.payload.activationBaseUrl
            : readPersistedActivationBase();
        return next;

    case LICENSE_DEMO_PREMIUM_CHECK_RESULT:
        next = immutable_copy(state);
        next.lastPremiumCheckResult = action.payload;
        return next;

    default:
        return state;
    }
}

export {initialState as license_demo_InitialState};
