/** Margin from viewport edges when placing centered Robbo popups. */
export const POPUP_VIEWPORT_MARGIN = 16;

/** Estimated size for centering (min-width / typical height from CSS). */
export const ROBBO_POPUP_SIZE_ABOUT = {width: 800, height: 480};
export const ROBBO_POPUP_SIZE_SETTINGS = {width: 520, height: 460};
export const ROBBO_POPUP_SIZE_FIRMWARE = {width: 815, height: 520};
export const ROBBO_POPUP_SIZE_FLASH_LOG = {width: 448, height: 360};

/**
 * Viewport position to center a popup of the given size (clamped to visible area).
 * @param {number} width
 * @param {number} height
 * @param {number} [margin=POPUP_VIEWPORT_MARGIN]
 * @returns {{left: number, top: number}}
 */
export function getViewportCenteredCoords (width, height, margin = POPUP_VIEWPORT_MARGIN) {
    if (typeof window === 'undefined') {
        return {left: margin, top: margin};
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(width, Math.max(0, vw - margin * 2));
    const h = Math.min(height, Math.max(0, vh - margin * 2));
    let left = Math.round((vw - w) / 2);
    let top = Math.round((vh - h) / 2);
    left = Math.max(margin, Math.min(left, vw - w - margin));
    top = Math.max(margin, Math.min(top, vh - h - margin));
    return {left, top};
}

/**
 * Initial coords for DraggableWindow `initialCoords` prop: [left, top].
 * @param {{width: number, height: number}} size
 * @returns {[number, number]}
 */
export function getCenteredPopupInitialCoords (size) {
    const {left, top} = getViewportCenteredCoords(size.width, size.height);
    return [left, top];
}
