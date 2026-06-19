/** @typedef {'pending' | 'success' | 'error' | 'none'} DeviceStatusTone */

const LOG_STATUS_CLASSES = ['robbo_status_pending', 'robbo_status_success', 'robbo_status_error'];
const FLASH_BUTTON_BUSY_CLASS = 'device_flash_button_busy';
const FLASH_BUTTON_ERROR_CLASS = 'device_flash_button_error';

/**
 * @param {HTMLElement | null | undefined} el
 * @param {DeviceStatusTone} tone
 */
export function setFlashLogStatusTone (el, tone) {
    if (!el) return;
    el.classList.remove(...LOG_STATUS_CLASSES);
    if (tone === 'pending') el.classList.add('robbo_status_pending');
    else if (tone === 'success') el.classList.add('robbo_status_success');
    else if (tone === 'error') el.classList.add('robbo_status_error');
    el.style.backgroundColor = '';
}

/**
 * @param {HTMLButtonElement | null | undefined} button
 * @param {'default' | 'busy' | 'error'} mode
 */
export function setFlashButtonVisualMode (button, mode) {
    if (!button) return;
    button.classList.remove(FLASH_BUTTON_BUSY_CLASS, FLASH_BUTTON_ERROR_CLASS);
    button.style.backgroundImage = '';
    button.style.backgroundColor = '';
    button.style.backgroundRepeat = '';
    button.style.backgroundPosition = '';
    button.style.textAlign = '';
    button.style.color = '';
    if (mode === 'busy') {
        button.classList.add(FLASH_BUTTON_BUSY_CLASS);
        button.style.textAlign = 'left';
        button.style.color = '#000';
    } else if (mode === 'error') {
        button.classList.add(FLASH_BUTTON_ERROR_CLASS);
        button.style.textAlign = 'center';
    }
}
