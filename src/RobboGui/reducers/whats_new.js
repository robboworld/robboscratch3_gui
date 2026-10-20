/**
 * «Что нового» (src/lib/whats-new-state.js): release messages of this build and the unread ones.
 * data is null until static/whats-new.json is loaded; without it the menu item is hidden.
 */

import {
    WHATS_NEW_URL,
    computeWhatsNew,
    isWhatsNewData,
    markWhatsNewPrompted,
    markWhatsNewSeen,
    readWhatsNewStorage
} from '../../lib/whats-new-state';
import {ActionTriggerNewDraggableWindow} from '../actions/sensor_actions';

export const WHATS_NEW_WINDOW_ID = 'whats-new-window';

const WHATS_NEW_LOADED = 'WHATS_NEW_LOADED';
const WHATS_NEW_SEEN = 'WHATS_NEW_SEEN';
const WHATS_NEW_SHOW_ALL = 'WHATS_NEW_SHOW_ALL';

export const whats_new_InitialState = {
    data: null,
    unread: [],
    sinceVersion: '',
    showAll: false
};

export default function whatsNewReducer (state, action) {
    if (typeof state === 'undefined') state = whats_new_InitialState;
    switch (action.type) {
    case WHATS_NEW_LOADED:
        return Object.assign({}, state, {
            data: action.payload.data,
            unread: action.payload.unread,
            sinceVersion: action.payload.sinceVersion
        });
    case WHATS_NEW_SEEN:
        return Object.assign({}, state, {unread: [], sinceVersion: '', showAll: false});
    case WHATS_NEW_SHOW_ALL:
        return Object.assign({}, state, {showAll: true});
    default:
        return state;
    }
}

/**
 * Loads static/whats-new.json once at startup. Missing file (web build, dev server) or a broken one —
 * the feature stays off silently.
 * @returns {function} thunk
 */
export const loadWhatsNewThunk = () => dispatch => {
    if (typeof fetch !== 'function') return Promise.resolve();
    return fetch(WHATS_NEW_URL)
        .then(response => (response.ok ? response.json() : null))
        .then(data => {
            if (!isWhatsNewData(data) || !data.releases.length) return;
            const {unread, sinceVersion, autoOpen} = computeWhatsNew(data, readWhatsNewStorage());
            dispatch({type: WHATS_NEW_LOADED, payload: {data, unread, sinceVersion}});
            if (autoOpen) {
                markWhatsNewPrompted(data.current);
                dispatch(ActionTriggerNewDraggableWindow(WHATS_NEW_WINDOW_ID));
            }
        })
        .catch(() => {});
};

/**
 * The window was closed: everything up to this build is read.
 * @param {string} version build version
 * @returns {object} action
 */
export const whatsNewSeen = version => {
    markWhatsNewSeen(version);
    return {type: WHATS_NEW_SEEN};
};

/** @returns {object} action: show every release of the build, not only the newest */
export const whatsNewShowAll = () => ({type: WHATS_NEW_SHOW_ALL});
