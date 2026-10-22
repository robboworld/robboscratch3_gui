
import classNames from 'classnames';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import {ActionDropDraggableWindow, ActionTriggerDraggableWindow} from './actions/sensor_actions';

import { defineMessages, injectIntl } from 'react-intl';


import styles from './SearchPanelDeviceComponent.css';
import './RobboDeviceStatus.css';
import {showSearchPanel} from './search-panel-visibility';
import {notifyFirmwareFlashing, notifySearchButtonFeedback} from './search-button-feedback';

import { getFirmwareSettingsFromRuntime } from '../lib/settingsLoader';
import { resolveCf2FirmwareVersionLabel, applyCf2FlashLine } from '../lib/crazyflie-flash-ui';
import {blocksPortOf} from '../lib/device-rows';
import {isDesktopWithBluetooth} from '../lib/platform';
import {
    COPTER_FLASH_STEP_MESSAGES,
    FLASH_STEP_MESSAGES,
    applyFlashConnected,
    applyFlashStatus,
    createFlashProgress,
    isFlashDone
} from '../lib/flash-status-phase';
import {hydrateLicenseThunk} from './actions/licenseActions';

const messages = defineMessages({
    row_details: {
        id: 'gui.SearchPanelDeviceComponent.row_details',
        description: 'Accessible name of a device row: shows or hides the device details',
        defaultMessage: 'Device details'
    },
    pill_connected: {
        id: 'gui.SearchPanelDeviceComponent.pill_connected',
        description: 'Device row status: the device is connected and works; {gender} is the grammatical gender of the device name (m, f, n) for languages that need it',
        defaultMessage: '{gender, select, f {Connected} n {Connected} other {Connected}}'
    },
    pill_detecting: {
        id: 'gui.SearchPanelDeviceComponent.pill_detecting',
        description: 'Device row status: asking the device who it is',
        defaultMessage: 'Detecting…'
    },
    pill_disconnected: {
        id: 'gui.SearchPanelDeviceComponent.pill_disconnected',
        description: 'Device row status: the USB cable of the device was pulled out; {gender} as in pill_connected',
        defaultMessage: '{gender, select, f {Disconnected} n {Disconnected} other {Disconnected}}'
    },
    hint_disconnected: {
        id: 'gui.SearchPanelDeviceComponent.hint_disconnected',
        description: 'Device row hint (desktop): the USB cable was pulled out; the app finds the device again by itself',
        defaultMessage: 'Plug the cable back in: Robbo Scratch will find the device by itself.'
    },
    pill_reconnecting: {
        id: 'gui.SearchPanelDeviceComponent.pill_reconnecting',
        description: 'Device row status: the connection was lost and is being restored',
        defaultMessage: 'Reconnecting…'
    },
    pill_needs_update: {
        id: 'gui.SearchPanelDeviceComponent.pill_needs_update',
        description: 'Device row status: the device firmware is older than Robbo Scratch needs',
        defaultMessage: 'New firmware needed'
    },
    pill_no_answer: {
        id: 'gui.SearchPanelDeviceComponent.pill_no_answer',
        description: 'Device row status: the device does not answer Robbo Scratch',
        defaultMessage: 'Not answering'
    },
    pill_no_link: {
        id: 'gui.SearchPanelDeviceComponent.pill_no_link',
        description: 'Device row status: the port could not be opened or the connection failed',
        defaultMessage: 'No connection'
    },
    pill_flashing: {
        id: 'gui.SearchPanelDeviceComponent.pill_flashing',
        description: 'Device row status: firmware is being written',
        defaultMessage: 'Flashing…'
    },
    pill_flashing_percent: {
        id: 'gui.SearchPanelDeviceComponent.pill_flashing_percent',
        description: 'Device row status: firmware is being written, {percent} done',
        defaultMessage: 'Flashing… {percent} %'
    },
    quadcopter_group_scanning: {
        id: 'gui.SearchPanelDeviceComponent.quadcopter_group_scanning',
        description: 'Quadcopter row hint: no copter in this group, looking in the other radio groups',
        defaultMessage: 'No copter in group {group}. Looking in the other groups…'
    },
    quadcopter_found_in_group: {
        id: 'gui.SearchPanelDeviceComponent.quadcopter_found_in_group',
        description: 'Quadcopter row hint: copters {numbers} answered in another radio group {group}; this computer uses group {current}',
        defaultMessage: '{count, plural, one {Copter {numbers} is} other {Copters {numbers} are}} in group {group}, this computer searches group {current}.'
    },
    quadcopter_switch_group: {
        id: 'gui.SearchPanelDeviceComponent.quadcopter_switch_group',
        description: 'Quadcopter row button: switch this computer to the radio group {group} and search again',
        defaultMessage: 'Switch to group {group}'
    },
    pill_flash_done: {
        id: 'gui.SearchPanelDeviceComponent.pill_flash_done',
        description: 'Device row status right after a successful flash, before the device answers again',
        defaultMessage: 'Done'
    },
    flash_log: {
        id: 'gui.SearchPanelDeviceComponent.flash_log',
        description: 'Collapsible block with the raw lines of the firmware flasher inside the device row',
        defaultMessage: 'Details'
    },
    pill_flash_failed: {
        id: 'gui.SearchPanelDeviceComponent.pill_flash_failed',
        description: 'Device row status: flashing failed',
        defaultMessage: 'Not flashed'
    },
    row_attempt: {
        id: 'gui.SearchPanelDeviceComponent.row_attempt',
        description: 'Next to the connection under the device name while detecting: the try number {attempt}',
        defaultMessage: 'try {attempt}'
    },
    row_title_unknown: {
        id: 'gui.SearchPanelDeviceComponent.row_title_unknown',
        description: 'Device row title: the device does not answer, its type is unknown',
        defaultMessage: 'Unknown device'
    },
    hint_needs_update: {
        id: 'gui.SearchPanelDeviceComponent.hint_needs_update',
        description: 'Device row hint: firmware {current} on the device, {required} is needed',
        defaultMessage: 'The device has firmware {current}, version {required} is needed. Without the update some blocks may not work.'
    },
    hint_no_answer: {
        id: 'gui.SearchPanelDeviceComponent.hint_no_answer',
        description: 'Device row hint for a device that does not answer: Robbo Scratch can flash it',
        defaultMessage: 'It probably has another firmware. Robbo Scratch will find out the device and write the right one.'
    },
    hint_flashing: {
        id: 'gui.SearchPanelDeviceComponent.hint_flashing',
        description: 'Device row hint while flashing, before the flasher reports anything',
        defaultMessage: 'Do not unplug the cable while the firmware is written.'
    },
    hint_flash_failed: {
        id: 'gui.SearchPanelDeviceComponent.hint_flash_failed',
        description: 'Device row hint: flashing failed',
        defaultMessage: 'The firmware was not written. Check the cable and try again.'
    },
    hint_bluetooth_no_answer: {
        id: 'gui.SearchPanelDeviceComponent.hint_bluetooth_no_answer',
        description: 'Bluetooth robot row: the connection failed for a reason without its own hint',
        defaultMessage: 'The robot does not answer over Bluetooth. Switch it on, bring it closer to the computer ' +
            'and press «Search again».'
    },
    hint_port_error: {
        id: 'gui.SearchPanelDeviceComponent.hint_port_error',
        description: 'Device row hint: the serial port could not be opened',
        defaultMessage: 'Could not open the port. Reconnect the device or plug the cable into another USB port.'
    },
    hint_port_error_web: {
        id: 'gui.SearchPanelDeviceComponent.hint_port_error_web',
        description: 'Device row hint (web): the USB port could not be opened; the browser does not find a plugged in device by itself',
        defaultMessage: 'Could not open the port. Reconnect the device or plug the cable into another USB port, then press «Search again».'
    },
    hint_bluetooth_off: {
        id: 'gui.SearchPanelDeviceComponent.hint_bluetooth_off',
        description: 'Device row hint: Bluetooth adapter of the computer is off',
        defaultMessage: 'Bluetooth on the computer is off. Turn it on and press «Search again».'
    },
    action_update: {
        id: 'gui.SearchPanelDeviceComponent.action_update',
        description: 'Device row button: update the outdated firmware',
        defaultMessage: 'Update'
    },
    action_flash: {
        id: 'gui.SearchPanelDeviceComponent.action_flash',
        description: 'Device row button: flash a device that does not answer',
        defaultMessage: 'Flash'
    },
    action_retry: {
        id: 'gui.SearchPanelDeviceComponent.action_retry',
        description: 'Device row button: repeat the failed flash',
        defaultMessage: 'Try again'
    },
    details_firmware: {
        id: 'gui.SearchPanelDeviceComponent.details_firmware',
        description: 'Device details: firmware label',
        defaultMessage: 'Firmware'
    },
    details_firmware_current: {
        id: 'gui.SearchPanelDeviceComponent.details_firmware_current',
        description: 'Device details: the firmware {version} is the one Robbo Scratch needs',
        defaultMessage: '{version}, current'
    },
    details_firmware_old: {
        id: 'gui.SearchPanelDeviceComponent.details_firmware_old',
        description: 'Device details: firmware {current} on the device, {required} is needed',
        defaultMessage: '{current}, version {required} is needed'
    },
    details_serial: {
        id: 'gui.SearchPanelDeviceComponent.details_serial',
        description: 'Device details: serial number label',
        defaultMessage: 'Serial number'
    },
    details_links: {
        id: 'gui.SearchPanelDeviceComponent.details_links',
        description: 'Device details: label of the list of connections (USB and Bluetooth) of the same device',
        defaultMessage: 'Connection'
    },
    link_blocks: {
        id: 'gui.SearchPanelDeviceComponent.link_blocks',
        description: 'Device connections: the blocks work through this connection (USB port or Bluetooth)',
        defaultMessage: 'blocks'
    },
    link_reserve: {
        id: 'gui.SearchPanelDeviceComponent.link_reserve',
        description: 'Device connections: the other connection of the same device, kept in reserve',
        defaultMessage: 'reserve'
    },
    details_error: {
        id: 'gui.SearchPanelDeviceComponent.details_error',
        description: 'Device details: technical error message label',
        defaultMessage: 'Error'
    },
    row_menu_reflash: {
        id: 'gui.SearchPanelDeviceComponent.row_menu_reflash',
        description: 'Device row menu item: write the same firmware to the device again',
        defaultMessage: 'Flash again'
    },
    row_menu_identify_flash: {
        id: 'gui.SearchPanelDeviceComponent.row_menu_identify_flash',
        description: 'Device row menu item: find out the device by its serial number and write the right firmware',
        defaultMessage: 'Another device? Detect it and flash'
    },
    row_menu_flash_log: {
        id: 'gui.SearchPanelDeviceComponent.row_menu_flash_log',
        description: 'Device row menu item: open the firmware flashing window with its log',
        defaultMessage: 'Flashing log'
    },
    row_menu_no_flash_yet: {
        id: 'gui.SearchPanelDeviceComponent.row_menu_no_flash_yet',
        description: 'Flash window opened from the row menu for a device not flashed in this session',
        defaultMessage: 'This device has not been flashed since Robbo Scratch started'
    },

    device_robot: {
        id: 'gui.FirmwareFlasherDeviceComponent.device_robot',
        description: ' ',
        defaultMessage: 'Robot'
    },
    device_lab: {
        id: 'gui.FirmwareFlasherDeviceComponent.device_lab',
        description: ' ',
        defaultMessage: 'Laboratory'
    },
    device_otto: {
        id: 'gui.FirmwareFlasherDeviceComponent.device_otto',
        description: ' ',
        defaultMessage: 'Dancing robot'
    },
    device_arduino: {
        id: 'gui.FirmwareFlasherDeviceComponent.device_arduino',
        description: ' ',
        defaultMessage: 'Arduino'
    },
    device_quadcopter: {
        id: 'gui.FirmwareFlasherDeviceComponent.device_quadcopter',
        description: ' ',
        defaultMessage: 'Quadcopter'
    },
    quadcopter_searching: {
        id: 'gui.SearchPanel.quadcopter_searching',
        description: 'Shown beside device name; do not repeat the device type (name is in the first column).',
        defaultMessage: 'Searching…'
    },
    quadcopter_connected: {
        id: 'gui.SearchPanel.quadcopter_connected',
        description: 'Shown beside device name; do not repeat the device type (name is in the first column).',
        defaultMessage: 'Connected'
    },
    quadcopter_disconnected: {
        id: 'gui.SearchPanel.quadcopter_disconnected',
        description: 'Shown beside device name; do not repeat the device type (name is in the first column).',
        defaultMessage: 'Not connected'
    },
    quadcopter_copter_not_found: {
        id: 'gui.SearchPanel.quadcopter_copter_not_found',
        description: 'Crazyradio closed or copter powered off during search (deviceClosed).',
        defaultMessage: 'Quadcopter not found. Turn on the copter and try searching again.'
    },
    quadcopter_search_refused_in_flight: {
        id: 'gui.SearchPanel.quadcopter_search_refused_in_flight',
        description: 'Search was requested while the quadcopter is flying; restarting the link would drop it.',
        defaultMessage: 'The quadcopter is flying: search again after it lands.'
    },
    quadcopter_flash_close_blocked: {
        id: 'gui.RobboGui.QuadcopterPalette.flashCloseBlocked',
        description: 'Shown when the user tries to close the app during a quadcopter firmware update',
        defaultMessage: 'Wait until the quadcopter firmware update finishes: if you close the program now, the quadcopter will stop starting'
    },
    quadcopter_low_battery_landing: {
        id: 'gui.SearchPanel.quadcopter_low_battery_landing',
        description: 'Battery became critical in flight; the copter lands by itself.',
        defaultMessage: 'The quadcopter battery is critically low: landing.'
    },
    quadcopter_locked: {
        id: 'gui.SearchPanel.quadcopter_locked',
        description: 'Supervisor locked: the quadcopter ignores commands until restarted.',
        defaultMessage: 'The quadcopter does not respond to commands — restart it'
    },
    quadcopter_landing: {
        id: 'gui.SearchPanel.quadcopter_landing',
        description: 'Shown beside device name; do not repeat the device type (name is in the first column).',
        defaultMessage: 'Landing'
    },
    quadcopter_lost: {
        id: 'gui.SearchPanel.quadcopter_lost',
        description: 'Shown beside device name; do not repeat the device type (name is in the first column).',
        defaultMessage: 'Link lost'
    },
    quadcopter_emergency: {
        id: 'gui.SearchPanel.quadcopter_emergency',
        description: 'Shown beside device name; do not repeat the device type (name is in the first column).',
        defaultMessage: 'Emergency stop'
    },
    quadcopter_firmware_update_warning: {
        id: 'gui.SearchPanel.quadcopter_firmware_update_warning',
        description: 'Shown before flashing quadcopter firmware.',
        defaultMessage: 'Before updating: remove propellers, ensure good battery charge, and do not power off the quadcopter during flashing.'
    },
    quadcopter_firmware_checking: {
        id: 'gui.SearchPanel.quadcopter_firmware_checking',
        description: 'Shown in quadcopter row while reading firmware version.',
        defaultMessage: 'Checking quadcopter firmware version…'
    },
    quadcopter_firmware_versions_line: {
        id: 'gui.SearchPanel.quadcopter_firmware_versions_line',
        description: 'Firmware versions after probe when update is required.',
        defaultMessage: 'Firmware: on board {current}, required {required}'
    },
    quadcopter_connect_failed_firmware_ok: {
        id: 'gui.SearchPanel.quadcopter_connect_failed_firmware_ok',
        description: 'Connect failed but firmware version matches bundled.',
        defaultMessage: 'Could not connect. Firmware {version} matches the required version — check copter power and radio.'
    },
    quadcopter_firmware_version_unknown: {
        id: 'gui.SearchPanel.quadcopter_firmware_version_unknown',
        description: 'Shown when firmware version could not be read.',
        defaultMessage: 'Firmware version could not be read. Required: {required}'
    },
    quadcopter_firmware_flash_started: {
        id: 'gui.SearchPanel.quadcopter_firmware_flash_started',
        description: 'Shown in quadcopter row during flashing.',
        defaultMessage: 'Flashing quadcopter firmware…'
    },
    quadcopter_firmware_flash_done_version: {
        id: 'gui.SearchPanel.quadcopter_firmware_flash_done_version',
        description: 'Quadcopter row after a successful flash: the version now on board',
        defaultMessage: 'Firmware {version} is written.'
    },
    quadcopter_firmware_flash_done: {
        id: 'gui.SearchPanel.quadcopter_firmware_flash_done',
        description: 'Shown in quadcopter row when flashing succeeds.',
        defaultMessage: 'Quadcopter firmware updated.'
    },
    quadcopter_firmware_flash_failed: {
        id: 'gui.SearchPanel.quadcopter_firmware_flash_failed',
        description: 'Shown in quadcopter row when flashing fails.',
        defaultMessage: 'Quadcopter firmware update failed. Try again.'
    },
    cf2_flash_scanning: {
        id: 'gui.SearchPanel.cf2_flash_scanning',
        defaultMessage: 'Scanning for bootloader…'
    },
    cf2_flash_erasing: {
        id: 'gui.SearchPanel.cf2_flash_erasing',
        defaultMessage: 'Erasing flash…'
    },
    cf2_flash_writing: {
        id: 'gui.SearchPanel.cf2_flash_writing',
        defaultMessage: 'Writing firmware…'
    },
    cf2_flash_writing_pct: {
        id: 'gui.SearchPanel.cf2_flash_writing_pct',
        defaultMessage: 'Writing firmware… {pct}%'
    },
    cf2_flash_verifying: {
        id: 'gui.SearchPanel.cf2_flash_verifying',
        defaultMessage: 'Verifying firmware…'
    },
    cf2_flash_resetting: {
        id: 'gui.SearchPanel.cf2_flash_resetting',
        defaultMessage: 'Resetting copter…'
    },
    cf2_flash_complete: {
        id: 'gui.SearchPanel.cf2_flash_complete',
        defaultMessage: 'Firmware update complete'
    },
    cf2_flash_connecting: {
        id: 'gui.SearchPanel.cf2_flash_connecting',
        defaultMessage: 'Connecting…'
    },
    cf2_flash_to_bootloader: {
        id: 'gui.SearchPanel.cf2_flash_to_bootloader',
        description: 'Quadcopter flash status: the quadcopter restarts into its bootloader before writing',
        defaultMessage: 'Restarting the quadcopter into the bootloader…'
    },
    cf2_flash_checking: {
        id: 'gui.SearchPanel.cf2_flash_checking',
        description: 'Quadcopter flash status: firmware written, Robbo Scratch connects to the quadcopter again',
        defaultMessage: 'Connecting to the quadcopter with the new firmware…'
    },
    quadcopter_hint_flashing: {
        id: 'gui.SearchPanel.quadcopter_hint_flashing',
        description: 'Quadcopter row hint while its firmware is written',
        defaultMessage: 'Do not switch the quadcopter off and do not unplug Crazyradio until the firmware is written.'
    },
    quadcopter_hint_power_cycle: {
        id: 'gui.SearchPanel.quadcopter_hint_power_cycle',
        description: 'Quadcopter row hint during a firmware recovery: the bootloader starts only on power-up',
        defaultMessage: 'Switch the quadcopter off and on now.'
    },
    quadcopter_flash_interrupted: {
        id: 'gui.SearchPanel.quadcopter_flash_interrupted',
        description: 'Quadcopter row hint: a firmware update did not finish, the quadcopter waits in its bootloader',
        defaultMessage: 'The firmware update was interrupted and the quadcopter waits in its bootloader. ' +
            'Press «{action}», then switch the quadcopter off and on.'
    },
    open_palette: {
        id: 'gui.SearchPanelDeviceComponent.open_palette',
        description: 'Device row button that opens the palette of this device',
        defaultMessage: 'Open the palette'
    },
    open_palette_unavailable: {
        id: 'gui.SearchPanelDeviceComponent.open_palette_unavailable',
        description: 'Device row palette button while the device is not connected (or is being flashed)',
        defaultMessage: 'The palette opens once the device is connected'
    },
    details_radio: {
        id: 'gui.SearchPanelDeviceComponent.details_radio',
        description: 'Quadcopter row details: label of the radio group and channel',
        defaultMessage: 'Radio'
    },
    details_radio_value: {
        id: 'gui.SearchPanelDeviceComponent.details_radio_value',
        description: 'Quadcopter row details: radio group and channel of this computer',
        defaultMessage: 'group {group}, channel {channel}'
    },
    firmware_not_available_mobile: {
        id: 'gui.SearchPanel.firmware_not_available_mobile',
        description: ' ',
        defaultMessage: 'Firmware update is unavailable in the Android app. Use the desktop version of Robbo Scratch for flashing.'
    },

    bluetooth_linux_hint: {

        id: 'gui.SearchPanel.bluetooth_linux_hint',
        description: ' ',
        defaultMessage: 'Due to Linux specifics, Robbo Scratch must be run with root privileges.'
    },
    otto_flash_retry_arduino_log: {
        id: 'gui.SearchPanel.otto_flash_retry_arduino_log',
        description: ' ',
        defaultMessage: 'Version unchanged. Flashing as Arduino…'
    },
    device_cannot_open_old_bluetooth_com: {


        id: 'gui.SearchPanel.device_cannot_open_old_bluetooth_com',
        description: ' ',
        defaultMessage: `Unable to open Bluetooth port.
This port may be left over from a previous Bluetooth connection.
Please remove old devices from the Bluetooth devices list.`

    },
    bluetooth_error_274C: {
        id: 'gui.SearchPanel.bluetooth_error_274C',
        description: ' ',
        defaultMessage: 'Failed to establish connection. Device may be unavailable, already connected to another device, or there may be a network issue. (0x274C)'
    },
    bluetooth_error_274D: {
        id: 'gui.SearchPanel.bluetooth_error_274D',
        description: ' ',
        defaultMessage: 'Connection rejected by device. (0x274D)'
    },
    bluetooth_error_2711: {
        id: 'gui.SearchPanel.bluetooth_error_2711',
        description: ' ',
        defaultMessage: 'Device not found or unavailable. (0x2711)'
    },
    bluetooth_error_2740: {
        id: 'gui.SearchPanel.bluetooth_error_2740',
        description: ' ',
        defaultMessage: 'Device is already connected to another device. Try disconnecting and connecting again. (0x2740)'
    },
    bluetooth_error_connection: {
        id: 'gui.SearchPanel.bluetooth_error_connection',
        description: ' ',
        defaultMessage: 'Failed to connect to Bluetooth device. Make sure the device is on and available for connection.'
    },
    bluetooth_error_already_connected: {
        id: 'gui.SearchPanel.bluetooth_error_already_connected',
        description: ' ',
        defaultMessage: 'Device is already connected. Try disconnecting and connecting again.'
    }


});

const FLASH_FLOW_DEBUG = false;
const FLASH_FLOW_KEEP_STATUSES = {
    session_start: true,
    start_flash: true,
    start_arduino_retry: true,
    manual_retry_start: true,
    session_finish: true
};
const AUTO_RETRY_START_DELAY_MS = 800;
// Palette window of each device_id (SensorPallete: robot 1, laboratory 2, Otto 5, Arduino 6; quadcopter 0).
const PALETTE_WINDOW_BY_DEVICE_ID = {0: 1, 1: 2, 2: 2, 3: 1, 4: 2, 5: 5, 6: 6};
const COPTER_PALETTE_WINDOW_ID = 0;
// A Bluetooth device that has not answered yet: its name tells the kind (see _rowIcon)
const PALETTE_WINDOW_BY_ROW_ICON = {robot: 1, lab: 2, otto: 5};
// A palette opened from the Devices panel stands next to it (the size is known only after it is shown;
// DraggableWindowComponent moves it back on screen).
const PALETTE_GAP_PX = 12;
const PALETTE_ESTIMATED_WIDTH_PX = 340;

/**
 * Right of the Devices panel, or left of it when there is no room; null keeps the palette where it was.
 * @returns {?{top: number, left: number}} position
 */
const paletteSpotNearPanel = () => {
    const panel = document.getElementById('SearchPanelComponent');
    if (!panel || panel.getAttribute('aria-hidden') === 'true') return null;
    const r = panel.getBoundingClientRect();
    if (!r.width) return null;
    let left = r.right + PALETTE_GAP_PX;
    if (left + PALETTE_ESTIMATED_WIDTH_PX > window.innerWidth - 8) {
        left = r.left - PALETTE_GAP_PX - PALETTE_ESTIMATED_WIDTH_PX;
    }
    if (left < 8) return null;
    return {top: Math.round(r.top), left: Math.round(left)};
};

// How long «Done» stays in the row after flashing.
const FLASH_DONE_HOLD_MS = 5000;
// The last flash of every port in this session, drawn inside the device row:
// {active, done, failed, connected, lines, status, step, phase, percent, deviceId, holdUntil}.
// Module-level: the search after flashing recreates the rows, and the new row keeps showing «Done».
const lastFlashByPort = new Map();
// fired when a «Done» hold ends: rows redraw, the panel may close as usual
const FLASH_HOLD_END_EVENT = 'rs3-flash-hold-end';

const isFlashShownInRow = record => !!record && (record.active || (record.holdUntil > Date.now()));
const notifyFlashingChanged = () => notifyFirmwareFlashing(
    Array.from(lastFlashByPort.values()).some(record => record.active)
);

/**
 * applyFlashStatus() writes the phase text and track step into DOM; the row is React, so it runs on a detached
 * element and the row reads the result.
 * @returns {{root: HTMLElement, el: HTMLElement}} detached flash window root and its status element
 */
const createFlashProbe = () => {
    const root = document.createElement('div');
    root.setAttribute('data-flash-window', '');
    const el = document.createElement('div');
    root.appendChild(el);
    return {root, el};
};

class SearchPanelDeviceComponent extends Component {


    constructor() {
        super();

        this.state = {
            devices: [],
            deviceState: 0,
            identifyAttempt: 0,
            // {current, required} while the device firmware is not the one Robbo Scratch needs
            firmwareDiffers: null,
            // flashing as seen in the row: {active, percent, text} or {failed, text}
            flashUi: null,
            detailsOpen: false,
            // «Flashing log» in the details: the last flash of this port drawn in the row
            logOpen: false,
            // the raw flasher lines of the row flash block are shown
            flashLogExpanded: false,
            deviceId: -1,
            deviceError: null,
            quadcopterConnected: false,
            quadcopterSearching: false,
            quadcopterState: 'disconnected',
            quadcopterLastError: null,
            quadcopterFlashStatus: null,
            // probe info {current, required, …} while the quadcopter needs a firmware update
            quadcopterFirmwareUpdate: null,
            quadcopterRowPhase: 'idle'
        };

        this.deviceId = -1;

        this.firmware_version_differs = false;
        this.flashSessionActive = false;
        this.flashSessionId = 0;
        this._activeFlashSessionId = null;
        this.flashStage = 'idle';

        this.isRasberry = false;

        this._quadcopterFirmwareVersionChecked = false;
        this._quadcopterFirmwareProbeInFlight = false;
        this._quadcopterFirmwarePrompted = false;
        this._quadcopterFirmwareFlashActive = false;
        this._quadcopterFirmwareUpdateDeclined = false;
        this._quadcopterSearchReachedTocReady = false;
        this._quadcopterSearchReachedLinkReady = false;
        this._quadcopterSearchSawRadioAck = false;
        this._debugMounted = false;

    }

    _noteQuadcopterSearchProgress(snapshot) {
        const cs = snapshot && snapshot.connectionState;
        if (cs === 'linkReady' || cs === 'tocReady' || cs === 'telemetryActive') {
            this._quadcopterSearchReachedLinkReady = true;
        }
        if (cs === 'tocReady' || cs === 'telemetryActive') {
            this._quadcopterSearchReachedTocReady = true;
        }
        if (snapshot && snapshot.copterRadioRespondedDuringSearch === true) {
            this._quadcopterSearchSawRadioAck = true;
        }
    }

    _copterLikelyPoweredDuringSearch(snapshot) {
        if (this._quadcopterSearchReachedTocReady) {
            return true;
        }
        if (this._quadcopterSearchSawRadioAck) {
            return true;
        }
        return !!(snapshot && snapshot.copterRadioRespondedDuringSearch === true);
    }

    _quadcopterSearchErrorText(snapshot) {
        const err = snapshot && snapshot.lastError;
        if (!err) return '';
        const tech = err.details && err.details.technical ? String(err.details.technical) : '';
        return `${err.code || ''}:${err.message || ''}:${tech}`;
    }

    /**
     * cf2tool probe only when the copter answered on radio but session connect failed.
     * Opening the Crazyradio dongle alone (copter powered off) must not start firmware check.
     */
    _shouldProbeFirmwareAfterFailedSearch(snapshot) {
        if (!this._copterLikelyPoweredDuringSearch(snapshot)) {
            return false;
        }

        const cs = snapshot && snapshot.connectionState;
        if (this._quadcopterSearchReachedTocReady || cs === 'tocReady' || cs === 'telemetryActive') {
            return true;
        }

        const err = snapshot && snapshot.lastError;
        const code = err && err.code ? String(err.code) : '';
        if (code === 'dongleNotFound') {
            return false;
        }
        if (code === 'copterRadioUnresponsive') {
            return true;
        }

        const blob = this._quadcopterSearchErrorText(snapshot);
        if (/control response did not arrive|TOC fetch timeout|missing in TOC|TOC item/i.test(blob)) {
            return true;
        }
        if (code === 'searchOperationTimeout' && this._quadcopterSearchReachedLinkReady) {
            return true;
        }
        return code === 'searchFailed' &&
            /TOC|control response|log reset|log block|missing in TOC/i.test(blob);
    }

    _isStrongQuadcopterFirmwareProbeHint(snapshot) {
        if (this._quadcopterSearchReachedTocReady) {
            return true;
        }
        const err = snapshot && snapshot.lastError;
        if (err && String(err.code) === 'copterRadioUnresponsive') {
            return true;
        }
        return this._copterLikelyPoweredDuringSearch(snapshot);
    }

    _getQuadcopterFirmwareProbeTimeoutMs(snapshot) {
        const qca = this.props.QCA;
        const strong = this._isStrongQuadcopterFirmwareProbeHint(snapshot);
        if (qca && typeof qca.getFirmwareProbeAfterFailedConnectTimeoutMs === 'function') {
            return qca.getFirmwareProbeAfterFailedConnectTimeoutMs(strong);
        }
        return strong ? 45000 : 12000;
    }

    _skipQuadcopterFirmwareProbeAfterSearch(snapshot) {
        this._quadcopterFirmwareVersionChecked = true;
        this._quadcopterFirmwareProbeInFlight = false;
        if (this._debugMounted !== true) {
            return;
        }
        this.setState({
            quadcopterFlashStatus: null,
            quadcopterRowPhase: 'idle',
            quadcopterLastError: snapshot && snapshot.lastError != null
                ? snapshot.lastError
                : this.state.quadcopterLastError
        });
    }

    _isQuadcopterFirmwareProbeUiActive() {
        return this._quadcopterFirmwareProbeInFlight === true &&
            this._quadcopterFirmwareVersionChecked !== true;
    }

    _isQuadcopterFirmwareCheckUiActive() {
        if (this._quadcopterFirmwareUpdateDeclined) {
            return false;
        }
        if (this._isQuadcopterFirmwareProbeUiActive()) {
            return true;
        }
        return this.props.QCA &&
            typeof this.props.QCA.isQuadcopterPreflightActive === 'function' &&
            this.props.QCA.isQuadcopterPreflightActive() === true &&
            this._quadcopterFirmwareVersionChecked !== true;
    }

    _quadcopterFirmwareMismatchStatusText(info) {
        if (!info || !info.required) {
            return this._quadcopterConnectFailureStatusText(info);
        }
        const currentUi = this._getQuadcopterCurrentVersionForUi(info);
        if (currentUi) {
            return this.props.intl.formatMessage(messages.quadcopter_firmware_versions_line, {
                current: currentUi,
                required: info.required
            });
        }
        return this.props.intl.formatMessage(messages.quadcopter_firmware_version_unknown, {
            required: info.required
        });
    }


    _isQuadcopterSearchUiActive(effectiveSearching, quadcopterRowPhase) {
        return effectiveSearching === true || quadcopterRowPhase === 'searching';
    }


    _getQuadcopterCurrentVersionForUi(infoOrVersion) {
        if (infoOrVersion && typeof infoOrVersion === 'object') {
            return resolveCf2FirmwareVersionLabel(
                infoOrVersion.current || infoOrVersion.rawRevision || infoOrVersion.revision,
                infoOrVersion.revisionHex,
                infoOrVersion.required,
                infoOrVersion.expectedRevisionHex
            );
        }
        return resolveCf2FirmwareVersionLabel(infoOrVersion, null);
    }

    _translateCf2FlashHeadline(headline) {
        if (!headline) return null;
        const pct = headline.match(/^Writing firmware… (\d{1,3})%$/);
        if (pct) {
            return this.props.intl.formatMessage(messages.cf2_flash_writing_pct, { pct: pct[1] });
        }
        const map = {
            'Scanning for bootloader…': messages.cf2_flash_scanning,
            'Erasing flash…': messages.cf2_flash_erasing,
            'Writing firmware…': messages.cf2_flash_writing,
            'Verifying firmware…': messages.cf2_flash_verifying,
            'Resetting copter…': messages.cf2_flash_resetting,
            'Firmware update complete': messages.cf2_flash_complete,
            'Connecting…': messages.cf2_flash_connecting,
            'Restarting into the bootloader…': messages.cf2_flash_to_bootloader,
            'Checking connection…': messages.cf2_flash_checking
        };
        if (map[headline]) {
            return this.props.intl.formatMessage(map[headline]);
        }
        return headline;
    }


    _shouldShowQuadcopterFlashStatusHint() {
        if (!this.state.quadcopterFlashStatus) {
            return false;
        }
        const errMsg = this.state.quadcopterLastError && this.state.quadcopterLastError.message
            ? String(this.state.quadcopterLastError.message)
            : '';
        if (errMsg && String(this.state.quadcopterFlashStatus) === errMsg) {
            return false;
        }
        const phase = this.state.quadcopterRowPhase;
        if (phase === 'checking' || phase === 'connecting' || phase === 'searching' || phase === 'flashing') {
            return false;
        }
        if (this._isQuadcopterFirmwareCheckUiActive()) {
            return false;
        }
        return true;
    }


    _isQuadcopterConnectErrorHintSuppressed() {
        return this._isQuadcopterFirmwareCheckUiActive() ||
            this._quadcopterFirmwareFlashActive === true ||
            this.state.quadcopterRowPhase === 'flashing';
    }

    _logFlashFlow(source, status, extra = {}) {
        if (!FLASH_FLOW_DEBUG && !FLASH_FLOW_KEEP_STATUSES[status]) return;
        const sessionId = this._activeFlashSessionId != null ? this._activeFlashSessionId : '-';
        const base = {
            ts: new Date().toISOString(),
            sessionId,
            port: this.props && this.props.devicePort ? this.props.devicePort : '-',
            deviceId: this.deviceId,
            stage: this.flashStage,
            source,
            status
        };
        const payload = Object.assign({}, base, extra || {});
        console.warn('[FLASH_FLOW] ' + JSON.stringify(payload));
    }

    _startFlashSession(initialStage, mode) {
        this.flashSessionId += 1;
        this._activeFlashSessionId = this.flashSessionId;
        this.flashSessionActive = true;
        this.flashStage = initialStage || 'single';
        this._logFlashFlow('flashDevice', 'session_start', { mode });
        return this._activeFlashSessionId;
    }

    _finishFlashSession(result) {
        this._logFlashFlow('statusCallback', 'session_finish', { result });
        this.flashSessionActive = false;
        this.flashStage = 'done';
        this._activeFlashSessionId = null;
    }

    getDeviceName(deviceId) {
        switch (deviceId) {
            case 0: case 3: return this.props.intl.formatMessage(messages.device_robot);
            case 1: case 2: case 4: return this.props.intl.formatMessage(messages.device_lab);
            case 5: return this.props.intl.formatMessage(messages.device_otto);
            case 6: return this.props.intl.formatMessage(messages.device_arduino);
            default: return this.props.intl.formatMessage(messages.row_title_unknown);
        }
    }

    /** Жирная колонка в панели поиска: на Desktop — имя устройства (когда готово) + порт; в Web — тип устройства. */
    getSearchPanelRowTitle() {
        if (this.props.isQuadcopter) {
            const title = this.props.intl.formatMessage(messages.device_quadcopter);
            const qca = this.props.QCA;
            const connected = qca && typeof qca.getCopters === 'function' ?
                qca.getCopters().filter(c => c.connected).length :
                0;
            // Several copters: the row stays for search / firmware of the primary one; details are in the copter palette.
            return connected > 1 ? `${title}: ${connected}` : title;
        }
        const port = this.props.devicePort || '';
        if (port.indexOf('webserial:') === 0) {
            return this.getDeviceName(this.state.deviceId);
        }
        if (this.state.deviceState === 6 && this.state.deviceId !== -1) {
            return `${this.getDeviceName(this.state.deviceId)} (${port})`;
        }
        return port;
    }

    /**
     * Grammatical gender of the device name for «connected» (ru: Робот подключён, Лаборатория подключена,
     * Ардуино подключено).
     * @param {number} deviceId device_id
     * @returns {'m'|'f'|'n'} gender
     */
    _deviceGender(deviceId) {
        if (deviceId === 1 || deviceId === 2 || deviceId === 4) return 'f';
        if (deviceId === 6 || deviceId === 7) return 'n';
        return 'm';
    }

    /** Short port name for the row (ttyUSB0, COM3); Bluetooth rows say «Bluetooth». */
    _shortPortName() {
        const port = this.props.devicePort || '';
        if (this.props.isBluetooth || port.indexOf('bluetooth_') === 0) return 'Bluetooth';
        if (port.indexOf('webserial:') === 0) return 'USB';
        return port.replace(/^\/dev\//, '');
    }

    /**
     * Links of the device row (USB port, Bluetooth), the row's own link first; a device connected twice has both.
     * Active is the link of a connected device the blocks use. Empty for the copter (it talks over Crazyradio).
     */
    _links() {
        if (this.props.isQuadcopter) return [];
        const connected = this.state.deviceState === 6;
        const also = connected && Array.isArray(this.props.alsoPorts) ? this.props.alsoPorts : [];
        const links = [{port: this.props.devicePort, isBluetooth: Boolean(this.props.isBluetooth)}].concat(also);
        let activePort = null;
        if (also.length) {
            const blocksPort = blocksPortOf(this.state.deviceId, this.props);
            activePort = links.some(link => link.port === blocksPort) ? blocksPort : null;
        } else if (connected) {
            activePort = this.props.devicePort;
        }
        return links.map(link => {
            const port = link.port || '';
            const name = port.indexOf('bluetooth_') === 0 ? port.slice('bluetooth_'.length) : '';
            return {
                port,
                isBluetooth: link.isBluetooth || port.indexOf('bluetooth_') === 0,
                short: link.isBluetooth || name ? (name || 'Bluetooth') : this._usbLabel(port),
                full: link.isBluetooth || name ? (name ? `Bluetooth (${name})` : 'Bluetooth') : port.replace(/^webserial:.*/, 'USB'),
                name,
                active: port === activePort
            };
        });
    }

    /** Short USB port for a chip: ttyUSB0, COM3; a Web Serial port is just USB. */
    _usbLabel(port) {
        if ((port || '').indexOf('webserial:') === 0) return 'USB';
        return (port || '').replace(/^\/dev\//, '');
    }

    /** USB plug or Bluetooth rune for a link. */
    _linkIcon(isBluetooth) {
        return (
            <svg className={styles.link_icon} viewBox="0 0 16 16" aria-hidden="true">
                {isBluetooth ?
                    <path d="M4.5 5l7 6-3.5 3V2l3.5 3-7 6" /> :
                    <path d="M6 1.5v3M10 1.5v3M4.5 4.5h7V8a3.5 3.5 0 0 1-7 0zM8 11.5v3" />}
            </svg>
        );
    }

    /** One line of the connection list in the details: icon, link, what it is for (when the blocks' link is known). */
    _linkLine(link, roleKnown) {
        const intl = this.props.intl;
        return (
            <span key={link.port} className={classNames(styles.link_line, link.active && styles.link_line_active)}>
                {this._linkIcon(link.isBluetooth)}
                <span>{link.full}</span>
                {roleKnown ?
                    <span className={styles.link_role}>
                        {intl.formatMessage(link.active ? messages.link_blocks : messages.link_reserve)}
                    </span> : null}
            </span>
        );
    }

    /** Device icon of the row: the same pictures as the device buttons in the menu bar. */
    _rowIcon() {
        if (this.props.isQuadcopter) return 'quadcopter';
        const flashUi = this.state.flashUi;
        const flashId = flashUi && flashUi.deviceId !== null && flashUi.deviceId !== undefined ? flashUi.deviceId : null;
        const id = flashId !== null ? flashId : (this.state.deviceState === 6 || flashUi ? this.state.deviceId : -1);
        if (id === 0 || id === 3) return 'robot';
        if (id === 1 || id === 2 || id === 4) return 'lab';
        if (id === 5) return 'otto';
        if (id === 6 || id === 7) return 'arduino';
        return this._bluetoothKind() || 'unknown';
    }

    /** Not answered yet: a Bluetooth name tells the kind (ROBBO-R-…, ROB-R-…, ROBBO-L-…, OTTO…), else null. */
    _bluetoothKind() {
        const btName = this.props.isBluetooth ? (this.props.devicePort || '').replace(/^bluetooth_/, '') : '';
        if (/^ROBB?O?-R-/i.test(btName) || /^ROB-R-/i.test(btName)) return 'robot';
        if (/^ROBBO-L-/i.test(btName)) return 'lab';
        if (/OTTO|Dancing/i.test(btName)) return 'otto';
        return null;
    }

    /** Title of a device that has not told what it is: the kind from its Bluetooth name, else «Unknown device». */
    _unknownTitle() {
        const kindId = {robot: 0, lab: 1, otto: 5}[this._bluetoothKind()];
        return kindId === undefined ? this.props.intl.formatMessage(messages.row_title_unknown) : this.getDeviceName(kindId);
    }

    /** Human text for a port / connection error (state 7); the raw message goes to the details. */
    _rowErrorHint(error) {
        const msg = (error && error.msg) || '';
        if (/not-powered|NotReady|adapter/i.test(msg)) return this.props.intl.formatMessage(messages.hint_bluetooth_off);
        if (this.props.devicePort.indexOf('rfcom') !== -1 && msg.indexOf('cannot open /dev/rfcom') !== -1) {
            return this.props.intl.formatMessage(messages.bluetooth_linux_hint);
        }
        const byCode = {
            '274C': messages.bluetooth_error_274C,
            '274D': messages.bluetooth_error_274D,
            '2711': messages.bluetooth_error_2711,
            '2740': messages.bluetooth_error_2740,
            CONNECTION_ERROR: messages.bluetooth_error_connection,
            ALREADY_CONNECTED: messages.bluetooth_error_already_connected
        };
        if (error && error.errorCode && byCode[error.errorCode]) return this.props.intl.formatMessage(byCode[error.errorCode]);
        // a cable and a USB port say nothing to a Bluetooth robot
        if (this.props.isBluetooth) return this.props.intl.formatMessage(messages.hint_bluetooth_no_answer);
        // desktop opens a plugged in cable by itself, the browser waits for a search
        return this.props.intl.formatMessage(isDesktopWithBluetooth() ? messages.hint_port_error : messages.hint_port_error_web);
    }

    /**
     * Everything the row shows, from the device state: tone (ok · action needed · waiting · error · unknown),
     * title, line under it, status pill, hint with at most one action, progress.
     */
    getRowView() {
        const intl = this.props.intl;
        const port = this._shortPortName();
        const view = {tone: 'wait', title: '', subtitle: port, pill: '', hint: '', action: null};
        if (this.props.isQuadcopter) {
            const {iconSrc, statusText} = this.getStatusDisplay();
            view.title = this.getSearchPanelRowTitle();
            view.subtitle = 'Crazyradio';
            view.pill = statusText;
            view.tone = /green/.test(iconSrc) ? 'ok' : /red/.test(iconSrc) ? 'err' : 'wait';
            const qca = this.props.QCA;
            const currentGroup = qca && typeof qca.getRadioGroup === 'function' ? qca.getRadioGroup() : null;
            const other = this.state.quadcopterOtherGroups && this.state.quadcopterOtherGroups[0];
            const record = lastFlashByPort.get(this.props.devicePort);
            const recovery = qca && typeof qca.isFirmwareRecoveryNeeded === 'function' &&
                qca.isFirmwareRecoveryNeeded() === true;
            const update = this.state.quadcopterFirmwareUpdate;
            if (record && record.active) {
                view.tone = 'wait';
                view.pill = record.percent === null ?
                    intl.formatMessage(messages.pill_flashing) :
                    intl.formatMessage(messages.pill_flashing_percent, {percent: record.percent});
                view.hint = intl.formatMessage(record.cold ? messages.quadcopter_hint_power_cycle :
                    messages.quadcopter_hint_flashing);
            } else if (this.state.quadcopterRowPhase === 'flashFailed' || recovery) {
                const label = intl.formatMessage(recovery ? messages.action_update : messages.action_retry);
                view.tone = this.state.quadcopterRowPhase === 'flashFailed' ? 'err' : 'act';
                if (this.state.quadcopterRowPhase === 'flashFailed') {
                    view.pill = intl.formatMessage(messages.pill_flash_failed);
                }
                view.hint = recovery ?
                    intl.formatMessage(messages.quadcopter_flash_interrupted, {action: label}) :
                    intl.formatMessage(messages.quadcopter_firmware_flash_failed);
                view.action = {label, run: () => this.flashQuadcopterFirmware({cold: recovery})};
            } else if (record && record.done && isFlashShownInRow(record) && view.tone !== 'ok') {
                view.tone = 'ok';
                view.pill = intl.formatMessage(messages.pill_flash_done);
            } else if (update && view.tone !== 'ok') {
                view.tone = 'act';
                view.hint = [
                    this._quadcopterFirmwareMismatchStatusText(update),
                    intl.formatMessage(messages.quadcopter_firmware_update_warning)
                ];
                view.action = {
                    label: intl.formatMessage(messages.action_update),
                    run: () => this.flashQuadcopterFirmware()
                };
            } else if (other) {
                view.hint = intl.formatMessage(messages.quadcopter_found_in_group, {
                    count: other.ids.length,
                    numbers: other.ids.join(', '),
                    group: other.group,
                    current: currentGroup
                });
                view.action = {
                    label: intl.formatMessage(messages.quadcopter_switch_group, {group: other.group}),
                    run: () => this._switchQuadcopterGroup(other.group)
                };
                view.tone = 'act';
            } else if (this.state.quadcopterGroupScanning) {
                view.hint = intl.formatMessage(messages.quadcopter_group_scanning, {group: currentGroup});
                view.tone = 'wait';
            }
            return view;
        }
        const {deviceState, deviceId, deviceError, firmwareDiffers, flashUi, identifyAttempt} = this.state;
        const shownId = flashUi && flashUi.deviceId !== null && flashUi.deviceId !== undefined ? flashUi.deviceId : deviceId;
        const known = shownId !== -1 && shownId !== undefined && shownId !== null;
        const name = known ? this.getDeviceName(shownId) : '';
        view.title = name || this._unknownTitle();

        if (flashUi && flashUi.active) {
            view.tone = 'wait';
            view.pill = flashUi.percent === null ?
                intl.formatMessage(messages.pill_flashing) :
                intl.formatMessage(messages.pill_flashing_percent, {percent: flashUi.percent});
            return view;
        }
        if (flashUi && flashUi.failed) {
            view.tone = 'err';
            view.pill = intl.formatMessage(messages.pill_flash_failed);
            view.hint = this.props.disableFirmwareUi ? flashUi.text : intl.formatMessage(messages.hint_flash_failed);
            if (this._firmwareActionsAllowed()) {
                view.action = {label: intl.formatMessage(messages.action_retry), run: () => this.retryFlash()};
            }
            return view;
        }
        const record = lastFlashByPort.get(this.props.devicePort);
        if (record && record.done && isFlashShownInRow(record)) {
            view.tone = 'ok';
            view.pill = record.connected ?
                intl.formatMessage(messages.pill_connected, {gender: this._deviceGender(record.deviceId)}) :
                intl.formatMessage(messages.pill_flash_done);
            if (record.deviceId !== null && record.deviceId !== undefined) view.title = this.getDeviceName(record.deviceId);
            return view;
        }
        if (this._isUnplugged()) {
            view.tone = 'unknown';
            view.pill = intl.formatMessage(messages.pill_disconnected, {gender: this._deviceGender(shownId)});
            view.hint = intl.formatMessage(messages.hint_disconnected);
            return view;
        }
        if (deviceState === 6) {
            if (firmwareDiffers && this._firmwareActionsAllowed()) {
                view.tone = 'act';
                view.pill = intl.formatMessage(messages.pill_needs_update);
                view.hint = intl.formatMessage(messages.hint_needs_update, firmwareDiffers);
                view.action = {
                    label: intl.formatMessage(messages.action_update),
                    run: () => this.flashDevice(deviceId === 5 ? 'auto' : undefined)
                };
                return view;
            }
            view.tone = 'ok';
            view.pill = intl.formatMessage(messages.pill_connected, {gender: this._deviceGender(deviceId)});
            return view;
        }
        if (deviceState === 7) {
            view.tone = 'err';
            view.pill = intl.formatMessage(messages.pill_no_link);
            view.hint = this._rowErrorHint(deviceError);
            return view;
        }
        if (deviceState === 9 || (deviceState === 8 && deviceError && deviceError.code === 1)) {
            view.pill = intl.formatMessage(messages.pill_reconnecting);
            return view;
        }
        if (deviceState === 8) {
            view.tone = 'unknown';
            view.title = this._unknownTitle();
            view.pill = intl.formatMessage(messages.pill_no_answer);
            if (this.props.isBluetooth) {
                view.hint = intl.formatMessage(messages.device_cannot_open_old_bluetooth_com);
            } else if (this._firmwareActionsAllowed()) {
                view.hint = intl.formatMessage(messages.hint_no_answer);
                view.action = {label: intl.formatMessage(messages.action_flash), run: () => this.flashDevice()};
            }
            return view;
        }
        if (deviceState === 10) {
            view.pill = intl.formatMessage(messages.pill_flashing);
            return view;
        }
        view.pill = intl.formatMessage(messages.pill_detecting);
        if (identifyAttempt > 1) view.attempt = intl.formatMessage(messages.row_attempt, {attempt: identifyAttempt});
        return view;
    }

    /**
     * Flashing inside the row: the track of steps, the status line, write progress and the raw flasher lines.
     * Shown while flashing, for a while after «Done», after a failure, and by «Flashing log» in the details.
     * @returns {?React.ReactElement} the block or null
     */
    _renderFlashBlock() {
        const intl = this.props.intl;
        const record = lastFlashByPort.get(this.props.devicePort);
        // the failure belongs to this row (a new search recreates rows and they start clean)
        const failed = !!(record && record.failed && (this.props.isQuadcopter ?
            this.state.quadcopterRowPhase === 'flashFailed' :
            this.state.flashUi && this.state.flashUi.failed));
        const shown = (record && (isFlashShownInRow(record) || failed)) || this.state.logOpen;
        if (!shown) return null;
        if (!record) {
            return (
                <div className={classNames(styles.flash, styles.flash_empty)}>
                    <p className={styles.flash_status}>{intl.formatMessage(messages.row_menu_no_flash_yet)}</p>
                </div>
            );
        }
        const step = record.done ? '5' : record.step;
        const phase = record.failed ? 'error' : record.done ? 'done' : record.phase;
        const steps = this.props.isQuadcopter ? COPTER_FLASH_STEP_MESSAGES : FLASH_STEP_MESSAGES;
        const status = this.props.isQuadcopter ? this._copterFlashStatusText(record) : record.status;
        return (
            <div
                className={classNames(
                    styles.flash,
                    record.done && styles.flash_done,
                    record.failed && styles.flash_failed
                )}
                data-flash-step={step || undefined}
                data-flash-phase={phase || undefined}
            >
                <ol className={styles.flash_steps} aria-hidden="true">
                    {steps.map(message => (
                        <li key={message.id} className={styles.flash_step}>
                            <span className={styles.flash_step_dot} />
                            <span className={styles.flash_step_label}>{intl.formatMessage(message)}</span>
                        </li>
                    ))}
                </ol>
                <p className={styles.flash_status} role="status" aria-live="polite">
                    {status || intl.formatMessage(messages.hint_flashing)}
                </p>
                {record.active && record.percent !== null ? (
                    <span className={styles.flash_bar}>
                        <b style={{width: `${record.percent}%`}} />
                    </span>
                ) : null}
                {record.lines.length ? (
                    <details
                        className={styles.flash_log}
                        open={this.state.flashLogExpanded}
                        onToggle={event => {
                            const open = event.currentTarget.open;
                            if (open !== this.state.flashLogExpanded) this.setState({flashLogExpanded: open});
                        }}
                    >
                        <summary>{intl.formatMessage(messages.flash_log)}</summary>
                        <div className={styles.flash_log_lines}>
                            {record.lines.map((line, index) => <div key={index}>{line}</div>)}
                        </div>
                    </details>
                ) : null}
            </div>
        );
    }

    /** Details under an expanded row: port, firmware, serial number, the raw error. */
    _rowDetails() {
        if (this.props.isQuadcopter) return this._copterRowDetails();
        const all = this.props.DCA && typeof this.props.DCA.getDevices === 'function' ? this.props.DCA.getDevices() : [];
        const device = all.find(d => d && d.getPortName && d.getPortName() === this.props.devicePort);
        const safe = fn => {
            try {
                return fn();
            } catch (e) {
                return null;
            }
        };
        const firmware = device ? safe(() => device.getFirmwareVersion()) : null;
        const serial = device ? safe(() => device.getSerialNumber()) : null;
        const {firmwareDiffers, deviceState, deviceError} = this.state;
        const links = this._links();
        // the role (blocks · reserve) matters only when the device is connected twice
        const roleKnown = links.length > 1 && links.some(link => link.active);
        const rows = [[this.props.intl.formatMessage(messages.details_links),
            <span className={styles.link_list}>{links.map(link => this._linkLine(link, roleKnown))}</span>]];
        if (deviceState === 6 && firmware !== null && firmware !== undefined && !Number.isNaN(Number(firmware))) {
            rows.push([this.props.intl.formatMessage(messages.details_firmware), firmwareDiffers ?
                this.props.intl.formatMessage(messages.details_firmware_old, firmwareDiffers) :
                this.props.intl.formatMessage(messages.details_firmware_current, {version: firmware})]);
        }
        if (deviceState === 6 && serial) rows.push([this.props.intl.formatMessage(messages.details_serial), serial]);
        if (deviceError && deviceError.msg) rows.push([this.props.intl.formatMessage(messages.details_error), deviceError.msg]);
        return rows;
    }

    /** Details under the expanded quadcopter row: radio group and channel, firmware, the raw error. */
    _copterRowDetails() {
        const intl = this.props.intl;
        const qca = this.props.QCA;
        const rows = [];
        const group = qca && typeof qca.getRadioGroup === 'function' ? qca.getRadioGroup() : null;
        const channels = qca && typeof qca.getRadioGroupChannels === 'function' ? qca.getRadioGroupChannels() : [];
        if (group) {
            rows.push([intl.formatMessage(messages.details_radio),
                intl.formatMessage(messages.details_radio_value, {group, channel: channels[group - 1]})]);
        }
        const probe = qca && typeof qca.getLastFirmwareProbe === 'function' ? qca.getLastFirmwareProbe() : null;
        const current = probe ? this._getQuadcopterCurrentVersionForUi(probe) : null;
        if (current) {
            rows.push([intl.formatMessage(messages.details_firmware), probe.needsUpdate && probe.required ?
                intl.formatMessage(messages.details_firmware_old, {current, required: probe.required}) :
                intl.formatMessage(messages.details_firmware_current, {version: current})]);
        }
        const error = this.state.quadcopterLastError;
        if (error && error.message) rows.push([intl.formatMessage(messages.details_error), String(error.message)]);
        return rows;
    }

    getStatusDisplay() {
        if (this.props.isQuadcopter && this.props.QCA) {
            const { quadcopterConnected, quadcopterSearching, quadcopterState, quadcopterRowPhase } = this.state;
            const connectedByQca = typeof this.props.QCA.isQuadcopterConnected === 'function'
                ? this.props.QCA.isQuadcopterConnected() === true
                : false;
            const searchingByQca = typeof this.props.QCA.isQuadcopterSearching === 'function'
                ? this.props.QCA.isQuadcopterSearching() === true
                : false;
            const dongleAvailable = typeof this.props.QCA.isDongleAvailable === 'function' &&
                this.props.QCA.isDongleAvailable() === true;
            const effectiveConnected = connectedByQca || quadcopterConnected;
            const effectiveSearching = dongleAvailable && (searchingByQca || quadcopterSearching);
            if (this._quadcopterFirmwareFlashActive || quadcopterRowPhase === 'flashing' ||
                quadcopterRowPhase === 'flashDone') {
                if (quadcopterRowPhase === 'flashDone') {
                    return {
                        iconSrc: './static/robbo_assets/green.png',
                        statusText: this.props.intl.formatMessage(messages.quadcopter_connected)
                    };
                }
                return {
                    iconSrc: './static/robbo_assets/yellow.png',
                    statusText: this.props.intl.formatMessage(messages.quadcopter_firmware_flash_started)
                };
            }
            if (this._isQuadcopterFirmwareCheckUiActive()) {
                return {
                    iconSrc: './static/robbo_assets/yellow.png',
                    statusText: this.props.intl.formatMessage(messages.quadcopter_firmware_checking)
                };
            }
            if (quadcopterRowPhase === 'flashing') {
                return {
                    iconSrc: './static/robbo_assets/yellow.png',
                    statusText: this.props.intl.formatMessage(messages.quadcopter_firmware_flash_started)
                };
            }
            if (quadcopterRowPhase === 'flashFailed') {
                return {
                    iconSrc: './static/robbo_assets/red.png',
                    statusText: this.props.intl.formatMessage(messages.quadcopter_firmware_flash_failed)
                };
            }
            if (quadcopterRowPhase === 'flashDone') {
                return {
                    iconSrc: './static/robbo_assets/green.png',
                    statusText: this.props.intl.formatMessage(messages.quadcopter_connected)
                };
            }
            if (this._isQuadcopterSearchUiActive(effectiveSearching, quadcopterRowPhase)) {
                return {
                    iconSrc: './static/robbo_assets/yellow.png',
                    statusText: this.props.intl.formatMessage(messages.quadcopter_searching)
                };
            }
            if (effectiveConnected) {
                if (quadcopterState === 'landing') {
                    return { iconSrc: './static/robbo_assets/yellow.png', statusText: this.props.intl.formatMessage(messages.quadcopter_landing) };
                }
                return { iconSrc: './static/robbo_assets/green.png', statusText: this.props.intl.formatMessage(messages.quadcopter_connected) };
            }
            if (quadcopterState === 'lost') {
                return { iconSrc: './static/robbo_assets/red.png', statusText: this.props.intl.formatMessage(messages.quadcopter_lost) };
            }
            if (quadcopterState === 'emergency') {
                return { iconSrc: './static/robbo_assets/red.png', statusText: this.props.intl.formatMessage(messages.quadcopter_emergency) };
            }
            return { iconSrc: './static/robbo_assets/red.png', statusText: this.props.intl.formatMessage(messages.quadcopter_disconnected) };
        }
        // Serial device rows are drawn from getRowView().
        return {iconSrc: null, statusText: ''};
    }

    // «Done» of a flash is no longer held: the row shows the device status again
    _onFlashHoldEnd = () => {
        if (this._debugMounted !== true) return;
        this.forceUpdate();
    };



    syncStateFromDevice() {
        if (this.props.isQuadcopter) return;
        const allDevices = this.props.DCA.getDevices();
        const realDevice = allDevices.find(dev => dev && dev.getPortName() === this.props.devicePort);
        if (!realDevice) return;
        const realState = realDevice.getState();
        const rawId = realDevice.getDeviceID();
        const normalizedId = rawId !== undefined ? rawId : -1;
        if (realState !== this.state.deviceState || normalizedId !== this.state.deviceId) {
            this.setState({ deviceState: realState, deviceId: normalizedId });
        }
    }

    componentDidUpdate(prevProps, prevState) {
        this.syncStateFromDevice();
        if (prevState.deviceState !== this.state.deviceState && !this.props.isQuadcopter) {
            if ([0, 2, 3, 9].indexOf(this.state.deviceState) !== -1) {
                showSearchPanel();
            }
        }
        if (this.props.isQuadcopter &&
            prevState.quadcopterConnected !== this.state.quadcopterConnected &&
            this.state.quadcopterConnected === true) {
            notifySearchButtonFeedback('connected');
        }
        if (this.props.isQuadcopter && this.props.searchEpoch !== prevProps.searchEpoch) {
            this._quadcopterFirmwareVersionChecked = false;
            this._quadcopterFirmwarePrompted = false;
            this._quadcopterFirmwareProbeInFlight = false;
            this._quadcopterFirmwareFlashActive = false;
            this._quadcopterFirmwareUpdateDeclined = false;
            this._quadcopterSearchReachedTocReady = false;
            this._quadcopterSearchReachedLinkReady = false;
            this._quadcopterSearchSawRadioAck = false;
            this._quadcopterConnectFailureHandled = false;
            this._lastQuadcopterConnected = null;
            this._lastQuadcopterSearching = null;
            this._lastQuadcopterState = null;
            this.setState({
                quadcopterLastError: null,
                quadcopterFlashStatus: null,
                quadcopterFirmwareUpdate: null,
                quadcopterRowPhase: 'searching'
            });
        }
    }

    /** The USB cable was pulled out (DCA watches the ports of the system). */
    _isUnplugged() {
        const dca = this.props.DCA;
        return !this.props.isBluetooth && Boolean(dca) && typeof dca.isPortUnplugged === 'function' &&
            dca.isPortUnplugged(this.props.devicePort);
    }

    componentWillUnmount() {
        this._debugMounted = false;
        document.removeEventListener(FLASH_HOLD_END_EVENT, this._onFlashHoldEnd);
        // A pending «Done» timer still closes the flash window: the row is recreated by the search after flashing.
        if (this.props.isQuadcopter && this.props.QCA && this._quadcopterStatusCallback &&
            typeof this.props.QCA.unregisterQuadcopterStatusChangeCallback === 'function') {
            this.props.QCA.unregisterQuadcopterStatusChangeCallback(this._quadcopterStatusCallback);
        }
        if (this._unsubscribeCopterScan) {
            this._unsubscribeCopterScan();
            this._unsubscribeCopterScan = null;
        }
        if (!this.props.isQuadcopter && this.props.DCA) {
            this.props.DCA.unregisterDeviceStatusChangeCallback(this.props.devicePort);
            this.props.DCA.unregisterFirmwareVersionDiffersCallback(this.props.devicePort);
        }
    }

    componentDidMount() {
        this._debugMounted = true;
        this.DCA = this.props.DCA;
        this.RCA = this.props.RCA;
        this.LCA = this.props.LCA;
        this.OCA = this.props.OCA;
        this.ACA = this.props.ACA;

        if (this.props.isQuadcopter && this.props.QCA) {
            this._lastQuadcopterConnected = null;
            this._lastQuadcopterSearching = null;
            this._lastQuadcopterState = null;
            this._quadcopterStatusCallback = (state, searching, snapshot) => {
                const nextSnapshot = snapshot || {};
                this._noteQuadcopterSearchProgress(nextSnapshot);
                const isSearching = nextSnapshot.searching === true || searching === true;
                const connected = !isSearching && (
                    nextSnapshot.connected === true ||
                    state === 'connected' ||
                    state === 'landing' ||
                    (this.props.QCA &&
                        typeof this.props.QCA.isQuadcopterConnected === 'function' &&
                        this.props.QCA.isQuadcopterConnected() === true)
                );
                const quadcopterState = nextSnapshot.state || state || 'disconnected';
                const suppressConnectError = this._isQuadcopterFirmwareCheckUiActive() ||
                    this._quadcopterFirmwareFlashActive === true ||
                    this.state.quadcopterRowPhase === 'flashing';
                const nextQuadHint = connected || suppressConnectError
                    ? null
                    : Object.prototype.hasOwnProperty.call(nextSnapshot, 'lastError')
                    ? nextSnapshot.lastError
                    : this.state.quadcopterLastError;
                const prevHint = this.state.quadcopterLastError || null;
                const hintSig = nextQuadHint
                    ? `${nextQuadHint.code || ''}:${String(nextQuadHint.message || '')}`
                    : '';
                const prevHintSig = prevHint
                    ? `${prevHint.code || ''}:${String(prevHint.message || '')}`
                    : '';
                const hintChanged = hintSig !== prevHintSig;
                const wasSearching = this._lastQuadcopterSearching === true;
                if (
                    this._lastQuadcopterConnected !== connected ||
                    this._lastQuadcopterSearching !== isSearching ||
                    this._lastQuadcopterState !== quadcopterState ||
                    hintChanged
                ) {
                    if (this._debugMounted !== true) {
                        return;
                    }
                    this._lastQuadcopterConnected = connected;
                    this._lastQuadcopterSearching = isSearching;
                    this._lastQuadcopterState = quadcopterState;
                    const qcaFlashBusy = this.props.QCA &&
                        this.props.QCA._firmwareFlashInProgress === true;
                    let nextRowPhase = 'idle';
                    if (qcaFlashBusy || this._quadcopterFirmwareFlashActive) {
                        nextRowPhase = 'flashing';
                    } else if (isSearching) {
                        nextRowPhase = 'searching';
                    } else if (connected) {
                        nextRowPhase = 'connected';
                    } else if (this._isQuadcopterFirmwareCheckUiActive()) {
                        nextRowPhase = 'checking';
                    }
                    this.setState({
                        quadcopterConnected: connected,
                        quadcopterSearching: isSearching,
                        quadcopterState: quadcopterState,
                        quadcopterLastError: nextQuadHint,
                        quadcopterRowPhase: nextRowPhase
                    });
                }
                if (wasSearching && !isSearching && !connected &&
                    !this._quadcopterConnectFailureHandled) {
                    this._quadcopterConnectFailureHandled = true;
                    notifySearchButtonFeedback('error');
                    this._maybeCheckFirmwareAfterConnectFailure(nextSnapshot);
                } else if (connected && !isSearching) {
                    const qcaFlashBusy = this.props.QCA &&
                        this.props.QCA._firmwareFlashInProgress === true;
                    if (!qcaFlashBusy && !this._quadcopterFirmwareFlashActive) {
                        this._quadcopterFirmwareVersionChecked = true;
                        this._quadcopterFirmwareProbeInFlight = false;
                        this._quadcopterFirmwareFlashActive = false;
                        if (this._debugMounted === true) {
                            this.setState({
                                quadcopterLastError: null,
                                quadcopterFlashStatus: null,
                                quadcopterRowPhase: 'connected',
                                quadcopterOtherGroups: null,
                                quadcopterGroupScanning: false,
                                quadcopterFirmwareUpdate: null
                            });
                        }
                    }
                }
            };
            this.props.QCA.registerQuadcopterStatusChangeCallback(this._quadcopterStatusCallback);
            // An empty group never opens a copter session, so the end of the scan itself is the signal.
            if (typeof this.props.QCA.subscribeScanFinished === 'function') {
                this._unsubscribeCopterScan = this.props.QCA.subscribeScanFinished(info => {
                    if (!info.connected && !info.foundIds.length) this._maybeFindCopterInOtherGroups();
                });
            }
            if (typeof this.props.QCA.isQuadcopterPreflightActive === 'function' &&
                this.props.QCA.isQuadcopterPreflightActive()) {
                this.setState({ quadcopterRowPhase: 'checking' });
            }
        }

        document.addEventListener(FLASH_HOLD_END_EVENT, this._onFlashHoldEnd);

        if (!this.props.isQuadcopter && this.props.DCA) {
            this.props.DCA.registerDeviceStatusChangeCallback(this.props.devicePort, this.onStatusChange.bind(this));
            this.props.DCA.registerFirmwareVersionDiffersCallback(this.props.devicePort, (result) => {
                this.firmware_version_differs = true;
                if (this.flashSessionActive) {
                    this._logFlashFlow('firmwareVersionDiffersCb', 'ignored_due_to_active_session', {
                        currentFirmware: result.current_device_firmware,
                        requiredFirmware: result.need_firmware
                    });
                    return;
                }
                this.setState({
                    firmwareDiffers: {current: result.current_device_firmware, required: result.need_firmware}
                });
            });
        }

        if (!this.props.isQuadcopter) {
            this.syncStateFromDevice();
        }


    }

    _formatQuadcopterLastErrorMessage(err) {
        if (!err) {
            return null;
        }
        const code = err.code ? String(err.code) : '';
        const msg = err.message ? String(err.message) : '';
        if (code === 'deviceClosed' || msg.indexOf('Crazyradio handle is not opened') !== -1) {
            return this.props.intl.formatMessage(messages.quadcopter_copter_not_found);
        }
        if (code === 'searchRefusedInFlight') {
            return this.props.intl.formatMessage(messages.quadcopter_search_refused_in_flight);
        }
        if (code === 'copterLocked') {
            return this.props.intl.formatMessage(messages.quadcopter_locked);
        }
        if (code === 'quadcopterLowBatteryLanding') {
            return this.props.intl.formatMessage(messages.quadcopter_low_battery_landing);
        }
        return msg || null;
    }

    _quadcopterConnectFailureStatusText(info) {
        const err = this.state.quadcopterLastError;
        const formatted = this._formatQuadcopterLastErrorMessage(err);
        if (formatted) {
            return formatted;
        }
        if (!info || info.supported !== true) {
            return this.props.intl.formatMessage(messages.quadcopter_disconnected);
        }
        if (info.probeComplete && !info.needsUpdate) {
            const versionLabel = info.current || info.required || '';
            if (versionLabel) {
                return this.props.intl.formatMessage(messages.quadcopter_connect_failed_firmware_ok, {
                    version: versionLabel
                });
            }
        }
        return this.props.intl.formatMessage(messages.quadcopter_disconnected);
    }

    _applyQuadcopterFirmwareAfterConnectFailure(info, probeEpoch) {
        if (probeEpoch !== this.props.searchEpoch) {
            return;
        }
        this._quadcopterFirmwareProbeInFlight = false;
        this._quadcopterFirmwareVersionChecked = true;

        if (!info || info.supported !== true || !info.needsUpdate) {
            if (this._debugMounted === true) {
                this.setState({
                    quadcopterFlashStatus: null,
                    quadcopterRowPhase: 'idle',
                    quadcopterLastError: this.state.quadcopterLastError
                });
            }
            this._retryQuadcopterSearchAfterLogSetupFailure(probeEpoch);
            return;
        }

        if (this._debugMounted === true) {
            this.setState({
                quadcopterLastError: null,
                quadcopterFlashStatus: this._quadcopterFirmwareMismatchStatusText(info),
                quadcopterRowPhase: 'idle'
            });
        }
        if (!info.required) {
            return;
        }

        // The row offers «Update» with the versions and what to do before it (no modal question).
        this._quadcopterFirmwarePrompted = true;
        if (this._debugMounted === true) this.setState({quadcopterFirmwareUpdate: info});
    }

    /**
     * Older firmware (e.g. 2023.07) often fails the first log-block setup and connects on the next
     * search. Instead of leaving the user with an error, retry once per search epoch.
     */
    _retryQuadcopterSearchAfterLogSetupFailure(probeEpoch) {
        if (probeEpoch !== this.props.searchEpoch) return;
        if (this._quadcopterLogRetryEpoch === probeEpoch) return;
        const blob = this._quadcopterSearchErrorText(this._lastFailedQuadcopterSearch);
        if (!/log block|log reset/i.test(blob)) return;
        if (!this.props.QCA || typeof this.props.QCA.searchQuadcopterDevices !== 'function') return;
        this._quadcopterLogRetryEpoch = probeEpoch;
        this.props.QCA.searchQuadcopterDevices();
    }

    _maybeCheckFirmwareAfterConnectFailure(searchSnapshot) {
        if (!this.props.isQuadcopter || !this.props.QCA) return;
        if (this._quadcopterFirmwareVersionChecked) return;
        if (this._quadcopterFirmwarePrompted) return;
        if (this._quadcopterFirmwareProbeInFlight) return;
        if (typeof this.props.QCA.isQuadcopterConnected === 'function' &&
            this.props.QCA.isQuadcopterConnected()) {
            return;
        }
        if (!this._shouldProbeFirmwareAfterFailedSearch(searchSnapshot)) {
            this._skipQuadcopterFirmwareProbeAfterSearch(searchSnapshot);
            return;
        }
        if (!this.isFirmwareFlashingSupportedForQuadcopter()) {
            this._quadcopterFirmwareVersionChecked = true;
            if (this._debugMounted === true) {
                this.setState({
                    quadcopterFlashStatus: this._quadcopterConnectFailureStatusText(null),
                    quadcopterRowPhase: 'idle'
                });
            }
            return;
        }

        const probeEpoch = this.props.searchEpoch;
        this._lastFailedQuadcopterSearch = searchSnapshot;
        const runProbe = typeof this.props.QCA.probeFirmwareAfterFailedConnect === 'function'
            ? this.props.QCA.probeFirmwareAfterFailedConnect.bind(this.props.QCA)
            : null;
        if (!runProbe) {
            this._quadcopterFirmwareVersionChecked = true;
            return;
        }

        this._quadcopterFirmwareProbeInFlight = true;
        if (this._debugMounted === true) {
            this.setState({
                quadcopterLastError: null,
                quadcopterFlashStatus: this.props.intl.formatMessage(messages.quadcopter_firmware_checking),
                quadcopterRowPhase: 'checking'
            });
        }
        const probeTimeoutMs = this._getQuadcopterFirmwareProbeTimeoutMs(searchSnapshot);
        runProbe({ onLine: () => {}, timeoutMs: probeTimeoutMs })
            .then((info) => {
                this._applyQuadcopterFirmwareAfterConnectFailure(info, probeEpoch);
            })
            .catch(() => {
                this._quadcopterFirmwareVersionChecked = true;
                if (this._debugMounted === true) {
                    this.setState({
                        quadcopterFlashStatus: null,
                        quadcopterRowPhase: 'idle'
                    });
                }
            })
            .finally(() => {
                this._quadcopterFirmwareProbeInFlight = false;
            });
    }

    /**
     * Nothing answered in this computer's group: a copter numbered on another computer (or before the group was
     * changed) may be in another group. Look there once per search and offer to switch.
     */
    _maybeFindCopterInOtherGroups() {
        const qca = this.props.QCA;
        if (!qca || typeof qca.findCoptersInOtherGroups !== 'function') return;
        if (typeof qca.lastScanFoundCopters === 'function' && qca.lastScanFoundCopters()) return;
        const epoch = this.props.searchEpoch;
        if (this._groupScanEpoch === epoch) return;
        this._groupScanEpoch = epoch;
        this.setState({quadcopterGroupScanning: true, quadcopterOtherGroups: null});
        qca.findCoptersInOtherGroups().then(found => {
            if (this._debugMounted !== true) return;
            this.setState({quadcopterGroupScanning: false, quadcopterOtherGroups: found && found.length ? found : null});
        });
    }

    _switchQuadcopterGroup(group) {
        const qca = this.props.QCA;
        this.setState({quadcopterOtherGroups: null});
        Promise.resolve(qca.setRadioGroup(group)).then(() => qca.searchQuadcopterDevices());
    }

    isFirmwareFlashingSupportedForQuadcopter() {
        if (!this.props.QCA || typeof this.props.QCA.isFirmwareFlashingSupported !== 'function') {
            return false;
        }
        try {
            return this.props.QCA.isFirmwareFlashingSupported() === true;
        } catch (e) {
            return false;
        }
    }


    onStatusChange(result_obj) {
        if (typeof this.props.onDeviceStateChange === 'function') this.props.onDeviceStateChange();
        // Проверяем, что этот callback вызван для правильного устройства
        // Получаем реальное устройство по порту и проверяем его deviceId
        const allDevices = this.props.DCA.getDevices();
        const realDevice = allDevices.find(dev => dev && dev.getPortName() === this.props.devicePort);

        if (!realDevice) {
            // Устройство не найдено, возможно оно было удалено
            console.warn(`[GUI_DEBUG] Device ${this.props.devicePort} not found, ignoring status change`);
            return;
        }

        // Получаем deviceId напрямую от устройства для гарантии правильности
        const realDeviceId = realDevice.getDeviceID();
        const realState = realDevice.getState();

        // Используем реальные значения от устройства, а не из result_obj
        // чтобы гарантировать, что статус соответствует именно этому устройству
        const deviceId = realDeviceId !== undefined ? realDeviceId : (result_obj.deviceId !== undefined ? result_obj.deviceId : -1);
        const state = realState !== undefined ? realState : result_obj.state;

        // Сохраняем ошибку из result_obj, если она есть (она может быть специфичной для этого события)
        // Но проверяем, что ошибка относится к правильному типу устройства
        let error = result_obj.error;
        if (error && error.msg) {
            const errorMsg = error.msg.toLowerCase();
            const isComPortError = errorMsg.indexOf('com port') !== -1 ||
                errorMsg.indexOf('getoverlappedresult') !== -1 ||
                errorMsg.indexOf('writing to com port') !== -1;

            // Bluetooth устройства не должны получать ошибки COM порта (это ошибки USB устройств)
            if (this.props.isBluetooth && this.props.devicePort.startsWith('bluetooth_') && isComPortError) {
                console.warn(`[GUI_DEBUG] Filtering COM port error for Bluetooth device ${this.props.devicePort}: ${error.msg}`);
                error = null; // Игнорируем ошибку COM порта для Bluetooth устройств
            }

            // USB устройства не должны получать Bluetooth ошибки
            if (!this.props.isBluetooth && !this.props.devicePort.startsWith('bluetooth_') &&
                (errorMsg.indexOf('bluetooth') !== -1 && !isComPortError)) {
                console.warn(`[GUI_DEBUG] Filtering Bluetooth error for USB device ${this.props.devicePort}: ${error.msg}`);
                error = null; // Игнорируем Bluetooth ошибки для USB устройств
            }
        }

        this.deviceId = deviceId;
        if (state === 10) {
            console.warn('[FLASH_ICON] onStatusChange: received state=10 FLASHING for port=' + this.props.devicePort);
        }
        // Each try at another port speed passes «checking the serial number» again: count the tries
        // so the repeated status does not look like a hang.
        let identifyAttempt = this.state.identifyAttempt || 0;
        if (state === 3 && this.state.deviceState !== 3) identifyAttempt++;
        else if (state === 6 || state === 7 || state === 8) identifyAttempt = 0;
        this.setState({ deviceState: state, deviceId, deviceError: error, identifyAttempt });

        if (!this.props.isQuadcopter && !this.flashSessionActive) {
            if (state === 6) {
                notifySearchButtonFeedback('connected');
            } else if (state === 7) {
                notifySearchButtonFeedback('error');
            } else if (state === 8 && !(error && error.code === 1)) {
                notifySearchButtonFeedback('error');
            }
        }

        let search_device_button = document.getElementById(`robbo_search_devices`);
        const unlockMenuBarSearch = () => {
            if (search_device_button) {
                search_device_button.style.pointerEvents = 'none';
                search_device_button.style.pointerEvents = 'auto';
                search_device_button.removeAttribute('disabled');
            }
        };

        if ([0, 2, 6, 8].indexOf(state) !== -1) {
            this._logFlashFlow('onStatusChange', 'state_received', { state, hasError: !!error });
        }

        // The row draws itself from deviceState / deviceError / firmwareDiffers / flashUi (render, getRowView);
        // here only what is not a picture: the flash window, the panel, the menu bar search button.
        if (state == 0 || state == 2) {
            if (this.flashSessionActive) {
                this._logFlashFlow('onStatusChange', `state${state}_ignored_due_to_active_session`, { state });
                return;
            }
            this.firmware_version_differs = false;
            if (this.state.firmwareDiffers) this.setState({firmwareDiffers: null});
        } else if (state == 6) {
            if (this.flashSessionActive) {
                this._logFlashFlow('onStatusChange', 'state6_ignored_due_to_active_session', { state });
                return;
            }
            unlockMenuBarSearch();
            const record = lastFlashByPort.get(this.props.devicePort);
            if (record && record.done && isFlashShownInRow(record) && !record.connected) {
                const probe = createFlashProbe();
                applyFlashConnected(probe.el, this.props.intl, {deviceId: record.deviceId});
                record.status = probe.el.textContent;
                record.connected = true;
                this.forceUpdate();
            }
        } else if (state == 9) { //Reconnecting (state - RECONNECTING)
            unlockMenuBarSearch();
            showSearchPanel();
        } else if (state == 8) { //Port doesn't respond (state - TIMEOUT)
            if (this.flashSessionActive) {
                this._logFlashFlow('onStatusChange', 'state8_ignored_due_to_active_session', { state });
                return;
            }
            unlockMenuBarSearch();
            // connection lost (code 1) or no answer at all (code -1): the row explains and offers «Flash»
            showSearchPanel();
        } else if (state == 7) {
            unlockMenuBarSearch();
            showSearchPanel();
        }
    }


    searchDevices(showPanel = true) {
        if (showPanel) {
            showSearchPanel();
        }


        this.DCA.searchAllDevices();

        this.RCA.searchRobotDevices();
        this.LCA.searchLaboratoryDevices();
        this.OCA.searchOttoDevices();
        this.ACA.searchArduinoDevices();

        if (this.props.QCA) {
            // A hidden search (after flashing a robot) must not give a number to a new copter.
            this.props.QCA.searchQuadcopterDevices({ from: 'SearchPanelDeviceComponent.searchDevices', background: !showPanel });
        }

        this.props.onHydrateDemoLicense();
    }


    _firmwareActionsAllowed() {
        return !this.props.disableFirmwareUi && !this.props.isQuadcopter && !this.props.isBluetooth &&
            !this.props.isMacBluetooth && !this.isRasberry && this.props.devicePort.indexOf('rfcomm') === -1;
    }

    toggleDetails() {
        this.setState(prev => ({detailsOpen: !prev.detailsOpen}));
    }

    retryFlash() {
        const [mode, opts] = this._lastFlashArgs || [this.deviceId === 5 ? 'auto' : undefined, {}];
        this.flashDevice(mode, opts);
    }

    // «Flashing log»: the last flash of this port, in the row
    toggleFlashLog() {
        this.setState(prev => ({logOpen: !prev.logOpen, flashLogExpanded: !prev.logOpen}));
    }


    _buildFlashConfig(ottoFlashMode, identify) {
        const config = { device: {} };
        config.device.device_id = identify ? -1 : this.deviceId;
        const firmwareSettings = getFirmwareSettingsFromRuntime(this.props.VM && this.props.VM.runtime ? this.props.VM.runtime : null);
        config.device.detect_timeout_ms = firmwareSettings.detect_timeout_ms;
        config.device.block_transmit_delay = firmwareSettings.block_transmit_delay;
        // Unknown device the search gave up on (TIMEOUT): the flasher skips asking it once more (~3 s)
        // «Detect the device and flash» skips it too: the probe would read the current (wrong) firmware again
        config.device.skip_probe = identify === true || (this.deviceId === -1 && this.state.deviceState === 8);
        if (!identify && this.deviceId === 5) {
            const useNullLab = ottoFlashMode === 'null_lab' || ottoFlashMode === 'auto';
            config.device.use_null_lab = useNullLab;
            if (useNullLab) {
                config.device.baud_rate = firmwareSettings.baud_rate;
            }
        }
        return config;
    }

    // Sensor polling stops only in the API that drives the flashed port: the other robots and labs keep
    // working while this device is flashed (each API polls its first connected device).
    _stopDataReceivingForFlashedPort() {
        const port = this.props.devicePort;
        [
            [this.RCA, 'ConnectedRobots'],
            [this.LCA, 'ConnectedLaboratories'],
            [this.OCA, 'ConnectedOttos'],
            [this.ACA, 'ConnectedArduinos']
        ].forEach(([api, listName]) => {
            const device = api && api[listName] && api[listName][0];
            const devicePort = device && typeof device.getPortName === 'function' ? device.getPortName() : null;
            if (devicePort === port) api.stopDataRecievingProcess();
        });
    }

    /**
     * @param {string} [ottoFlashMode] Otto: 'auto' | 'null_lab' | 'arduino'
     * @param {object} [opts]
     * @param {boolean} [opts.identify] ignore the current firmware: the flasher recognizes the device by a test
     *     firmware (its serial number) and writes the right firmware
     */
    flashDevice(ottoFlashMode, opts = {}) {
        if (this.props.isQuadcopter) {
            this.flashQuadcopterFirmware();
            return;
        }
        if (this.props.disableFirmwareUi) {
            this.setState({flashUi: {failed: true, text: this.props.intl.formatMessage(messages.firmware_not_available_mobile)}});
            return;
        }

        const flashMode = ottoFlashMode || 'default';
        if (this.flashSessionActive) {
            this._logFlashFlow('flashDevice', 'ignored_parallel_start', { mode: flashMode });
            return;
        }

        // «Retry» in the row repeats exactly this flash
        this._lastFlashArgs = [ottoFlashMode, opts];
        const targetDeviceId = opts.identify ? -1 : this.deviceId;
        const initialStage = (targetDeviceId === 5 && flashMode === 'auto') ? 'null_lab' : 'single';
        const currentSessionId = this._startFlashSession(initialStage, flashMode);

        // The menu bar search button stays enabled: while flashing it opens this panel (FIRMWARE_FLASHING event).
        var search_device_button = document.getElementById(`robbo_search_devices`);

        // The flash is drawn in the row from this record (steps, status, progress, log); applyFlashStatus()
        // computes the phase texts on a detached element.
        const flashProbe = createFlashProbe();
        const flashRecord = {
            active: true,
            done: false,
            failed: false,
            connected: false,
            lines: [],
            status: '',
            step: null,
            phase: null,
            percent: null,
            deviceId: targetDeviceId >= 0 ? targetDeviceId : null,
            holdUntil: 0
        };
        lastFlashByPort.set(this.props.devicePort, flashRecord);
        const flashLogLines = flashRecord.lines;
        notifyFlashingChanged();
        this.setState({flashUi: {active: true, percent: null, text: ''}, detailsOpen: false, logOpen: false});

        var config = this._buildFlashConfig(flashMode, opts.identify);
        config.device.flash_session_id = currentSessionId;

        this._logFlashFlow('flashDevice', 'start_flash', {
            sessionId: currentSessionId,
            mode: flashMode,
            useNullLab: !!(config && config.device && config.device.use_null_lab)
        });

        this._stopDataReceivingForFlashedPort();

        const suppressVerifyConfirmInAutoFlow = (targetDeviceId === 5 && flashMode === 'auto');
        const flashProgress = createFlashProgress();
        // A known device is named in the phases right away; an unknown one once the flasher recognizes it.
        if (targetDeviceId >= 0) flashProgress.deviceId = targetDeviceId;
        var statusCallback = (status) => {
            if (!this.flashSessionActive || this._activeFlashSessionId !== currentSessionId) {
                this._logFlashFlow('statusCallback', 'ignored_stale_session', { status, callbackSessionId: currentSessionId });
                return;
            }
            this._logFlashFlow('statusCallback', 'status', { status });

            // Raw lines to the details log, the phase in plain words to the status line.
            if (status.indexOf("Uploading") === -1 && !/Block \d+\/\d+/.test(status)) {
                flashLogLines.push(status);
            }
            const phase = applyFlashStatus(flashProbe.el, status, this.props.intl, flashProgress);
            flashRecord.status = flashProbe.el.textContent;
            flashRecord.step = flashProbe.root.getAttribute('data-flash-step');
            flashRecord.phase = phase;
            flashRecord.deviceId = flashProgress.deviceId;
            // percent of the written blocks while writing
            flashRecord.percent = phase === 'write' && flashProgress.blockTotal ?
                Math.round(flashProgress.block / flashProgress.blockTotal * 100) : null;
            if (phase !== 'done' && phase !== 'error') {
                this.setState({flashUi: {
                    active: true,
                    percent: flashRecord.percent,
                    text: flashRecord.status,
                    deviceId: flashRecord.deviceId
                }});
            }

            if (isFlashDone(status)) {
                if (search_device_button) search_device_button.removeAttribute("disabled");
                this.firmware_version_differs = false;
                // «Done» stays in the row for a while, then the panel may close as usual
                flashRecord.active = false;
                flashRecord.done = true;
                flashRecord.holdUntil = Date.now() + FLASH_DONE_HOLD_MS;
                setTimeout(() => document.dispatchEvent(new CustomEvent(FLASH_HOLD_END_EVENT)), FLASH_DONE_HOLD_MS + 50);
                notifyFlashingChanged();
                this.setState({flashUi: null, firmwareDiffers: null});
                this._finishFlashSession('success');
                // Reconnect all devices; the panel stays open while the row shows «Done».
                this.searchDevices(false);
            } else if ((status.indexOf("Error") !== -1)) {
                if (search_device_button) search_device_button.removeAttribute("disabled");
                flashRecord.active = false;
                flashRecord.failed = true;
                notifyFlashingChanged();
                this.setState({flashLogExpanded: true});

                // The row says what happened and offers «Retry» (it repeats this flash): no question window.
                this.setState({flashUi: {failed: true, text: flashRecord.status}});
                showSearchPanel();
                this._logFlashFlow('statusCallback', 'flash_error', {
                    stage: this.flashStage,
                    autoRetry: suppressVerifyConfirmInAutoFlow
                });

                this._finishFlashSession('error');
            } else {
                if (status.indexOf("Upload complete. Verifying") !== -1) {
                    this.flashStage = 'verify';
                    this._logFlashFlow('statusCallback', 'verify_started_search_suppressed', {});
                }
            }
        };

        var onVerifyFailure = null;
        if (targetDeviceId === 5 && flashMode === 'auto') {
            onVerifyFailure = (verifyContext = {}) => {
                if (!this.flashSessionActive || this._activeFlashSessionId !== currentSessionId) {
                    this._logFlashFlow('onVerifyFailure', 'ignored_stale_session', { callbackSessionId: currentSessionId });
                    return;
                }
                this._logFlashFlow('onVerifyFailure', 'triggered', verifyContext);
                flashLogLines.push(this.props.intl.formatMessage(messages.otto_flash_retry_arduino_log));
                this.forceUpdate();
                this._stopDataReceivingForFlashedPort();
                var arduinoConfig = this._buildFlashConfig('arduino');
                arduinoConfig.device.flash_session_id = currentSessionId;
                this.flashStage = 'retry_wait';
                setTimeout(() => {
                    if (!this.flashSessionActive || this._activeFlashSessionId !== currentSessionId) {
                        this._logFlashFlow('onVerifyFailure', 'retry_delay_skipped_stale_session', { callbackSessionId: currentSessionId });
                        return;
                    }
                    this.flashStage = 'arduino_retry';
                    this._logFlashFlow('onVerifyFailure', 'start_arduino_retry', {
                        useNullLab: !!(arduinoConfig && arduinoConfig.device && arduinoConfig.device.use_null_lab),
                        delayMs: AUTO_RETRY_START_DELAY_MS
                    });
                    this.DCA.flashFirmwareWithDisconnect(this.props.devicePort, arduinoConfig, statusCallback);
                }, AUTO_RETRY_START_DELAY_MS);
            };
        }

        this.DCA.flashFirmwareWithDisconnect(this.props.devicePort, config, statusCallback, onVerifyFailure);


        //  this.LCA.discon();
        //}

        // var styles = {

        //       margin: '20px 10px',
        //       fontWeight:'bold',
        //       fontSize:"16px"

        // }


        // 


    }


    /**
     * Write the bundled firmware to the quadcopter; steps, progress and the cfloader lines are drawn in the row.
     * @param {object} [opts]
     * @param {boolean} [opts.cold] the copter is stuck in its bootloader (an interrupted update): cfloader waits
     *     for it to be switched off and on
     */
    flashQuadcopterFirmware(opts = {}) {
        const intl = this.props.intl;
        const qca = this.props.QCA;
        const supported = qca && typeof qca.flashBundledFirmware === 'function' &&
            (typeof qca.isFirmwareFlashingSupported !== 'function' || qca.isFirmwareFlashingSupported());
        if (!supported) {
            this.setState({quadcopterFlashStatus: intl.formatMessage(messages.quadcopter_firmware_flash_failed)});
            return;
        }
        if (qca._firmwareFlashInProgress === true) return;
        const cold = opts.cold === true;
        // {active, done, failed, lines, step, headline, percent, status, holdUntil} — see lastFlashByPort
        const record = {
            active: true,
            done: false,
            failed: false,
            connected: false,
            cold,
            lines: [],
            status: null,
            headline: null,
            step: '1',
            phase: null,
            percent: null,
            deviceId: null,
            holdUntil: 0
        };
        lastFlashByPort.set(this.props.devicePort, record);
        notifyFlashingChanged();
        this._quadcopterFirmwareUpdateDeclined = false;
        this._quadcopterFirmwareFlashActive = true;
        this.setState({
            quadcopterLastError: null,
            quadcopterFlashStatus: null,
            quadcopterFirmwareUpdate: null,
            quadcopterOtherGroups: null,
            quadcopterRowPhase: 'flashing',
            logOpen: false,
            flashLogExpanded: false
        });
        const options = {
            closeBlockedMessage: intl.formatMessage(messages.quadcopter_flash_close_blocked),
            onLine: (line, meta) => {
                if (applyCf2FlashLine(record, line, meta || {}) && this._debugMounted === true) this.forceUpdate();
            }
        };
        const run = cold ? qca.recoverInterruptedFirmware(options) : qca.flashBundledFirmware(options);
        Promise.resolve(run).then(ok => ok === true, () => false).then(ok => {
            record.active = false;
            this._quadcopterFirmwareFlashActive = false;
            this._quadcopterFirmwarePrompted = false;
            notifyFlashingChanged();
            if (ok) {
                const probe = typeof qca.getLastFirmwareProbe === 'function' ? qca.getLastFirmwareProbe() : null;
                const currentUi = probe ? this._getQuadcopterCurrentVersionForUi(probe) : null;
                record.done = true;
                if (currentUi && probe.required && currentUi !== probe.required) {
                    record.status = intl.formatMessage(messages.quadcopter_firmware_versions_line, {
                        current: currentUi,
                        required: probe.required
                    });
                } else {
                    record.status = currentUi ?
                        intl.formatMessage(messages.quadcopter_firmware_flash_done_version, {version: currentUi}) :
                        intl.formatMessage(messages.quadcopter_firmware_flash_done);
                }
                record.holdUntil = Date.now() + FLASH_DONE_HOLD_MS;
                setTimeout(() => document.dispatchEvent(new CustomEvent(FLASH_HOLD_END_EVENT)), FLASH_DONE_HOLD_MS + 50);
                this._quadcopterFirmwareVersionChecked = true;
                if (this._debugMounted === true) {
                    this.setState({quadcopterLastError: null, quadcopterRowPhase: 'flashDone'});
                }
                return;
            }
            record.failed = true;
            record.status = intl.formatMessage(messages.quadcopter_firmware_flash_failed);
            this._quadcopterFirmwareVersionChecked = false;
            if (this._debugMounted === true) {
                this.setState({quadcopterRowPhase: 'flashFailed', flashLogExpanded: true});
            }
        });
    }

    /** Status line of the quadcopter flash block from the last cfloader headline. */
    _copterFlashStatusText(record) {
        const intl = this.props.intl;
        if (!record.active) return record.status;
        if (record.headline === 'Writing firmware…' && record.percent !== null) {
            return intl.formatMessage(messages.cf2_flash_writing_pct, {pct: record.percent});
        }
        return this._translateCf2FlashHeadline(record.headline) ||
            intl.formatMessage(messages.quadcopter_firmware_flash_started);
    }

    /** @returns {?number} palette window of this row's device, null when the device has no palette */
    _paletteWindowId() {
        if (this.props.isQuadcopter) return COPTER_PALETTE_WINDOW_ID;
        const byId = PALETTE_WINDOW_BY_DEVICE_ID[this.state.deviceId];
        if (byId !== undefined) return byId;
        // the button stays off until the device answers and connects
        const byIcon = PALETTE_WINDOW_BY_ROW_ICON[this._rowIcon()];
        return byIcon === undefined ? null : byIcon;
    }

    /** The palette button works: the device is connected and not being flashed. */
    _paletteAvailable() {
        const record = lastFlashByPort.get(this.props.devicePort);
        if (record && record.active) return false;
        if (this.props.isQuadcopter) {
            const qca = this.props.QCA;
            return this.state.quadcopterConnected === true ||
                Boolean(qca && typeof qca.isQuadcopterConnected === 'function' && qca.isQuadcopterConnected());
        }
        return this.state.deviceState === 6 && !this.flashSessionActive;
    }

    /** Open the device palette next to the panel, or bring it to the front when it is already open. */
    openPalette() {
        const windowId = this._paletteWindowId();
        if (windowId === null) return;
        const win = this.props.draggable_window && this.props.draggable_window[windowId];
        if (win && win.isShowing) {
            // the palette raises itself on mousedown (DraggableWindowComponent)
            const node = document.getElementById(`draggable_window_id-${windowId}`);
            if (node) node.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
            return;
        }
        this.props.onOpenPalette(windowId, paletteSpotNearPanel());
    }

    /** The quadcopter can be flashed from its row right now (connected, on the ground, nothing else flashing). */
    _copterReflashAllowed() {
        const qca = this.props.QCA;
        if (!qca || this.props.disableFirmwareUi || !this.isFirmwareFlashingSupportedForQuadcopter()) return false;
        if (qca._firmwareFlashInProgress === true || this._quadcopterFirmwareFlashActive) return false;
        if (typeof qca.isAnyCopterAirborne === 'function' && qca.isAnyCopterAirborne()) return false;
        return typeof qca.isQuadcopterConnected === 'function' && qca.isQuadcopterConnected() === true;
    }

    render() {
        const intl = this.props.intl;
        const view = this.getRowView();
        const quadcopterHintText = this.props.isQuadcopter &&
            !this._isQuadcopterConnectErrorHintSuppressed() &&
            this._formatQuadcopterLastErrorMessage(this.state.quadcopterLastError);
        const quadcopterFlashStatus = this.props.isQuadcopter && this._shouldShowQuadcopterFlashStatusHint() ?
            String(this.state.quadcopterFlashStatus) :
            '';
        // a copter found in another group explains «not found» better than the connect error
        const viewHints = [].concat(view.hint || []);
        const hints = (this.props.isQuadcopter && !view.action ?
            [quadcopterHintText, quadcopterFlashStatus, ...viewHints] :
            viewHints).filter(Boolean);
        const canExpand = true;
        const links = this._links();
        const detailsOpen = canExpand && this.state.detailsOpen;
        const detailsId = `search-panel-device-details-${this.props.Id}`;
        const flashing = this.flashSessionActive;
        const firmwareActions = this._firmwareActionsAllowed() && !flashing;
        const flashBlock = this._renderFlashBlock();
        const paletteWindowId = this._paletteWindowId();
        const paletteAvailable = paletteWindowId !== null && this._paletteAvailable();
        const paletteLabel = intl.formatMessage(paletteAvailable ? messages.open_palette :
            messages.open_palette_unavailable);

        const head = (
            <React.Fragment>
                <span className={classNames(styles.row_icon, styles[`row_icon_${this._rowIcon()}`])} aria-hidden="true">
                    <i />
                </span>
                <span className={styles.row_text}>
                    <span className={styles.row_title}>{view.title}</span>
                    {links.length ? (
                        <span className={classNames(styles.row_subtitle, styles.row_links)}>
                            {links.map(link => (
                                <span
                                    key={link.port}
                                    className={classNames(styles.link_chip, link.active && styles.link_chip_active)}
                                    title={link.full}
                                >
                                    {this._linkIcon(link.isBluetooth)}
                                    {link.short}
                                </span>
                            ))}
                            {view.attempt ? <span className={styles.link_attempt}>{view.attempt}</span> : null}
                        </span>
                    ) : <span className={styles.row_subtitle}>{view.subtitle}</span>}
                </span>
                <span className={styles.row_status}>
                    <span className={styles.row_pill}>{view.pill}</span>
                    {canExpand ? <span className={styles.row_chevron} aria-hidden="true" /> : null}
                </span>
            </React.Fragment>
        );

        return (
            <div
                id="search-panel-device-component"
                className={classNames(styles.row, styles[`row_${view.tone}`], detailsOpen && styles.row_open)}
                data-port={this.props.devicePort}
                data-tone={view.tone}
            >
                <div className={styles.row_top}>
                    {canExpand ? (
                        <button
                            type="button"
                            className={styles.row_head}
                            aria-expanded={detailsOpen}
                            aria-controls={detailsId}
                            aria-label={`${view.title}: ${view.pill}. ${intl.formatMessage(messages.row_details)}`}
                            onClick={() => this.toggleDetails()}
                        >
                            {head}
                        </button>
                    ) : (
                        <div className={styles.row_head}>{head}</div>
                    )}
                    {paletteWindowId === null ? <span className={styles.row_palette_space} /> : (
                        <button
                            type="button"
                            className={styles.row_palette}
                            // aria-disabled, not disabled: the tooltip says when the palette becomes available
                            aria-disabled={!paletteAvailable}
                            title={paletteLabel}
                            aria-label={`${view.title}: ${paletteLabel}`}
                            onClick={() => {
                                if (paletteAvailable) this.openPalette();
                            }}
                        >
                            <svg
                                viewBox="0 0 20 20"
                                aria-hidden="true"
                            >
                                <rect
                                    x="2.5"
                                    y="3.5"
                                    width="15"
                                    height="13"
                                    rx="2.5"
                                />
                                <path d="M2.5 7.5h15M6 11h3M6 13.5h5" />
                                <circle
                                    cx="13.5"
                                    cy="12"
                                    r="1.6"
                                />
                            </svg>
                        </button>
                    )}
                </div>

                {flashBlock}

                {hints.length || view.action ? (
                    <div className={styles.row_more} role={view.tone === 'err' ? 'alert' : undefined}>
                        <div className={styles.row_hints}>
                            {hints.map(text => <p key={text}>{text}</p>)}
                        </div>
                        {view.action ? (
                            <button type="button" className={styles.row_action} onClick={view.action.run}>
                                {view.action.label}
                            </button>
                        ) : null}
                    </div>
                ) : null}

                {detailsOpen ? (
                    <div id={detailsId} className={styles.row_details}>
                        <dl>
                            {this._rowDetails().map(([label, value]) => (
                                <React.Fragment key={label}>
                                    <dt>{label}</dt>
                                    <dd>{value}</dd>
                                </React.Fragment>
                            ))}
                        </dl>
                        <div className={styles.row_details_actions}>
                            {this.props.isQuadcopter && this._copterReflashAllowed() ? (
                                <button
                                    type="button"
                                    className={styles.row_link}
                                    onClick={() => this.flashQuadcopterFirmware()}
                                >
                                    {intl.formatMessage(messages.row_menu_reflash)}
                                </button>
                            ) : null}
                            {firmwareActions && this.state.deviceState === 6 && this.deviceId >= 0 ? (
                                <button
                                    type="button"
                                    className={styles.row_link}
                                    onClick={() => this.flashDevice(this.deviceId === 5 ? 'auto' : undefined)}
                                >
                                    {intl.formatMessage(messages.row_menu_reflash)}
                                </button>
                            ) : null}
                            {firmwareActions && this.state.deviceState === 6 ? (
                                <button
                                    type="button"
                                    className={styles.row_link}
                                    onClick={() => this.flashDevice(undefined, {identify: true})}
                                >
                                    {intl.formatMessage(messages.row_menu_identify_flash)}
                                </button>
                            ) : null}
                            <button type="button" className={styles.row_link} onClick={() => this.toggleFlashLog()}>
                                {intl.formatMessage(messages.row_menu_flash_log)}
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        );
    }
}


const mapStateToProps = state => ({
    draggable_window: state.scratchGui.draggable_window
});

const mapDispatchToProps = dispatch => ({

    onOpenPalette: (windowId, spot) => {
        if (spot) dispatch(ActionDropDraggableWindow(spot.top, spot.left, windowId));
        dispatch(ActionTriggerDraggableWindow(windowId));
    },

    onHydrateDemoLicense: () => {
        dispatch(hydrateLicenseThunk());
    }

    // onDeviceFound: (device) => {

    //       dispatch(ActionDeviceFound(device));
    // },


    // onSearchPanelWindowClose: (window_id) => {

    //     dispatch(ActionTriggerDraggableWindow(window_id));
    //   }


});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(SearchPanelDeviceComponent));

//export default injectIntl(SearchPanelDeviceComponent);