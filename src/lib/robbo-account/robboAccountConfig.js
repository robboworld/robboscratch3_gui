/**
 * Resolve Robbo personal account (ЛК) API and frontend base URLs.
 * Matches frontend/src/config.js conventions in robbo_personal_account.
 */

function trimTrailingSlash (url) {
    return (url || '').trim().replace(/\/$/, '');
}

function envString (key) {
    try {
        if (typeof process !== 'undefined' && process.env && process.env[key]) {
            return String(process.env[key]).trim();
        }
    } catch (e) { /* ignore */ }
    return '';
}

function currentHostname () {
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
        return window.location.hostname;
    }
    return 'localhost';
}

function currentProtocol () {
    if (typeof window !== 'undefined' && window.location && window.location.protocol) {
        return window.location.protocol;
    }
    return 'http:';
}

function isLoopbackHost (hostname) {
    return hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * Cookies for :8080 are host-bound: login on 127.0.0.1 does not apply on localhost.
 * Prefer a single loopback name (localhost) for editor + API + ЛК links.
 * @returns {boolean} true if a redirect was triggered
 */
export function canonicalizeLoopbackEditorHost () {
    if (typeof window === 'undefined' || !window.location) {
        return false;
    }
    const {hostname, protocol, port, pathname, search, hash} = window.location;
    if (hostname !== '127.0.0.1') {
        return false;
    }
    const portPart = port ? `:${port}` : '';
    const next = `${protocol}//localhost${portPart}${pathname}${search}${hash}`;
    window.location.replace(next);
    return true;
}

/**
 * Rewrite loopback hostname in a URL to match the current page host.
 * @param {string} url
 * @returns {string}
 */
export function alignLoopbackUrlHost (url) {
    if (!url || typeof window === 'undefined' || !window.location) {
        return url;
    }
    try {
        const parsed = new URL(url, window.location.origin);
        const pageHost = window.location.hostname;
        if (isLoopbackHost(pageHost) && isLoopbackHost(parsed.hostname) && parsed.hostname !== pageHost) {
            parsed.hostname = pageHost;
            return parsed.toString();
        }
    } catch (e) { /* ignore */ }
    return url;
}

/**
 * @returns {string} e.g. http://localhost:8080
 */
export function resolveApiBase () {
    const fromEnv = envString('ROBBO_ACCOUNT_API_URL') || envString('RS3_ACTIVATION_BASE_URL');
    if (fromEnv) {
        return trimTrailingSlash(alignLoopbackUrlHost(fromEnv));
    }
    return `${currentProtocol()}//${currentHostname()}:8080`;
}

/**
 * @returns {string} e.g. http://localhost:3030
 */
export function resolveLkBase () {
    const fromEnv = envString('ROBBO_ACCOUNT_LK_URL') || envString('RS3_ACCOUNT_BASE_URL');
    if (fromEnv) {
        return trimTrailingSlash(alignLoopbackUrlHost(fromEnv));
    }
    return `${currentProtocol()}//${currentHostname()}:3030`;
}

export function loginUrl (returnTo) {
    const base = resolveLkBase();
    const target = returnTo || (typeof window !== 'undefined' ? window.location.href : '');
    if (!target) {
        return `${base}/login`;
    }
    return `${base}/login?return_to=${encodeURIComponent(target)}`;
}

export function oidcLogoutUrl (returnTo) {
    const api = resolveApiBase();
    const lk = resolveLkBase();
    const post = returnTo || `${lk}/login`;
    return `${api}/auth/oidc/logout?return_to=${encodeURIComponent(post)}`;
}

export function myProjectsUrl () {
    return `${resolveLkBase()}/myprojects`;
}

export function projectPageUrl (projectPageId) {
    return `${resolveLkBase()}/projects/${projectPageId}`;
}

export function projectEditUrl (projectPageId) {
    return `${resolveLkBase()}/projects/${projectPageId}/edit`;
}
