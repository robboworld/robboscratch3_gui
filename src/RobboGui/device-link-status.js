/**
 * Connection state of a serial ROBBO device for palettes and the menu bar.
 * Polled from the *ControlAPI: its status callback has a single slot, already used by the menu bar.
 */

import {subscribeSearchButtonFeedback, subscribeSearchStarted} from './search-button-feedback';

const DEVICE_IS_READY = 6;
/** CONNECTED, DEVICE_CHECKING, DEVICE_PURGING: the port is open, the device is being identified. */
const CONNECTING_STATES = [2, 3, 5];

const SEARCH_REQUEST_EVENT = 'rs3-device-search-request';
/** Longest search session; the menu bar normally ends it much earlier. */
const SEARCH_SESSION_MAX_MS = 15000;

/**
 * Search session as the menu bar shows it: from its start until "connected" / "error" / "idle".
 * Each *ControlAPI keeps searching_in_progress until its own full search cycle (10 s by default)
 * ends, even when the menu bar already reported the result — palettes would keep "Searching…".
 */
let searchSessionActive = false;
let searchSessionTimer = null;

const endSearchSession = () => {
    searchSessionActive = false;
    clearTimeout(searchSessionTimer);
};

subscribeSearchStarted(() => {
    searchSessionActive = true;
    clearTimeout(searchSessionTimer);
    searchSessionTimer = setTimeout(endSearchSession, SEARCH_SESSION_MAX_MS);
});
subscribeSearchButtonFeedback(endSearchSession);

/**
 * @param {object} api RCA / LCA / OCA / ACA
 * @param {string} connectedKey 'ConnectedRobots' | 'ConnectedLaboratories' | 'ConnectedOttos' | 'ConnectedArduinos'
 * @param {boolean} [simulated] the 2D simulator stands in for the device
 * @returns {'sim'|'ready'|'connecting'|'searching'|'off'} connection state
 */
export const getDeviceLinkKind = (api, connectedKey, simulated) => {
    if (simulated) return 'sim';
    if (!api) return 'off';
    const devices = api[connectedKey];
    const device = devices && devices[0];
    const state = device && typeof device.getState === 'function' ? device.getState() : null;
    if (state === DEVICE_IS_READY) return 'ready';
    if (CONNECTING_STATES.indexOf(state) !== -1) return 'connecting';
    if (searchSessionActive && api.searching_in_progress === true) return 'searching';
    return 'off';
};

/**
 * @param {string} kind from {@link getDeviceLinkKind}
 * @returns {boolean} live data can be shown
 */
export const isDeviceLinkLive = kind => kind === 'ready' || kind === 'sim';

/** Ask the menu bar to run the device search (same as its "Search devices" button). */
export const requestDeviceSearch = () => {
    document.dispatchEvent(new CustomEvent(SEARCH_REQUEST_EVENT));
};

/**
 * @param {function} handler called on {@link requestDeviceSearch}
 * @returns {function} unsubscribe
 */
export const subscribeDeviceSearchRequest = handler => {
    document.addEventListener(SEARCH_REQUEST_EVENT, handler);
    return () => document.removeEventListener(SEARCH_REQUEST_EVENT, handler);
};
