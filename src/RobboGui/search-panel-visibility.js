const EVENT_SHOW = 'rs3-search-panel-show';
const EVENT_HIDE = 'rs3-search-panel-hide';

/** Delay before auto-hiding the panel after all devices are connected. */
export const SEARCH_PANEL_HIDE_AFTER_CONNECT_MS = 1000;

let visible = false;
let hideAfterConnectTimer = null;

export function cancelScheduledHideSearchPanel () {
    if (hideAfterConnectTimer !== null) {
        clearTimeout(hideAfterConnectTimer);
        hideAfterConnectTimer = null;
    }
}

/**
 * @param {() => boolean} whenReady re-checked when the timer fires
 * @param {number} [delayMs]
 */
export function scheduleHideSearchPanelAfterConnect (whenReady, delayMs = SEARCH_PANEL_HIDE_AFTER_CONNECT_MS) {
    cancelScheduledHideSearchPanel();
    hideAfterConnectTimer = setTimeout(() => {
        hideAfterConnectTimer = null;
        if (typeof whenReady === 'function' && whenReady()) {
            hideSearchPanel();
        }
    }, delayMs);
}

export function showSearchPanel () {
    cancelScheduledHideSearchPanel();
    document.dispatchEvent(new CustomEvent(EVENT_SHOW));
}

export function hideSearchPanel () {
    cancelScheduledHideSearchPanel();
    document.dispatchEvent(new CustomEvent(EVENT_HIDE));
}

export function isSearchPanelVisible () {
    return visible;
}

/**
 * @param {(showing: boolean) => void} handler
 * @returns {() => void} unsubscribe
 */
export function subscribeSearchPanelVisibility (handler) {
    const onShow = () => {
        visible = true;
        handler(true);
    };
    const onHide = () => {
        visible = false;
        handler(false);
    };
    document.addEventListener(EVENT_SHOW, onShow);
    document.addEventListener(EVENT_HIDE, onHide);
    return () => {
        document.removeEventListener(EVENT_SHOW, onShow);
        document.removeEventListener(EVENT_HIDE, onHide);
    };
}
