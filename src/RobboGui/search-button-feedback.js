const EVENT_CONNECTED = 'rs3-search-device-connected';
const EVENT_CONNECT_ERROR = 'rs3-search-device-connect-error';
const EVENT_SEARCH_IDLE = 'rs3-search-idle';

/** One connected/error label per search attempt (ignore duplicate state 7→8, multiple rows). */
let sessionTerminalFeedbackSent = false;

const EVENT_SEARCH_STARTED = 'rs3-search-started';

/** Call when a new device search starts (menu bar or DCA scan). */
export function beginSearchButtonFeedbackSession () {
    sessionTerminalFeedbackSent = false;
    document.dispatchEvent(new CustomEvent(EVENT_SEARCH_STARTED));
}

/**
 * @param {function} handler called when a search session starts (menu bar search)
 * @returns {function} unsubscribe
 */
export function subscribeSearchStarted (handler) {
    document.addEventListener(EVENT_SEARCH_STARTED, handler);
    return () => document.removeEventListener(EVENT_SEARCH_STARTED, handler);
}

/**
 * @param {'connected' | 'error'} kind
 */
export function notifySearchButtonFeedback (kind) {
    if (sessionTerminalFeedbackSent) {
        return;
    }
    sessionTerminalFeedbackSent = true;
    document.dispatchEvent(new CustomEvent(
        kind === 'connected' ? EVENT_CONNECTED : EVENT_CONNECT_ERROR
    ));
}

/** Search scan finished with no devices to connect; clear menu-bar busy state. */
export function notifySearchIdle () {
    sessionTerminalFeedbackSent = false;
    document.dispatchEvent(new CustomEvent(EVENT_SEARCH_IDLE));
}

/**
 * @param {(kind: 'connected' | 'error' | 'idle') => void} handler
 * @returns {() => void}
 */
export function subscribeSearchButtonFeedback (handler) {
    const onConnected = () => handler('connected');
    const onError = () => handler('error');
    const onIdle = () => handler('idle');
    document.addEventListener(EVENT_CONNECTED, onConnected);
    document.addEventListener(EVENT_CONNECT_ERROR, onError);
    document.addEventListener(EVENT_SEARCH_IDLE, onIdle);
    return () => {
        document.removeEventListener(EVENT_CONNECTED, onConnected);
        document.removeEventListener(EVENT_CONNECT_ERROR, onError);
        document.removeEventListener(EVENT_SEARCH_IDLE, onIdle);
    };
}

const EVENT_DEVICE_COUNT = 'rs3-device-count';
let deviceCount = 0;

/**
 * Rows in the Devices panel changed (serial and Bluetooth devices, the quadcopter row).
 * @param {number} count rows
 */
export function notifyDeviceCount (count) {
    deviceCount = count;
    document.dispatchEvent(new CustomEvent(EVENT_DEVICE_COUNT, {detail: {count}}));
}

/**
 * @param {(count: number) => void} handler called now with the current count and on every change
 * @returns {() => void} unsubscribe
 */
export function subscribeDeviceCount (handler) {
    const listener = event => handler(event.detail.count);
    document.addEventListener(EVENT_DEVICE_COUNT, listener);
    handler(deviceCount);
    return () => document.removeEventListener(EVENT_DEVICE_COUNT, listener);
}

const EVENT_FIRMWARE_FLASHING = 'rs3-firmware-flashing';

/**
 * Serial flashing started or ended (flashing is drawn in the device row of the Devices panel; when the panel
 * is closed, the menu bar search button shows it).
 * @param {boolean} active some device is being flashed
 */
export function notifyFirmwareFlashing (active) {
    document.dispatchEvent(new CustomEvent(EVENT_FIRMWARE_FLASHING, {detail: {active: !!active}}));
}

/**
 * @param {(active: boolean) => void} handler
 * @returns {() => void} unsubscribe
 */
export function subscribeFirmwareFlashing (handler) {
    const listener = event => handler(!!(event.detail && event.detail.active));
    document.addEventListener(EVENT_FIRMWARE_FLASHING, listener);
    return () => document.removeEventListener(EVENT_FIRMWARE_FLASHING, listener);
}
