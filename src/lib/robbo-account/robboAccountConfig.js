/**
 * Resolve Robbo personal account (ЛК) API and frontend base URLs.
 * Matches frontend/src/config.js conventions in robbo_personal_account.
 */

import queryString from 'query-string';

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

/**
 * @returns {string} e.g. http://local.openedx.io
 */
export function resolveLmsBase () {
    const fromEnv = envString('ROBBO_LMS_URL');
    if (fromEnv) {
        return trimTrailingSlash(alignLoopbackUrlHost(fromEnv));
    }
    return 'http://local.openedx.io';
}

/**
 * Open edX registration page; after signup user returns to returnTo when allowlisted.
 * @param {string} [returnTo]
 * @returns {string}
 */
export function lmsRegisterUrl (returnTo) {
    const lmsBase = resolveLmsBase();
    const url = new URL(`${lmsBase}/register`);
    const next = returnTo ||
        (typeof window !== 'undefined' ? window.location.href : `${lmsBase}/`);
    url.searchParams.set('next', next);
    return url.toString();
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

/** Query params that open a cloud project from the account; dropped on sign-out. */
export const CLOUD_PROJECT_URL_PARAMS = ['projectPageId', 'projectRef'];

export function resolveEditorLogoutReturnTo () {
    if (typeof window !== 'undefined' && window.location) {
        // Same editor page, but not the signed-in user's cloud project: a guest would get it
        // reopened (or the "project not available" screen with Sign in).
        const {protocol, host, pathname, search, hash} = window.location;
        const params = queryString.parse(search);
        CLOUD_PROJECT_URL_PARAMS.forEach(name => {
            delete params[name];
        });
        const qs = queryString.stringify(params);
        return `${protocol}//${host}${pathname}${qs ? `?${qs}` : ''}${hash}`;
    }
    const port = envString('PORT') || '8601';
    return `${currentProtocol()}//${currentHostname()}:${port}/`;
}

export function bffLogoutClearUrl () {
    return `${resolveApiBase()}/auth/oidc/logout/clear`;
}

/** LMS /logout with redirect (clears Tutor session in a top-level window or popup). */
export function idpLogoutUrl (returnTo) {
    const target = returnTo || bffLogoutClearUrl();
    const logout = new URL(`${resolveLmsBase()}/logout`);
    logout.searchParams.set('redirect_url', target);
    logout.searchParams.set('post_logout_redirect_uri', target);
    return logout.toString();
}

export function oidcLogoutUrl (returnTo, {skipIdp = false} = {}) {
    const api = resolveApiBase();
    const post = returnTo || resolveEditorLogoutReturnTo();
    if (!skipIdp) {
        const logout = new URL(`${api}/auth/oidc/logout/rs`);
        logout.searchParams.set('return_to', post);
        return logout.toString();
    }
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
