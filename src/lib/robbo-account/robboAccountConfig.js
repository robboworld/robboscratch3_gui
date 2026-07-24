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

/**
 * @returns {string} e.g. http://localhost:8080
 */
export function resolveApiBase () {
    const fromEnv = envString('ROBBO_ACCOUNT_API_URL') || envString('RS3_ACTIVATION_BASE_URL');
    if (fromEnv) {
        return trimTrailingSlash(fromEnv);
    }
    return `${currentProtocol()}//${currentHostname()}:8080`;
}

/**
 * @returns {string} e.g. http://localhost:3030
 */
export function resolveLkBase () {
    const fromEnv = envString('ROBBO_ACCOUNT_LK_URL') || envString('RS3_ACCOUNT_BASE_URL');
    if (fromEnv) {
        return trimTrailingSlash(fromEnv);
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
