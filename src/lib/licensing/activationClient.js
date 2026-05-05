/**
 * @param {string} activationBaseUrl e.g. http://127.0.0.1:9876
 * @param {object} body
 * @param {string} body.licenseKey
 * @param {string} body.deviceId
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
            deviceId: body.deviceId,
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
                const err = new Error(json.error || `activation_http_${res.status}`);
                err.status = res.status;
                throw err;
            }
            if (!json.signedOfflineToken) {
                throw new Error('activation_no_token');
            }
            return json;
        }));
}
