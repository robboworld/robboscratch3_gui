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
        // cflib console callback traceback after the copter restarts: harmless, not for the user
        lower.indexOf('exception while doing callback') !== -1 ||
        /^file "/.test(lower) ||
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
function parseCf2FlashToolLine(line, meta) {
    const s = String(line || '').trim();
    if (!s) return null;
    const lower = s.toLowerCase();
    if (shouldSkipFlashLogLine(lower)) {
        return null;
    }
    if (isBenignFlashNoise(lower)) {
        return null;
    }

    // cfloader prints «..........10%..........20%» on one line: the last figure is the current one
    const pct = s.match(/\d{1,3}(?=\s*%)/g);
    if (pct) {
        return { headline: `Writing firmware… ${pct[pct.length - 1]}%`, logLine: null };
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

/**
 * Share of the write time of each part, by the number of parts: stm32 then nrf51 took 23 s and 6 s
 * (CF2.1, 2026.04, 14.10.2026). Other counts split evenly.
 */
const WRITE_PART_WEIGHTS = {2: [80, 20]};

/**
 * Apply one cfloader line to the flash record drawn in the quadcopter row.
 * Steps: 1 bootloader (the copter restarts into it), 2 writing, 3 restart with the new firmware,
 * 4 check (RS connects to the copter again; QCA sends `meta.stage === 'check'`).
 * A two-part image (stm32, then nrf51 — «Flashing 1 of 2 …») gives one overall percent.
 * @param {{lines: string[], step: ?string, percent: ?number, headline: ?string, wrote?: boolean,
 *     part?: ?{index: number, count: number}}} record flash record, changed in place
 * @param {string} line raw cfloader line
 * @param {?object} meta {isStderr, stage}
 * @returns {boolean} the record changed
 */
export function applyCf2FlashLine(record, line, meta) {
    if (meta && meta.stage === 'restart') {
        record.step = '3';
        record.headline = 'Resetting copter…';
        record.percent = null;
        return true;
    }
    if (meta && meta.progress) {
        // pages written so far in the unfinished cfloader line (desktop flasher)
        const {index, count, done, total} = meta.progress;
        record.wrote = true;
        if (index === count && done === total) {
            // the last page is written; cfloader restarts the copter for ~20 s more without a word
            record.step = '3';
            record.headline = 'Resetting copter…';
            record.percent = null;
            return true;
        }
        const weights = WRITE_PART_WEIGHTS[count] || Array(count).fill(100 / count);
        const before = weights.slice(0, index - 1).reduce((sum, weight) => sum + weight, 0);
        record.step = '2';
        record.headline = 'Writing firmware…';
        record.percent = Math.round(before + ((weights[index - 1] * done) / total));
        return true;
    }
    if (meta && meta.stage === 'check') {
        record.step = '4';
        record.headline = 'Checking connection…';
        record.percent = null;
        return true;
    }
    const parsed = parseCf2FlashToolLine(line, meta);
    if (!parsed) return false;
    // the page dots of «Flashing 1 of 2 … (284 pages) ..........10…» say nothing in the log
    const raw = String(line).trim().replace(/(\(\d+ pages\))[\s.\d]+$/, '$1');
    record.lines.push(raw.length > 200 ? `${raw.slice(0, 200)}…` : raw);
    const part = raw.match(/(\d+)\s+of\s+(\d+)/i);
    if (part) record.part = {index: Number(part[1]), count: Number(part[2])};
    const headline = parsed.headline;
    if (!headline) return true;
    const pct = headline.match(/(\d{1,3})%$/);
    if (pct || headline === 'Erasing flash…' || headline === 'Writing firmware…' || headline === 'Verifying firmware…') {
        record.wrote = true;
        // the whole «Flashing 2 of 2 …» line arrives after its last page: the track does not go back
        if (Number(record.step) > 2) return true;
        record.step = '2';
        record.headline = pct ? 'Writing firmware…' : headline;
        if (pct) {
            const percent = Math.min(100, Number(pct[1]));
            const current = record.part && record.part.count > 1 ? record.part : null;
            record.percent = current ?
                Math.round((((current.index - 1) * 100) + percent) / current.count) :
                percent;
        }
        return true;
    }
    if (headline === 'Resetting copter…') {
        // before writing, a restart is the jump into the bootloader
        record.step = record.wrote ? '3' : '1';
        record.headline = record.wrote ? headline : 'Restarting into the bootloader…';
        record.percent = record.wrote ? null : record.percent;
        return true;
    }
    if (headline === 'Firmware update complete') {
        record.step = '3';
        record.headline = 'Resetting copter…';
        record.percent = null;
        return true;
    }
    if (!record.wrote) record.step = '1';
    record.headline = headline;
    return true;
}
