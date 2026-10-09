/**
 * Escape closes the topmost Robbo window (palettes, settings, about, sensor choose window).
 * The listener sits on window, so menus, select lists and dialogs that handle Escape first
 * (and call preventDefault) keep it for themselves.
 */

const entries = new Set();
let listening = false;

const handleKeyDown = event => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    // An open RobboSelect list closes on its own.
    if (document.querySelector('[role="listbox"]')) return;
    let top = null;
    entries.forEach(entry => {
        if (!entry.isOpen()) return;
        if (!top || entry.getZIndex() > top.getZIndex()) top = entry;
    });
    if (top) {
        event.preventDefault();
        top.close();
    }
};

/**
 * @param {{isOpen: function(): boolean, getZIndex: function(): number, close: function()}} entry window
 * @returns {function} unregister
 */
export const registerEscapeClosable = entry => {
    entries.add(entry);
    if (!listening) {
        window.addEventListener('keydown', handleKeyDown);
        listening = true;
    }
    return () => entries.delete(entry);
};
