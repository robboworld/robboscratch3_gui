import classNames from 'classnames';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {defineMessages, injectIntl, intlShape} from 'react-intl';

import {ActionTriggerDraggableWindow} from './actions/sensor_actions';
import styles from './MenuBarDevicePreview.css';
import {batteryColorLevel, worseBatteryLevel} from '../lib/copter-colors';

const DEVICE_IS_READY = 6;

const messages = defineMessages({
    connected: {
        id: 'gui.RobboGui.MenuBarDevice.connected',
        description: 'Menu bar device button tooltip: the device is connected',
        defaultMessage: '{device}: connected'
    },
    notConnected: {
        id: 'gui.RobboGui.MenuBarDevice.notConnected',
        description: 'Menu bar device button tooltip: no device connected',
        defaultMessage: '{device}: not connected'
    },
    searching: {
        id: 'gui.RobboGui.MenuBarDevice.searching',
        description: 'Menu bar device button tooltip: device search in progress',
        defaultMessage: '{device}: searching…'
    }
});

const CONNECTED_DEVICES_BY_TYPE = {
    robot: 'ConnectedRobots',
    lab: 'ConnectedLaboratories',
    otto: 'ConnectedOttos',
    arduino: 'ConnectedArduinos'
};

const COPTER_PROPELLER = 'M -0.42 -0.32 L -2.02 -0.76 C -4.81 -1.36 -6.66 -1.44 -6.7 -0.4 ' +
    'C -6.66 1.44 -4.81 1.36 -2.02 0.76 L -0.42 0.32 Z M 0.42 0.32 L 2.02 0.76 C 4.81 1.36 6.66 1.44 6.7 0.4 ' +
    'C 6.66 -1.44 4.81 -1.36 2.02 -0.76 L 0.42 -0.32 Z';
const COPTER_ARMS = ['M12 12L8.25 8.25', 'M24 12L27.75 8.25', 'M12 24L8.25 27.75', 'M24 24L27.75 27.75'];
const COPTER_PLUG = 'M10.83 13.8h0.89a0.28 0.28 0 0 1 0.28 0.28v7.84a0.28 0.28 0 0 1-0.28 0.28h-0.89' +
    'a0.28 0.28 0 0 1-0.28-0.28v-7.84a0.28 0.28 0 0 1 0.28-0.28z';
const COPTER_ROTORS = [[7.1, 7.1, -45], [28.9, 7.1, 45], [7.1, 28.9, 45], [28.9, 28.9, -45]];
/** Inner area of the copter body that holds the charge (viewBox units of menu_icon_quadcopter.svg). */
const BODY_FILL = {x: 13.5, y: 13.5, width: 9, height: 9};

/**
 * menu_icon_quadcopter.svg drawn inline: its body is a battery filled left to right with the
 * lowest charge of the copters in use (the plug on the left is the battery contact).
 * @param {number} percent lowest charge
 * @param {string} level 'ok' | 'warning' | 'critical'
 * @returns {React.Element} icon
 */
const renderCopterBatteryIcon = (percent, level) => {
    const value = Math.max(0, Math.min(100, Number(percent) || 0));
    return (
        <svg
            className={styles.copterIcon}
            // Same crop as the 110 % background-size of the other device icons.
            viewBox="1.64 1.64 32.73 32.73"
            aria-hidden="true"
        >
            <g
                stroke="currentColor"
                strokeWidth="2.15"
                strokeLinecap="round"
            >
                {COPTER_ARMS.map(d => (
                    <path
                        key={d}
                        d={d}
                    />
                ))}
            </g>
            <g fill="currentColor">
                {COPTER_ROTORS.map(([x, y, angle]) => (
                    <g
                        key={`${x}-${y}`}
                        transform={`translate(${x} ${y}) rotate(${angle})`}
                    >
                        <path d={COPTER_PROPELLER} />
                        <circle r="1.05" />
                    </g>
                ))}
                <path d={COPTER_PLUG} />
            </g>
            <rect
                x="12.6"
                y="12.6"
                width="10.8"
                height="10.8"
                rx="1.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
            />
            <rect
                className={classNames(styles.copterCharge, {
                    [styles.copterChargeWarning]: level === 'warning',
                    [styles.copterChargeLow]: level === 'critical'
                })}
                x={BODY_FILL.x}
                y={BODY_FILL.y}
                width={BODY_FILL.width * value / 100}
                height={BODY_FILL.height}
                rx="0.8"
            />
        </svg>
    );
};

class MenuBarDevicePreview extends Component {
    constructor (props) {
        super(props);
        this.state = {
            connected: false,
            searching: false,
            copterCount: 0,
            copterBattery: null,
            copterBatteryLevel: 'ok'
        };
        this.handleStatusChange = this.handleStatusChange.bind(this);
        this.syncInitialConnectionState = this.syncInitialConnectionState.bind(this);
    }

    componentDidMount () {
        const {statusApi, deviceType} = this.props;
        if (!statusApi) return;

        switch (deviceType) {
        case 'robot':
            statusApi.registerRobotStatusChangeCallback(this.handleStatusChange);
            break;
        case 'lab':
            statusApi.registerLabStatusChangeCallback(this.handleStatusChange);
            break;
        case 'quadcopter':
            statusApi.registerQuadcopterStatusChangeCallback(this.handleStatusChange);
            break;
        case 'otto':
            statusApi.registerOttoStatusChangeCallback(this.handleStatusChange);
            break;
        case 'arduino':
            statusApi.registerArduinoStatusChangeCallback(this.handleStatusChange);
            break;
        default:
            break;
        }

        this.syncInitialConnectionState();
        if (deviceType === 'quadcopter') {
            this.syncCopterSummary();
            this.copterSummaryTimer = setInterval(() => this.syncCopterSummary(), 500);
        }
    }

    /** Copters in use and their lowest battery, for the badge on the icon. */
    syncCopterSummary () {
        const {statusApi, simulated, vm} = this.props;
        let batteries = [];
        const blocks = simulated && vm && vm.runtime && vm.runtime._copterBlocks;
        if (blocks) {
            batteries = blocks.getSimControllers().map(c => ({percent: Number(c.sim_battery) || 0}));
        } else if (statusApi && typeof statusApi.getCopters === 'function') {
            batteries = statusApi.getCopters()
                .filter(c => c.connected && c.enabled && c.battery && c.battery.percent !== null)
                .map(c => c.battery);
        }
        const percents = batteries.map(b => b.percent);
        const copterBattery = percents.length ? Math.round(Math.min.apply(null, percents)) : null;
        const copterBatteryLevel = batteries.reduce((worst, b) =>
            worseBatteryLevel(worst, batteryColorLevel(b.percent, b.level)), 'ok');
        if (copterBattery !== this.state.copterBattery || percents.length !== this.state.copterCount ||
            copterBatteryLevel !== this.state.copterBatteryLevel) {
            this.setState({copterBattery, copterBatteryLevel, copterCount: percents.length});
        }
    }

    syncInitialConnectionState () {
        const {statusApi, deviceType} = this.props;
        if (!statusApi) return;

        if (deviceType === 'quadcopter') {
            if (typeof statusApi.getStatusSnapshot !== 'function') return;
            const snap = statusApi.getStatusSnapshot();
            const state = snap.state || 'disconnected';
            this.handleStatusChange(state);
            if (snap.searching === true) {
                this.setState({searching: true});
            }
            return;
        }

        const connectedDevicesKey = CONNECTED_DEVICES_BY_TYPE[deviceType];
        const connectedDevices = connectedDevicesKey ? statusApi[connectedDevicesKey] : null;
        if (connectedDevices && connectedDevices[0] &&
            typeof connectedDevices[0].getState === 'function') {
            this.handleStatusChange(connectedDevices[0].getState());
        }
    }

    componentWillUnmount () {
        if (this.copterSummaryTimer) clearInterval(this.copterSummaryTimer);
        const {statusApi, deviceType} = this.props;
        if (!statusApi) return;

        switch (deviceType) {
        case 'robot':
            if (typeof statusApi.unregisterRobotStatusChangeCallback === 'function') {
                statusApi.unregisterRobotStatusChangeCallback(this.handleStatusChange);
            }
            break;
        case 'lab':
            if (typeof statusApi.unregisterLabStatusChangeCallback === 'function') {
                statusApi.unregisterLabStatusChangeCallback(this.handleStatusChange);
            }
            break;
        case 'quadcopter':
            if (typeof statusApi.unregisterQuadcopterStatusChangeCallback === 'function') {
                statusApi.unregisterQuadcopterStatusChangeCallback(this.handleStatusChange);
            }
            break;
        case 'otto':
            if (typeof statusApi.unregisterOttoStatusChangeCallback === 'function') {
                statusApi.unregisterOttoStatusChangeCallback(this.handleStatusChange);
            }
            break;
        case 'arduino':
            if (typeof statusApi.unregisterArduinoStatusChangeCallback === 'function') {
                statusApi.unregisterArduinoStatusChangeCallback(this.handleStatusChange);
            }
            break;
        default:
            break;
        }
    }

    handleStatusChange (state) {
        const connected = this.props.deviceType === 'quadcopter' ?
            state === 'connected' :
            state === DEVICE_IS_READY;

        this.setState({
            connected,
            searching: false
        });
    }

    render () {
        const {deviceType, idPrefix, index, title, simulated} = this.props;
        const {searching} = this.state;
        // The simulated copter is always "connected": status comes from QCA only for real hardware.
        const connected = simulated || this.state.connected;
        const showBattery = deviceType === 'quadcopter' && this.state.copterBattery !== null;
        // The state in words in the tooltip and for screen readers (the icon shows it by colour).
        let stateMessage = connected ? messages.connected : messages.notConnected;
        if (searching) stateMessage = messages.searching;
        const stateTitle = this.props.intl.formatMessage(stateMessage, {device: title});
        const fullTitle = showBattery ? `${stateTitle} · ${this.state.copterBattery}\u00a0%` : stateTitle;

        return (
            <button
                type="button"
                id={`${idPrefix}-preview-${index}`}
                className={classNames(styles.previewButton, styles[`device_${deviceType}`], {
                    [styles.connected]: connected,
                    [styles.disconnected]: !connected,
                    [styles.searching]: searching
                })}
                title={fullTitle}
                aria-label={fullTitle}
                onClick={this.props.onOpenPalette}
            >
                {showBattery ?
                    renderCopterBatteryIcon(this.state.copterBattery, this.state.copterBatteryLevel) :
                    <span className={styles.previewIcon} aria-hidden="true" />}
                {showBattery && this.state.copterCount > 1 ? (
                    <span
                        className={styles.copterCount}
                        aria-hidden="true"
                    >
                        {this.state.copterCount}
                    </span>
                ) : null}
            </button>
        );
    }
}

MenuBarDevicePreview.propTypes = {
    deviceType: PropTypes.oneOf(['robot', 'lab', 'quadcopter', 'otto', 'arduino']).isRequired,
    draggableWindowId: PropTypes.number.isRequired,
    simulated: PropTypes.bool,
    vm: PropTypes.shape({runtime: PropTypes.object}),
    idPrefix: PropTypes.string.isRequired,
    index: PropTypes.number.isRequired,
    intl: intlShape.isRequired,
    title: PropTypes.string.isRequired,
    statusApi: PropTypes.object,
    onOpenPalette: PropTypes.func.isRequired
};

const mapDispatchToProps = (dispatch, ownProps) => ({
    onOpenPalette: () => {
        dispatch(ActionTriggerDraggableWindow(ownProps.draggableWindowId));
    }
});

export default injectIntl(connect(
    null,
    mapDispatchToProps
)(MenuBarDevicePreview));
