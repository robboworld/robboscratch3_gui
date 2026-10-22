/**
 * Support report: one text file that tells support what went wrong (docs/support-diagnostics.md).
 *
 *   buildSupportReport()  collect → diagnose → text
 *   saveSupportReport()   the same, saved to the Desktop / downloaded
 *
 * The DCA is registered once by RobboGui, so the crash screen can build a report too.
 */
import {collectEnvironment, collectWindowsSystem} from './collect-environment';
import {diagnose} from './diagnose';
import {formatReport} from './format-report';
import {saveReport, showReportInFolder} from './save-report';

let registeredDca = null;
let registeredVersion = '';

// Causes the empty Devices panel can name (device rows tell about their own state themselves)
const EMPTY_PANEL_CODES = ['RS-WEB-01', 'RS-WEB-02', 'RS-PORT-02', 'RS-INST-01', 'RS-DRV-02', 'RS-DRV-01', 'RS-LNX-01', 'RS-PORT-01'];
// PowerShell takes a second or two: the Device Manager part is reused for this long
const WINDOWS_CHECK_TTL_MS = 60000;
let windowsCheck = null;

/**
 * @param {object} source what the report reads
 * @param {?object} [source.dca] DeviceControlAPI
 * @param {string} [source.version] app version (DISPLAY_VERSION)
 */
const registerSupportReportSource = function ({dca, version}) {
    if (dca) registeredDca = dca;
    if (version) registeredVersion = version;
};

/**
 * @param {object} [options] options
 * @param {function} [options.formatMessage] intl.formatMessage for the conclusions (English without it)
 * @param {?object} [options.dca] DeviceControlAPI (the registered one by default)
 * @param {string} [options.version] app version (the registered one by default)
 * @returns {Promise<{text: string, findings: Array<object>, snapshot: object}>} the report
 */
const buildSupportReport = function ({formatMessage, dca, version} = {}) {
    return collectEnvironment({dca: dca || registeredDca, version: version || registeredVersion})
        .then(snapshot => {
            const findings = diagnose(snapshot);
            return {text: formatReport(snapshot, findings, formatMessage), findings, snapshot};
        });
};

/**
 * @param {object} [options] see buildSupportReport
 * @returns {Promise<{path: ?string, fileName: string, onDesktop: boolean, downloaded: boolean,
 *     findings: Array<object>}>} where the file went
 */
const saveSupportReport = function (options) {
    return buildSupportReport(options).then(report => saveReport(report.text)
        .then(saved => Object.assign({findings: report.findings}, saved)));
};

/**
 * Why the Devices panel found nothing, in a form the panel can show (or null when nothing known explains it).
 * @param {object} [options] options
 * @param {?object} [options.dca] DeviceControlAPI (the registered one by default)
 * @returns {Promise<?{code: string, severity: string, values: object}>} the most important finding
 */
const findEmptyPanelCause = function ({dca} = {}) {
    if (!windowsCheck || Date.now() - windowsCheck.at > WINDOWS_CHECK_TTL_MS) {
        windowsCheck = {at: Date.now(), promise: collectWindowsSystem()};
    }
    return collectEnvironment({dca: dca || registeredDca, version: registeredVersion, quick: true,
        windows: windowsCheck.promise})
        .then(snapshot => diagnose(snapshot)
            .filter(finding => EMPTY_PANEL_CODES.indexOf(finding.code) !== -1)
            .sort((a, b) => EMPTY_PANEL_CODES.indexOf(a.code) - EMPTY_PANEL_CODES.indexOf(b.code))[0] || null)
        .catch(() => null);
};

export {
    findEmptyPanelCause,
    registerSupportReportSource,
    buildSupportReport,
    saveSupportReport,
    showReportInFolder
};
