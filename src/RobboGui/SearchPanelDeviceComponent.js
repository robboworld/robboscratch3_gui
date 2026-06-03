
import classNames from 'classnames';
import React, { Component } from 'react';
import { connect } from 'react-redux';

import { defineMessages, intlShape, injectIntl, FormattedMessage } from 'react-intl';

import { ActionTriggerDraggableWindow } from './actions/sensor_actions';
import { ActionCreateDraggableWindow } from './actions/sensor_actions';


import styles from './SearchPanelDeviceComponent.css';
import './RobboDeviceStatus.css';
import {hideSearchPanel, showSearchPanel} from './search-panel-visibility';
import {notifySearchButtonFeedback} from './search-button-feedback';

import { createDiv } from './lib/lib.js';
import { getFirmwareSettingsFromRuntime } from '../lib/settingsLoader';
import { applyRobboPopupZIndex } from '../lib/robbo-popup-z-index';
import { resolveCf2FirmwareVersionLabel, parseCf2FlashToolLine } from '../lib/crazyflie-flash-ui';
import {getFirmwareFlashLogElements} from './firmware-flash-window-dom';
import {setFlashButtonVisualMode, setFlashLogStatusTone} from '../lib/device-status-dom';



const messages = defineMessages({

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
    quadcopter_connecting: {
        id: 'gui.SearchPanel.quadcopter_connecting',
        description: 'Crazyflie radio link is being established during device search.',
        defaultMessage: 'Connecting…'
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
    quadcopter_firmware_update_prompt: {
        id: 'gui.SearchPanel.quadcopter_firmware_update_prompt',
        description: 'Confirm text when Crazyflie firmware differs from bundled desktop firmware.',
        defaultMessage: 'Crazyflie firmware version differs from the required one.\n\nCurrent: {current}\nRequired: {required}\n\nUpdate now?'
    },
    quadcopter_firmware_update_warning: {
        id: 'gui.SearchPanel.quadcopter_firmware_update_warning',
        description: 'Shown before flashing Crazyflie firmware.',
        defaultMessage: 'Before updating: remove propellers, ensure good battery charge, and do not power off the Crazyflie during flashing.'
    },
    quadcopter_firmware_checking: {
        id: 'gui.SearchPanel.quadcopter_firmware_checking',
        description: 'Shown in quadcopter row while reading firmware version.',
        defaultMessage: 'Checking Crazyflie firmware version…'
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
        defaultMessage: 'Flashing Crazyflie firmware…'
    },
    quadcopter_firmware_flash_done: {
        id: 'gui.SearchPanel.quadcopter_firmware_flash_done',
        description: 'Shown in quadcopter row when flashing succeeds.',
        defaultMessage: 'Crazyflie firmware updated.'
    },
    quadcopter_firmware_flash_failed: {
        id: 'gui.SearchPanel.quadcopter_firmware_flash_failed',
        description: 'Shown in quadcopter row when flashing fails.',
        defaultMessage: 'Crazyflie firmware update failed. Try again.'
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
    device_unknown: {
        id: 'gui.FirmwareFlasherDeviceComponent.device_unknown',
        description: ' ',
        defaultMessage: 'Unknown device'
    },
    flash_device: {
        id: 'gui.FirmwareFlasherDeviceComponent.flash_device',
        description: ' ',
        defaultMessage: 'Flash device'
    },
    firmware_not_available_mobile: {
        id: 'gui.SearchPanel.firmware_not_available_mobile',
        description: ' ',
        defaultMessage: 'Firmware update is unavailable in the Android app. Use the desktop version of Robbo Scratch for flashing.'
    },
    flashing_device: {
        id: 'gui.FirmwareFlasherDeviceComponent.flashing_device',
        description: ' ',
        defaultMessage: 'Flashing...'
    },

    update_firm_msg: {

        id: 'gui.RobboGui.update_firm_msg',
        description: ' ',
        defaultMessage: 'Please update  firmware.'
    },
    cr_firm_msg: {

        id: 'gui.RobboGui.cr_firm_msg',
        description: ' ',
        defaultMessage: '(current: {current_firmware} required: {required_firmware})'
    },
    differ_firm_msg: {

        id: 'gui.RobboGui.differ_firm_msg',
        description: ' ',
        defaultMessage: 'The current firmware version of the device differs from the required one.'
    },
    differ_firm_msg_device_maybe_incorrect: {

        id: 'gui.RobboGui.differ_firm_msg_device_maybe_incorrect',
        description: ' ',
        defaultMessage: 'Device may not work correctly.'
    },
    error: {

        id: 'gui.SearchPanel.error',
        description: ' ',
        defaultMessage: 'Error!'
    },
    firmware_verify_failed_try_again: {
        id: 'gui.SearchPanel.firmware_verify_failed_try_again',
        description: ' ',
        defaultMessage: 'Firmware was not updated. Try again?'
    },
    device_connected: {

        id: 'gui.SearchPanel.device_connected',
        description: ' ',
        defaultMessage: 'Device connected'
    },
    device_checking_serial: {

        id: 'gui.SearchPanel.device_checking_serial',
        description: ' ',
        defaultMessage: 'Checking serial number...'
    },
    device_no_response: {

        id: 'gui.SearchPanel.device_no_response',
        description: ' ',
        defaultMessage: 'Unknown device detected'
    },
    device_no_response_details: {

        id: 'gui.SearchPanel.device_no_response_details',
        description: ' ',
        defaultMessage: 'Firmware update is required.'
    },
    device_no_response_alert_details: {

        id: 'gui.SearchPanel.device_no_response_alert_details',
        description: ' ',
        defaultMessage: `A device connected to port {device_port} is not recognized by Robbo Scratch.
The device may have no firmware or non-standard firmware loaded.

Load standard Robbo Scratch firmware?`
    },
    device_connection_lost: {

        id: 'gui.SearchPanel.device_connection_lost',
        description: ' ',
        defaultMessage: 'Connection to device lost.'
    },
    device_port_error: {

        id: 'gui.SearchPanel.device_port_error',
        description: ' ',
        defaultMessage: 'Port error!'
    },
    milliseconds: {

        id: 'gui.SearchPanel.milliseconds',
        description: ' ',
        defaultMessage: ' ms'
    },
    bluetooth_linux_hint: {

        id: 'gui.SearchPanel.bluetooth_linux_hint',
        description: ' ',
        defaultMessage: 'Due to Linux specifics, Robbo Scratch must be run with root privileges.'
    },
    flashing_in_progress: {

        id: 'gui.SearchPanel.flashing_in_progress',
        description: ' ',
        defaultMessage: 'Attention!'
    },
    flashing_in_progress_details: {

        id: 'gui.SearchPanel.flashing_in_progress_details',
        description: ' ',
        defaultMessage: 'Flashing in progress.'
    },
    otto_flash_version_unchanged_try_arduino: {
        id: 'gui.SearchPanel.otto_flash_version_unchanged_try_arduino',
        description: ' ',
        defaultMessage: 'Version unchanged. Try flashing as Arduino?'
    },
    otto_flash_retry_arduino_log: {
        id: 'gui.SearchPanel.otto_flash_retry_arduino_log',
        description: ' ',
        defaultMessage: 'Version unchanged. Flashing as Arduino…'
    },
    device_try_to_reconnect: {


        id: 'gui.SearchPanel.device_try_to_reconnect',
        description: ' ',
        defaultMessage: 'Try reconnecting the device or use a different USB port.'

    },
    device_reconnecting: {
        id: 'gui.SearchPanel.device_reconnecting',
        description: ' ',
        defaultMessage: 'Connection lost, attempting to reconnect'
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
    },
    try_connect_to_port: {


        id: 'gui.SearchPanel.try_connect_to_port',
        description: ' ',
        defaultMessage: 'Connecting to port...'

    },
    port_opened: {


        id: 'gui.SearchPanel.port_opened',
        description: ' ',
        defaultMessage: 'Port opened'

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

class SearchPanelDeviceComponent extends Component {


    constructor() {
        super();

        this.state = {
            devices: [],
            deviceState: 0,
            deviceId: -1,
            deviceError: null,
            quadcopterConnected: false,
            quadcopterSearching: false,
            quadcopterState: 'disconnected',
            quadcopterLastError: null,
            quadcopterFlashStatus: null,
            quadcopterRowPhase: 'idle'
        };

        this.deviceId = -1;

        this.firmware_version_differs = false;

        this.firmware_version_differs_cb_result = {};

        this.isFlashing = false;
        this.flashSessionActive = false;
        this.flashSessionId = 0;
        this._activeFlashSessionId = null;
        this.flashStage = 'idle';
        this._flashConfigRef = null;

        this.isRasberry = false;

        this._quadcopterFirmwareVersionChecked = false;
        this._quadcopterFirmwareProbeInFlight = false;
        this._quadcopterFirmwarePrompted = false;
        this._quadcopterFirmwareFlashActive = false;
        this._debugMounted = false;

    }

    _isQuadcopterFirmwareFlowBlockingHide() {
        if (!this.props.isQuadcopter) return false;
        if (this._quadcopterFirmwareProbeInFlight) return true;
        if (this._quadcopterFirmwareFlashActive) return true;
        if (!this._quadcopterFirmwareVersionChecked) return true;
        return false;
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
            'Connecting…': messages.cf2_flash_connecting
        };
        if (map[headline]) {
            return this.props.intl.formatMessage(map[headline]);
        }
        return headline;
    }

    _getQuadcopterFlashWindowElements() {
        const cId = this.props.flashingStatusComponentId;
        const root = document.getElementById(`firmware-flasher-flashing-status-component-${cId}`);
        const {statusEl, logEl} = getFirmwareFlashLogElements(cId);
        return {root, statusEl, logEl};
    }

    _resetQuadcopterFlashWindow() {
        const { statusEl, logEl } = this._getQuadcopterFlashWindowElements();
        const started = this.props.intl.formatMessage(messages.quadcopter_firmware_flash_started);
        if (statusEl) {
            statusEl.innerHTML = started;
            setFlashLogStatusTone(statusEl, 'pending');
        }
        if (logEl) {
            logEl.innerHTML = '';
        }
    }

    onQuadcopterFlashingStatusChanged(line, meta) {
        const parsed = parseCf2FlashToolLine(line, meta);
        if (!parsed) {
            return;
        }
        const { statusEl, logEl } = this._getQuadcopterFlashWindowElements();
        if (parsed.headline && statusEl) {
            statusEl.innerHTML = this._translateCf2FlashHeadline(parsed.headline);
            setFlashLogStatusTone(statusEl, 'pending');
        }
        if (parsed.logLine && logEl) {
            const styles = { margin: '6px 10px', fontSize: '11px' };
            createDiv(logEl, null, null, null, null, styles, parsed.logLine, null);
            logEl.scrollTop = logEl.scrollHeight;
        }
    }

    _quadcopterFlashFinishUi(message, success) {
        const { statusEl } = this._getQuadcopterFlashWindowElements();
        if (statusEl) {
            statusEl.innerHTML = success
                ? this._translateCf2FlashHeadline('Firmware update complete')
                : message;
            setFlashLogStatusTone(statusEl, success ? 'success' : 'error');
        }
    }

    _shouldShowQuadcopterFlashStatusHint() {
        if (!this.state.quadcopterFlashStatus) {
            return false;
        }
        const phase = this.state.quadcopterRowPhase;
        if (phase === 'checking' || phase === 'connecting' || phase === 'flashing') {
            return false;
        }
        return true;
    }

    _raiseQuadcopterFlashingWindowZIndex() {
        const windowId = this.props.draggableWindowId;
        const el = document.getElementById(`draggable_window_id-${windowId}`);
        if (el) {
            applyRobboPopupZIndex(el);
        }
    }

    _openQuadcopterFlashingWindow() {
        const windowId = this.props.draggableWindowId;
        if (typeof this.props.onCreateDraggableWindow === 'function') {
            this.props.onCreateDraggableWindow(windowId);
        }
        const windowState = this.props.draggable_window && this.props.draggable_window[windowId];
        if ((!windowState || windowState.isShowing !== true) &&
            typeof this.props.onShowFlashingStatusWindow === 'function') {
            this.props.onShowFlashingStatusWindow(windowId);
        }
        this._raiseQuadcopterFlashingWindowZIndex();
        requestAnimationFrame(() => {
            this._raiseQuadcopterFlashingWindowZIndex();
        });
    }

    _isQuadcopterConnectErrorHintSuppressed() {
        return this._quadcopterFirmwareProbeInFlight === true ||
            this._quadcopterFirmwareFlashActive === true ||
            this.state.quadcopterRowPhase === 'checking' ||
            this.state.quadcopterRowPhase === 'flashing';
    }

    _logFlashFlow(source, status, extra = {}, always = false) {
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
        this.isFlashing = true;
        this._logFlashFlow('flashDevice', 'session_start', { mode }, true);
        return this._activeFlashSessionId;
    }

    _finishFlashSession(result) {
        this._logFlashFlow('statusCallback', 'session_finish', { result }, true);
        this.flashSessionActive = false;
        this.flashStage = 'done';
        this.isFlashing = false;
        this._activeFlashSessionId = null;
    }

    getDeviceName(deviceId) {
        switch (deviceId) {
            case 0: case 3: return this.props.intl.formatMessage(messages.device_robot);
            case 1: case 2: case 4: return this.props.intl.formatMessage(messages.device_lab);
            case 5: return this.props.intl.formatMessage(messages.device_otto);
            case 6: return this.props.intl.formatMessage(messages.device_arduino);
            default: return this.props.intl.formatMessage(messages.device_unknown);
        }
    }

    /** Жирная колонка в панели поиска: на Desktop — имя устройства (когда готово) + порт; в Web — тип устройства. */
    getSearchPanelRowTitle() {
        if (this.props.isQuadcopter) {
            return this.props.intl.formatMessage(messages.device_quadcopter);
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
            if (quadcopterRowPhase === 'checking') {
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
            if (this._quadcopterFirmwareProbeInFlight) {
                return {
                    iconSrc: './static/robbo_assets/yellow.png',
                    statusText: this.props.intl.formatMessage(messages.quadcopter_firmware_checking)
                };
            }
            if (this.props.QCA && typeof this.props.QCA.isQuadcopterPreflightActive === 'function' &&
                this.props.QCA.isQuadcopterPreflightActive()) {
                return {
                    iconSrc: './static/robbo_assets/yellow.png',
                    statusText: this.props.intl.formatMessage(messages.quadcopter_firmware_checking)
                };
            }
            if (effectiveSearching) {
                return { iconSrc: './static/robbo_assets/yellow.png', statusText: this.props.intl.formatMessage(messages.quadcopter_connecting) };
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
        const { deviceState, deviceId, deviceError } = this.state;
        let statusText = '';
        let iconSrc = './static/robbo_assets/yellow.png';
        if (deviceState === 6) {
            statusText = this.props.intl.formatMessage(messages.device_connected);
            iconSrc = './static/robbo_assets/green.png';
        } else if (deviceState === 0) {
            statusText = this.props.intl.formatMessage(messages.try_connect_to_port);
        } else if (deviceState === 2) {
            statusText = this.props.intl.formatMessage(messages.port_opened);
        } else if (deviceState === 3) {
            statusText = this.props.intl.formatMessage(messages.device_checking_serial);
        } else if (deviceState === 8) {
            if (deviceError && deviceError.code === 1) {
                statusText = this.props.intl.formatMessage(messages.device_reconnecting);
            } else {
                statusText = this.props.intl.formatMessage(messages.device_no_response);
                iconSrc = './static/robbo_assets/red.png';
            }
        } else if (deviceState === 7) {
            statusText = this.props.intl.formatMessage(messages.device_port_error);
            iconSrc = './static/robbo_assets/red.png';
        } else if (deviceState === 9) {
            statusText = this.props.intl.formatMessage(messages.device_reconnecting);
        } else if (deviceState === 10) {
            statusText = this.props.intl.formatMessage(messages.flashing_in_progress_details);
            iconSrc = './static/robbo_assets/yellow.png';
            console.warn('[FLASH_ICON] getStatusDisplay: deviceState=10 FLASHING -> yellow icon, port=' + (this.props.devicePort || ''));
        }
        return { iconSrc, statusText };
    }

    // Hide search panel when all DCA devices are ready; if dongle row is shown, require copter connected (not searching).
    _tryHideSearchPanelWhenAllDevicesReady() {
        if (this._isQuadcopterFirmwareFlowBlockingHide()) {
            return;
        }
        if (!this.props.DCA) return;
        const allDevices = this.props.DCA.getDevices();
        for (let i = 0; i < allDevices.length; i++) {
            const dev = allDevices[i];
            if (!(dev.getState() === 6 && !dev.isFirmwareVersionDiffers())) {
                return;
            }
        }
        if (this.props.QCA && typeof this.props.QCA.isDongleAvailable === 'function' && this.props.QCA.isDongleAvailable()) {
            if (typeof this.props.QCA.isQuadcopterConnected !== 'function' || !this.props.QCA.isQuadcopterConnected()) {
                return;
            }
            if (typeof this.props.QCA.isQuadcopterSearching === 'function' && this.props.QCA.isQuadcopterSearching()) {
                return;
            }
        }
        hideSearchPanel();
    }

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
            this._quadcopterConnectFailureHandled = false;
            this.setState({
                quadcopterLastError: null,
                quadcopterFlashStatus: null,
                quadcopterRowPhase: 'connecting'
            });
        }
    }

    componentWillUnmount() {
        this._debugMounted = false;
        if (this.props.isQuadcopter && this.props.QCA && this._quadcopterStatusCallback &&
            typeof this.props.QCA.unregisterQuadcopterStatusChangeCallback === 'function') {
            this.props.QCA.unregisterQuadcopterStatusChangeCallback(this._quadcopterStatusCallback);
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
        this.QCA = this.props.QCA;
        this.OCA = this.props.OCA;
        this.ACA = this.props.ACA;

        this.dots_counter = 1;

        if (this.props.isQuadcopter && this.props.QCA) {
            this._lastQuadcopterConnected = null;
            this._lastQuadcopterSearching = null;
            this._lastQuadcopterState = null;
            this._quadcopterStatusCallback = (state, searching, snapshot) => {
                const nextSnapshot = snapshot || {};
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
                const preflightActive = typeof this.props.QCA.isQuadcopterPreflightActive === 'function' &&
                    this.props.QCA.isQuadcopterPreflightActive();
                const suppressConnectError = this._quadcopterFirmwareProbeInFlight === true ||
                    this._quadcopterFirmwareFlashActive === true ||
                    preflightActive ||
                    this.state.quadcopterRowPhase === 'checking' ||
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
                    let nextRowPhase = 'idle';
                    if (isSearching) {
                        nextRowPhase = 'connecting';
                    } else if (connected) {
                        nextRowPhase = 'connected';
                    } else if (preflightActive || this._quadcopterFirmwareProbeInFlight) {
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
                    this._maybeCheckFirmwareAfterConnectFailure();
                } else if (connected && !isSearching) {
                    this._quadcopterFirmwareVersionChecked = true;
                    this._quadcopterFirmwareProbeInFlight = false;
                    this._quadcopterFirmwareFlashActive = false;
                    if (this._debugMounted === true) {
                        this.setState({
                            quadcopterLastError: null,
                            quadcopterFlashStatus: null,
                            quadcopterRowPhase: 'connected'
                        });
                    }
                    this._tryHideSearchPanelWhenAllDevicesReady();
                }
            };
            this.props.QCA.registerQuadcopterStatusChangeCallback(this._quadcopterStatusCallback);
            if (typeof this.props.QCA.isQuadcopterPreflightActive === 'function' &&
                this.props.QCA.isQuadcopterPreflightActive()) {
                this.setState({ quadcopterRowPhase: 'checking' });
            }
        }

        if (!this.props.isQuadcopter && this.props.DCA) {
            this.props.DCA.registerDeviceStatusChangeCallback(this.props.devicePort, this.onStatusChange.bind(this));
            this.props.DCA.registerFirmwareVersionDiffersCallback(this.props.devicePort, (result) => {
                this.firmware_version_differs = true;
                this.firmware_version_differs_cb_result = result;
                if (this.flashSessionActive) {
                    this._logFlashFlow('firmwareVersionDiffersCb', 'ignored_due_to_active_session', {
                        currentFirmware: result.current_device_firmware,
                        requiredFirmware: result.need_firmware
                    }, true);
                    return;
                }
                let info_field = document.getElementById(`search-panel-device-info-${this.props.Id}`);
                if (info_field) {
                    info_field.style.display = "inline-block";
                    info_field.innerHTML = this.props.intl.formatMessage(messages.differ_firm_msg) + "<br/><br/>" + this.props.intl.formatMessage(messages.cr_firm_msg, { current_firmware: result.current_device_firmware, required_firmware: result.need_firmware }) + "<br/><br/>" + this.props.intl.formatMessage(messages.differ_firm_msg_device_maybe_incorrect) + "<br/><br/>" + this.props.intl.formatMessage(messages.update_firm_msg);
                }
                var flashing_button = document.getElementById(`search-panel-device-flash-button-${this.props.Id}`);
                if (flashing_button) setFlashButtonVisualMode(flashing_button, 'default');
            });
        }

        if (!this.props.isQuadcopter) {
            this.syncStateFromDevice();
        }



        this.props.onCreateDraggableWindow(this.props.draggableWindowId);






        //    this.props.DCA.registerFirmwareVersionDiffersCallback(this.props.devicePort, (result) => {


        //  this.firmware_version_differs = true;     
        //  this.firmware_version_differs_cb_result = result;  


        // let info_field = document.getElementById(`search-panel-device-info-${this.props.Id}`);

        //  info_field.style.display = "inline-block";


        // info_field.innerHTML = this.props.intl.formatMessage(messages.differ_firm_msg) + "<br/><br/>" + this.props.intl.formatMessage(messages.cr_firm_msg,{current_firmware:result.current_device_firmware,required_firmware:result.need_firmware}) +  "<br/><br/>" + this.props.intl.formatMessage(messages.differ_firm_msg_device_maybe_incorrect) + "<br/><br/>" + this.props.intl.formatMessage(messages.update_firm_msg);


        // var flashing_button =  document.getElementById(`search-panel-device-flash-button-${this.props.Id}`);
        // flashing_button.style.backgroundColor = "";  




        //      });
    }

    _quadcopterConnectFailureStatusText(info) {
        const err = this.state.quadcopterLastError;
        if (err && err.message) {
            return String(err.message);
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
        this._quadcopterFirmwareVersionChecked = true;

        if (!info || info.supported !== true || !info.needsUpdate) {
            if (this._debugMounted === true) {
                this.setState({
                    quadcopterFlashStatus: this._quadcopterConnectFailureStatusText(info),
                    quadcopterRowPhase: 'idle'
                });
            }
            return;
        }

        if (this._debugMounted === true) {
            const currentUi = this._getQuadcopterCurrentVersionForUi(info);
            if (currentUi && info.required) {
                this.setState({
                    quadcopterLastError: null,
                    quadcopterFlashStatus: this.props.intl.formatMessage(messages.quadcopter_firmware_versions_line, {
                        current: currentUi,
                        required: info.required
                    }),
                    quadcopterRowPhase: 'checking'
                });
            } else if (info.required) {
                this.setState({
                    quadcopterLastError: null,
                    quadcopterFlashStatus: this.props.intl.formatMessage(messages.quadcopter_firmware_version_unknown, {
                        required: info.required
                    }),
                    quadcopterRowPhase: 'checking'
                });
            }
        }
        if (!info.required) {
            return;
        }

        this._quadcopterFirmwarePrompted = true;
        try {
            const currentUi = this._getQuadcopterCurrentVersionForUi(info);
            const promptText = this.props.intl.formatMessage(messages.quadcopter_firmware_update_prompt, {
                current: currentUi || '?',
                required: info.required
            });
            const warning = this.props.intl.formatMessage(messages.quadcopter_firmware_update_warning);
            const ok = confirm(promptText + '\n\n' + warning);
            if (ok) {
                this.flashDevice('quadcopter_auto');
                return;
            }
            this._quadcopterFirmwarePrompted = false;
            if (this._debugMounted === true) {
                this.setState({
                    quadcopterFlashStatus: this._quadcopterConnectFailureStatusText(info),
                    quadcopterRowPhase: 'idle'
                });
            }
        } catch (confirmErr) {
            console.error('[CF2 firmware] confirm failed', confirmErr);
        }
    }

    _maybeCheckFirmwareAfterConnectFailure() {
        if (!this.props.isQuadcopter || !this.props.QCA) return;
        if (this._quadcopterFirmwareVersionChecked) return;
        if (this._quadcopterFirmwarePrompted) return;
        if (this._quadcopterFirmwareProbeInFlight) return;
        if (typeof this.props.QCA.isQuadcopterConnected === 'function' &&
            this.props.QCA.isQuadcopterConnected()) {
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
        runProbe({ onLine: () => {} })
            .then((info) => {
                this._applyQuadcopterFirmwareAfterConnectFailure(info, probeEpoch);
            })
            .catch(() => {
                this._quadcopterFirmwareVersionChecked = true;
                if (this._debugMounted === true) {
                    this.setState({
                        quadcopterFlashStatus: this._quadcopterConnectFailureStatusText(null),
                        quadcopterRowPhase: 'idle'
                    });
                }
            })
            .finally(() => {
                this._quadcopterFirmwareProbeInFlight = false;
            });
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
        this.setState({ deviceState: state, deviceId, deviceError: error });

        if (!this.props.isQuadcopter && !this.flashSessionActive) {
            if (state === 6) {
                notifySearchButtonFeedback('connected');
            } else if (state === 7) {
                notifySearchButtonFeedback('error');
            } else if (state === 8 && !(error && error.code === 1)) {
                notifySearchButtonFeedback('error');
            }
        }

        let status_field = document.getElementById(`search-panel-device-status-${this.props.Id}`);
        let info_field = document.getElementById(`search-panel-device-info-${this.props.Id}`);
        let flashing_button = document.getElementById(`search-panel-device-flash-button-${this.props.Id}`);
        let flashing_show_details_icon = document.getElementById(`search-panel-flashing-show-details-${this.props.Id}`);
        let device_status_icon = document.getElementById(`search-panel-device-status-icon-${this.props.Id}`);
        let search_device_button = document.getElementById(`robbo_search_devices`);

        if (!status_field || !device_status_icon) return;
        if (!this.props.isQuadcopter && !info_field) return;

        const unlockMenuBarSearch = () => {
            if (search_device_button) {
                search_device_button.style.pointerEvents = 'none';
                search_device_button.style.pointerEvents = 'auto';
                search_device_button.removeAttribute('disabled');
            }
        };
        const hasFirmwareUi = Boolean(
            flashing_button && flashing_show_details_icon && info_field && !this.props.isQuadcopter
        );

        let device_name = "";

        // Используем deviceId, полученный напрямую от устройства
        switch (deviceId) {

            case -1:

                device_name = this.props.intl.formatMessage(messages.device_unknown);

                break;

            case 0:

                device_name = this.props.intl.formatMessage(messages.device_robot);

                break;

            case 1:

                device_name = this.props.intl.formatMessage(messages.device_lab);

                break;

            case 2:

                device_name = this.props.intl.formatMessage(messages.device_lab);

                break;

            case 3:

                device_name = this.props.intl.formatMessage(messages.device_robot);

                break;

            case 4:

                device_name = this.props.intl.formatMessage(messages.device_lab);

                break;

            case 5:

                device_name = this.props.intl.formatMessage(messages.device_otto);

                break;

            case 6:

                device_name = this.props.intl.formatMessage(messages.device_arduino);

                break;


            default:

        }

        if ([0, 2, 6, 8].indexOf(state) !== -1) {
            this._logFlashFlow('onStatusChange', 'state_received', { state, hasError: !!error });
        }

        if (state == 0) {
            if (this.flashSessionActive) {
                this._logFlashFlow('onStatusChange', 'state0_ignored_due_to_active_session', { state }, true);
                return;
            }
            this.firmware_version_differs = false;
            this.isFlashing = false;
            if (info_field) {
                info_field.innerHTML = '';
                info_field.style.display = 'none';
            }

            if (hasFirmwareUi) {
                setFlashButtonVisualMode(flashing_button, 'default');
                flashing_button.innerText = this.props.intl.formatMessage(messages.flash_device);
                flashing_show_details_icon.style.display = 'none';
                flashing_button.style.display = 'none';
                this.flashingHideDetails();
            }


        } else if (state == 2) {
            if (this.flashSessionActive) {
                this._logFlashFlow('onStatusChange', 'state2_ignored_due_to_active_session', { state }, true);
                return;
            }
            this.firmware_version_differs = false;
            this.isFlashing = false;
            if (info_field) {
                info_field.innerHTML = '';
                info_field.style.display = 'none';
            }

            if (hasFirmwareUi) {
                setFlashButtonVisualMode(flashing_button, 'default');
                flashing_button.innerText = this.props.intl.formatMessage(messages.flash_device);
                flashing_show_details_icon.style.display = 'none';
                flashing_button.style.display = 'none';
                this.flashingHideDetails();
            }


        } else if (state == 3) {


        } else if (state == 6) {
            if (this.flashSessionActive) {
                this._logFlashFlow('onStatusChange', 'state6_ignored_due_to_active_session', { state }, true);
                return;
            }
            unlockMenuBarSearch();
            let result = this.firmware_version_differs_cb_result;
            if (!this.firmware_version_differs && info_field) {
                info_field.innerHTML = '';
            }

            let need_flash_device = false;
            if (hasFirmwareUi && this.firmware_version_differs &&
                this.props.devicePort.indexOf('rfcomm') === -1 &&
                !this.props.isMacBluetooth && !this.props.isBluetooth && !this.isRasberry) {
                const firm_differs_msg = this.props.intl.formatMessage(messages.differ_firm_msg) +
                    this.props.intl.formatMessage(messages.cr_firm_msg, {
                        current_firmware: result.current_device_firmware,
                        required_firmware: result.need_firmware
                    }) +
                    this.props.intl.formatMessage(messages.flash_device) + '?';

                flashing_show_details_icon.style.display = 'inline-block';
                flashing_button.style.display = 'inline-block';
                need_flash_device = confirm(firm_differs_msg);
            }



            if (need_flash_device) {

                if (deviceId === 5) {
                    this.flashDevice('auto');
                } else {
                    this.flashDevice();
                }

            } else if (!this.firmware_version_differs) { //We don't need to close panel if firmware versions differ.

                this._tryHideSearchPanelWhenAllDevicesReady();

            }


        } else if (state == 9) { //Reconnecting (state - RECONNECTING)

            unlockMenuBarSearch();

            let info_field_local = document.getElementById(`search-panel-device-info-${this.props.Id}`);
            showSearchPanel();

            if (hasFirmwareUi) {
                flashing_show_details_icon.style.display = 'none';
                flashing_button.style.display = 'none';
            }

            if (info_field_local) {
                info_field_local.style.display = "none";
                info_field_local.innerHTML = "";
            }

        } else if (state == 8) { //Port doesn't respond (state - TIMEOUT)
            if (this.flashSessionActive) {
                this._logFlashFlow('onStatusChange', 'state8_ignored_due_to_active_session', { state }, true);
                return;
            }

            unlockMenuBarSearch();

            let info_field_local = document.getElementById(`search-panel-device-info-${this.props.Id}`);

            if (info_field_local) info_field_local.style.display = "inline-block";

            if (error && error.code == 1 && (!this.isFlashing)) { //Device was good but connection lost.

                showSearchPanel();

                if (info_field) {
                    info_field.innerHTML = '';
                    info_field.style.display = 'none';
                }
                if (hasFirmwareUi) {
                    flashing_show_details_icon.style.display = 'none';
                    flashing_button.style.display = 'none';
                }

            } else if (error && error.code == -1) { //We cann't get any usefull info from the device




                let DEVICE_HANDLE_TIMEOUT = this.DCA.getTimeoutVars().DEVICE_HANDLE_TIMEOUT;

                //  info_field.innerHTML = this.props.intl.formatMessage(messages.device_no_response_details) + " " + DEVICE_HANDLE_TIMEOUT
                //         + " " + this.props.intl.formatMessage(messages.milliseconds);

                if (info_field) {
                    if (this.props.isBluetooth) {
                        info_field.innerHTML = this.props.intl.formatMessage(messages.device_cannot_open_old_bluetooth_com);
                    } else {
                        info_field.innerHTML = this.props.intl.formatMessage(messages.device_no_response_details);
                    }
                }

                let need_flash_device = false;

                if (hasFirmwareUi &&
                    this.props.devicePort.indexOf('rfcomm') === -1 &&
                    !this.props.isMacBluetooth && !this.props.isBluetooth && !this.isRasberry) {
                    const need_to_flash_msg = this.props.intl.formatMessage(
                        messages.device_no_response_alert_details,
                        {device_port: this.props.devicePort}
                    );

                    flashing_show_details_icon.style.display = 'inline-block';
                    flashing_button.style.display = 'inline-block';
                    need_flash_device = confirm(need_to_flash_msg);
                }


                if (need_flash_device) {

                    if (deviceId === 5) {
                        this.flashDevice('auto');
                    } else {
                        this.flashDevice();
                    }

                }

            }



        } else if (state == 7) {

            unlockMenuBarSearch();

            let info_field = document.getElementById(`search-panel-device-info-${this.props.Id}`);

            if (info_field) info_field.style.display = "inline-block";

            //  if (this.props.devicePort.indexOf("rfcom") != -1){

            //         flashing_show_details_icon.style.display = "none";
            //         flashing_button.style.display = "none";



            //     }



            if (hasFirmwareUi) {
                flashing_show_details_icon.style.display = 'none';
                flashing_button.style.display = 'none';
            }

            if (error && info_field && (this.props.devicePort.indexOf("rfcom") != -1) && (error.msg && error.msg.indexOf("cannot open /dev/rfcom") != -1)) {

                info_field.innerHTML = error.msg + "<br/>" + this.props.intl.formatMessage(messages.bluetooth_linux_hint);

            } else if (error && (this.props.isBluetooth) && (this.props.devicePort.indexOf("bluetooth_") !== -1)) {

                // Используем интернационализированное сообщение на основе кода ошибки
                let errorMessage = error.msg || '';
                if (error.errorCode) {
                    const errorCode = error.errorCode;
                    let messageKey = null;

                    switch (errorCode) {
                        case '274C':
                            messageKey = messages.bluetooth_error_274C;
                            break;
                        case '274D':
                            messageKey = messages.bluetooth_error_274D;
                            break;
                        case '2711':
                            messageKey = messages.bluetooth_error_2711;
                            break;
                        case '2740':
                            messageKey = messages.bluetooth_error_2740;
                            break;
                        case 'CONNECTION_ERROR':
                            messageKey = messages.bluetooth_error_connection;
                            break;
                        case 'ALREADY_CONNECTED':
                            messageKey = messages.bluetooth_error_already_connected;
                            break;
                    }

                    if (messageKey) {
                        errorMessage = this.props.intl.formatMessage(messageKey);
                    }
                }

                info_field.innerHTML = errorMessage;

            }

            else if (error) {

                info_field.innerHTML = error.msg + "<br/>" + this.props.intl.formatMessage(messages.device_try_to_reconnect);

            }

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
            this.props.QCA.searchQuadcopterDevices();
        }
    }


    flashingShowDetails() {
        const windowState = this.props.draggable_window && this.props.draggable_window[this.props.draggableWindowId];
        if (windowState && windowState.isShowing !== true) {
            this._logFlashFlow('flashWindow', 'show', { reason: 'manual_open' });
            this.props.onShowFlashingStatusWindow(this.props.draggableWindowId);
        }
    }

    flashingHideDetails() {
        const windowState = this.props.draggable_window && this.props.draggable_window[this.props.draggableWindowId];
        if (windowState && windowState.isShowing === true) {
            this._logFlashFlow('flashWindow', 'hide', { reason: 'ui_state_change' });
            this.props.onHideFlashingStatusWindow(this.props.draggableWindowId);
        }
    }

    onFlashingStatusChanged(status) {
        if (this.props.isQuadcopter) {
            this.onQuadcopterFlashingStatusChanged(status);
            return;
        }

        var cId = this.props.flashingStatusComponentId;

        const {statusEl: flashingStatusComponent, logEl: flashingLogComponent} = getFirmwareFlashLogElements(cId);

        var block_ids_component = null;

        //flashingStatusComponent.innerHTML = "";
        //flashingLogComponent.innerHTML = "";





        var styles = {

            margin: '10px'

        }

        if ((status.indexOf("Block") == -1) && (status.indexOf("Error") == -1) && (status.indexOf("Uploading") == -1) && (status.indexOf("Port closed") == -1)) {

            if (flashingLogComponent) createDiv(flashingLogComponent, null, null, null, null, styles, status, null);

            var dots = "";

            for (var i = 0; i < this.dots_counter; i++) {

                dots += ".";
            }

            if (flashingStatusComponent) flashingStatusComponent.innerHTML = "Waiting.." + dots;

            if (this.dots_counter == 1) {

                this.dots_counter = 2;

            } else {

                this.dots_counter = 1;

            }

        } else {

            if (flashingStatusComponent) flashingStatusComponent.innerHTML = status;

        }

        if (flashingLogComponent) flashingLogComponent.scrollTop = flashingLogComponent.scrollHeight;

        var search_device_button = document.getElementById(`robbo_search_devices`);
        var flashing_button = document.getElementById(`search-panel-device-flash-button-${this.props.Id}`);

        if ((status.indexOf("Port closed") !== -1)) {

            setFlashLogStatusTone(flashingStatusComponent, 'success');

            if (search_device_button) search_device_button.removeAttribute("disabled");

            if (flashing_button) {
                setFlashButtonVisualMode(flashing_button, 'default');
                flashing_button.removeAttribute("disabled");
                flashing_button.style.display = "inline-block";
            }

            // Обновляем список устройств, но окно поиска должно оставаться скрытым
            // (как на Desktop после успешной прошивки).
            try {
                hideSearchPanel();
            } catch (_) { }
            this.searchDevices(false); //search devices (hidden)

        } else if ((status.indexOf("Error") !== -1)) {

            setFlashLogStatusTone(flashingStatusComponent, 'error');
            if (search_device_button) search_device_button.removeAttribute("disabled");

            if (flashing_button) {
                setFlashButtonVisualMode(flashing_button, 'error');
                flashing_button.innerText = this.props.intl.formatMessage(messages.error);
                flashing_button.removeAttribute("disabled");
            }

            let device_status_icon = document.getElementById(`search-panel-device-status-icon-${this.props.Id}`);
            if (device_status_icon) device_status_icon.innerHTML = `<img src = "./static/robbo_assets/red.png" />`;

            showSearchPanel();

        } else {

            setFlashLogStatusTone(flashingStatusComponent, 'pending');

        }



    }

    _buildFlashConfig(ottoFlashMode) {
        const config = { device: {} };
        config.device.device_id = this.deviceId;
        const firmwareSettings = getFirmwareSettingsFromRuntime(this.props.VM && this.props.VM.runtime ? this.props.VM.runtime : null);
        config.device.detect_timeout_ms = firmwareSettings.detect_timeout_ms;
        config.device.block_transmit_delay = firmwareSettings.block_transmit_delay;
        if (this.deviceId === 5) {
            const useNullLab = ottoFlashMode === 'null_lab' || ottoFlashMode === 'auto';
            config.device.use_null_lab = useNullLab;
            if (useNullLab) {
                config.device.baud_rate = firmwareSettings.baud_rate;
            }
        }
        return config;
    }

    flashDevice(ottoFlashMode) {
        if (this.props.isQuadcopter) {
            this.flashQuadcopterFirmware(ottoFlashMode);
            return;
        }
        if (this.props.disableFirmwareUi) {
            let status_field = document.getElementById(`search-panel-device-status-${this.props.Id}`);
            let info_field = document.getElementById(`search-panel-device-info-${this.props.Id}`);
            if (status_field) {
                status_field.innerHTML = this.props.intl.formatMessage(messages.device_connected);
            }
            if (info_field) {
                info_field.style.display = "block";
                info_field.innerHTML = this.props.intl.formatMessage(messages.firmware_not_available_mobile);
            }
            return;
        }

        const flashMode = ottoFlashMode || 'default';
        if (this.flashSessionActive) {
            this._logFlashFlow('flashDevice', 'ignored_parallel_start', { mode: flashMode }, true);
            return;
        }

        const initialStage = (this.deviceId === 5 && flashMode === 'auto') ? 'null_lab' : 'single';
        const currentSessionId = this._startFlashSession(initialStage, flashMode);

        if (this.props.onShowFlashingStatusWindow) {
            this._logFlashFlow('flashWindow', 'show', { reason: 'flash_start' });
            this.props.onShowFlashingStatusWindow(this.props.draggableWindowId);
        }

        var search_device_button = document.getElementById(`robbo_search_devices`);
        if (search_device_button) search_device_button.setAttribute("disabled", "disabled");

        var flashing_button = document.getElementById(`search-panel-device-flash-button-${this.props.Id}`);
        if (flashing_button) {
            flashing_button.setAttribute("disabled", "disabled");
            setFlashButtonVisualMode(flashing_button, 'busy');
            flashing_button.innerText = this.props.intl.formatMessage(messages.flashing_device);
        }

        let status_field = document.getElementById(`search-panel-device-status-${this.props.Id}`);
        let info_field = document.getElementById(`search-panel-device-info-${this.props.Id}`);
        if (status_field) status_field.innerHTML = this.props.intl.formatMessage(messages.flashing_in_progress);
        if (info_field) info_field.innerHTML = "";

        // Иконку не трогаем через innerHTML — она управляется React по deviceState (state 10 приходит из disco() в VM)
        var cId = this.props.flashingStatusComponentId;
        const {statusEl: flashingStatusComponent, logEl: flashingLogComponent} = getFirmwareFlashLogElements(cId);

        if (flashingStatusComponent) flashingStatusComponent.innerHTML = "";
        if (flashingLogComponent) flashingLogComponent.innerHTML = "";

        var config = this._buildFlashConfig(flashMode);
        config.device.flash_session_id = currentSessionId;
        this._flashConfigRef = config;
        this.dots_counter = 1;

        this._logFlashFlow('flashDevice', 'start_flash', {
            sessionId: currentSessionId,
            mode: flashMode,
            useNullLab: !!(config && config.device && config.device.use_null_lab)
        }, true);

        var styles = { margin: '10px' };

        this.RCA.stopDataRecievingProcess();
        this.LCA.stopDataRecievingProcess();
        this.OCA.stopDataRecievingProcess();
        this.ACA.stopDataRecievingProcess();

        const suppressVerifyConfirmInAutoFlow = (this.deviceId === 5 && flashMode === 'auto');
        var statusCallback = (status) => {
            if (!this.flashSessionActive || this._activeFlashSessionId !== currentSessionId) {
                this._logFlashFlow('statusCallback', 'ignored_stale_session', { status, callbackSessionId: currentSessionId }, true);
                return;
            }
            this._logFlashFlow('statusCallback', 'status', { status });

            if ((status.indexOf("Block") == -1) && (status.indexOf("Error") == -1) && (status.indexOf("Uploading") == -1) && (status.indexOf("Port closed") == -1)) {
                if (flashingLogComponent) createDiv(flashingLogComponent, null, null, null, null, styles, status, null);
                var dots = "";
                for (var i = 0; i < this.dots_counter; i++) {
                    dots += ".";
                }
                if (flashingStatusComponent) flashingStatusComponent.innerHTML = "Waiting.." + dots;
                this.dots_counter = this.dots_counter == 1 ? 2 : 1;
            } else {
                if (flashingStatusComponent) flashingStatusComponent.innerHTML = status;
            }

            if (flashingLogComponent) flashingLogComponent.scrollTop = flashingLogComponent.scrollHeight;

            if ((status.indexOf("Port closed") !== -1)) {
                setFlashLogStatusTone(flashingStatusComponent, 'success');
                if (search_device_button) search_device_button.removeAttribute("disabled");
                if (flashing_button) {
                    setFlashButtonVisualMode(flashing_button, 'default');
                    flashing_button.removeAttribute("disabled");
                    flashing_button.style.display = "inline-block";
                }
                this._finishFlashSession('success');
                // Web-отладка: после успешной прошивки в некоторых сценариях
                // событие state==0/2 в onStatusChange приходит позже, поэтому
                // окно прошивки/поля статуса не сбрасываются автоматически.
                // Явно скрываем окно и очищаем DOM-поля, чтобы поведение стало
                // как на Desktop.
                try {
                    this.flashingHideDetails();
                } catch (_) { }
                if (status_field) {
                    status_field.innerHTML = this.props.intl.formatMessage(messages.device_connected);
                }
                if (info_field) {
                    info_field.innerHTML = "";
                    info_field.style.display = "none";
                }
                // Обновляем список устройств, но окно поиска должно оставаться скрытым
                // (как на Desktop после успешной прошивки).
                try {
                    hideSearchPanel();
                } catch (_) { }
                this.searchDevices(false);
            } else if ((status.indexOf("Error") !== -1)) {
                setFlashLogStatusTone(flashingStatusComponent, 'error');
                if (search_device_button) search_device_button.removeAttribute("disabled");

                if (flashing_button) {
                    setFlashButtonVisualMode(flashing_button, 'error');
                    flashing_button.innerText = this.props.intl.formatMessage(messages.error);
                    flashing_button.removeAttribute("disabled");
                }

                this.setState({ deviceState: 8 });

                showSearchPanel();

                var isVerifyFailure = (status.indexOf("Firmware was not updated") !== -1) || (status.indexOf("verification timeout") !== -1);
                if (isVerifyFailure) {
                    if (!suppressVerifyConfirmInAutoFlow) {
                        const tryAgain = confirm(this.props.intl.formatMessage(messages.firmware_verify_failed_try_again));
                        this._logFlashFlow('statusCallback', 'verify_failure_confirm', { tryAgain }, true);
                        if (tryAgain) {
                            this.RCA.stopDataRecievingProcess();
                            this.LCA.stopDataRecievingProcess();
                            this.OCA.stopDataRecievingProcess();
                            this.ACA.stopDataRecievingProcess();
                            var retryConfig = this._flashConfigRef || config;
                            if (retryConfig && retryConfig.device && retryConfig.device.flash_session_id == null) {
                                retryConfig.device.flash_session_id = currentSessionId;
                            }
                            this.flashStage = 'manual_retry';
                            this._logFlashFlow('statusCallback', 'manual_retry_start', {
                                useNullLab: !!(retryConfig && retryConfig.device && retryConfig.device.use_null_lab)
                            }, true);
                            this.DCA.flashFirmwareWithDisconnect(this.props.devicePort, retryConfig, statusCallback);
                            return;
                        }
                    } else {
                        this._logFlashFlow('statusCallback', 'verify_failure_auto_no_confirm', {
                            stage: this.flashStage
                        }, true);
                    }
                }

                this._finishFlashSession('error');
            } else {
                setFlashLogStatusTone(flashingStatusComponent, 'pending');
                if (status.indexOf("Upload complete. Verifying") !== -1) {
                    this.flashStage = 'verify';
                    this._logFlashFlow('statusCallback', 'verify_started_search_suppressed', {}, true);
                }
            }
        };

        var onVerifyFailure = null;
        if (this.deviceId === 5 && flashMode === 'auto') {
            onVerifyFailure = (verifyContext = {}) => {
                if (!this.flashSessionActive || this._activeFlashSessionId !== currentSessionId) {
                    this._logFlashFlow('onVerifyFailure', 'ignored_stale_session', { callbackSessionId: currentSessionId }, true);
                    return;
                }
                this._logFlashFlow('onVerifyFailure', 'triggered', verifyContext, true);
                if (flashingLogComponent) {
                    createDiv(flashingLogComponent, null, null, null, null, styles, this.props.intl.formatMessage(messages.otto_flash_retry_arduino_log), null);
                    flashingLogComponent.scrollTop = flashingLogComponent.scrollHeight;
                }
                this.RCA.stopDataRecievingProcess();
                this.LCA.stopDataRecievingProcess();
                this.OCA.stopDataRecievingProcess();
                this.ACA.stopDataRecievingProcess();
                var arduinoConfig = this._buildFlashConfig('arduino');
                arduinoConfig.device.flash_session_id = currentSessionId;
                this._flashConfigRef = arduinoConfig;
                this.flashStage = 'retry_wait';
                setTimeout(() => {
                    if (!this.flashSessionActive || this._activeFlashSessionId !== currentSessionId) {
                        this._logFlashFlow('onVerifyFailure', 'retry_delay_skipped_stale_session', { callbackSessionId: currentSessionId }, true);
                        return;
                    }
                    this.flashStage = 'arduino_retry';
                    this._logFlashFlow('onVerifyFailure', 'start_arduino_retry', {
                        useNullLab: !!(arduinoConfig && arduinoConfig.device && arduinoConfig.device.use_null_lab),
                        delayMs: AUTO_RETRY_START_DELAY_MS
                    }, true);
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

        // this.DCA.flashFirmware(this.props.devicePort,config,this.onFlashingStatusChanged.bind(this, dots_counter));

    }

    flashQuadcopterFirmware(_mode) {
        if (!this.props.QCA || typeof this.props.QCA.flashBundledFirmware !== 'function') {
            this.setState({ quadcopterFlashStatus: this.props.intl.formatMessage(messages.quadcopter_firmware_flash_failed) });
            return;
        }
        if (typeof this.props.QCA.isFirmwareFlashingSupported === 'function' && !this.props.QCA.isFirmwareFlashingSupported()) {
            this.setState({ quadcopterFlashStatus: this.props.intl.formatMessage(messages.quadcopter_firmware_flash_failed) });
            return;
        }

        if (_mode !== 'quadcopter_auto') {
            const warning = this.props.intl.formatMessage(messages.quadcopter_firmware_update_warning);
            const ok = confirm(warning);
            if (!ok) return;
        }

        this._quadcopterFirmwareFlashActive = true;
        this.setState({
            quadcopterLastError: null,
            quadcopterFlashStatus: null,
            quadcopterRowPhase: 'flashing'
        });
        this._openQuadcopterFlashingWindow();

        setTimeout(() => {
            if (this._debugMounted !== true) {
                return;
            }
            this._resetQuadcopterFlashWindow();
        }, 0);

        this.props.QCA.flashBundledFirmware({
            onLine: (line, meta) => {
                if (line && typeof line === 'string') {
                    this.onQuadcopterFlashingStatusChanged(line, meta || {});
                }
            }
        }).then((ok) => {
            if (ok) {
                const probe = typeof this.props.QCA.getLastFirmwareProbe === 'function'
                    ? this.props.QCA.getLastFirmwareProbe()
                    : null;
                const currentUi = probe ? this._getQuadcopterCurrentVersionForUi(probe) : null;
                if (probe && currentUi && probe.required) {
                    const doneMsg = this.props.intl.formatMessage(messages.quadcopter_firmware_versions_line, {
                        current: currentUi,
                        required: probe.required
                    });
                    if (this._debugMounted === true) {
                        this.setState({ quadcopterFlashStatus: doneMsg, quadcopterRowPhase: 'flashDone' });
                    }
                    this._quadcopterFlashFinishUi(doneMsg, true);
                } else {
                    const doneMsg = this.props.intl.formatMessage(messages.quadcopter_firmware_flash_done);
                    if (this._debugMounted === true) {
                        this.setState({ quadcopterFlashStatus: doneMsg, quadcopterRowPhase: 'flashDone' });
                    }
                    this._quadcopterFlashFinishUi(doneMsg, true);
                }
                this._quadcopterFirmwareVersionChecked = true;
                this._quadcopterFirmwarePrompted = false;
                if (this._debugMounted === true) {
                    this.setState({ quadcopterLastError: null });
                }
                this._tryHideSearchPanelWhenAllDevicesReady();
                this._quadcopterFirmwareFlashActive = false;
            } else {
                const failMsg = this.props.intl.formatMessage(messages.quadcopter_firmware_flash_failed);
                if (this._debugMounted === true) {
                    this.setState({ quadcopterFlashStatus: failMsg, quadcopterRowPhase: 'flashFailed' });
                }
                this._quadcopterFirmwarePrompted = false;
                this._quadcopterFirmwareVersionChecked = false;
                this._quadcopterFlashFinishUi(failMsg, false);
                this._quadcopterFirmwareFlashActive = false;
            }
        }).catch(() => {
            const failMsg = this.props.intl.formatMessage(messages.quadcopter_firmware_flash_failed);
            if (this._debugMounted === true) {
                this.setState({ quadcopterFlashStatus: failMsg, quadcopterRowPhase: 'flashFailed' });
            }
            this._quadcopterFirmwarePrompted = false;
            this._quadcopterFirmwareVersionChecked = false;
            this._quadcopterFlashFinishUi(failMsg, false);
            this._quadcopterFirmwareFlashActive = false;
        });
    }


    render() {
        const displayPortName = this.getSearchPanelRowTitle();
        const showFlashButton = !this.props.disableFirmwareUi;
        const { iconSrc, statusText } = this.getStatusDisplay();
        const quadcopterHintText = this.props.isQuadcopter &&
            !this._isQuadcopterConnectErrorHintSuppressed() &&
            this.state.quadcopterLastError &&
            this.state.quadcopterLastError.message;
        const quadcopterFlashStatus = this.props.isQuadcopter && this._shouldShowQuadcopterFlashStatusHint()
            ? String(this.state.quadcopterFlashStatus)
            : '';
        const quadcopterFlashHintIsError = this.state.quadcopterRowPhase === 'flashFailed';

        return (

            <div id={`search-panel-device-component`} className={classNames(
                styles.firmware_flasher_device_component,
                this.props.isQuadcopter && styles.quadcopter_device_root
            )}>


                <div className={styles.search_panel_device_primary_row}>


                <div id="search-panel-device-port" className={styles.search_panel_device_element}>

                    {displayPortName}

                </div>

                <div id={`search-panel-device-status-icon-${this.props.Id}`} className={styles.search_panel_device_status_icon}>
                    {iconSrc ? <img src={iconSrc} alt="" /> : null}
                </div>

                <div id={`search-panel-device-status-${this.props.Id}`} className={styles.search_panel_device_element}>
                    {statusText}
                </div>

                {!this.props.isQuadcopter ? (
                    <div id={`search-panel-device-info-${this.props.Id}`} className={styles.search_panel_device_element}>



                    </div>
                ) : null}

                {showFlashButton && (
                    <div id={`search-panel-device-flash-button-element-${this.props.Id}`} className={styles.search_panel_device_element}>

                        <button id={`search-panel-device-flash-button-${this.props.Id}`} className={styles.device_flash_button} onClick={() => this.flashDevice()}>{this.props.intl.formatMessage(messages.flash_device)} </button>

                    </div>
                )}

                <div id={`search-panel-flashing-status-${this.props.Id}`} className={styles.search_panel_flashing_status}>



                </div>

                {showFlashButton && (
                    <div id={`search-panel-flashing-show-details-${this.props.Id}`} className={styles.search_panel_flashing_show_details} onClick={this.flashingShowDetails.bind(this)}>



                    </div>
                )}


                </div>


                {this.props.isQuadcopter ? (
                    <div
                        id={`search-panel-device-info-${this.props.Id}`}
                        className={styles.quadcopter_info_row}
                    >
                        {quadcopterHintText ? (
                            <div className={styles.quadcopter_panel_hint}>{quadcopterHintText}</div>
                        ) : null}
                        {quadcopterFlashStatus ? (
                            <div className={classNames(
                                styles.quadcopter_panel_hint,
                                !quadcopterFlashHintIsError && styles.quadcopter_panel_hint_info
                            )}>{quadcopterFlashStatus}</div>
                        ) : null}
                    </div>
                ) : null}


            </div>

        );

    }

}


const mapStateToProps = state => ({

    //   devices:state.scratchGui.devices_search_panel,
    //   draggable_window:state.scratchGui.new_draggable_window
    draggable_window: state.scratchGui.draggable_window

});

const mapDispatchToProps = dispatch => ({

    onShowFlashingStatusWindow: (draggable_window_id) => {

        dispatch(ActionTriggerDraggableWindow(draggable_window_id));
    },

    onHideFlashingStatusWindow: (draggable_window_id) => {

        dispatch(ActionTriggerDraggableWindow(draggable_window_id));
    },

    onCreateDraggableWindow: (draggable_window_id) => {

        dispatch(ActionCreateDraggableWindow(draggable_window_id));
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