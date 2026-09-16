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

export function oidcStartUrl (returnTo, prompt) {
    const api = resolveApiBase();
    const target = returnTo || (typeof window !== 'undefined' ? window.location.href : '');
    const start = new URL(`${api}/auth/oidc/start`);
    if (target) {
        start.searchParams.set('return_to', target);
    }
    start.searchParams.set('prompt', prompt || 'login');
    return start.toString();
}

export function resolveEditorLogoutReturnTo () {
    if (typeof window !== 'undefined' && window.location) {
        const {protocol, host, pathname, search, hash} = window.location;
        return `${protocol}//${host}${pathname}${search}${hash}`;
    }
    const port = envString('PORT') || '8601';
    return `${currentProtocol()}//${currentHostname()}:${port}/`;
}

export function oidcLogoutUrl (returnTo, {skipIdp = false} = {}) {
    const api = resolveApiBase();
    if (!skipIdp) {
        return `${api}/auth/oidc/logout/rs`;
    }
    const post = returnTo || resolveEditorLogoutReturnTo();
    const logout = new URL(`${api}/auth/oidc/logout`);
    logout.searchParams.set('skip_idp', '1');
    logout.searchParams.set('return_to', post);
    return logout.toString();
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
