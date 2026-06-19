/**
 * Dynamic z-index for Robbo floating windows.
 * Keep ROBBO_POPUP_Z_INDEX_BASE in sync with $z-index-robbo-popup in css/z-index.css.
 */
export const ROBBO_POPUP_Z_INDEX_BASE = 3000;
export const ROBBO_POPUP_Z_INDEX_MAX = ROBBO_POPUP_Z_INDEX_BASE + 899;

let stackCounter = 0;

export const raiseRobboPopupZIndex = () => {
    stackCounter = Math.min(stackCounter + 1, ROBBO_POPUP_Z_INDEX_MAX - ROBBO_POPUP_Z_INDEX_BASE);
    return ROBBO_POPUP_Z_INDEX_BASE + stackCounter;
};

export const applyRobboPopupZIndex = element => {
    if (element) {
        element.style.zIndex = String(raiseRobboPopupZIndex());
    }
};

export const onRobboPopupPointerDown = event => {
    applyRobboPopupZIndex(event.currentTarget);
};
