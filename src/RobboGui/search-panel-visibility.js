const EVENT_SHOW = 'rs3-search-panel-show';
const EVENT_HIDE = 'rs3-search-panel-hide';

let visible = false;

export function showSearchPanel () {
    document.dispatchEvent(new CustomEvent(EVENT_SHOW));
}

export function hideSearchPanel () {
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
