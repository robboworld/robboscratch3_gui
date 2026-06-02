/** Stable id on the root menu bar element (see menu-bar.jsx). */
export const RS3_MENU_BAR_ID = 'rs3-menu-bar';

/**
 * Viewport Y for the top edge of a dropdown attached below the menu bar.
 * @param {number} [gapPx=0]
 * @returns {number|null}
 */
export function getMenuBarDropdownTopPx (gapPx = 0) {
    if (typeof document === 'undefined') {
        return null;
    }
    const bar = document.getElementById(RS3_MENU_BAR_ID);
    if (!bar) {
        return null;
    }
    return Math.round(bar.getBoundingClientRect().bottom) + gapPx;
}
