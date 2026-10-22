import {blocksPortOf, buildDeviceRows, deviceRowsDiffer} from '../../../src/lib/device-rows.js';

const READY = 6;
const CHECKING = 3;

const link = (port, {bluetooth = false, state = READY, serial = 'O-00001-00005-121'} = {}) => ({
    getPortName: () => port,
    isBluetoothDevice: () => bluetooth,
    getState: () => state,
    getSerialNumber: () => serial
});

describe('buildDeviceRows', () => {
    test('the same robot over USB and Bluetooth is one row led by USB', () => {
        const rows = buildDeviceRows([
            link('/dev/ttyUSB0'),
            link('bluetooth_OTTO-121', {bluetooth: true})
        ]);
        expect(rows).toEqual([{
            devicePort: '/dev/ttyUSB0',
            isBluetooth: false,
            isMacBluetooth: false,
            alsoPorts: [{port: 'bluetooth_OTTO-121', isBluetooth: true}]
        }]);
    });

    test('USB leads the row even when Bluetooth comes first', () => {
        const rows = buildDeviceRows([
            link('bluetooth_OTTO-121', {bluetooth: true}),
            link('/dev/ttyUSB0')
        ]);
        expect(rows).toHaveLength(1);
        expect(rows[0].devicePort).toBe('/dev/ttyUSB0');
        expect(rows[0].isBluetooth).toBe(false);
        expect(rows[0].alsoPorts).toEqual([{port: 'bluetooth_OTTO-121', isBluetooth: true}]);
    });

    test('a link that has not answered yet keeps its own row', () => {
        const rows = buildDeviceRows([
            link('/dev/ttyUSB0'),
            link('bluetooth_OTTO-121', {bluetooth: true, state: CHECKING})
        ]);
        expect(rows.map(row => row.devicePort)).toEqual(['/dev/ttyUSB0', 'bluetooth_OTTO-121']);
    });

    test('different robots and links without a serial number stay apart', () => {
        const rows = buildDeviceRows([
            link('/dev/ttyUSB0', {serial: 'R-1'}),
            link('/dev/ttyUSB1', {serial: 'R-2'}),
            link('/dev/ttyUSB2', {serial: ''}),
            link('/dev/ttyUSB3', {serial: ''}),
            null
        ]);
        expect(rows).toHaveLength(4);
        rows.forEach(row => expect(row.alsoPorts).toEqual([]));
    });
});

describe('deviceRowsDiffer', () => {
    test('a link joining a row is a change, the same rows are not', () => {
        const apart = buildDeviceRows([link('/dev/ttyUSB0'), link('bluetooth_OTTO-121', {bluetooth: true, state: CHECKING})]);
        const merged = buildDeviceRows([link('/dev/ttyUSB0'), link('bluetooth_OTTO-121', {bluetooth: true})]);
        expect(deviceRowsDiffer(apart, merged)).toBe(true);
        expect(deviceRowsDiffer(merged, buildDeviceRows([link('/dev/ttyUSB0'), link('bluetooth_OTTO-121', {bluetooth: true})])))
            .toBe(false);
        expect(deviceRowsDiffer([{devicePort: '/dev/ttyUSB0'}], [{devicePort: '/dev/ttyUSB0', alsoPorts: []}])).toBe(false);
    });
});

describe('blocksPortOf', () => {
    const OCA = {ConnectedOttos: [link('/dev/ttyUSB0')]};
    const RCA = {ConnectedRobots: [link('bluetooth_ROBBO-R-1', {bluetooth: true})]};
    test('the first connected device of the kind', () => {
        expect(blocksPortOf(5, {OCA, RCA})).toBe('/dev/ttyUSB0');
        expect(blocksPortOf(0, {OCA, RCA})).toBe('bluetooth_ROBBO-R-1');
        expect(blocksPortOf(1, {OCA, RCA})).toBe(null);
        expect(blocksPortOf(-1, {OCA, RCA})).toBe(null);
    });
});
