/**
 * Support report: one text file that tells support what went wrong (docs/support-diagnostics.md).
 *
 *   buildSupportReport()  collect → diagnose → text
 *   saveSupportReport()   the same, saved to the Desktop / downloaded
 *
 * The DCA is registered once by RobboGui, so the crash screen can build a report too.
 */
import {collectEnvironment} from './collect-environment';
import {diagnose} from './diagnose';
import {formatReport} from './format-report';
import {saveReport, showReportInFolder} from './save-report';

let registeredDca = null;
let registeredVersion = '';

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
 * @returns {Promise<{path: ?string, downloaded: boolean, findings: Array<object>}>} where the file went
 */
const saveSupportReport = function (options) {
    return buildSupportReport(options).then(report => saveReport(report.text)
        .then(saved => Object.assign({findings: report.findings}, saved)));
};

export {
    registerSupportReportSource,
    buildSupportReport,
    saveSupportReport,
    showReportInFolder
};
