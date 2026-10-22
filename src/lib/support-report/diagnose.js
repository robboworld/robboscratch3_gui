/**
 * Conclusions of the support report: known problems recognised in the collected snapshot
 * (see collect-environment.js for its shape). Pure: same snapshot → same findings.
 *
 * A finding: {code, severity: 'error' | 'warning', values} — values fill the message placeholders
 * (messages.js). Findings come in the order a user should deal with them.
 */

// USB vendors of the serial devices Robbo Scratch searches (Crazyradio 1915 is not a serial device)
const SERIAL_VENDORS = {
    '0403': 'FTDI',
    '1A86': 'CH340',
    '2341': 'Arduino',
    '2A03': 'Arduino'
};

// Device Manager error codes (ConfigManagerErrorCode)
const NO_DRIVER_CODES = [28];
const DRIVER_BLOCKED_CODES = [31, 39, 52];

// FTDI CDM older than this is blocked by Windows 11 Memory Integrity (HVCI)
const FTDI_HVCI_MIN_VERSION = '2.12.36.4';

const compareVersions = function (left, right) {
    const a = String(left || '').split('.').map(Number);
    const b = String(right || '').split('.').map(Number);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const diff = (a[i] || 0) - (b[i] || 0);
        if (diff !== 0) return diff;
    }
    return 0;
};

/**
 * Events of the last USB search (a flash check also searches: then that is the last one).
 * @param {?object} search DCA diagnostics snapshot
 * @returns {Array<object>} events
 */
const lastSearchEvents = function (search) {
    const events = (search && Array.isArray(search.events)) ? search.events : [];
    let start = -1;
    events.forEach((event, index) => {
        if (event.kind === 'search_start') start = index;
    });
    return start >= 0 ? events.slice(start) : events;
};

/**
 * The last probe result of every port in the given events.
 * @param {Array<object>} events search events
 * @returns {object} port → probe data
 */
const probesByPort = function (events) {
    const probes = {};
    events.filter(event => event.kind === 'probe').forEach(event => {
        probes[event.data.port] = event.data;
    });
    return probes;
};

const serialDevices = function (windows) {
    const devices = (windows && Array.isArray(windows.devices)) ? windows.devices : [];
    return devices.filter(device => SERIAL_VENDORS[String(device.vid || '').toUpperCase()]);
};

const deviceLabel = device => device.name || `${SERIAL_VENDORS[String(device.vid).toUpperCase()]} ${device.vid}:${device.pid}`;

const unique = list => list.filter((item, index) => list.indexOf(item) === index);

/**
 * Driver lines the installer writes to install.log: «driver: <label> exit=<code> FAIL».
 * @param {string} installLog install.log text
 * @returns {Array<string>} labels of the drivers that failed
 */
const failedDriversFromInstallLog = function (installLog) {
    const failed = [];
    const pattern = /^driver:\s*(.+?)\s+exit=(-?\d+)\s+FAIL\b/gim;
    let match = pattern.exec(String(installLog || ''));
    while (match) {
        failed.push(`${match[1]} (${match[2]})`);
        match = pattern.exec(String(installLog || ''));
    }
    return failed;
};

/**
 * @param {object} snapshot collected environment (collect-environment.js)
 * @returns {Array<{code: string, severity: string, values: object}>} findings, most important first
 */
const diagnose = function (snapshot) {
    const findings = [];
    const add = (code, severity, values) => findings.push({code, severity, values: values || {}});

    const platform = snapshot.platform || '';
    const isDesktop = snapshot.runtime === 'desktop';
    const events = lastSearchEvents(snapshot.search);
    const allEvents = (snapshot.search && snapshot.search.events) || [];
    const probes = probesByPort(events);
    const readyPorts = Object.keys(probes).filter(port => probes[port].result === 'ready');
    // A search keeps connected devices without probing them again: «something works» looks at the whole journal
    const everReady = allEvents.some(event => event.kind === 'probe' && event.data.result === 'ready');
    const portList = snapshot.search && snapshot.search.lastPortList;
    const acceptedPorts = portList ? portList.ports.filter(port => port.verdict === 'accepted') : [];

    // Web: no way to reach a USB device at all
    const web = snapshot.web;
    if (snapshot.runtime === 'web' && web && !web.robbolink && (!web.serialApi || !web.secureContext)) {
        add('RS-WEB-01', 'error');
    } else if (snapshot.runtime === 'web' && events.some(event => event.kind === 'port_choice_cancelled') &&
        !(portList && portList.ports.length)) {
        // the browser shows its own port dialog: nothing chosen there, nothing to connect
        add('RS-WEB-02', 'warning');
    }

    // The serialport module or the port list is broken: nothing else about the ports can be trusted
    if (allEvents.some(event => event.kind === 'serialport_unavailable' || event.kind === 'port_list_error')) {
        add('RS-PORT-02', 'error');
    }

    // Windows: copied instead of installed, and nothing works yet
    if (platform === 'win32' && snapshot.install && snapshot.install.state === 'copied' && !everReady) {
        add('RS-INST-01', 'error');
    }

    // Windows: Device Manager knows the device, but its driver is blocked or missing
    const windows = snapshot.windows;
    const devices = serialDevices(windows);
    const ftdiDrivers = ((windows && windows.drivers) || []).filter(driver => driver.family === 'ftdi');
    const oldFtdiDriver = ftdiDrivers.some(driver => driver.version && compareVersions(driver.version, FTDI_HVCI_MIN_VERSION) < 0);
    const blocked = devices.filter(device =>
        DRIVER_BLOCKED_CODES.indexOf(Number(device.errorCode)) !== -1 ||
        (windows && windows.memoryIntegrity === true && oldFtdiDriver &&
            String(device.vid).toUpperCase() === '0403' && Number(device.errorCode) > 0));
    if (blocked.length) {
        add('RS-DRV-02', 'error', {devices: unique(blocked.map(deviceLabel)).join(', ')});
    }
    const noDriver = devices.filter(device => NO_DRIVER_CODES.indexOf(Number(device.errorCode)) !== -1 &&
        blocked.indexOf(device) === -1);
    if (noDriver.length) {
        add('RS-DRV-01', 'error', {devices: unique(noDriver.map(deviceLabel)).join(', ')});
    }
    const failedDrivers = failedDriversFromInstallLog(snapshot.install && snapshot.install.installLog);
    if (failedDrivers.length) {
        add('RS-DRV-03', 'warning', {drivers: failedDrivers.join(', ')});
    }

    // Opening the port failed
    const openErrors = events.filter(event => event.kind === 'port_open' && !event.data.ok &&
        readyPorts.indexOf(event.data.port) === -1);
    // Linux: «Permission denied» is the dialout group; Windows says «Access denied» when another program holds the port
    const messageOf = event => String(event.data.message || '');
    const isPermission = event => platform !== 'win32' && /permission denied|EACCES/i.test(messageOf(event));
    const permissionDenied = openErrors.filter(isPermission);
    const linux = snapshot.linux;
    if (platform === 'linux' && (permissionDenied.length ||
        (linux && linux.inDialout === false && (linux.ttys || []).some(tty => tty.accessible === false)))) {
        add('RS-LNX-01', 'error');
    }
    const busy = openErrors.filter(event => !isPermission(event) &&
        /access denied|busy|cannot lock|locked/i.test(messageOf(event)));
    if (busy.length) {
        add('RS-PORT-01', 'error', {ports: unique(busy.map(event => event.data.port)).join(', ')});
    }

    // The port opened, the device is not ready
    const notReady = Object.keys(probes).filter(port => probes[port].result !== 'ready');
    const wrongAnswer = notReady.filter(port => probes[port].rubbish && probes[port].rubbish.count > 0);
    if (wrongAnswer.length) {
        add('RS-DEV-02', 'warning', {ports: wrongAnswer.join(', ')});
    }
    const silent = notReady.filter(port => !probes[port].firstByte && wrongAnswer.indexOf(port) === -1);
    if (silent.length) {
        add('RS-DEV-01', 'warning', {ports: silent.join(', ')});
    }

    // Nothing plugged in at all (only when no other finding explains the empty list)
    const driverProblem = findings.some(finding => /^RS-(DRV|PORT|INST|LNX)-/.test(finding.code));
    const systemSeesNothing = platform === 'win32' ? (windows && Array.isArray(windows.devices) && devices.length === 0) :
        platform === 'linux' ? (linux && Array.isArray(linux.ttys) && linux.ttys.length === 0) :
            true;
    if (isDesktop && portList && acceptedPorts.length === 0 && !driverProblem && systemSeesNothing) {
        add('RS-DEV-03', 'warning');
    }

    return findings;
};

export {
    diagnose,
    compareVersions,
    failedDriversFromInstallLog,
    lastSearchEvents,
    SERIAL_VENDORS
};
