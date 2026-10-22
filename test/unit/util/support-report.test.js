import {diagnose, compareVersions, failedDriversFromInstallLog} from '../../../src/lib/support-report/diagnose.js';
import {formatReport, maskUserPaths} from '../../../src/lib/support-report/format-report.js';
import {parsePnputilDrivers} from '../../../src/lib/support-report/collect-environment.js';

const event = (kind, data, t = 1000) => ({t, kind, data: data || {}});

const searchWith = (ports, events) => ({
    events: [event('search_start')].concat(events || []),
    lastPortList: {t: 1000, ports}
});

const windowsSnapshot = overrides => Object.assign({
    generatedAt: '2026-10-22T10:00:00.000Z',
    version: 'Robbo Scratch v.3.137.0-alpha',
    runtime: 'desktop',
    platform: 'win32',
    system: {osLabel: 'Windows 10.0.26100', arch: 'x64'},
    app: {execDir: 'C:\\Users\\Ivan\\Desktop\\RobboScratch', nw: '0.111.0', chromium: '148'},
    install: {state: 'installed', registeredDir: 'C:\\Program Files\\robboScratch', installLog: null},
    windows: {devices: [], drivers: [], memoryIntegrity: false},
    linux: null,
    web: null,
    search: searchWith([]),
    errors: {text: '', logPath: null},
    problems: []
}, overrides);

const codes = snapshot => diagnose(snapshot).map(finding => finding.code);

const ftdiDevice = errorCode => ({
    name: 'USB Serial Converter', status: errorCode ? 'Error' : 'OK', errorCode,
    deviceId: 'USB\\VID_0403&PID_6001\\A50285BI', vid: '0403', pid: '6001'
});

describe('diagnose', () => {
    test('copied folder, device without driver (the offline school case)', () => {
        expect(codes(windowsSnapshot({
            install: {state: 'copied', registeredDir: '', installLog: null},
            windows: {devices: [ftdiDevice(28)], drivers: [], memoryIntegrity: false},
            search: searchWith([{path: 'COM1', verdict: 'com1'}])
        }))).toEqual(['RS-INST-01', 'RS-DRV-01']);
    });

    test('Memory Integrity blocks the old FTDI driver', () => {
        const findings = diagnose(windowsSnapshot({
            windows: {
                devices: [ftdiDevice(52)],
                drivers: [{family: 'ftdi', inf: 'ftdibus.inf', version: '2.12.16.0', source: 'store'}],
                memoryIntegrity: true
            }
        }));
        expect(findings.map(finding => finding.code)).toEqual(['RS-DRV-02']);
        expect(findings[0].values.devices).toBe('USB Serial Converter');
    });

    test('port held by another program', () => {
        expect(codes(windowsSnapshot({
            windows: {devices: [ftdiDevice(0)], drivers: [], memoryIntegrity: false},
            search: searchWith([{path: 'COM3', verdict: 'accepted'}], [
                event('port_open', {port: 'COM3', ok: false, message: 'Opening COM3: Access denied'})
            ])
        }))).toEqual(['RS-PORT-01']);
    });

    test('silent device and wrong firmware are told apart', () => {
        const findings = diagnose(windowsSnapshot({
            windows: {devices: [ftdiDevice(0)], drivers: [], memoryIntegrity: false},
            search: searchWith([{path: 'COM3', verdict: 'accepted'}, {path: 'COM4', verdict: 'accepted'}], [
                event('probe', {port: 'COM3', result: 'no answer', firstByte: null, rubbish: null}),
                event('probe', {port: 'COM4', result: 'no answer', firstByte: {ms: 900, baud: 115200},
                    rubbish: {count: 3, baud: 115200, sample: 'avrdude'}})
            ])
        }));
        expect(findings.map(finding => [finding.code, finding.values.ports])).toEqual([
            ['RS-DEV-02', 'COM4'],
            ['RS-DEV-01', 'COM3']
        ]);
    });

    test('everything works: no findings, even for a copied folder', () => {
        expect(codes(windowsSnapshot({
            install: {state: 'copied', registeredDir: '', installLog: null},
            windows: {devices: [ftdiDevice(0)], drivers: [], memoryIntegrity: false},
            search: searchWith([{path: 'COM3', verdict: 'accepted'}], [
                event('port_open', {port: 'COM3', ok: true, baud: 115200}),
                event('probe', {port: 'COM3', result: 'ready', deviceId: 1, firmware: 6})
            ])
        }))).toEqual([]);
    });

    test('nothing plugged in', () => {
        expect(codes(windowsSnapshot())).toEqual(['RS-DEV-03']);
    });

    test('only the last search counts', () => {
        expect(codes(windowsSnapshot({
            windows: {devices: [ftdiDevice(0)], drivers: [], memoryIntegrity: false},
            search: {
                events: [
                    event('search_start'),
                    event('port_open', {port: 'COM3', ok: false, message: 'Access denied'}),
                    event('search_start'),
                    event('probe', {port: 'COM3', result: 'ready'})
                ],
                lastPortList: {t: 1000, ports: [{path: 'COM3', verdict: 'accepted'}]}
            }
        }))).toEqual([]);
    });

    test('broken serialport module', () => {
        expect(codes(windowsSnapshot({
            search: {events: [event('search_start'), event('serialport_unavailable', {message: 'bindings'})],
                lastPortList: {t: 1000, ports: []}}
        }))).toEqual(['RS-PORT-02']);
    });

    test('installer log with a failed driver', () => {
        expect(codes(windowsSnapshot({
            install: {state: 'installed', registeredDir: 'C:\\x', installLog: 'driver: CH340 drivers exit=5 FAIL\r\n'},
            windows: {devices: [ftdiDevice(0)], drivers: [], memoryIntegrity: false}
        }))).toEqual(['RS-DRV-03']);
    });

    test('Linux user outside dialout', () => {
        expect(codes(windowsSnapshot({
            platform: 'linux',
            install: {state: 'unknown'},
            windows: null,
            linux: {groups: ['ivan'], inDialout: false, ttys: [{path: '/dev/ttyUSB0', accessible: false}]},
            search: searchWith([{path: '/dev/ttyUSB0', verdict: 'accepted'}], [
                event('port_open', {port: '/dev/ttyUSB0', ok: false, message: 'Error: Permission denied, cannot open /dev/ttyUSB0'})
            ])
        }))).toEqual(['RS-LNX-01']);
    });

    test('browser without Web Serial', () => {
        expect(codes({
            runtime: 'web', platform: '', search: null, install: null, windows: null, linux: null,
            web: {serialApi: false, secureContext: true, robbolink: false, ports: []}
        })).toEqual(['RS-WEB-01']);
    });
});

describe('helpers', () => {
    test('compareVersions', () => {
        expect(compareVersions('2.12.16', '2.12.36.4')).toBeLessThan(0);
        expect(compareVersions('2.12.36.20', '2.12.36.4')).toBeGreaterThan(0);
        expect(compareVersions('2.12.36.4', '2.12.36.4')).toBe(0);
    });

    test('failedDriversFromInstallLog ignores successful drivers', () => {
        expect(failedDriversFromInstallLog([
            'driver: Robbo CDM drivers exit=0 OK',
            'driver: Scratchduino/Arduino drivers exit=-2147483648 FAIL'
        ].join('\n'))).toEqual(['Scratchduino/Arduino drivers (-2147483648)']);
    });

    test('pnputil output in any language: inf names and version are read', () => {
        const output = [
            'Microsoft PnP Utility',
            '',
            'Опубликованное имя:     oem12.inf',
            'Исходное имя:          ftdibus.inf',
            'Имя поставщика:        FTDI',
            'Версия драйвера:       07/05/2024 2.12.36.20',
            '',
            'Published Name:     oem3.inf',
            'Original Name:      netrndis.inf',
            'Driver Version:     06/21/2006 10.0.1.0'
        ].join('\r\n');
        expect(parsePnputilDrivers(output)).toEqual([{
            family: 'ftdi', inf: 'ftdibus.inf', publishedName: 'oem12.inf', version: '2.12.36.20',
            provider: '', source: 'store'
        }]);
    });
});

describe('formatReport', () => {
    test('codes on top, conclusions in the summary, user names masked', () => {
        const snapshot = windowsSnapshot({
            install: {state: 'copied', registeredDir: '', installLog: null},
            windows: {devices: [ftdiDevice(28)], drivers: [], memoryIntegrity: false},
            errors: {text: 'at C:\\Users\\Ivan\\AppData\\Local\\x.js', logPath: '/home/ivan/.config/robbo/errors.log'}
        });
        const text = formatReport(snapshot, diagnose(snapshot));
        expect(text.split('\r\n')[3]).toBe('CODES: RS-INST-01,RS-DRV-01');
        expect(text).toContain('[RS-DRV-01] A device is plugged in, but Windows has no driver for it: USB Serial Converter.');
        expect(text).toContain('C:\\Users\\***\\Desktop\\RobboScratch');
        expect(text).not.toMatch(/Ivan|ivan/);
        expect(text).not.toMatch(/[^\r]\n/);
    });

    test('maskUserPaths', () => {
        expect(maskUserPaths('C:\\Users\\Пётр\\Desktop and /home/petr/x')).toBe('C:\\Users\\***\\Desktop and /home/***/x');
    });
});
