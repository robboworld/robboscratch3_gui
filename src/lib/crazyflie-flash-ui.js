/**
 * Crazyflie cf2tool / cfloader UI helpers (cfclient-style status, legacy version labels).
 */

/** firmware.revision0+1 hex → release label (must match crazyflie_flasher_desktop.js). */
export const LEGACY_CF2_REVISION_HEX_VERSION = {
    '7d40b5411085': '2023.06',
    'f83e4269f59b': '2023.07'
};

function normalizeFirmwareRevision(value) {
    if (value == null) return null;
    const s = String(value).trim();
    const match = s.match(/(\d{4})\.(\d{1,2})/);
    if (!match) return null;
    return `${match[1]}.${match[2].padStart(2, '0')}`;
}

function normalizeRevisionHex(value) {
    if (value == null) return null;
    const s = String(value).trim().toLowerCase().replace(/^0x/, '');
    return /^[0-9a-f]{12}$/.test(s) ? s : null;
}

export function resolveCf2FirmwareVersionLabel(revision, revisionHex, requiredWhenMatched, expectedHex) {
    const fromRevision = normalizeFirmwareRevision(revision);
    if (fromRevision) {
        return fromRevision;
    }
    const hex = normalizeRevisionHex(revisionHex) || normalizeRevisionHex(revision);
    if (hex && LEGACY_CF2_REVISION_HEX_VERSION[hex]) {
        return LEGACY_CF2_REVISION_HEX_VERSION[hex];
    }
    if (hex && requiredWhenMatched && expectedHex &&
        hex === String(expectedHex).trim().toLowerCase()) {
        return requiredWhenMatched;
    }
    return null;
}

function shouldSkipFlashLogLine(lower) {
    return lower.indexOf('no logentry to handle') !== -1 ||
        lower.indexOf('could not save cache') !== -1 ||
        lower.indexOf('deprecationwarning') !== -1 ||
        lower.indexOf('warnings.warn') !== -1 ||
        lower.indexOf('userwarning') !== -1 ||
        /^info:/i.test(lower) ||
        /^debug:/i.test(lower);
}

function isBenignFlashNoise(lower) {
    return lower.indexOf('resource busy') !== -1 ||
        lower.indexOf('usb.core.usberror') !== -1 ||
        lower.indexOf('errno 16') !== -1 ||
        lower.indexOf('could not save cache') !== -1 ||
        lower.indexOf('no logentry') !== -1;
}

/**
 * Map cfloader/cf2tool line to cfclient-like headline (and optional short log line).
 * @returns {{ headline: string, logLine: string|null }|null}
 */
export function parseCf2FlashToolLine(line, meta) {
    const s = String(line || '').trim();
    if (!s) return null;
    const lower = s.toLowerCase();
    if (shouldSkipFlashLogLine(lower)) {
        return null;
    }
    if (isBenignFlashNoise(lower)) {
        return null;
    }

    const pct = s.match(/(\d{1,3})\s*%/);
    if (pct) {
        return { headline: `Writing firmware… ${pct[1]}%`, logLine: null };
    }

    if (lower.indexOf('scan') !== -1 || lower.indexOf('scanning') !== -1) {
        return { headline: 'Scanning for bootloader…', logLine: null };
    }
    if (lower.indexOf('erase') !== -1 || lower.indexOf('erasing') !== -1) {
        return { headline: 'Erasing flash…', logLine: null };
    }
    if (lower.indexOf('write') !== -1 || lower.indexOf('writing') !== -1 ||
        lower.indexOf('upload') !== -1 || lower.indexOf('flash') !== -1) {
        return { headline: 'Writing firmware…', logLine: null };
    }
    if (lower.indexOf('verify') !== -1 || lower.indexOf('verifying') !== -1) {
        return { headline: 'Verifying firmware…', logLine: null };
    }
    if (lower.indexOf('reboot') !== -1 || lower.indexOf('reset') !== -1 ||
        lower.indexOf('restart') !== -1) {
        return { headline: 'Resetting copter…', logLine: null };
    }
    if (lower.indexOf('done') !== -1 || lower.indexOf('complete') !== -1 ||
        lower.indexOf('success') !== -1) {
        return { headline: 'Firmware update complete', logLine: null };
    }
    if (lower.indexOf('connect') !== -1) {
        return { headline: 'Connecting…', logLine: null };
    }

    if (meta && meta.isStderr === true) {
        if (lower.indexOf('error') !== -1 || lower.indexOf('traceback') !== -1) {
            return null;
        }
    }

    if (s.length > 120) {
        return { headline: null, logLine: s.slice(0, 120) + '…' };
    }
    return { headline: null, logLine: s };
}
