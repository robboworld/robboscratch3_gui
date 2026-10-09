import {defineMessages} from 'react-intl';

/**
 * Firmware flashing status for children: localized phases and a progress bar instead of the
 * raw flasher lines ("Uploading..", "Block…", "Port closed"), which stay in the details log.
 */
const messages = defineMessages({
    prepare: {
        id: 'gui.FlashStatus.prepare',
        description: 'Firmware flashing phase: connecting to the bootloader',
        defaultMessage: 'Preparing…'
    },
    write: {
        id: 'gui.FlashStatus.write',
        description: 'Firmware flashing phase: writing the firmware ({percent} %)',
        defaultMessage: 'Writing firmware… {percent} %'
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
    error: {
        id: 'gui.FlashStatus.error',
        description: 'Firmware flashing failed',
        defaultMessage: 'The firmware was not updated. Open the details or try again'
    }
});

const WAIT_PATTERN = /Wait about ([\d.]+) secs/;
/** Writing usually takes a bit longer than the flasher estimate; stop the bar short of 100 %. */
const MAX_PENDING_PERCENT = 95;

/**
 * @returns {{startedAt: ?number, expectedMs: ?number}} per-flash state for {@link applyFlashStatus}
 */
export const createFlashProgress = () => ({startedAt: null, expectedMs: null});

/**
 * @param {string} status raw flasher line
 * @returns {'prepare'|'write'|'verify'|'done'|'error'} phase
 */
export const flashPhaseOf = status => {
    if (status.indexOf('Error') !== -1) return 'error';
    if (status.indexOf('Port closed') !== -1 && status.indexOf('reopening') === -1) return 'done';
    if (status.indexOf('Verifying') !== -1 || status.indexOf('verification') !== -1) return 'verify';
    if (status.indexOf('Uploading') !== -1 || status.indexOf('Block') !== -1) return 'write';
    return 'prepare';
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
    const phase = flashPhaseOf(status);
    if (!el) return phase;
    let text;
    let percent = null;
    if (phase === 'write') {
        if (progress.startedAt && progress.expectedMs > 0) {
            percent = Math.min(MAX_PENDING_PERCENT,
                Math.round((Date.now() - progress.startedAt) / progress.expectedMs * 100));
            text = intl.formatMessage(messages.write, {percent});
        } else {
            text = intl.formatMessage(messages.writeNoPercent);
        }
    } else {
        text = intl.formatMessage(messages[phase]);
        if (phase === 'verify') percent = 100;
    }
    el.textContent = text;
    el.classList.toggle('robbo_flash_progress', phase === 'prepare' || phase === 'write' || phase === 'verify');
    el.classList.toggle('robbo_flash_progress_known', percent !== null);
    if (percent === null) el.style.removeProperty('--flash-progress');
    else el.style.setProperty('--flash-progress', `${percent}%`);
    return phase;
};
