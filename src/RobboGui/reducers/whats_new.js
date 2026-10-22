/**
 * «Что нового» (src/lib/whats-new-state.js): release messages of this build and the unread ones;
 * newer versions on the file mirrors (src/lib/update-check.js, desktop only).
 * data is null until static/whats-new.json brings at least one release; without it and without
 * an offered update the menu item is hidden.
 */

import {
    WHATS_NEW_URL,
    computeWhatsNew,
    isWhatsNewData,
    markWhatsNewPrompted,
    markWhatsNewSeen,
    readWhatsNewStorage
} from '../../lib/whats-new-state';
import {
    checkForUpdates,
    hasUnseenOffers,
    isUpdateCheckEnabled,
    isUpdateCheckSupported,
    markOfferPrompted,
    markOffersSeen,
    offerToPrompt,
    setUpdateCheckEnabled
} from '../../lib/update-check';
import {ActionTriggerNewDraggableWindow} from '../actions/sensor_actions';

export const WHATS_NEW_WINDOW_ID = 'whats-new-window';

const WHATS_NEW_LOADED = 'WHATS_NEW_LOADED';
const WHATS_NEW_SEEN = 'WHATS_NEW_SEEN';
const WHATS_NEW_SHOW_ALL = 'WHATS_NEW_SHOW_ALL';
const WHATS_NEW_UPDATES = 'WHATS_NEW_UPDATES';
const WHATS_NEW_UPDATE_CHECK = 'WHATS_NEW_UPDATE_CHECK';

/** First check after the editor has settled: the check must not slow down the start. */
const UPDATE_CHECK_DELAY_MS = 5000;

export const whats_new_InitialState = {
    current: '',
    updateCheckSupported: false,
    updateCheckEnabled: true,
    data: null,
    unread: [],
    sinceVersion: '',
    showAll: false,
    updates: [],
    updatesUnseen: false
};

export default function whatsNewReducer (state, action) {
    if (typeof state === 'undefined') state = whats_new_InitialState;
    switch (action.type) {
    case WHATS_NEW_LOADED:
        return Object.assign({}, state, {
            current: action.payload.current,
            updateCheckSupported: action.payload.updateCheckSupported,
            updateCheckEnabled: action.payload.updateCheckEnabled,
            data: action.payload.data,
            unread: action.payload.unread,
            sinceVersion: action.payload.sinceVersion
        });
    case WHATS_NEW_SEEN:
        return Object.assign({}, state, {unread: [], sinceVersion: '', showAll: false, updatesUnseen: false});
    case WHATS_NEW_SHOW_ALL:
        return Object.assign({}, state, {showAll: true});
    case WHATS_NEW_UPDATE_CHECK:
        return Object.assign({}, state, {updateCheckEnabled: action.payload.enabled});
    case WHATS_NEW_UPDATES:
        return Object.assign({}, state, {updates: action.payload.updates, updatesUnseen: action.payload.unseen});
    default:
        return state;
    }
}

/** @returns {boolean} «What's new» is in the menu: releases of this build, or the update check (desktop) */
export const hasWhatsNew = whatsNew => Boolean(whatsNew.data || whatsNew.updates.length || whatsNew.updateCheckSupported);

/** @returns {boolean} the dot on «Robbo menu» and «What's new»: unread releases or an unseen update */
export const hasUnreadWhatsNew = whatsNew => whatsNew.unread.length > 0 || whatsNew.updatesUnseen;

const isWindowShowing = getState => {
    const w = getState().scratchGui.new_draggable_window[WHATS_NEW_WINDOW_ID];
    return Boolean(w && w.isShowing);
};

const openWindow = (dispatch, getState) => {
    if (!isWindowShowing(getState)) dispatch(ActionTriggerNewDraggableWindow(WHATS_NEW_WINDOW_ID));
};

/**
 * Asks the mirrors for newer versions (at most every few hours, see update-check.js).
 * @param {object} [opts] force: ignore the cached answer
 * @returns {function} thunk
 */
export const checkUpdatesThunk = (opts = {}) => (dispatch, getState) => {
    const current = getState().scratchGui.whats_new.current;
    if (!current) return Promise.resolve();
    return checkForUpdates(current, opts).then(updates => {
        dispatch({type: WHATS_NEW_UPDATES, payload: {updates, unseen: hasUnseenOffers(updates)}});
        const prompt = offerToPrompt(updates);
        if (prompt) {
            markOfferPrompted(prompt.version);
            openWindow(dispatch, getState);
        }
    })
        .catch(() => {});
};

/**
 * Turns the new version check on or off (checkbox in the window).
 * @param {boolean} enabled check the mirrors
 * @returns {function} thunk
 */
export const setUpdateCheckThunk = enabled => dispatch => {
    setUpdateCheckEnabled(enabled);
    dispatch({type: WHATS_NEW_UPDATE_CHECK, payload: {enabled}});
    if (!enabled) {
        dispatch({type: WHATS_NEW_UPDATES, payload: {updates: [], unseen: false}});
        return Promise.resolve();
    }
    return dispatch(checkUpdatesThunk({force: true}));
};

/**
 * Loads static/whats-new.json once at startup, then checks for newer versions. Missing file (web build,
 * dev server) or a broken one — the feature stays off silently.
 * @returns {function} thunk
 */
export const loadWhatsNewThunk = () => (dispatch, getState) => {
    if (typeof fetch !== 'function') return Promise.resolve();
    return fetch(WHATS_NEW_URL)
        .then(response => (response.ok ? response.json() : null))
        .then(data => {
            if (!isWhatsNewData(data)) return;
            const hasReleases = data.releases.length > 0;
            const {unread, sinceVersion, autoOpen} = hasReleases ?
                computeWhatsNew(data, readWhatsNewStorage()) :
                {unread: [], sinceVersion: '', autoOpen: false};
            dispatch({
                type: WHATS_NEW_LOADED,
                payload: {
                    current: data.current,
                    updateCheckSupported: isUpdateCheckSupported(),
                    updateCheckEnabled: isUpdateCheckEnabled(),
                    data: hasReleases ? data : null,
                    unread,
                    sinceVersion
                }
            });
            if (autoOpen) {
                markWhatsNewPrompted(data.current);
                openWindow(dispatch, getState);
            }
            setTimeout(() => dispatch(checkUpdatesThunk()), UPDATE_CHECK_DELAY_MS);
        })
        .catch(() => {});
};

/**
 * The window was closed: everything up to this build is read, the offered versions are seen.
 * @param {string} version build version
 * @returns {function} thunk
 */
export const whatsNewSeen = version => (dispatch, getState) => {
    markWhatsNewSeen(version);
    markOffersSeen(getState().scratchGui.whats_new.updates);
    dispatch({type: WHATS_NEW_SEEN});
};

/** @returns {object} action: show every release of the build, not only the newest */
export const whatsNewShowAll = () => ({type: WHATS_NEW_SHOW_ALL});
