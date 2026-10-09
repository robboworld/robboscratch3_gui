/**
 * @fileoverview
 * index.html carries a static copy of the loader (#app-loading-splash) so the page is not
 * blank while lib.min.js and gui.js download and run. The React Loader takes over from it.
 */

const SPLASH_ID = 'app-loading-splash';

/**
 * Remove the static loading screen from index.html, if it is still there.
 */
const hideLoadingSplash = function () {
    if (typeof document === 'undefined') {
        return;
    }
    const splash = document.getElementById(SPLASH_ID);
    if (splash && splash.parentNode) {
        splash.parentNode.removeChild(splash);
    }
};

export default hideLoadingSplash;
