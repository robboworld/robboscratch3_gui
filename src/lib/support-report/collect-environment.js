/**
 * Collects what the support report needs, at the moment the user asks for it.
 *
 * Snapshot shape (every block may be null when it does not apply or could not be read):
 *   generatedAt, version, runtime ('desktop' | 'web'), platform (node platform or '')
 *   system      getSystemInfoAsync() result; app: {execDir, nw, chromium}
 *   install     Windows: {state: installed | installed_elsewhere | copied, registeredDir, installLog,
 *               driversLog, hasDriversDir}; Linux/macOS: {state: 'unknown'}
 *   windows     {devices: [{name, status, errorCode, deviceId, vid, pid}],
 *               drivers: [{family, inf, publishedName, version, provider, source}], memoryIntegrity}
 *   linux       {groups, inDialout, ttys: [{path, accessible}], brlttyRunning, udevRule}
 *   web         {serialApi, secureContext, robbolink, ports: [{usbVendorId, usbProductId}]}
 *   search      DCA.getDiagnosticsSnapshot()
 *   errors      {text, logPath} from the error journal
 *   problems    what could not be collected (shown in the report, never thrown)
 */
import {getSystemInfoAsync} from '../platform';
import {getErrorJournalFilePath, getErrorJournalText} from '../error-journal';

const COMMAND_TIMEOUT_MS = 8000;
const MAX_FILE_CHARS = 64 * 1024;
const VENDOR_PATTERN = 'VID_(0403|1A86|2341|2A03|1915)';
const LINUX_UDEV_RULE = '86-robboscratch-ch340.rules';

const nodeRequire = function (moduleId) {
    try {
        if (typeof window !== 'undefined' && window.nw && typeof window.nw.require === 'function') {
            return window.nw.require(moduleId);
        }
    } catch (e) {
        // not NW.js or the module is missing
    }
    return null;
};

/**
 * @param {object} cp child_process
 * @param {string} file executable
 * @param {Array<string>} args arguments
 * @param {string} [encoding] output encoding (pnputil writes in the OEM code page: latin1 keeps ASCII intact)
 * @returns {Promise<{error: ?Error, stdout: string}>} never rejects
 */
const run = function (cp, file, args, encoding) {
    return new Promise(resolve => {
        try {
            cp.execFile(file, args, {
                timeout: COMMAND_TIMEOUT_MS,
                windowsHide: true,
                encoding: encoding || 'utf8',
                maxBuffer: 4 * 1024 * 1024
            }, (error, stdout) => resolve({error: error || null, stdout: String(stdout || '')}));
        } catch (error) {
            resolve({error, stdout: ''});
        }
    });
};

const readTextFile = function (fs, filePath) {
    try {
        if (!fs.existsSync(filePath)) return null;
        const text = fs.readFileSync(filePath, 'utf8');
        return text.length > MAX_FILE_CHARS ? `…${text.slice(-MAX_FILE_CHARS)}` : text;
    } catch (e) {
        return null;
    }
};

const normalizeDir = dir => String(dir || '').replace(/[\\/]+$/, '')
    .toLowerCase();

const vidPidOf = function (deviceId) {
    const match = /VID_([0-9A-F]{4})&PID_([0-9A-F]{4})/i.exec(String(deviceId || ''));
    return match ? {vid: match[1].toUpperCase(), pid: match[2].toUpperCase()} : {vid: '', pid: ''};
};

const driverFamily = function (name) {
    const text = String(name || '').toLowerCase();
    if (/ftdibus|ftdiport|^0403$/.test(text)) return 'ftdi';
    if (/ch341|^1a86$/.test(text)) return 'ch340';
    if (/arduino|^2341$|^2a03$/.test(text)) return 'arduino';
    if (/^1915$/.test(text)) return 'crazyradio';
    return '';
};

// --- Windows -------------------------------------------------------------------------------------

/**
 * @param {object} cp child_process
 * @param {string} key registry key
 * @param {string} name value name
 * @returns {Promise<?string>} the value, null when absent (64-bit view: the installer writes there)
 */
const readRegistryValue = function (cp, key, name) {
    return run(cp, 'reg', ['query', key, '/v', name, '/reg:64']).then(({error, stdout}) => {
        if (error) return null;
        const line = stdout.split(/\r?\n/).find(row => new RegExp(`^\\s*${name}\\s+REG_`, 'i').test(row));
        if (!line) return null;
        const match = /REG_\w+\s+(.*)$/.exec(line);
        return match ? match[1].trim() : null;
    });
};

const collectWindowsInstall = function (cp, fs, path, execDir) {
    const uninstallKey = 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\robboScratch';
    return Promise.all([
        readRegistryValue(cp, uninstallKey, 'InstallLocation'),
        readRegistryValue(cp, uninstallKey, 'UninstallString'),
        readRegistryValue(cp, 'HKLM\\SOFTWARE\\robboScratch', 'Install_Dir')
    ]).then(([installLocation, uninstallString, installDir]) => {
        const fromUninstall = uninstallString ? path.dirname(uninstallString.replace(/"/g, '')) : '';
        const registeredDir = installLocation || installDir || fromUninstall || '';
        let state = 'copied';
        if (registeredDir) {
            state = normalizeDir(registeredDir) === normalizeDir(execDir) ? 'installed' : 'installed_elsewhere';
        }
        return {
            state,
            registeredDir,
            hasDriversDir: fs.existsSync(path.join(execDir, 'drivers')),
            installLog: readTextFile(fs, path.join(execDir, 'install.log')),
            driversLog: readTextFile(fs, path.join(execDir, 'drivers', 'install-drivers.log'))
        };
    });
};

// Devices of the Robbo vendors with their Device Manager state, and the drivers bound to them
const PNP_SCRIPT = [
    '$ErrorActionPreference = "SilentlyContinue"',
    '[Console]::OutputEncoding = [Text.Encoding]::UTF8',
    `$p = "${VENDOR_PATTERN}"`,
    '$d = @(Get-CimInstance Win32_PnPEntity | Where-Object { $_.PNPDeviceID -match $p } | ForEach-Object {',
    '  [pscustomobject]@{ name = $_.Name; status = $_.Status; errorCode = $_.ConfigManagerErrorCode;',
    '    deviceId = $_.PNPDeviceID; present = $_.Present } })',
    '$s = @(Get-CimInstance Win32_PnPSignedDriver | Where-Object { $_.DeviceID -match $p } | ForEach-Object {',
    '  [pscustomobject]@{ deviceId = $_.DeviceID; inf = $_.InfName; version = $_.DriverVersion;',
    '    provider = $_.DriverProviderName } })',
    '[pscustomobject]@{ devices = $d; signed = $s } | ConvertTo-Json -Depth 4 -Compress'
].join('\n');

const asArray = value => {
    if (Array.isArray(value)) return value;
    return value ? [value] : [];
};

const collectWindowsDevices = function (cp, systemRoot) {
    const powershell = `${systemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
    return Promise.resolve()
        .then(() => {
            const encoded = nodeRequire('buffer').Buffer.from(PNP_SCRIPT, 'utf16le').toString('base64');
            return run(cp, powershell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
                '-EncodedCommand', encoded]);
        })
        .then(({error, stdout}) => {
            const json = stdout.trim();
            if (!json) throw (error || new Error('no output'));
            const parsed = JSON.parse(json.replace(/^\uFEFF/, ''));
            const devices = asArray(parsed.devices)
                .filter(device => device.present !== false)
                .map(device => Object.assign({
                    name: device.name || '',
                    status: device.status || '',
                    errorCode: Number(device.errorCode) || 0,
                    deviceId: device.deviceId || ''
                }, vidPidOf(device.deviceId)));
            const signed = asArray(parsed.signed).map(driver => ({
                family: driverFamily(vidPidOf(driver.deviceId).vid),
                inf: driver.inf || '',
                publishedName: driver.inf || '',
                version: driver.version || '',
                provider: driver.provider || '',
                deviceId: driver.deviceId || '',
                source: 'device'
            }));
            return {devices, signed};
        });
};

/**
 * Robbo-related packages in the driver store, whether a device is plugged in or not.
 * pnputil labels are localised: only the ASCII parts (inf names, a.b.c.d version) are read.
 * @param {string} output pnputil /enum-drivers
 * @returns {Array<object>} drivers
 */
const parsePnputilDrivers = function (output) {
    return String(output || '').split(/\r?\n\s*\r?\n/)
        .map(block => {
            const original = /\b(ftdibus|ftdiport|ch341ser|ch341s64|arduino[\w-]*)\.inf\b/i.exec(block);
            if (!original) return null;
            const published = /\boem\d+\.inf\b/i.exec(block);
            const version = /\b(\d+\.\d+\.\d+\.\d+)\b/.exec(block);
            return {
                family: driverFamily(original[1]),
                inf: `${original[1]}.inf`,
                publishedName: published ? published[0] : '',
                version: version ? version[1] : '',
                provider: '',
                source: 'store'
            };
        })
        .filter(Boolean);
};

const collectWindows = function (cp, systemRoot, problems) {
    const devicesPromise = collectWindowsDevices(cp, systemRoot).catch(error => {
        problems.push(`Device Manager query failed: ${error && error.message}`);
        return null;
    });
    const storePromise = run(cp, `${systemRoot}\\System32\\pnputil.exe`, ['/enum-drivers'], 'latin1')
        .then(({error, stdout}) => {
            if (!stdout) {
                problems.push(`pnputil failed: ${error && error.message}`);
                return [];
            }
            return parsePnputilDrivers(stdout);
        });
    const hvciPromise = readRegistryValue(cp,
        'HKLM\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard\\Scenarios\\HypervisorEnforcedCodeIntegrity',
        'Enabled');
    return Promise.all([devicesPromise, storePromise, hvciPromise]).then(([pnp, store, hvci]) => ({
        devices: pnp ? pnp.devices : null,
        drivers: store.concat(pnp ? pnp.signed : []),
        memoryIntegrity: hvci === null ? null : /0x1$/i.test(hvci)
    }));
};

// --- Linux ---------------------------------------------------------------------------------------

const collectLinux = function (cp, fs) {
    const ttys = [];
    try {
        fs.readdirSync('/dev')
            .filter(name => /^tty(USB|ACM)\d+$/.test(name))
            .forEach(name => {
                const devicePath = `/dev/${name}`;
                let accessible = true;
                try {
                    fs.accessSync(devicePath, fs.constants.R_OK | fs.constants.W_OK);
                } catch (e) {
                    accessible = false;
                }
                ttys.push({path: devicePath, accessible});
            });
    } catch (e) {
        // /dev unreadable: the list stays empty
    }
    const udevRule = ['/etc/udev/rules.d', '/lib/udev/rules.d', '/usr/lib/udev/rules.d']
        .map(dir => `${dir}/${LINUX_UDEV_RULE}`)
        .find(rulePath => fs.existsSync(rulePath)) || null;
    return Promise.all([
        run(cp, 'id', ['-nG']),
        run(cp, 'pgrep', ['-x', 'brltty'])
    ]).then(([groupsResult, brlttyResult]) => {
        const groups = groupsResult.error ? null : groupsResult.stdout.trim().split(/\s+/);
        return {
            groups,
            // Arch-based systems use uucp for serial ports
            inDialout: groups ? groups.some(group => group === 'dialout' || group === 'uucp') : null,
            ttys,
            brlttyRunning: !brlttyResult.error && brlttyResult.stdout.trim() !== '',
            udevRule
        };
    });
};

// --- Web -----------------------------------------------------------------------------------------

const collectWeb = function () {
    const serialApi = typeof navigator !== 'undefined' && 'serial' in navigator;
    const result = {
        serialApi,
        secureContext: typeof window !== 'undefined' && window.isSecureContext === true,
        robbolink: typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || ''),
        ports: []
    };
    if (!serialApi) return Promise.resolve(result);
    return navigator.serial.getPorts()
        .then(ports => {
            result.ports = ports.map(port => (typeof port.getInfo === 'function' ? port.getInfo() : {}));
            return result;
        })
        .catch(() => result);
};

// --- Snapshot ------------------------------------------------------------------------------------

/**
 * @param {object} options options
 * @param {?object} options.dca DeviceControlAPI (search journal)
 * @param {string} options.version app version shown in the report
 * @param {boolean} [options.quick] skip the slow system queries (PowerShell, pnputil) — for UI hints
 * @returns {Promise<object>} snapshot, see the top of this file
 */
const collectEnvironment = options => Promise.resolve().then(() => collect(options || {}));

const collect = function ({dca, version, quick}) {
    const problems = [];
    const nodeProcess = nodeRequire('process');
    const runtime = nodeProcess ? 'desktop' : 'web';
    const platform = nodeProcess ? nodeProcess.platform : '';
    const cp = nodeRequire('child_process');
    const fs = nodeRequire('fs');
    const path = nodeRequire('path');
    const execDir = nodeProcess && path ? path.dirname(nodeProcess.execPath) : '';

    let search = null;
    try {
        search = dca && typeof dca.getDiagnosticsSnapshot === 'function' ? dca.getDiagnosticsSnapshot() : null;
    } catch (e) {
        problems.push(`Search journal unavailable: ${e && e.message}`);
    }

    const guard = (promise, label) => promise.catch(error => {
        problems.push(`${label}: ${error && error.message}`);
        return null;
    });

    const systemPromise = guard(getSystemInfoAsync(), 'System info');
    let installPromise = Promise.resolve(runtime === 'desktop' ? {state: 'unknown'} : null);
    let windowsPromise = Promise.resolve(null);
    let linuxPromise = Promise.resolve(null);
    const webPromise = runtime === 'web' ? guard(collectWeb(), 'Web Serial') : Promise.resolve(null);

    if (platform === 'win32' && cp && fs && path) {
        const systemRoot = nodeProcess.env.SystemRoot || 'C:\\Windows';
        installPromise = guard(collectWindowsInstall(cp, fs, path, execDir), 'Installation');
        if (!quick) windowsPromise = guard(collectWindows(cp, systemRoot, problems), 'Windows devices');
    } else if (platform === 'linux' && cp && fs && !quick) {
        linuxPromise = guard(collectLinux(cp, fs), 'Linux devices');
    }

    return Promise.all([systemPromise, installPromise, windowsPromise, linuxPromise, webPromise])
        .then(([system, install, windows, linux, web]) => ({
            generatedAt: new Date().toISOString(),
            version: version || '',
            runtime,
            platform,
            system,
            app: nodeProcess ? {
                execDir,
                nw: (nodeProcess.versions && nodeProcess.versions.nw) || '',
                chromium: (nodeProcess.versions && nodeProcess.versions.chromium) || ''
            } : null,
            install,
            windows,
            linux,
            web,
            search,
            errors: {text: getErrorJournalText(), logPath: getErrorJournalFilePath()},
            problems
        }));
};

export {
    collectEnvironment,
    parsePnputilDrivers,
    driverFamily
};
