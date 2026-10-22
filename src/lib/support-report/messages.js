import {defineMessages} from 'react-intl';

/**
 * Texts of the report conclusions: a title (what is wrong) and an action (what to do), by finding code.
 * The same texts are meant for the Devices panel hint, so they speak to the user, not to support.
 */
const findingMessages = defineMessages({
    'RS-INST-01.title': {
        id: 'gui.supportReport.RS-INST-01.title',
        description: 'Support report: the program folder was copied instead of installed',
        defaultMessage: 'Robbo Scratch was copied to this computer instead of being installed, so the USB drivers may be missing.'
    },
    'RS-INST-01.action': {
        id: 'gui.supportReport.RS-INST-01.action',
        description: 'Support report: what to do when the program was copied',
        defaultMessage: 'Install Robbo Scratch with the installer (.exe) as administrator. No internet is needed: the drivers are inside the installer.'
    },
    'RS-DRV-01.title': {
        id: 'gui.supportReport.RS-DRV-01.title',
        description: 'Support report: a device is plugged in but has no driver',
        defaultMessage: 'A device is plugged in, but Windows has no driver for it: {devices}.'
    },
    'RS-DRV-01.action': {
        id: 'gui.supportReport.RS-DRV-01.action',
        description: 'Support report: what to do when a driver is missing',
        defaultMessage: 'Run the Robbo Scratch installer again as administrator and keep the driver components selected.'
    },
    'RS-DRV-02.title': {
        id: 'gui.supportReport.RS-DRV-02.title',
        description: 'Support report: the driver is installed but Windows does not load it',
        defaultMessage: 'The device driver is installed, but Windows blocks it (often Memory Integrity in Windows 11): {devices}.'
    },
    'RS-DRV-02.action': {
        id: 'gui.supportReport.RS-DRV-02.action',
        description: 'Support report: what to do when the driver is blocked',
        defaultMessage: 'Install Robbo Scratch 3.136.1 or newer: it brings a driver that Memory Integrity allows. Then unplug and plug in the device.'
    },
    'RS-DRV-03.title': {
        id: 'gui.supportReport.RS-DRV-03.title',
        description: 'Support report: the installer reported a driver failure',
        defaultMessage: 'The installer could not install a driver: {drivers}.'
    },
    'RS-DRV-03.action': {
        id: 'gui.supportReport.RS-DRV-03.action',
        description: 'Support report: what to do when a driver failed to install',
        defaultMessage: 'Run the installer again as administrator. If it fails again, send this report to support.'
    },
    'RS-PORT-01.title': {
        id: 'gui.supportReport.RS-PORT-01.title',
        description: 'Support report: the port is used by another program',
        defaultMessage: 'The device port is busy: {ports}.'
    },
    'RS-PORT-01.action': {
        id: 'gui.supportReport.RS-PORT-01.action',
        description: 'Support report: what to do when the port is busy',
        defaultMessage: 'Close other programs that work with the device (Arduino IDE, a second Robbo Scratch window) and search again.'
    },
    'RS-PORT-02.title': {
        id: 'gui.supportReport.RS-PORT-02.title',
        description: 'Support report: the program cannot list serial ports',
        defaultMessage: 'Robbo Scratch cannot read the list of ports: the installation is damaged or incomplete.'
    },
    'RS-PORT-02.action': {
        id: 'gui.supportReport.RS-PORT-02.action',
        description: 'Support report: what to do when ports cannot be listed',
        defaultMessage: 'Reinstall Robbo Scratch with the installer.'
    },
    'RS-DEV-01.title': {
        id: 'gui.supportReport.RS-DEV-01.title',
        description: 'Support report: the port opens, but the device sends nothing',
        defaultMessage: 'The port opens, but the device does not answer: {ports}.'
    },
    'RS-DEV-01.action': {
        id: 'gui.supportReport.RS-DEV-01.action',
        description: 'Support report: what to do when the device is silent',
        defaultMessage: 'Check that the device is switched on and charged, try another cable and USB socket.'
    },
    'RS-DEV-02.title': {
        id: 'gui.supportReport.RS-DEV-02.title',
        description: 'Support report: the device answers with something that is not Robbo firmware',
        defaultMessage: 'The device answers, but the search did not recognise the answer: {ports}.'
    },
    'RS-DEV-02.action': {
        id: 'gui.supportReport.RS-DEV-02.action',
        description: 'Support report: what to do when the firmware is wrong',
        defaultMessage: 'Press «Search again»: some devices take a few seconds to start. If it repeats, flash the Robbo firmware: Devices panel → the device row → Flash.'
    },
    'RS-DEV-03.title': {
        id: 'gui.supportReport.RS-DEV-03.title',
        description: 'Support report: no Robbo device is connected at all',
        defaultMessage: 'The computer does not see any Robbo device over USB.'
    },
    'RS-DEV-03.action': {
        id: 'gui.supportReport.RS-DEV-03.action',
        description: 'Support report: what to do when nothing is connected',
        defaultMessage: 'Check the cable (some cables only charge) and try another USB socket.'
    },
    'RS-LNX-01.title': {
        id: 'gui.supportReport.RS-LNX-01.title',
        description: 'Support report: Linux user has no access to serial ports',
        defaultMessage: 'Your user has no access to the device ports (not in the dialout group).'
    },
    'RS-LNX-01.action': {
        id: 'gui.supportReport.RS-LNX-01.action',
        description: 'Support report: what to do without dialout',
        defaultMessage: 'Run «sudo usermod -a -G dialout $USER» in a terminal, then log out and log in again.'
    },
    'RS-WEB-01.title': {
        id: 'gui.supportReport.RS-WEB-01.title',
        description: 'Support report: the browser cannot work with USB devices',
        defaultMessage: 'This browser cannot connect to USB devices.'
    },
    'RS-WEB-01.action': {
        id: 'gui.supportReport.RS-WEB-01.action',
        description: 'Support report: what to do without Web Serial',
        defaultMessage: 'Open Robbo Scratch in Chrome or Edge, or install the desktop version.'
    },
    'RS-WEB-02.title': {
        id: 'gui.supportReport.RS-WEB-02.title',
        description: 'Support report: no port was chosen in the browser port dialog',
        defaultMessage: 'No device was chosen in the browser window.'
    },
    'RS-WEB-02.action': {
        id: 'gui.supportReport.RS-WEB-02.action',
        description: 'Support report: what to do when no port was chosen',
        defaultMessage: 'Press «Search devices», choose the device in the browser window and press «Connect». If the device is not in the list, check the cable; on Windows it also needs the driver from the Robbo Scratch installer.'
    },
    'OK.title': {
        id: 'gui.supportReport.OK.title',
        description: 'Support report: no known problem found',
        defaultMessage: 'No known problem found.'
    }
});

/**
 * @param {function} formatMessage intl.formatMessage; without it the English text is used
 * @returns {function(object, object=): string} formats a message descriptor
 */
const makeFormatter = function (formatMessage) {
    if (typeof formatMessage === 'function') return formatMessage;
    return (descriptor, values) => String(descriptor.defaultMessage).replace(
        /\{(\w+)\}/g,
        (match, key) => (values && key in values ? String(values[key]) : match)
    );
};

export {findingMessages, makeFormatter};
