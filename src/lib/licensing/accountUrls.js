/**
 * Resolve Robbo personal account (frontend) home URL.
 * Activation API is often :8080; LK UI is :3030 locally.
 *
 * @param {string} [activationBaseUrl]
 * @returns {string}
 */
export function resolveAccountHomeUrl (activationBaseUrl) {
    try {
        if (typeof process !== 'undefined' && process.env && process.env.RS3_ACCOUNT_BASE_URL) {
            const fromEnv = String(process.env.RS3_ACCOUNT_BASE_URL).trim().replace(/\/$/, '');
            if (fromEnv) {
                return `${fromEnv}/home`;
            }
        }
    } catch (e) { /* ignore */ }

    const raw = (activationBaseUrl || '').trim() || 'http://localhost:8080';
    try {
        const url = new URL(raw);
        if (url.port === '8080' ||
            ((url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
                (url.port === '' || url.port === '8080'))) {
            url.port = '3030';
        }
        return `${url.protocol}//${url.host}/home`;
    } catch (e) {
        return 'http://localhost:3030/home';
    }
}

/**
 * «My licenses» page in the personal account (subscription / seats).
 *
 * @param {string} [activationBaseUrl]
 * @returns {string}
 */
export function resolveLicensesUrl (activationBaseUrl) {
    const home = resolveAccountHomeUrl(activationBaseUrl);
    try {
        const url = new URL(home);
        url.pathname = '/licenses';
        url.search = '';
        url.hash = '';
        return url.toString().replace(/\/$/, '');
    } catch (e) {
        return 'http://localhost:3030/licenses';
    }
}

/** Public download directory for Desktop installers. */
export const DESKTOP_DOWNLOAD_URL = 'http://files.robbo.ru/Software/RobboScratch3.0/';
