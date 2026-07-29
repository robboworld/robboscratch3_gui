import {immutable_copy} from '../lib/lib.js';

export const ROBBO_ACCOUNT_SESSION_START = 'ROBBO_ACCOUNT_SESSION_START';
export const ROBBO_ACCOUNT_SESSION_SUCCESS = 'ROBBO_ACCOUNT_SESSION_SUCCESS';
export const ROBBO_ACCOUNT_SESSION_FAILURE = 'ROBBO_ACCOUNT_SESSION_FAILURE';
export const ROBBO_ACCOUNT_SET_CLOUD_PROJECT = 'ROBBO_ACCOUNT_SET_CLOUD_PROJECT';
export const ROBBO_ACCOUNT_SAVE_START = 'ROBBO_ACCOUNT_SAVE_START';
export const ROBBO_ACCOUNT_SAVE_SUCCESS = 'ROBBO_ACCOUNT_SAVE_SUCCESS';
export const ROBBO_ACCOUNT_SAVE_FAILURE = 'ROBBO_ACCOUNT_SAVE_FAILURE';
export const ROBBO_ACCOUNT_CLEAR_SAVE_STATUS = 'ROBBO_ACCOUNT_CLEAR_SAVE_STATUS';
export const ROBBO_ACCOUNT_SIGN_OUT = 'ROBBO_ACCOUNT_SIGN_OUT';

function applyLmsPasswordFallback (next, payload, prevState) {
    if (payload && typeof payload.lmsPasswordFallback === 'boolean') {
        next.lmsPasswordFallback = payload.lmsPasswordFallback;
    } else {
        next.lmsPasswordFallback = prevState.lmsPasswordFallback;
    }
}

export function robboAccountInitialState () {
    return {
        sessionStatus: 'idle', // idle | loading | authenticated | anonymous | error
        user: null, // {email, edxUserId, sub, role, displayName}
        cloudProjectPageId: '',
        saveStatus: 'idle', // idle | saving | success | error
        saveError: '',
        // Default true so the form is shown before the first /auth/oidc/status resolves.
        lmsPasswordFallback: true
    };
}

export const robboAccount_InitialState = robboAccountInitialState();

export default function robboAccountReducer (state, action) {
    if (typeof state === 'undefined') {
        state = robboAccountInitialState();
    }
    switch (action.type) {
    case ROBBO_ACCOUNT_SESSION_START: {
        const next = immutable_copy(state);
        next.sessionStatus = 'loading';
        return next;
    }
    case ROBBO_ACCOUNT_SESSION_SUCCESS: {
        const next = immutable_copy(state);
        next.sessionStatus = 'authenticated';
        next.user = action.payload.user || null;
        applyLmsPasswordFallback(next, action.payload, state);
        return next;
    }
    case ROBBO_ACCOUNT_SESSION_FAILURE: {
        const next = immutable_copy(state);
        next.sessionStatus = action.payload && action.payload.anonymous ? 'anonymous' : 'error';
        next.user = null;
        applyLmsPasswordFallback(next, action.payload, state);
        return next;
    }
    case ROBBO_ACCOUNT_SET_CLOUD_PROJECT: {
        const next = immutable_copy(state);
        next.cloudProjectPageId = action.payload.cloudProjectPageId || '';
        return next;
    }
    case ROBBO_ACCOUNT_SAVE_START: {
        const next = immutable_copy(state);
        next.saveStatus = 'saving';
        next.saveError = '';
        return next;
    }
    case ROBBO_ACCOUNT_SAVE_SUCCESS: {
        const next = immutable_copy(state);
        next.saveStatus = 'success';
        next.saveError = '';
        if (action.payload && action.payload.cloudProjectPageId) {
            next.cloudProjectPageId = action.payload.cloudProjectPageId;
        }
        return next;
    }
    case ROBBO_ACCOUNT_SAVE_FAILURE: {
        const next = immutable_copy(state);
        next.saveStatus = 'error';
        next.saveError = (action.payload && action.payload.message) || 'save_failed';
        return next;
    }
    case ROBBO_ACCOUNT_CLEAR_SAVE_STATUS: {
        const next = immutable_copy(state);
        next.saveStatus = 'idle';
        next.saveError = '';
        return next;
    }
    case ROBBO_ACCOUNT_SIGN_OUT: {
        return robboAccountInitialState();
    }
    default:
        return state;
    }
}
