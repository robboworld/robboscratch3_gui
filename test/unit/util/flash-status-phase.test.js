import {
    applyFlashConnected,
    applyFlashStatus,
    createFlashProgress,
    flashFailureOf,
    flashPhaseOf,
    resetFlashWindow
} from '../../../src/lib/flash-status-phase.js';

// formatMessage stand-in: "<id>|<values>" keeps the assertions readable.
const intl = {
    formatMessage: (message, values) => {
        const id = message.id.replace('gui.FlashStatus.', '');
        return values ? `${id}|${JSON.stringify(values)}` : id;
    }
};

const P = '[/dev/ttyUSB0] ';

// Flasher lines for an unknown Otto on an LGT8F328P board (desktop, 14.10.2026).
const UNKNOWN_OTTO_FLOW = [
    [`${P}Waiting for DeviceID on (115200)`, 'probe'],
    [`${P}No DeviceID, trying diagnostic for nano/otto_arduino...`, 'board'],
    [`${P}Start downloading diagnostic for nano/otto_arduino(57600) 1/3`, 'board'],
    [`${P}STK500 timeout: packet=ENTER_PROGMODE, receivedBytes=0, raw=no bytes`, 'board'],
    [`${P}Trying next diagnostic profile: otto_nulllab...`, 'board'],
    [`${P}Start downloading diagnostic for otto_nulllab(115200) 2/3`, 'board'],
    [`${P}Wait about 3 secs`, 'board'],
    [`${P}Uploading..`, 'diagnosticWrite'],
    [`${P}Waiting for DeviceID on (115200)`, 'identify'],
    [`${P}Device ID is:5`, 'identified'],
    [`${P}Start downloading firmware for Dancing robot Null Lab(115200)`, 'identified'],
    [`${P}Wait about 18 secs`, 'identified'],
    [`${P}Uploading...`, 'write'],
    [`${P}Upload complete. Verifying...`, 'verify'],
    [`${P}END. Port closed`, 'done']
];

describe('flash status phases', () => {
    test('an unknown Otto goes through board detection, recognition and writing', () => {
        const progress = createFlashProgress();
        const el = document.createElement('div');
        const phases = UNKNOWN_OTTO_FLOW.map(([line]) => applyFlashStatus(el, line, intl, progress));
        expect(phases).toEqual(UNKNOWN_OTTO_FLOW.map(([, phase]) => phase));
        expect(progress.deviceId).toBe(5);
        expect(el.textContent).toBe('doneDevice|{"device":"deviceOtto"}');
    });

    test('a board whose bootloader never answers is told apart (Bluetooth module on pins 0/1)', () => {
        const progress = createFlashProgress();
        const el = document.createElement('div');
        [
            `${P}Waiting for DeviceID on (115200)`,
            `${P}Start downloading diagnostic for nano/otto_arduino(57600) 1/3`,
            `${P}STK500 timeout: packet=ENTER_PROGMODE, receivedBytes=0, raw=no bytes`,
            `${P}Start downloading diagnostic for uno/otto_arduino(115200) 3/3`,
            `${P}STK500 error: Timeout waiting for STK500 response (no bytes)`,
            `${P}Error! PLS reload RS and try again`
        ].forEach(line => applyFlashStatus(el, line, intl, progress));
        expect(flashFailureOf(progress)).toBe('board_silent');
        expect(el.textContent).toBe('errorBoardSilent');
    });

    test('a silent board variant before a good one is not a silent board', () => {
        const progress = createFlashProgress();
        UNKNOWN_OTTO_FLOW.slice(0, 8).forEach(([line]) => applyFlashStatus(null, line, intl, progress));
        applyFlashStatus(null, `${P}Error! PLS reload RS and try again`, intl, progress);
        expect(flashFailureOf(progress)).toBe(null);
    });

    test('board detection shows the variant number', () => {
        const progress = createFlashProgress();
        const el = document.createElement('div');
        applyFlashStatus(el, `${P}Start downloading diagnostic for otto_nulllab(115200) 2/3`, intl, progress);
        expect(el.textContent).toBe('board|{"attempt":2,"total":3}');
    });

    test('the real firmware is named once the device is recognized', () => {
        const progress = createFlashProgress();
        const el = document.createElement('div');
        applyFlashStatus(el, `${P}Device ID is:5`, intl, progress);
        expect(el.textContent).toBe('identified|{"device":"deviceOtto"}');
        applyFlashStatus(el, `${P}Start downloading firmware for Dancing robot Null Lab(115200)`, intl, progress);
        applyFlashStatus(el, `${P}Uploading..`, intl, progress);
        expect(el.textContent).toBe('writeNoPercent');
        applyFlashStatus(el, `${P}Wait about 10 secs`, intl, progress);
        applyFlashStatus(el, `${P}Uploading...`, intl, progress);
        expect(el.textContent).toBe('writeDevice|{"device":"deviceOtto","percent":0}');
    });

    test('a known device is named from the start, an unnamed id is not', () => {
        const known = createFlashProgress();
        known.deviceId = 6;
        const el = document.createElement('div');
        applyFlashStatus(el, `${P}END. Port closed`, intl, known);
        expect(el.textContent).toBe('doneDevice|{"device":"deviceArduino"}');
        applyFlashConnected(el, intl, known);
        expect(el.textContent).toBe('connectedDevice|{"device":"deviceArduino"}');

        const esp = createFlashProgress();
        esp.deviceId = 7;
        applyFlashStatus(el, `${P}END. Port closed`, intl, esp);
        expect(el.textContent).toBe('done');
    });

    test('errors and reopening are told apart from success', () => {
        expect(flashPhaseOf(`${P}Error! PLS reload RS and try again`)).toBe('error');
        expect(flashPhaseOf(`${P}Port closed, reopening (baud)...`)).toBe('prepare');
        expect(flashPhaseOf(`${P}Uploading..`)).toBe('write');
    });

    test('done and error stop the progress bar', () => {
        const el = document.createElement('div');
        const progress = createFlashProgress();
        applyFlashStatus(el, `${P}Waiting for DeviceID on (115200)`, intl, progress);
        expect(el.classList.contains('robbo_flash_progress')).toBe(true);
        applyFlashStatus(el, `${P}Error! PLS reload RS and try again`, intl, progress);
        expect(el.classList.contains('robbo_flash_progress')).toBe(false);
    });

    test('the window gets the step of the track, an error keeps its step', () => {
        const flashWindow = document.createElement('div');
        flashWindow.setAttribute('data-flash-window', '');
        const el = document.createElement('div');
        flashWindow.appendChild(el);
        const progress = createFlashProgress();
        applyFlashStatus(el, `${P}Start downloading diagnostic for otto_nulllab(115200) 2/3`, intl, progress);
        expect(flashWindow.getAttribute('data-flash-step')).toBe('1');
        applyFlashStatus(el, `${P}Device ID is:5`, intl, progress);
        expect(flashWindow.getAttribute('data-flash-step')).toBe('2');
        applyFlashStatus(el, `${P}Error! PLS reload RS and try again`, intl, progress);
        expect(flashWindow.getAttribute('data-flash-step')).toBe('2');
        expect(flashWindow.getAttribute('data-flash-phase')).toBe('error');
        resetFlashWindow(el);
        expect(flashWindow.hasAttribute('data-flash-step')).toBe(false);
    });

    test('block counters give the exact write percent', () => {
        const el = document.createElement('div');
        const progress = createFlashProgress();
        progress.deviceId = 0;
        applyFlashStatus(el, `${P}Wait about 17.25 secs`, intl, progress);
        applyFlashStatus(el, `${P}Block 35/69`, intl, progress);
        expect(el.textContent).toBe('writeDevice|{"device":"deviceRobot","percent":51}');
        expect(flashPhaseOf(`${P}Port closed, reopening (baud)...`, progress)).toBe('prepare');
    });
});
