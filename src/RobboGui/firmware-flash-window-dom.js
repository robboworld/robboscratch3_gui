/**
 * DOM helpers for firmware flash log windows (by stable element ids).
 */
export function getFirmwareFlashLogElements (componentId) {
    return {
        statusEl: document.getElementById(
            `firmware-flasher-flashing-status-component-${componentId}-log-status`
        ),
        logEl: document.getElementById(
            `firmware-flasher-flashing-status-component-${componentId}-log-content`
        )
    };
}
