/** @typedef {'pending' | 'success' | 'error' | 'none'} DeviceStatusTone */

const LOG_STATUS_CLASSES = ['robbo_status_pending', 'robbo_status_success', 'robbo_status_error'];

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
