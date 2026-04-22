
import classNames from 'classnames';
import React, { Component } from 'react';
import { connect } from 'react-redux';

import { defineMessages, intlShape, injectIntl, FormattedMessage } from 'react-intl';

import { ActionTriggerDraggableWindow } from './actions/sensor_actions';
import { ActionCreateDraggableWindow } from './actions/sensor_actions';


import styles from './SearchPanelDeviceComponent.css';

import { createDiv } from './lib/lib.js';
import { getFirmwareSettingsFromRuntime } from '../lib/settingsLoader';



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
        defaultMessage: 'Otto'
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
        description: ' ',
        defaultMessage: 'Searching for quadcopter...'
    },
    quadcopter_connected: {
        id: 'gui.SearchPanel.quadcopter_connected',
        description: ' ',
        defaultMessage: 'Quadcopter connected'
    },
    quadcopter_disconnected: {
        id: 'gui.SearchPanel.quadcopter_disconnected',
        description: ' ',
        defaultMessage: 'Quadcopter not connected'
    },
    quadcopter_landing: {
        id: 'gui.SearchPanel.quadcopter_landing',
        description: ' ',
        defaultMessage: 'Quadcopter landing'
    },
    quadcopter_lost: {
        id: 'gui.SearchPanel.quadcopter_lost',
        description: ' ',
        defaultMessage: 'Quadcopter link lost'
    },
    quadcopter_emergency: {
        id: 'gui.SearchPanel.quadcopter_emergency',
        description: ' ',
        defaultMessage: 'Quadcopter emergency stop'
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
            quadcopterState: 'disconnected'
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
            const { quadcopterConnected, quadcopterSearching, quadcopterState } = this.state;
            if (quadcopterConnected) {
                if (quadcopterState === 'landing') {
                    return { iconSrc: './static/robbo_assets/yellow.png', statusText: this.props.intl.formatMessage(messages.quadcopter_landing) };
                }
                return { iconSrc: './static/robbo_assets/green.png', statusText: this.props.intl.formatMessage(messages.quadcopter_connected) };
            }
            if (quadcopterSearching) {
                return { iconSrc: './static/robbo_assets/yellow.png', statusText: this.props.intl.formatMessage(messages.quadcopter_searching) };
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
    }

    componentWillUnmount() {
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
                const connected = nextSnapshot.connected === true || state === 'connected' || state === 'landing';
                const isSearching = nextSnapshot.searching === true || searching === true;
                const quadcopterState = nextSnapshot.state || state || 'disconnected';
                if (this._lastQuadcopterConnected !== connected || this._lastQuadcopterSearching !== isSearching || this._lastQuadcopterState !== quadcopterState) {
                    this._lastQuadcopterConnected = connected;
                    this._lastQuadcopterSearching = isSearching;
                    this._lastQuadcopterState = quadcopterState;
                    this.setState({
                        quadcopterConnected: connected,
                        quadcopterSearching: isSearching,
                        quadcopterState: quadcopterState
                    });
                }
            };
            this.props.QCA.registerQuadcopterStatusChangeCallback(this._quadcopterStatusCallback);
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
                if (flashing_button) flashing_button.style.backgroundColor = "";
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

        let status_field = document.getElementById(`search-panel-device-status-${this.props.Id}`);
        let info_field = document.getElementById(`search-panel-device-info-${this.props.Id}`);
        let flashing_button = document.getElementById(`search-panel-device-flash-button-${this.props.Id}`);
        let flashing_show_details_icon = document.getElementById(`search-panel-flashing-show-details-${this.props.Id}`);
        let device_status_icon = document.getElementById(`search-panel-device-status-icon-${this.props.Id}`);
        let search_device_button = document.getElementById(`robbo_search_devices`);

        if (!status_field || !info_field || !flashing_button || !device_status_icon || !flashing_show_details_icon || !search_device_button) return;





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
            info_field.innerHTML = "";

            info_field.style.display = "none";

            flashing_button.style.backgroundColor = "";
            flashing_button.style.backgroundImage = "-webkit-linear-gradient(top,#00af41,#008a00)";
            flashing_button.innerText = this.props.intl.formatMessage(messages.flash_device);

            flashing_show_details_icon.style.display = "none";
            flashing_button.style.display = "none";

            this.flashingHideDetails();


        } else if (state == 2) {
            if (this.flashSessionActive) {
                this._logFlashFlow('onStatusChange', 'state2_ignored_due_to_active_session', { state }, true);
                return;
            }
            this.firmware_version_differs = false;
            this.isFlashing = false;
            info_field.innerHTML = "";

            info_field.style.display = "none";

            flashing_button.style.backgroundColor = "";
            flashing_button.style.backgroundImage = "-webkit-linear-gradient(top,#00af41,#008a00)";
            flashing_button.innerText = this.props.intl.formatMessage(messages.flash_device);

            flashing_show_details_icon.style.display = "none";
            flashing_button.style.display = "none";

            this.flashingHideDetails();


        } else if (state == 3) {


        } else if (state == 6) {
            if (this.flashSessionActive) {
                this._logFlashFlow('onStatusChange', 'state6_ignored_due_to_active_session', { state }, true);
                return;
            }
            search_device_button.style.pointerEvents = "auto";
            let result = this.firmware_version_differs_cb_result;
            if (!this.firmware_version_differs) {

                info_field.innerHTML = "";
            }



            let firm_differs_msg = this.props.intl.formatMessage(messages.differ_firm_msg) + this.props.intl.formatMessage(messages.cr_firm_msg, { current_firmware: result.current_device_firmware, required_firmware: result.need_firmware })
                + this.props.intl.formatMessage(messages.flash_device) + "?";

            //let firm_differs_msg = "Flash?";

            let need_flash_device = false;
            //Mac OS    
            if ((this.firmware_version_differs) && (this.props.devicePort.indexOf("rfcomm") == -1) && (!this.props.isMacBluetooth) && (!this.props.isBluetooth) && (!this.isRasberry)) {

                // if (true){

                flashing_show_details_icon.style.display = "inline-block";
                flashing_button.style.display = "inline-block";

                need_flash_device = confirm(firm_differs_msg);

            }



            if (need_flash_device) {

                if (deviceId === 5) {
                    this.flashDevice('auto');
                } else {
                    this.flashDevice();
                }

            } else if (!this.firmware_version_differs) { //We don't need to close panel if firmware versions differ.

                let all_devices = this.props.DCA.getDevices();

                let all_devices_found = false;

                for (let device_index = 0; device_index < all_devices.length; device_index++) {

                    all_devices_found = ((all_devices[device_index].getState() == 6) && (!all_devices[device_index].isFirmwareVersionDiffers()));

                    if (!all_devices_found) break;
                }

                if (all_devices_found) {

                    let search_panel = document.getElementById(`SearchPanelComponent`);
                    if (search_panel) search_panel.style.display = "none";
                }

            }


        } else if (state == 9) { //Reconnecting (state - RECONNECTING)

            search_device_button.style.pointerEvents = "auto";

            let info_field_local = document.getElementById(`search-panel-device-info-${this.props.Id}`);
            let search_panel = document.getElementById(`SearchPanelComponent`);

            if (search_panel) search_panel.style.display = "block";

            flashing_show_details_icon.style.display = "none";
            flashing_button.style.display = "none";

            if (info_field_local) {
                info_field_local.style.display = "none";
                info_field_local.innerHTML = "";
            }

        } else if (state == 8) { //Port doesn't respond (state - TIMEOUT)
            if (this.flashSessionActive) {
                this._logFlashFlow('onStatusChange', 'state8_ignored_due_to_active_session', { state }, true);
                return;
            }

            search_device_button.style.pointerEvents = "auto";

            let info_field_local = document.getElementById(`search-panel-device-info-${this.props.Id}`);

            if (info_field_local) info_field_local.style.display = "inline-block";

            if (error && error.code == 1 && (!this.isFlashing)) { //Device was good but connection lost.

                let search_panel = document.getElementById(`SearchPanelComponent`);
                if (search_panel) search_panel.style.display = "block";

                info_field.innerHTML = "";
                info_field.style.display = "none";
                flashing_show_details_icon.style.display = "none";
                flashing_button.style.display = "none";

            } else if (error && error.code == -1) { //We cann't get any usefull info from the device




                let DEVICE_HANDLE_TIMEOUT = this.DCA.getTimeoutVars().DEVICE_HANDLE_TIMEOUT;

                //  info_field.innerHTML = this.props.intl.formatMessage(messages.device_no_response_details) + " " + DEVICE_HANDLE_TIMEOUT
                //         + " " + this.props.intl.formatMessage(messages.milliseconds);

                if (this.props.isBluetooth) {

                    info_field.innerHTML = this.props.intl.formatMessage(messages.device_cannot_open_old_bluetooth_com);

                } else {

                    info_field.innerHTML = this.props.intl.formatMessage(messages.device_no_response_details);

                }



                let need_to_flash_msg = this.props.intl.formatMessage(messages.device_no_response_alert_details, { device_port: this.props.devicePort });

                let need_flash_device = false;

                // if (true){
                //macos
                if ((this.props.devicePort.indexOf("rfcomm") == -1) && (!this.props.isMacBluetooth) && (!this.props.isBluetooth) && (!this.isRasberry)) {

                    flashing_show_details_icon.style.display = "inline-block";
                    flashing_button.style.display = "inline-block";

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

            search_device_button.style.pointerEvents = "auto";

            let info_field = document.getElementById(`search-panel-device-info-${this.props.Id}`);

            info_field.style.display = "inline-block";

            //  if (this.props.devicePort.indexOf("rfcom") != -1){

            //         flashing_show_details_icon.style.display = "none";
            //         flashing_button.style.display = "none";



            //     }



            flashing_show_details_icon.style.display = "none";
            flashing_button.style.display = "none";

            if (error && (this.props.devicePort.indexOf("rfcom") != -1) && (error.msg && error.msg.indexOf("cannot open /dev/rfcom") != -1)) {

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

            let search_panel = document.getElementById(`SearchPanelComponent`);
            search_panel.style.display = "block";

        }
    }


    searchDevices(showPanel = true) {
        let search_panel = document.getElementById(`SearchPanelComponent`);

        if (search_panel && showPanel) {
            search_panel.style.display = "block";
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

        var cId = this.props.flashingStatusComponentId;

        var firmwareFlasherFlashingStatusComponent = document.getElementById(`firmware-flasher-flashing-status-component-${cId}`);

        var flashingStatusComponent = firmwareFlasherFlashingStatusComponent && firmwareFlasherFlashingStatusComponent.children && firmwareFlasherFlashingStatusComponent.children[1] ? firmwareFlasherFlashingStatusComponent.children[1] : null;
        var flashingLogComponent = firmwareFlasherFlashingStatusComponent && firmwareFlasherFlashingStatusComponent.children && firmwareFlasherFlashingStatusComponent.children[2] ? firmwareFlasherFlashingStatusComponent.children[2] : null;

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

            if (flashingStatusComponent) flashingStatusComponent.style.backgroundColor = "green";

            if (search_device_button) search_device_button.removeAttribute("disabled");

            if (flashing_button) {
                flashing_button.style.backgroundImage = "";
                flashing_button.removeAttribute("disabled");
                flashing_button.style.display = "inline-block";
            }

            // Обновляем список устройств, но окно поиска должно оставаться скрытым
            // (как на Desktop после успешной прошивки).
            try {
                const search_panel = document.getElementById(`SearchPanelComponent`);
                if (search_panel) search_panel.style.display = "none";
            } catch (_) { }
            this.searchDevices(false); //search devices (hidden)

        } else if ((status.indexOf("Error") !== -1)) {

            if (flashingStatusComponent) flashingStatusComponent.style.backgroundColor = "red";
            if (search_device_button) search_device_button.removeAttribute("disabled");

            if (flashing_button) {
                flashing_button.style.backgroundImage = "-webkit-linear-gradient(top,#ff0000,#ff0000)";
                flashing_button.style.backgroundColor = "#ff0000";
                flashing_button.style.textAlign = "center";
                flashing_button.innerText = this.props.intl.formatMessage(messages.error);
                flashing_button.removeAttribute("disabled");
            }

            let device_status_icon = document.getElementById(`search-panel-device-status-icon-${this.props.Id}`);
            if (device_status_icon) device_status_icon.innerHTML = `<img src = "./static/robbo_assets/red.png" />`;

            let search_panel = document.getElementById(`SearchPanelComponent`);
            if (search_panel) search_panel.style.display = "block";

        } else {

            if (flashingStatusComponent) flashingStatusComponent.style.backgroundColor = "#FFFF99"; //Light yellow2

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
            flashing_button.style.backgroundImage = " url(./static/robbo_assets/searching.gif)";
            flashing_button.style.backgroundColor = "#FFFF99"; //Light yellow2
            flashing_button.style.backgroundRepeat = "no-repeat";
            flashing_button.style.backgroundPosition = "center";
            flashing_button.style.textAlign = "left";
            flashing_button.style.color = "black";
            flashing_button.innerText = this.props.intl.formatMessage(messages.flashing_device);
        }

        let status_field = document.getElementById(`search-panel-device-status-${this.props.Id}`);
        let info_field = document.getElementById(`search-panel-device-info-${this.props.Id}`);
        if (status_field) status_field.innerHTML = this.props.intl.formatMessage(messages.flashing_in_progress);
        if (info_field) info_field.innerHTML = "";

        // Иконку не трогаем через innerHTML — она управляется React по deviceState (state 10 приходит из disco() в VM)
        var cId = this.props.flashingStatusComponentId;
        var firmwareFlasherFlashingStatusComponent = document.getElementById(`firmware-flasher-flashing-status-component-${cId}`);
        var flashingStatusComponent = firmwareFlasherFlashingStatusComponent && firmwareFlasherFlashingStatusComponent.children && firmwareFlasherFlashingStatusComponent.children[1] ? firmwareFlasherFlashingStatusComponent.children[1] : null;
        var flashingLogComponent = firmwareFlasherFlashingStatusComponent && firmwareFlasherFlashingStatusComponent.children && firmwareFlasherFlashingStatusComponent.children[2] ? firmwareFlasherFlashingStatusComponent.children[2] : null;

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
                if (flashingStatusComponent) flashingStatusComponent.style.backgroundColor = "green";
                if (search_device_button) search_device_button.removeAttribute("disabled");
                if (flashing_button) {
                    flashing_button.style.backgroundImage = "";
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
                    const search_panel = document.getElementById(`SearchPanelComponent`);
                    if (search_panel) search_panel.style.display = "none";
                } catch (_) { }
                this.searchDevices(false);
            } else if ((status.indexOf("Error") !== -1)) {
                if (flashingStatusComponent) flashingStatusComponent.style.backgroundColor = "red";
                if (search_device_button) search_device_button.removeAttribute("disabled");

                if (flashing_button) {
                    flashing_button.style.backgroundImage = "-webkit-linear-gradient(top,#ff0000,#ff0000)";
                    flashing_button.style.backgroundColor = "#ff0000";
                    flashing_button.style.textAlign = "center";
                    flashing_button.innerText = this.props.intl.formatMessage(messages.error);
                    flashing_button.removeAttribute("disabled");
                }

                this.setState({ deviceState: 8 });

                let search_panel = document.getElementById(`SearchPanelComponent`);
                if (search_panel) search_panel.style.display = "block";

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
                if (flashingStatusComponent) flashingStatusComponent.style.backgroundColor = "#FFFF99"; //Light yellow2
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


    render() {
        const displayPortName = this.getSearchPanelRowTitle();
        const showFlashButton = !this.props.isQuadcopter && !this.props.disableFirmwareUi;
        const { iconSrc, statusText } = this.getStatusDisplay();

        return (

            <div id={`search-panel-device-component`} className={styles.firmware_flasher_device_component}>


                <div id="search-panel-device-port" className={styles.search_panel_device_element}>

                    {displayPortName}

                </div>

                <div id={`search-panel-device-status-icon-${this.props.Id}`} className={styles.search_panel_device_status_icon}>
                    {iconSrc ? <img src={iconSrc} alt="" /> : null}
                </div>

                <div id={`search-panel-device-status-${this.props.Id}`} className={styles.search_panel_device_element}>
                    {statusText}
                </div>

                <div id={`search-panel-device-info-${this.props.Id}`} className={styles.search_panel_device_element}>



                </div>

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