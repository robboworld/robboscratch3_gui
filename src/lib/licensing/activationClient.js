/**
 * @param {string} activationBaseUrl e.g. http://127.0.0.1:9876
 * @param {object} body
 * @param {string} body.licenseKey
 * @param {string} body.deviceFingerprint stable device hash
 * @param {string} body.publicBase same origin as activation for addon URLs
 * @returns {Promise<{signedOfflineToken: string, addonManifestUrl: string}>}
 */
export function postActivateDemo (activationBaseUrl, body) {
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
export function postDeactivateSeatDemo (activationBaseUrl, body) {
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
