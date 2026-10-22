/**
 * Rows of the Devices panel: one row per device, even when the same device is connected twice
 * (USB and Bluetooth). Links are the same device when both are ready and answered the same serial number.
 */

const DEVICE_IS_READY = 6;

const safe = fn => {
    try {
        return fn();
    } catch (e) {
        return null;
    }
};

/** Serial number of a ready link, null while the link has not answered yet. */
const readySerial = device => {
    if (safe(() => device.getState()) !== DEVICE_IS_READY) return null;
    const serial = safe(() => device.getSerialNumber());
    return typeof serial === 'string' && serial.trim() !== '' ? serial : null;
};

/**
 * @param {Array<object>} devices links from DCA.getDevices() (getPortName, isBluetoothDevice, getState, getSerialNumber)
 * @returns {Array<{devicePort: string, isBluetooth: boolean, isMacBluetooth: boolean,
 *   alsoPorts: Array<{port: string, isBluetooth: boolean}>}>} USB link first in a row, the other links in alsoPorts
 */
export function buildDeviceRows (devices) {
    const rows = [];
    const rowBySerial = new Map();
    (devices || []).filter(Boolean).forEach(device => {
        const link = {port: device.getPortName(), isBluetooth: safe(() => device.isBluetoothDevice()) === true};
        const serial = readySerial(device);
        const row = serial === null ? null : rowBySerial.get(serial);
        if (!row) {
            const newRow = {devicePort: link.port, isBluetooth: link.isBluetooth, isMacBluetooth: false, alsoPorts: []};
            rows.push(newRow);
            if (serial !== null) rowBySerial.set(serial, newRow);
            return;
        }
        if (row.isBluetooth && !link.isBluetooth) {
            // the cable link leads the row: its port is what the user plugged in and what flashing uses
            row.alsoPorts.unshift({port: row.devicePort, isBluetooth: row.isBluetooth});
            row.devicePort = link.port;
            row.isBluetooth = false;
        } else {
            row.alsoPorts.push(link);
        }
    });
    return rows;
}

/** The rows differ in what the panel renders: ports, kinds, merged links. */
export function deviceRowsDiffer (prev, next) {
    if (prev.length !== next.length) return true;
    const linksOf = row => (row.alsoPorts || []).map(link => link.port).join('|');
    return next.some((row, i) => !prev[i] ||
        prev[i].devicePort !== row.devicePort ||
        Boolean(prev[i].isQuadcopter) !== Boolean(row.isQuadcopter) ||
        linksOf(prev[i]) !== linksOf(row));
}

/**
 * Port of the link the blocks of this device use: Robot, Laboratory and Otto blocks talk to the first
 * connected device of their kind. Null when the kind is not known or nothing is connected.
 */
export function blocksPortOf (deviceId, {RCA, LCA, OCA} = {}) {
    let list = null;
    if (deviceId === 0 || deviceId === 3) list = RCA && RCA.ConnectedRobots;
    else if (deviceId === 1 || deviceId === 2 || deviceId === 4) list = LCA && LCA.ConnectedLaboratories;
    else if (deviceId === 5) list = OCA && OCA.ConnectedOttos;
    const device = Array.isArray(list) ? list[0] : null;
    return device ? safe(() => device.getPortName()) : null;
}
