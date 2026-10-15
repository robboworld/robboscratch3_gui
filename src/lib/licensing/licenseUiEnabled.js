import {isDesktopWithBluetooth, isRobboAndroidAppContext} from '../platform.js';

/**
 * License window, activation and paid addon: every platform (Desktop binds the licence to the
 * computer, the browser shows the account's rights). Set to false to hide the license UI.
 */
export const LICENSE_UI_ENABLED = true;

/**
 * Robbo account sign-in, session and cloud projects: browser only. Signing in leaves the page for
 * the ЛК and comes back, which the NW.js window (chrome-extension:// page) and the Android
 * WebView cannot do; Desktop activates its licence through Robbo ID in the system browser instead.
 * @returns {boolean} true when the editor may talk to the account
 */
export function isAuthUiEnabled () {
    return !isDesktopWithBluetooth() && !isRobboAndroidAppContext();
}
