
import classNames from 'classnames';
import React, { Component } from 'react';
import { connect } from 'react-redux';

import { defineMessages, intlShape, injectIntl, FormattedMessage } from 'react-intl';

import { ActionTriggerDraggableWindow } from './actions/sensor_actions';
import { ActionCreateDraggableWindow } from './actions/sensor_actions';


import styles from './SearchPanelDeviceComponent.css';

import { createDiv } from './lib/lib.js';



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
        defaultMessage: 'Отто'
    },
    device_arduino: {
        id: 'gui.FirmwareFlasherDeviceComponent.device_arduino',
        description: ' ',
        defaultMessage: 'Ардуино'
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
    flashing_device: {
        id: 'gui.FirmwareFlasherDeviceComponent.flashing_device',
        description: ' ',
        defaultMessage: 'Прошиваем...'
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
        defaultMessage: 'Возможна некорректная работа устройства.'
    },
    error: {

        id: 'gui.SearchPanel.error',
        description: ' ',
        defaultMessage: 'Ошибка!'
    },
    device_connected: {

        id: 'gui.SearchPanel.device_connected',
        description: ' ',
        defaultMessage: 'Устройство подключёно'
    },
    device_checking_serial: {

        id: 'gui.SearchPanel.device_checking_serial',
        description: ' ',
        defaultMessage: 'Проверяем серийный номер...'
    },
    device_no_response: {

        id: 'gui.SearchPanel.device_no_response',
        description: ' ',
        defaultMessage: 'Обнаружено неизвестное устройство'
    },
    device_no_response_details: {

        id: 'gui.SearchPanel.device_no_response_details',
        description: ' ',
        defaultMessage: 'Необходимо обновить прошивку.'
    },
    device_no_response_alert_details: {

        id: 'gui.SearchPanel.device_no_response_alert_details',
        description: ' ',
        defaultMessage: `К порту {device_port} подключено устройство, которое не распознаётся в Robbo Scratch.
Вероятно в устройстве отсутствует прошивка,  либо загружена нестандартная прошивка. 
                         
Загрузить стандартную прошивку Robbo Scratch 3?`
    },
    device_connection_lost: {

        id: 'gui.SearchPanel.device_connection_lost',
        description: ' ',
        defaultMessage: 'Потеряна связь с устройством.'
    },
    device_port_error: {

        id: 'gui.SearchPanel.device_port_error',
        description: ' ',
        defaultMessage: 'Ошибка порта!'
    },
    milliseconds: {

        id: 'gui.SearchPanel.milliseconds',
        description: ' ',
        defaultMessage: ' мс'
    },
    bluetooth_linux_hint: {

        id: 'gui.SearchPanel.bluetooth_linux_hint',
        description: ' ',
        defaultMessage: 'В силу особенностей устройства Линукс Robbo Scratch нужно запустить с правами пользователя root.'
    },
    flashing_in_progress: {

        id: 'gui.SearchPanel.flashing_in_progress',
        description: ' ',
        defaultMessage: 'Внимание!'
    },
    flashing_in_progress_details: {

        id: 'gui.SearchPanel.flashing_in_progress_details',
        description: ' ',
        defaultMessage: 'Идёт прошивка.'
    },
    otto_flash_which_mode: {
        id: 'gui.SearchPanel.otto_flash_which_mode',
        description: ' ',
        defaultMessage: 'Какие настройки прошивки использовать?'
    },
    otto_flash_arduino: {
        id: 'gui.SearchPanel.otto_flash_arduino',
        description: ' ',
        defaultMessage: 'Arduino'
    },
    otto_flash_nulllab: {
        id: 'gui.SearchPanel.otto_flash_nulllab',
        description: ' ',
        defaultMessage: 'Null Lab'
    },
    otto_flash_auto: {
        id: 'gui.SearchPanel.otto_flash_auto',
        description: ' ',
        defaultMessage: 'Авто'
    },
    otto_flash_version_unchanged_try_arduino: {
        id: 'gui.SearchPanel.otto_flash_version_unchanged_try_arduino',
        description: ' ',
        defaultMessage: 'Версия не изменилась. Попробовать прошить как Arduino?'
    },
    device_try_to_reconnect: {


        id: 'gui.SearchPanel.device_try_to_reconnect',
        description: ' ',
        defaultMessage: 'Попробуйте переподключить устройство. Или использовать другой usb разъём.'

    },
    device_reconnecting: {
        id: 'gui.SearchPanel.device_reconnecting',
        description: ' ',
        defaultMessage: 'Потеряно соединение, попытка восстановить соединение'
    },
    device_cannot_open_old_bluetooth_com: {


        id: 'gui.SearchPanel.device_cannot_open_old_bluetooth_com',
        description: ' ',
        defaultMessage: `Не удаётся открыть блютуз порт. 
Вероятно этот порт остался после предыдущего подключения по блютуз. 
Пожалуйста, удалите старые устройства из списка блютуз устройств.`

    },
    bluetooth_error_274C: {
        id: 'gui.SearchPanel.bluetooth_error_274C',
        description: ' ',
        defaultMessage: 'Не удалось установить соединение. Устройство может быть недоступно, уже подключено к другому устройству, или возникла проблема с сетью. (0x274C)'
    },
    bluetooth_error_274D: {
        id: 'gui.SearchPanel.bluetooth_error_274D',
        description: ' ',
        defaultMessage: 'Соединение отклонено устройством. (0x274D)'
    },
    bluetooth_error_2711: {
        id: 'gui.SearchPanel.bluetooth_error_2711',
        description: ' ',
        defaultMessage: 'Устройство не найдено или недоступно. (0x2711)'
    },
    bluetooth_error_2740: {
        id: 'gui.SearchPanel.bluetooth_error_2740',
        description: ' ',
        defaultMessage: 'Устройство уже подключено к другому устройству. Попробуйте отключить устройство и подключить снова. (0x2740)'
    },
    bluetooth_error_connection: {
        id: 'gui.SearchPanel.bluetooth_error_connection',
        description: ' ',
        defaultMessage: 'Не удалось подключиться к Bluetooth устройству. Убедитесь, что устройство включено и доступно для подключения.'
    },
    bluetooth_error_already_connected: {
        id: 'gui.SearchPanel.bluetooth_error_already_connected',
        description: ' ',
        defaultMessage: 'Устройство уже подключено. Попробуйте отключить устройство и подключить снова.'
    },
    try_connect_to_port: {


        id: 'gui.SearchPanel.try_connect_to_port',
        description: ' ',
        defaultMessage: 'Пробуем подключиться к порту...'

    },
    port_opened: {


        id: 'gui.SearchPanel.port_opened',
        description: ' ',
        defaultMessage: 'Порт открыт'

    }


});


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
            showOttoFlashChoice: false
        };

        this.deviceId = -1;

        this.firmware_version_differs = false;

        this.firmware_version_differs_cb_result = {};

        this.isFlashing = false;

        this.ottoVersionBeforeAutoFlash = null;

        this.ottoAutoFlashPending = false;

        this.isRasberry = false;

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

    getStatusDisplay() {
        if (this.props.isQuadcopter && this.props.QCA) {
            const { quadcopterConnected, quadcopterSearching } = this.state;
            if (quadcopterConnected) {
                return { iconSrc: './static/robbo_assets/green.png', statusText: this.props.intl.formatMessage(messages.quadcopter_connected) };
            }
            if (quadcopterSearching) {
                return { iconSrc: './static/robbo_assets/yellow.png', statusText: this.props.intl.formatMessage(messages.quadcopter_searching) };
            }
            return { iconSrc: './static/robbo_assets/red.png', statusText: this.props.intl.formatMessage(messages.quadcopter_disconnected) };
        }
        const { deviceState, deviceId, deviceError } = this.state;
        const deviceName = this.getDeviceName(deviceId);
        let statusText = '';
        let iconSrc = './static/robbo_assets/yellow.png';
        if (deviceState === 6) {
            statusText = deviceName + ' ' + this.props.intl.formatMessage(messages.device_connected);
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
            this.props.QCA.registerQuadcopterStatusChangeCallback(() => {
                const connected = this.props.QCA.isQuadcopterConnected();
                const searching = this.props.QCA.isQuadcopterSearching();
                if (this._lastQuadcopterConnected !== connected || this._lastQuadcopterSearching !== searching) {
                    this._lastQuadcopterConnected = connected;
                    this._lastQuadcopterSearching = searching;
                    this.setState({ quadcopterConnected: connected, quadcopterSearching: searching });
                }
            });
        }

        if (!this.props.isQuadcopter && this.props.DCA) {
            this.props.DCA.registerDeviceStatusChangeCallback(this.props.devicePort, this.onStatusChange.bind(this));
            this.props.DCA.registerFirmwareVersionDiffersCallback(this.props.devicePort, (result) => {
                this.firmware_version_differs = true;
                this.firmware_version_differs_cb_result = result;
                if (this.ottoAutoFlashPending) {
                    this.ottoAutoFlashPending = false;
                    if (this.ottoVersionBeforeAutoFlash != null && result.current_device_firmware === this.ottoVersionBeforeAutoFlash) {
                        if (confirm(this.props.intl.formatMessage(messages.otto_flash_version_unchanged_try_arduino))) {
                            this.flashDevice('arduino');
                        }
                    }
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
        this.setState({ deviceState: state, deviceId, deviceError: error, showOttoFlashChoice: state === 6 || state === 8 ? this.state.showOttoFlashChoice : false });

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

        if (state == 0) {
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
                    this.setState({ showOttoFlashChoice: true });
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
                        this.setState({ showOttoFlashChoice: true });
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


    searchDevices() {
        let search_panel = document.getElementById(`SearchPanelComponent`);

        search_panel.style.display = "block";




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
            this.props.onShowFlashingStatusWindow(this.props.draggableWindowId);
        }
    }

    flashingHideDetails() {
        const windowState = this.props.draggable_window && this.props.draggable_window[this.props.draggableWindowId];
        if (windowState && windowState.isShowing === true) {
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

            this.searchDevices(); //search devices

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


    flashDevice(ottoFlashMode) {

        this.setState({ showOttoFlashChoice: false });

        if (this.deviceId === 5 && ottoFlashMode === 'auto' && this.firmware_version_differs_cb_result && this.firmware_version_differs_cb_result.current_device_firmware != null) {
            this.ottoVersionBeforeAutoFlash = this.firmware_version_differs_cb_result.current_device_firmware;
            this.ottoAutoFlashPending = true;
        }

        this.isFlashing = true;

        if (this.props.onShowFlashingStatusWindow) {
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
        if (info_field) info_field.innerHTML = this.props.intl.formatMessage(messages.flashing_in_progress_details);

        // Иконку не трогаем через innerHTML — она управляется React по deviceState (state 10 приходит из disco() в VM)

        var cId = this.props.flashingStatusComponentId;
        var firmwareFlasherFlashingStatusComponent = document.getElementById(`firmware-flasher-flashing-status-component-${cId}`);
        var flashingStatusComponent = firmwareFlasherFlashingStatusComponent && firmwareFlasherFlashingStatusComponent.children && firmwareFlasherFlashingStatusComponent.children[1] ? firmwareFlasherFlashingStatusComponent.children[1] : null;
        var flashingLogComponent = firmwareFlasherFlashingStatusComponent && firmwareFlasherFlashingStatusComponent.children && firmwareFlasherFlashingStatusComponent.children[2] ? firmwareFlasherFlashingStatusComponent.children[2] : null;

        if (flashingStatusComponent) flashingStatusComponent.innerHTML = "";
        if (flashingLogComponent) flashingLogComponent.innerHTML = "";


        var config = {};
        config.device = {};

        config.device.device_id = this.deviceId;
        if (this.deviceId === 5) {
          const useNullLab = ottoFlashMode === 'null_lab' || ottoFlashMode === 'auto';
          if (useNullLab) {
            config.device.use_null_lab = true;
            config.device.null_lab_baud = 115200;
            config.device.null_lab_block_delay = 100;
          }
        }
        // config.device.device_firmware_version = this.props.deviceFirmwareVersion;

        //var dots_counter = 1;

        this.dots_counter = 1;

        var styles = {

            margin: '10px'

        }


        // if ([0,3].indexOf(this.deviceId) != -1){

        //     this.RCA.stopDataRecievingProcess();
        //     this.RCA.discon(()=>{

        //         this.DCA.flashFirmware(this.props.devicePort,config,this.onFlashingStatusChanged.bind(this));
        //     });

        // }else if ([1,2,4].indexOf(this.deviceId) != -1){

        //       this.LCA.stopDataRecievingProcess();
        //       this.LCA.discon(()=>{

        //         this.DCA.flashFirmware(this.props.devicePort,config,this.onFlashingStatusChanged.bind(this));
        //     });

        // }else if ([5].indexOf(this.deviceId) != -1){

        //       this.OCA.stopDataRecievingProcess();
        //       this.OCA.discon(()=>{

        //         this.DCA.flashFirmware(this.props.devicePort,config,this.onFlashingStatusChanged.bind(this));
        //     });

        // }else if ([6].indexOf(this.deviceId) != -1){

        //       this.ACA.stopDataRecievingProcess();
        //       this.ACA.discon(()=>{

        //         this.DCA.flashFirmware(this.props.devicePort,config,this.onFlashingStatusChanged.bind(this));
        //     });

        // }else{

        this.RCA.stopDataRecievingProcess();
        this.LCA.stopDataRecievingProcess();
        this.OCA.stopDataRecievingProcess();
        this.ACA.stopDataRecievingProcess();

        this.DCA.flashFirmwareWithDisconnect(this.props.devicePort, config, (status) => {

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

            if ((status.indexOf("Port closed") !== -1)) {

                if (flashingStatusComponent) flashingStatusComponent.style.backgroundColor = "green";

                if (search_device_button) search_device_button.removeAttribute("disabled");

                if (flashing_button) {
                    flashing_button.style.backgroundImage = "";
                    flashing_button.removeAttribute("disabled");
                    flashing_button.style.display = "inline-block";
                }

                this.searchDevices(); //search devices

            } else if ((status.indexOf("Error") !== -1)) {

                this.ottoAutoFlashPending = false;
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

            } else {

                if (flashingStatusComponent) flashingStatusComponent.style.backgroundColor = "#FFFF99"; //Light yellow2

            }

        });


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
        const displayPortName = this.props.isQuadcopter
            ? this.props.intl.formatMessage(messages.device_quadcopter)
            : this.props.devicePort;
        const showFlashButton = !this.props.isQuadcopter;
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

                {showFlashButton && this.state.showOttoFlashChoice && (
                    <div id={`otto-flash-mode-choice-${this.props.Id}`} className={styles.search_panel_device_element}>
                        <span>{this.props.intl.formatMessage(messages.otto_flash_which_mode)}</span>
                        <button type="button" onClick={() => this.flashDevice('arduino')}>{this.props.intl.formatMessage(messages.otto_flash_arduino)}</button>
                        <button type="button" onClick={() => this.flashDevice('null_lab')}>{this.props.intl.formatMessage(messages.otto_flash_nulllab)}</button>
                        <button type="button" onClick={() => this.flashDevice('auto')}>{this.props.intl.formatMessage(messages.otto_flash_auto)}</button>
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