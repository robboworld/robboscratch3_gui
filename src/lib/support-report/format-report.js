/**
 * The support report as plain text: the conclusions first (in the interface language, for the user),
 * then the raw sections (in English, for support). User names in paths are masked.
 */
import {findingMessages, makeFormatter} from './messages';

const SECTION_LINE = '='.repeat(64);

const section = title => ['', SECTION_LINE, title, SECTION_LINE];

const pad2 = n => String(n).padStart(2, '0');

const formatTime = function (timestamp) {
    const date = new Date(timestamp);
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}.` +
        `${String(date.getMilliseconds()).padStart(3, '0')}`;
};

const formatValue = function (value) {
    if (value === null || typeof value === 'undefined') return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

/**
 * One journal event: «12:30:01.250 probe COM3 result=no answer baud=115200 …».
 * @param {object} event diagnostics journal event
 * @returns {string} line
 */
const formatEvent = function (event) {
    const data = Object.assign({}, event.data);
    const port = data.port;
    delete data.port;
    const fields = Object.keys(data).map(key => `${key}=${formatValue(data[key])}`);
    return [formatTime(event.t), event.kind, port].concat(fields)
        .filter(part => part !== undefined && part !== '')
        .join(' ');
};

/**
 * Masks the user name in paths: C:\Users\Ivan → C:\Users\***, /home/ivan → /home/***.
 * @param {string} text report text
 * @returns {string} masked text
 */
const maskUserPaths = text => String(text)
    .replace(/([A-Za-z]:\\(?:Users|Documents and Settings)\\)[^\\/\r\n"']+/gi, '$1***')
    .replace(/(\/(?:home|Users)\/)[^/\s"']+/g, '$1***');

const yesNo = value => {
    if (value === true) return 'yes';
    if (value === false) return 'no';
    return 'unknown';
};

const summaryLines = function (findings, format) {
    if (!findings.length) return [format(findingMessages['OK.title'])];
    const lines = [];
    findings.forEach(finding => {
        lines.push(`[${finding.code}] ${format(findingMessages[`${finding.code}.title`], finding.values)}`);
        lines.push(`    → ${format(findingMessages[`${finding.code}.action`], finding.values)}`);
    });
    return lines;
};

const systemLines = function (snapshot) {
    const system = snapshot.system || {};
    const app = snapshot.app || {};
    return [
        `OS: ${system.osLabel || [system.platform, system.release].filter(Boolean).join(' ') || '-'}`,
        `Arch: ${system.arch || '-'}`,
        system.cpuModel ? `CPU: ${system.cpuModel}` : null,
        system.browser ? `Browser: ${system.browser}` : null,
        app.nw ? `NW.js: ${app.nw} (Chromium ${app.chromium || '-'})` : null,
        app.execDir ? `Program folder: ${app.execDir}` : null
    ].filter(Boolean);
};

const installLines = function (install) {
    if (!install) return [];
    const lines = [`State: ${install.state}`];
    if (install.registeredDir) lines.push(`Installed to: ${install.registeredDir}`);
    if (typeof install.hasDriversDir === 'boolean') lines.push(`drivers folder: ${yesNo(install.hasDriversDir)}`);
    if (typeof install.installLog !== 'undefined') lines.push(`install.log: ${install.installLog === null ? 'missing' : 'below'}`);
    return lines;
};

const windowsLines = function (windows) {
    const lines = [`Memory Integrity (HVCI): ${yesNo(windows.memoryIntegrity)}`, '', 'Devices (Device Manager):'];
    if (windows.devices === null) {
        lines.push('  (query failed)');
    } else if (!windows.devices.length) {
        lines.push('  none of the Robbo vendors (FTDI 0403, CH340 1A86, Arduino 2341/2A03, Crazyradio 1915)');
    } else {
        windows.devices.forEach(device => {
            lines.push(`  ${device.vid}:${device.pid} ${device.name || '-'} — status=${device.status || '-'} ` +
                `code=${device.errorCode} id=${device.deviceId}`);
        });
    }
    lines.push('', 'Drivers:');
    if (!windows.drivers.length) {
        lines.push('  none found');
    } else {
        windows.drivers.forEach(driver => {
            lines.push(`  [${driver.source}] ${driver.family || '?'} ${driver.inf}` +
                `${driver.publishedName && driver.publishedName !== driver.inf ? ` (${driver.publishedName})` : ''}` +
                ` version=${driver.version || '-'}${driver.provider ? ` provider=${driver.provider}` : ''}` +
                `${driver.deviceId ? ` device=${driver.deviceId}` : ''}`);
        });
    }
    return lines;
};

const linuxLines = linux => [
    `Groups: ${linux.groups ? linux.groups.join(' ') : 'unknown'}`,
    `In dialout: ${yesNo(linux.inDialout)}`,
    `Serial devices: ${linux.ttys.length ? linux.ttys.map(tty => `${tty.path}${tty.accessible ? '' : ' (no access)'}`).join(', ') : 'none'}`,
    `brltty running: ${yesNo(linux.brlttyRunning)}`,
    `CH340 udev rule: ${linux.udevRule || 'missing'}`
];

const webLines = web => [
    `Web Serial: ${yesNo(web.serialApi)}`,
    `Secure context: ${yesNo(web.secureContext)}`,
    `RobboLink (Android): ${yesNo(web.robbolink)}`,
    `Allowed ports: ${web.ports.length ? web.ports.map(info => `${formatValue(info.usbVendorId)}:${formatValue(info.usbProductId)}`).join(', ') : 'none'}`
];

const portListLines = function (portList) {
    if (!portList) return ['No USB search yet.'];
    if (!portList.ports.length) return [`${formatTime(portList.t)} the system listed no serial ports`];
    return [`${formatTime(portList.t)} ${portList.ports.length} port(s):`].concat(portList.ports.map(port =>
        `  ${port.path} ${port.verdict} vid=${formatValue(port.vendorId)} pid=${formatValue(port.productId)} ` +
        `manufacturer=${formatValue(port.manufacturer)} serial=${formatValue(port.serialNumber)} pnpId=${formatValue(port.pnpId)}`));
};

/**
 * @param {object} snapshot collected environment
 * @param {Array<object>} findings diagnose() result
 * @param {function} [formatMessage] intl.formatMessage (English without it)
 * @returns {string} report text
 */
const formatReport = function (snapshot, findings, formatMessage) {
    const format = makeFormatter(formatMessage);
    const codes = findings.length ? findings.map(finding => finding.code).join(',') : 'OK';
    let lines = [
        'Robbo Scratch — support report',
        `Version: ${snapshot.version || '-'} (${snapshot.runtime}${snapshot.platform ? ` ${snapshot.platform}` : ''})`,
        `Created: ${snapshot.generatedAt}`,
        `CODES: ${codes}`
    ];

    lines = lines.concat(section('SUMMARY'), summaryLines(findings, format));
    lines = lines.concat(section('SYSTEM'), systemLines(snapshot));
    if (snapshot.install) lines = lines.concat(section('INSTALLATION'), installLines(snapshot.install));
    if (snapshot.windows) lines = lines.concat(section('USB DEVICES AND DRIVERS (WINDOWS)'), windowsLines(snapshot.windows));
    if (snapshot.linux) lines = lines.concat(section('USB DEVICES (LINUX)'), linuxLines(snapshot.linux));
    if (snapshot.web) lines = lines.concat(section('BROWSER'), webLines(snapshot.web));

    const search = snapshot.search;
    lines = lines.concat(section('SERIAL PORTS (LAST SEARCH)'), portListLines(search && search.lastPortList));
    const events = (search && search.events) || [];
    lines = lines.concat(section(`DEVICE SEARCH JOURNAL (${events.length})`),
        events.length ? events.map(formatEvent) : ['empty']);

    const errors = snapshot.errors || {};
    lines = lines.concat(section('ERRORS'),
        errors.logPath ? [`Full log: ${errors.logPath}`] : [],
        [errors.text || 'none']);

    if (snapshot.install && snapshot.install.installLog) {
        lines = lines.concat(section('install.log'), [snapshot.install.installLog.trim()]);
    }
    if (snapshot.install && snapshot.install.driversLog) {
        lines = lines.concat(section('drivers\\install-drivers.log'), [snapshot.install.driversLog.trim()]);
    }
    if (snapshot.problems && snapshot.problems.length) {
        lines = lines.concat(section('NOT COLLECTED'), snapshot.problems);
    }

    // CRLF: the report is mostly opened in Notepad
    return maskUserPaths(`${lines.join('\n')}\n`).replace(/\r?\n/g, '\r\n');
};

export {formatReport, formatEvent, maskUserPaths};
