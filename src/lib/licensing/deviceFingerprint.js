/**
 * Stable device fingerprint for license binding (Desktop NW.js preferred).
 * Hashed SHA-256 hex string; same machine => same value across restarts.
 *
 * Desktop: the OS machine id (Linux machine-id, Windows MachineGuid) plus host name. No MAC:
 * networkInterfaces() lists only interfaces with an address, so with the cable out or Wi-Fi off
 * the MAC would vanish and the licence would look bound to another computer. The host name keeps
 * cloned class images (same machine id) apart.
 */

const LS_FP_CACHE = 'rs3_license_device_fingerprint';

let cachedFingerprint = null;

function sha256Hex (input) {
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
        const data = new TextEncoder().encode(input);
        return crypto.subtle.digest('SHA-256', data).then(buf => {
            const arr = new Uint8Array(buf);
            let hex = '';
            for (let i = 0; i < arr.length; i++) {
                hex += arr[i].toString(16).padStart(2, '0');
            }
            return hex;
        });
    }
    return Promise.reject(new Error('crypto_subtle_missing'));
}

function readLinuxMachineId () {
    try {
        const cp = typeof window !== 'undefined' && window.__node_child_process__;
        if (cp && typeof cp.execSync === 'function') {
            const out = cp.execSync(
                'cat /etc/machine-id 2>/dev/null || cat /var/lib/dbus/machine-id 2>/dev/null',
                {encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore']}
            );
            return String(out).trim();
        }
    } catch (e) { /* ignore */ }
    return '';
}

function readWindowsMachineGuid () {
    try {
        const cp = typeof window !== 'undefined' && window.__node_child_process__;
        if (cp && typeof cp.execSync === 'function') {
            const out = cp.execSync(
                'reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid',
                {encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore']}
            );
            const m = out.match(/MachineGuid\s+REG_SZ\s+(\S+)/i);
            if (m && m[1]) {
                return m[1].trim();
            }
        }
    } catch (e) { /* ignore */ }
    return '';
}

function firstNonInternalMac (osMod) {
    try {
        const ifaces = osMod.networkInterfaces && osMod.networkInterfaces();
        if (!ifaces) {
            return '';
        }
        for (const name of Object.keys(ifaces)) {
            const list = ifaces[name];
            for (let i = 0; i < list.length; i++) {
                const ni = list[i];
                if (ni && !ni.internal && ni.mac && ni.mac !== '00:00:00:00:00:00') {
                    return ni.mac;
                }
            }
        }
    } catch (e) { /* ignore */ }
    return '';
}

function readMachineId () {
    return readLinuxMachineId() || readWindowsMachineGuid();
}

/**
 * @param {object} osMod Node `os` module
 * @param {string} machineId OS machine id, '' when unreadable
 * @returns {?string} material to hash; without a machine id the MAC stands in for it
 */
export function desktopMaterial (osMod, machineId) {
    const parts = [
        'rs3-desktop-v2',
        String(osMod.platform && osMod.platform() || ''),
        String(osMod.arch && osMod.arch() || ''),
        String(osMod.hostname && osMod.hostname() || ''),
        machineId || firstNonInternalMac(osMod)
    ].filter(Boolean);
    if (parts.length <= 1) {
        return null;
    }
    return parts.join('|');
}

function nodeOs () {
    return (typeof window !== 'undefined' && window.__node_os__) || null;
}

function collectDesktopMaterial () {
    const osMod = nodeOs();
    return osMod ? desktopMaterial(osMod, readMachineId()) : null;
}

function collectWebMaterial () {
    const parts = [
        'rs3-web-v1',
        typeof navigator !== 'undefined' ? navigator.userAgent : '',
        typeof navigator !== 'undefined' ? navigator.language : '',
        typeof screen !== 'undefined' ? `${screen.width}x${screen.height}x${screen.colorDepth}` : '',
        typeof Intl !== 'undefined' && Intl.DateTimeFormat
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : ''
    ];
    return parts.join('|');
}

/**
 * @returns {Promise<string>} SHA-256 hex fingerprint
 */
export function computeDeviceFingerprint () {
    if (cachedFingerprint) {
        return Promise.resolve(cachedFingerprint);
    }
    const material = collectDesktopMaterial() || collectWebMaterial();
    if (!material) {
        return Promise.reject(new Error('fingerprint_material_unavailable'));
    }
    return sha256Hex(material).then(fp => {
        cachedFingerprint = fp;
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(LS_FP_CACHE, fp);
            }
        } catch (e) { /* ignore */ }
        return fp;
    });
}

/**
 * Synchronous read of last computed/stored fingerprint (may be stale until computeDeviceFingerprint resolves).
 * @returns {string}
 */
export function getCachedDeviceFingerprint () {
    if (cachedFingerprint) {
        return cachedFingerprint;
    }
    try {
        if (typeof localStorage !== 'undefined') {
            const x = localStorage.getItem(LS_FP_CACHE);
            if (x) {
                cachedFingerprint = x;
                return x;
            }
        }
    } catch (e) { /* ignore */ }
    return '';
}

export {LS_FP_CACHE};
