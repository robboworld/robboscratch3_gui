/**
 * Credentialed HTTP client for Robbo personal-account backend.
 * Uses cookies (OIDC BFF / refresh) and optional Bearer access token from /auth/refresh.
 */

import {resolveApiBase} from './robboAccountConfig';

/** @type {string} */
let accessTokenMemory = '';

function apiBase () {
    return resolveApiBase().replace(/\/$/, '');
}

function parseJsonSafe (text) {
    if (!text) {
        return {};
    }
    try {
        return JSON.parse(text);
    } catch (e) {
        return null;
    }
}

function throwHttpError (res, json, fallbackCode) {
    const message = (json && (json.error || json.errorCode || json.message)) ||
        `${fallbackCode}_${res.status}`;
    const err = new Error(typeof message === 'string' ? message : fallbackCode);
    err.status = res.status;
    err.errorCode = (json && (json.errorCode || json.error)) || fallbackCode;
    throw err;
}

/**
 * @param {string} path
 * @param {RequestInit} [init]
 * @returns {Promise<Response>}
 */
function fetchAccount (path, init) {
    const headers = new Headers((init && init.headers) || {});
    if (accessTokenMemory && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${accessTokenMemory}`);
    }
    return fetch(`${apiBase()}${path}`, Object.assign({}, init, {
        credentials: 'include',
        headers
    }));
}

/**
 * @param {string} path
 * @param {RequestInit} [init]
 * @returns {Promise<object>}
 */
function fetchJson (path, init) {
    return fetchAccount(path, init).then(res => res.text().then(text => {
        const json = parseJsonSafe(text);
        if (json === null) {
            throw new Error('robbo_account_invalid_json');
        }
        if (!res.ok) {
            throwHttpError(res, json, 'robbo_account_http');
        }
        return json;
    }));
}

/**
 * Refresh access JWT via HttpOnly refresh_token cookie (password / hybrid login).
 * @returns {Promise<string|null>}
 */
export function refreshAccessToken () {
    return fetch(`${apiBase()}/auth/refresh`, {
        method: 'GET',
        credentials: 'include'
    }).then(res => res.text().then(text => {
        const json = parseJsonSafe(text) || {};
        if (!res.ok || !json.accessToken) {
            accessTokenMemory = '';
            return null;
        }
        accessTokenMemory = json.accessToken;
        return accessTokenMemory;
    })).catch(() => {
        accessTokenMemory = '';
        return null;
    });
}

/**
 * Password sign-in via ЛК REST. Sets refresh_token cookie and returns access JWT.
 * @param {string} email email or LMS username
 * @param {string} password
 * @returns {Promise<{accessToken: string}>}
 */
export function signIn (email, password) {
    return fetchJson('/auth/sign-in', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            email: email || '',
            password: password || '',
            role: 0
        })
    }).then(json => {
        if (json && json.accessToken) {
            accessTokenMemory = json.accessToken;
        }
        return json;
    });
}

/**
 * @returns {Promise<{
 *   authenticated: boolean,
 *   email?: string,
 *   edx_user_id?: string,
 *   sub?: string,
 *   role?: number,
 *   lms_password_fallback?: boolean
 * }>}
 */
export function getSessionStatus () {
    return fetchJson('/auth/oidc/status', {method: 'GET'})
        .then(status => {
            if (status && status.authenticated) {
                return status;
            }
            // Password / hybrid: OIDC cookie absent — try refresh cookie → Bearer.
            return refreshAccessToken().then(token => {
                if (!token) {
                    return status || {authenticated: false};
                }
                return Object.assign({}, status || {}, {
                    authenticated: true,
                    email: (status && status.email) || '',
                    edx_user_id: (status && status.edx_user_id) || '',
                    sub: (status && status.sub) || '',
                    role: (status && status.role) || 0,
                    auth_via: 'refresh'
                });
            });
        })
        .catch(() => refreshAccessToken().then(token => {
            if (!token) {
                return {authenticated: false};
            }
            return {
                authenticated: true,
                email: '',
                edx_user_id: '',
                sub: '',
                role: 0,
                auth_via: 'refresh'
            };
        }));
}

/**
 * @returns {Promise<{projectPage: object}>}
 */
export function createProjectPage () {
    return fetchJson('/projectPage/', {method: 'POST'});
}

/**
 * @param {object} projectPage partial ProjectPageHTTP
 * @returns {Promise<void>}
 */
export function updateProjectPage (projectPage) {
    return fetchAccount('/projectPage/', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({projectPage})
    }).then(res => {
        if (!res.ok) {
            return res.text().then(text => {
                throwHttpError(res, parseJsonSafe(text) || {}, 'update_project_http');
            });
        }
        return undefined;
    });
}

/**
 * @param {string} projectPageId
 * @returns {Promise<{projectPage: object, playToken?: object}>}
 */
export function getProjectPage (projectPageId) {
    return fetchJson(`/projectPage/${encodeURIComponent(projectPageId)}`, {method: 'GET'});
}

/**
 * @param {string} projectPageId
 * @param {Blob} blob .sb3
 * @returns {Promise<{ok: boolean}>}
 */
export function uploadProjectSb3 (projectPageId, blob) {
    const form = new FormData();
    form.append('file', blob, 'project.sb3');
    return fetchAccount(`/projectPage/${encodeURIComponent(projectPageId)}/upload`, {
        method: 'POST',
        body: form
    }).then(res => res.text().then(text => {
        const json = parseJsonSafe(text) || {};
        if (!res.ok) {
            throwHttpError(res, json, 'upload_sb3_http');
        }
        return json;
    }));
}

/**
 * @param {string} projectPageId
 * @param {Blob} blob image (png/jpeg/webp)
 * @returns {Promise<object>}
 */
export function uploadProjectPreview (projectPageId, blob) {
    const form = new FormData();
    const type = blob.type || 'image/png';
    const ext = type.indexOf('jpeg') >= 0 || type.indexOf('jpg') >= 0 ? 'jpg' :
        (type.indexOf('webp') >= 0 ? 'webp' : 'png');
    form.append('file', blob, `preview.${ext}`);
    return fetchAccount(`/projectPage/${encodeURIComponent(projectPageId)}/preview`, {
        method: 'POST',
        body: form
    }).then(res => res.text().then(text => {
        const json = parseJsonSafe(text) || {};
        if (!res.ok) {
            throwHttpError(res, json, 'upload_preview_http');
        }
        return json;
    }));
}

/**
 * @param {string} projectPageId
 * @returns {Promise<ArrayBuffer>}
 */
export function downloadProjectSb3 (projectPageId) {
    return fetchAccount(`/projectPage/${encodeURIComponent(projectPageId)}/download`, {
        method: 'GET'
    }).then(res => {
        if (!res.ok) {
            return res.text().then(text => {
                throwHttpError(res, parseJsonSafe(text) || {}, 'download_sb3_http');
            });
        }
        return res.arrayBuffer();
    });
}

export function clearAccessTokenMemory () {
    accessTokenMemory = '';
}
