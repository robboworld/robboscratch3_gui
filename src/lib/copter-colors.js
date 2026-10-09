/** One colour per copter number: palette cards, stage number badges. */
const COPTER_COLORS = [
    '#7F77DD', '#1D9E75', '#D85A30', '#D4537E', '#378ADD', '#639922', '#BA7517', '#888780',
    '#534AB7', '#0F6E56', '#993C1D', '#993556', '#185FA5', '#3B6D11', '#854F0B'
];

/**
 * @param {?number} number copter number 1..15, null for a factory copter
 * @returns {string} CSS colour
 */
const copterColor = number => (number ? COPTER_COLORS[(number - 1) % COPTER_COLORS.length] : '#B4B2A9');

export {copterColor};

const BATTERY_LEVEL_RANK = {ok: 0, warning: 1, critical: 2};

/**
 * Battery colour level shared by the palette cards and the menu-bar icon: the copter's own level
 * (low voltage, firmware low-power state) or the percent, whichever is worse.
 * @param {?number} percent battery percent
 * @param {string} [level] 'ok' | 'warning' | 'critical' | 'unknown' from the battery policy
 * @returns {string} 'ok' | 'warning' | 'critical'
 */
const batteryColorLevel = (percent, level) => {
    const value = Number(percent) || 0;
    const byPercent = value < 10 ? 'critical' : (value < 20 ? 'warning' : 'ok');
    const byPolicy = Object.prototype.hasOwnProperty.call(BATTERY_LEVEL_RANK, level) ? level : 'ok';
    return BATTERY_LEVEL_RANK[byPolicy] > BATTERY_LEVEL_RANK[byPercent] ? byPolicy : byPercent;
};

/**
 * @param {string} a colour level
 * @param {string} b colour level
 * @returns {string} the worse of the two
 */
const worseBatteryLevel = (a, b) => (BATTERY_LEVEL_RANK[b] > BATTERY_LEVEL_RANK[a] ? b : a);

export {batteryColorLevel, worseBatteryLevel};
