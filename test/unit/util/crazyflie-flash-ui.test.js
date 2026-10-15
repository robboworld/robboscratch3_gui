import {applyCf2FlashLine} from '../../../src/lib/crazyflie-flash-ui.js';

const newRecord = () => ({lines: [], step: '1', percent: null, headline: null});

// cfloader 2026.04 warm flash of a CF2.1 (desktop, 14.10.2026); progress events come from the desktop flasher.
const STM32_LINE = 'Flashing 1 of 2 to stm32 (fw): 290795 bytes (284 pages) ..........10..........10';
const WARM_FLASH = [
    ['Reset to bootloader mode ...'],
    ['Found manifest version: 2'],
    ['Flashing 1 of 2 to stm32', {progress: {index: 1, count: 2, done: 142, total: 284}}],
    [STM32_LINE],
    ['Flashing 2 of 2 to nrf51', {progress: {index: 2, count: 2, done: 46, total: 46}}],
    ['Flashing 2 of 2 to nrf51 (fw): 47019 bytes (46 pages) .1.1.1.1'],
    ['Exception while doing callback on port [0]', {isStderr: true}],
    ['File "cflib/crazyflie/console.py", line 73, in _incoming', {isStderr: true}],
    ['Firmware written, the copter restarts', {stage: 'restart'}],
    ['Connecting to the copter', {stage: 'check'}]
];

describe('applyCf2FlashLine', () => {
    test('warm flash: bootloader, writing two parts, restart, check', () => {
        const record = newRecord();
        const steps = WARM_FLASH.map(([line, meta]) => {
            applyCf2FlashLine(record, line, meta);
            return [record.step, record.headline, record.percent];
        });
        expect(steps).toEqual([
            ['1', 'Restarting into the bootloader…', null],
            ['1', 'Restarting into the bootloader…', null],
            ['2', 'Writing firmware…', 40],
            ['2', 'Writing firmware…', 40],
            ['3', 'Resetting copter…', null],
            ['3', 'Resetting copter…', null],
            ['3', 'Resetting copter…', null],
            ['3', 'Resetting copter…', null],
            ['3', 'Resetting copter…', null],
            ['4', 'Checking connection…', null]
        ]);
        // page dots and the cflib traceback stay out of the log
        expect(record.lines).toEqual([
            'Reset to bootloader mode ...',
            'Found manifest version: 2',
            'Flashing 1 of 2 to stm32 (fw): 290795 bytes (284 pages)',
            'Flashing 2 of 2 to nrf51 (fw): 47019 bytes (46 pages)'
        ]);
    });

    test('tool noise does not reach the log', () => {
        const record = newRecord();
        expect(applyCf2FlashLine(record, 'usb.core.USBError: [Errno 16] Resource busy', {isStderr: true})).toBe(false);
        expect(record.lines).toHaveLength(0);
    });
});
