/**
 * @param {string} activationBaseUrl e.g. http://localhost:8080
 * @param {object} body
 * @param {string} body.licenseKey
 * @param {string} body.deviceFingerprint stable device hash
 * @param {string} body.publicBase same origin as activation for addon URLs
 * @returns {Promise<{signedOfflineToken: string, addonManifestUrl: string}>}
 */
export function postActivate (activationBaseUrl, body) {
    const base = activationBaseUrl.replace(/\/$/, '');
    return fetch(`${base}/v1/activate`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            licenseKey: body.licenseKey,
            deviceId: body.deviceFingerprint,
            device: {fingerprint: body.deviceFingerprint},
            publicBase: body.publicBase
        })
    })
        .then(res => res.text().then(text => {
            let json;
            try {
                json = text ? JSON.parse(text) : {};
            } catch (e) {
                throw new Error('activation_invalid_json');
            }
            if (!res.ok) {
                const err = new Error(json.error || json.errorCode || `activation_http_${res.status}`);
                err.status = res.status;
                err.errorCode = json.errorCode || json.error;
                throw err;
            }
            if (!json.signedOfflineToken) {
                throw new Error('activation_no_token');
            }
            return json;
        }));
}

/**
 * @param {string} activationBaseUrl
 * @param {object} body
 * @param {string} body.licenseKey
 * @param {string} body.deviceFingerprint
 * @returns {Promise<object>}
 */
export function postDeactivateSeat (activationBaseUrl, body) {
    const base = activationBaseUrl.replace(/\/$/, '');
    return fetch(`${base}/v1/seats/deactivate`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            licenseKey: body.licenseKey,
            deviceFingerprint: body.deviceFingerprint
        })
    })
        .then(res => res.text().then(text => {
            let json;
            try {
                json = text ? JSON.parse(text) : {};
            } catch (e) {
                throw new Error('deactivate_invalid_json');
            }
            if (!res.ok) {
                const err = new Error(json.error || json.errorCode || `deactivate_http_${res.status}`);
                err.status = res.status;
                throw err;
            }
            return json;
        }));
}

/**
 * Start device-link (Robbo ID login) — OAuth Device Authorization–like flow.
 *
 * @param {string} activationBaseUrl
 * @param {object} body
 * @param {string} body.deviceFingerprint
 * @returns {Promise<{device_code: string, user_code: string, verification_uri: string, expiresIn: number}>}
 */
export function postDeviceLinkStart (activationBaseUrl, body) {
    const base = activationBaseUrl.replace(/\/$/, '');
    return fetch(`${base}/v1/device/link/start`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-RS3-Device-Fingerprint': body.deviceFingerprint || ''
        },
        body: JSON.stringify({
            deviceFingerprint: body.deviceFingerprint,
            device: {fingerprint: body.deviceFingerprint}
        })
    })
        .then(res => res.text().then(text => {
            let json;
            try {
                json = text ? JSON.parse(text) : {};
            } catch (e) {
                throw new Error('device_link_invalid_json');
            }
            if (!res.ok) {
                const err = new Error(json.error || json.errorCode || `device_link_http_${res.status}`);
                err.status = res.status;
                err.errorCode = json.errorCode || json.error;
                throw err;
            }
            if (!json.device_code || !json.user_code) {
                throw new Error('device_link_incomplete');
            }
            return json;
        }));
}

/**
 * Poll device-link until confirmed (or pending / expired).
 *
 * @param {string} activationBaseUrl
 * @param {object} body
 * @param {string} body.deviceCode
 * @param {string} body.deviceFingerprint
 * @param {string} body.publicBase
 * @returns {Promise<object>} same shape as postActivate when done; {status:'pending'} while waiting
 */
export function postDeviceLinkPoll (activationBaseUrl, body) {
    const base = activationBaseUrl.replace(/\/$/, '');
    return fetch(`${base}/v1/device/link/poll`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-RS3-Device-Fingerprint': body.deviceFingerprint || ''
        },
        body: JSON.stringify({
            device_code: body.deviceCode,
            deviceFingerprint: body.deviceFingerprint,
            publicBase: body.publicBase
        })
    })
        .then(res => res.text().then(text => {
            let json;
            try {
                json = text ? JSON.parse(text) : {};
            } catch (e) {
                throw new Error('device_link_poll_invalid_json');
            }
            if (!res.ok) {
                const err = new Error(json.error || json.errorCode || `device_link_poll_http_${res.status}`);
                err.status = res.status;
                err.errorCode = json.errorCode || json.error;
                throw err;
            }
            return json;
        }));
}

/**
 * Build auth headers for addon manifest/bundle fetch.
 *
 * @param {string} signedOfflineToken
 * @param {string} deviceFingerprint
 * @returns {object}
 */
export function addonAuthHeaders (signedOfflineToken, deviceFingerprint) {
    return {
        Authorization: `Bearer ${signedOfflineToken}`,
        'X-RS3-Device-Fingerprint': deviceFingerprint
    };
}

/**
 * POST a device's offline token (token refresh / seat release). A rejection carries
 * `reason` (expired | revoked | seat_removed | other_device | invalid) when the ЛК answered why the
 * licence no longer applies, and `offline` when the server could not be reached.
 * @param {string} activationBaseUrl e.g. https://lk-api.example
 * @param {string} path /v1/token/refresh or /v1/seats/release
 * @param {object} body {signedOfflineToken, deviceFingerprint, publicBase}
 * @returns {Promise<object>} the ЛК's JSON answer
 */
function postDeviceToken (activationBaseUrl, path, body) {
    const base = activationBaseUrl.replace(/\/$/, '');
    return fetch(`${base}${path}`, {
        method: 'POST',
        headers: Object.assign(
            {'Content-Type': 'application/json'},
            addonAuthHeaders(body.signedOfflineToken, body.deviceFingerprint || '')
        ),
        body: JSON.stringify({publicBase: body.publicBase || ''})
    })
        .catch(fetchErr => {
            const err = new Error(`device_token_offline: ${fetchErr && fetchErr.message}`);
            err.offline = true;
            throw err;
        })
        .then(res => res.text().then(text => {
            let json;
            try {
                json = text ? JSON.parse(text) : {};
            } catch (e) {
                json = {};
            }
            if (!res.ok) {
                const err = new Error(json.error || json.errorCode || `device_token_http_${res.status}`);
                err.status = res.status;
                err.errorCode = json.errorCode || json.error;
                err.reason = json.reason || '';
                // No answer from the licensing API (proxy error, server down): as good as offline.
                err.offline = res.status >= 500 && !err.reason;
                throw err;
            }
            return json;
        }));
}

/**
 * Renew this device's offline token with the licence's current terms.
 * @param {string} activationBaseUrl licensing API of the ЛК
 * @param {object} body {signedOfflineToken, deviceFingerprint, publicBase}
 * @returns {Promise<{signedOfflineToken: string, addonManifestUrl: string, refreshAfter: string}>}
 *     the same answer as postActivate
 */
export function postTokenRefresh (activationBaseUrl, body) {
    return postDeviceToken(activationBaseUrl, '/v1/token/refresh', body);
}

/**
 * Free this device's seat (no licence key needed).
 * @param {string} activationBaseUrl licensing API of the ЛК
 * @param {object} body {signedOfflineToken, deviceFingerprint}
 * @returns {Promise<{ok: boolean, seatId: string}>} the released seat
 */
export function postSeatRelease (activationBaseUrl, body) {
    return postDeviceToken(activationBaseUrl, '/v1/seats/release', body);
}
