import {defineMessages} from 'react-intl';

/**
 * Firmware flashing status for children: localized phases and a progress bar instead of the
 * raw flasher lines ("Uploading..", "Block…", "Port closed"), which stay in the details log.
 *
 * An unknown device goes through a longer path: the flasher looks for the bootloader of each
 * board variant, uploads a diagnostic firmware, reads the device id from it and only then
 * writes the real firmware. Each step gets its own phase, and once the device is known its name
 * is shown, so the child sees what the board is becoming.
 */
const messages = defineMessages({
    prepare: {
        id: 'gui.FlashStatus.prepare',
        description: 'Firmware flashing phase: connecting to the bootloader',
        defaultMessage: 'Preparing…'
    },
    probe: {
        id: 'gui.FlashStatus.probe',
        description: 'Firmware flashing phase: checking which firmware the unknown device has now',
        defaultMessage: 'Checking what the device answers…'
    },
    board: {
        id: 'gui.FlashStatus.board',
        description: 'Firmware flashing phase: trying the bootloader of board variant {attempt} of {total}',
        defaultMessage: 'Detecting the board: variant {attempt} of {total}…'
    },
    boardNoCount: {
        id: 'gui.FlashStatus.boardNoCount',
        description: 'Firmware flashing phase: trying the bootloaders of board variants',
        defaultMessage: 'Detecting the board…'
    },
    diagnosticWrite: {
        id: 'gui.FlashStatus.diagnosticWrite',
        description: 'Firmware flashing phase: uploading a small test firmware to recognize the device',
        defaultMessage: 'Uploading a test firmware to recognize the device…'
    },
    identify: {
        id: 'gui.FlashStatus.identify',
        description: 'Firmware flashing phase: waiting for the test firmware to tell the device type',
        defaultMessage: 'Recognizing the device…'
    },
    identified: {
        id: 'gui.FlashStatus.identified',
        description: 'Firmware flashing phase: the device type is known, its firmware is about to be written',
        defaultMessage: 'Recognized: {device}. Preparing its firmware…'
    },
    write: {
        id: 'gui.FlashStatus.write',
        description: 'Firmware flashing phase: writing the firmware ({percent} %)',
        defaultMessage: 'Writing firmware… {percent} %'
    },
    writeDevice: {
        id: 'gui.FlashStatus.writeDevice',
        description: 'Firmware flashing phase: writing the firmware of the recognized device ({percent} %)',
        defaultMessage: 'Writing the {device} firmware… {percent} %'
    },
    writeNoPercent: {
        id: 'gui.FlashStatus.writeNoPercent',
        description: 'Firmware flashing phase: writing the firmware, duration unknown',
        defaultMessage: 'Writing firmware…'
    },
    verify: {
        id: 'gui.FlashStatus.verify',
        description: 'Firmware flashing phase: checking the written firmware',
        defaultMessage: 'Checking…'
    },
    done: {
        id: 'gui.FlashStatus.done',
        description: 'Firmware flashing finished',
        defaultMessage: 'Done: the firmware is updated'
    },
    doneDevice: {
        id: 'gui.FlashStatus.doneDevice',
        description: 'Firmware flashing finished, the device was recognized during flashing',
        defaultMessage: 'Done: {device} firmware is updated, connecting…'
    },
    connected: {
        id: 'gui.FlashStatus.connected',
        description: 'Firmware flashing finished and the device is connected again',
        defaultMessage: 'Done: the firmware is updated, the device is connected'
    },
    connectedDevice: {
        id: 'gui.FlashStatus.connectedDevice',
        description: 'Firmware flashing finished and the device is connected again',
        defaultMessage: 'Done: {device} is connected, the firmware is updated'
    },
    error: {
        id: 'gui.FlashStatus.error',
        description: 'Firmware flashing failed',
        defaultMessage: 'The firmware was not updated. Open the details or try again'
    },
    deviceRobot: {
        id: 'gui.FlashStatus.deviceRobot',
        description: 'Device name in firmware flashing phases',
        defaultMessage: 'Robot'
    },
    deviceLab: {
        id: 'gui.FlashStatus.deviceLab',
        description: 'Device name in firmware flashing phases',
        defaultMessage: 'Laboratory'
    },
    deviceOtto: {
        id: 'gui.FlashStatus.deviceOtto',
        description: 'Device name in firmware flashing phases (Otto, the dancing robot)',
        defaultMessage: 'Dancing robot'
    },
    deviceArduino: {
        id: 'gui.FlashStatus.deviceArduino',
        description: 'Device name in firmware flashing phases',
        defaultMessage: 'Arduino'
    }
});

/** device_id → device name; ids missing here are shown without a name. */
const DEVICE_NAME_BY_ID = {
    0: messages.deviceRobot,
    1: messages.deviceLab,
    2: messages.deviceLab,
    3: messages.deviceRobot,
    4: messages.deviceLab,
    5: messages.deviceOtto,
    6: messages.deviceArduino
};

/**
 * Step of the flash window track (Board → Device → Writing → Check) for each phase;
 * 5 — every step passed. Error keeps the step it happened on.
 */
const STEP_BY_PHASE = {
    probe: 1,
    board: 1,
    prepare: 1,
    diagnosticWrite: 2,
    identify: 2,
    identified: 2,
    write: 3,
    verify: 4,
    done: 5
};

const WAIT_PATTERN = /Wait about ([\d.]+) secs/;
const DIAGNOSTIC_PATTERN = /Start downloading diagnostic for .*?(?:\s(\d+)\/(\d+))?$/;
const DEVICE_ID_PATTERN = /Device ID is:\s*(-?\d+)/;
/** Writing usually takes a bit longer than the flasher estimate; stop the bar short of 100 %. */
const MAX_PENDING_PERCENT = 95;

/**
 * @returns {object} per-flash state for {@link applyFlashStatus}: write progress and what is
 *     known about the device so far
 */
export const createFlashProgress = () => ({
    startedAt: null,
    expectedMs: null,
    diagnostic: false,
    attempt: null,
    total: null,
    deviceId: null,
    recognized: false
});

/**
 * @param {string} status raw flasher line
 * @param {object} [progress] from {@link createFlashProgress}; without it the diagnostic
 *     phases are not told apart
 * @returns {'probe'|'board'|'diagnosticWrite'|'identify'|'identified'|'prepare'|'write'|'verify'|'done'|'error'} phase
 */
export const flashPhaseOf = (status, progress) => {
    if (status.indexOf('Error') !== -1) return 'error';
    if (status.indexOf('Port closed') !== -1 && status.indexOf('reopening') === -1) return 'done';
    if (status.indexOf('Verifying') !== -1 || status.indexOf('verification') !== -1) return 'verify';
    const diagnostic = !!(progress && progress.diagnostic);
    if (status.indexOf('Uploading') !== -1 || status.indexOf('Block') !== -1) {
        if (diagnostic) return 'diagnosticWrite';
        // Writing the real firmware: «recognized» has been shown.
        if (progress) progress.recognized = false;
        return 'write';
    }
    if (!progress) return 'prepare';
    if (DEVICE_ID_PATTERN.test(status)) return 'identified';
    if (status.indexOf('Start downloading diagnostic') !== -1 ||
        status.indexOf('trying diagnostic') !== -1 ||
        status.indexOf('next diagnostic profile') !== -1) return 'board';
    if (status.indexOf('Waiting for DeviceID') !== -1) return diagnostic ? 'identify' : 'probe';
    // Service lines between the steps («Wait about…», bootloader timeouts) keep the current step.
    if (diagnostic) return 'board';
    if (progress.recognized) return 'identified';
    return 'prepare';
};

/** Remember what a flasher line tells about the device. */
const trackDevice = (status, progress) => {
    const diagnostic = DIAGNOSTIC_PATTERN.exec(status);
    if (diagnostic) {
        progress.diagnostic = true;
        if (diagnostic[1]) {
            progress.attempt = Number(diagnostic[1]);
            progress.total = Number(diagnostic[2]);
        }
        return;
    }
    const deviceId = DEVICE_ID_PATTERN.exec(status);
    if (deviceId) {
        progress.deviceId = Number(deviceId[1]);
        progress.recognized = true;
        return;
    }
    // The diagnostic firmware is done once the real one starts.
    if (status.indexOf('Start downloading firmware') !== -1) progress.diagnostic = false;
};

const deviceNameOf = (progress, intl) => {
    const message = progress.deviceId === null ? null : DEVICE_NAME_BY_ID[progress.deviceId];
    return message ? intl.formatMessage(message) : null;
};

const pendingPercent = progress => {
    if (!progress.startedAt || !(progress.expectedMs > 0)) return null;
    return Math.min(MAX_PENDING_PERCENT,
        Math.round((Date.now() - progress.startedAt) / progress.expectedMs * 100));
};

/**
 * Show the phase of a flasher line in the status element.
 * @param {?HTMLElement} el status element of the flash log
 * @param {string} status raw flasher line
 * @param {object} intl react-intl
 * @param {object} progress from {@link createFlashProgress}, updated in place
 * @returns {string} phase
 */
export const applyFlashStatus = (el, status, intl, progress) => {
    const wait = WAIT_PATTERN.exec(status);
    if (wait) {
        progress.startedAt = Date.now();
        progress.expectedMs = Number(wait[1]) * 1000;
    }
    trackDevice(status, progress);
    const phase = flashPhaseOf(status, progress);
    if (!el) return phase;
    const device = deviceNameOf(progress, intl);
    let text;
    let percent = null;
    if (phase === 'diagnosticWrite') {
        // Takes a couple of seconds: the percent would hardly move, the running bar says «working».
        text = intl.formatMessage(messages.diagnosticWrite);
    } else if (phase === 'write') {
        percent = pendingPercent(progress);
        if (percent === null) {
            text = intl.formatMessage(messages.writeNoPercent);
        } else if (device) {
            text = intl.formatMessage(messages.writeDevice, {device, percent});
        } else {
            text = intl.formatMessage(messages.write, {percent});
        }
    } else if (phase === 'board') {
        text = progress.attempt ?
            intl.formatMessage(messages.board, {attempt: progress.attempt, total: progress.total}) :
            intl.formatMessage(messages.boardNoCount);
    } else if (phase === 'identified') {
        text = device ? intl.formatMessage(messages.identified, {device}) : intl.formatMessage(messages.prepare);
    } else if (phase === 'done' && device) {
        text = intl.formatMessage(messages.doneDevice, {device});
    } else {
        text = intl.formatMessage(messages[phase]);
        if (phase === 'verify') percent = 100;
    }
    el.textContent = text;
    // The window draws its step track from these attributes (FirmwareFlasherFlashingStatusComponent.css).
    const flashWindow = el.closest('[data-flash-window]');
    if (flashWindow) {
        if (STEP_BY_PHASE[phase]) flashWindow.dataset.flashStep = String(STEP_BY_PHASE[phase]);
        flashWindow.dataset.flashPhase = phase;
    }
    el.classList.toggle('robbo_flash_progress', phase !== 'done' && phase !== 'error');
    el.classList.toggle('robbo_flash_progress_known', percent !== null);
    if (percent === null) el.style.removeProperty('--flash-progress');
    else el.style.setProperty('--flash-progress', `${percent}%`);
    return phase;
};

/**
 * After a successful flash the device is found again: say so in the status line.
 * @param {?HTMLElement} el status element of the flash log
 * @param {object} intl react-intl
 * @param {object} progress from {@link createFlashProgress}
 */
export const applyFlashConnected = (el, intl, progress) => {
    if (!el) return;
    const device = deviceNameOf(progress, intl);
    el.textContent = device ?
        intl.formatMessage(messages.connectedDevice, {device}) :
        intl.formatMessage(messages.connected);
};

/**
 * Clear the step track before a new flash (and for flashes without phases, like the quadcopter).
 * @param {?HTMLElement} el status element of the flash log
 */
export const resetFlashWindow = el => {
    const flashWindow = el && el.closest('[data-flash-window]');
    if (!flashWindow) return;
    delete flashWindow.dataset.flashStep;
    delete flashWindow.dataset.flashPhase;
};
