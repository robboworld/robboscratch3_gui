const EVENT_CONNECTED = 'rs3-search-device-connected';
const EVENT_CONNECT_ERROR = 'rs3-search-device-connect-error';
const EVENT_SEARCH_IDLE = 'rs3-search-idle';

/** One connected/error label per search attempt (ignore duplicate state 7→8, multiple rows). */
let sessionTerminalFeedbackSent = false;

/** Call when a new device search starts (menu bar or DCA scan). */
export function beginSearchButtonFeedbackSession () {
    sessionTerminalFeedbackSent = false;
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
