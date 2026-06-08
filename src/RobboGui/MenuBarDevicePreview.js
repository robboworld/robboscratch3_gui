import classNames from 'classnames';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';

import {ActionTriggerDraggableWindow} from './actions/sensor_actions';
import styles from './MenuBarDevicePreview.css';

const DEVICE_IS_READY = 6;

const CONNECTED_DEVICES_BY_TYPE = {
    robot: 'ConnectedRobots',
    lab: 'ConnectedLaboratories',
    otto: 'ConnectedOttos',
    arduino: 'ConnectedArduinos'
};

class MenuBarDevicePreview extends Component {
    constructor (props) {
        super(props);
        this.state = {
            connected: false,
            searching: false
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
        const {deviceType, idPrefix, index, title} = this.props;
        const {connected, searching} = this.state;

        return (
            <button
                type="button"
                id={`${idPrefix}-preview-${index}`}
                className={classNames(styles.previewButton, styles[`device_${deviceType}`], {
                    [styles.connected]: connected,
                    [styles.disconnected]: !connected,
                    [styles.searching]: searching
                })}
                title={title}
                aria-label={title}
                onClick={this.props.onOpenPalette}
            >
                <span className={styles.previewIcon} aria-hidden="true" />
            </button>
        );
    }
}

MenuBarDevicePreview.propTypes = {
    deviceType: PropTypes.oneOf(['robot', 'lab', 'quadcopter', 'otto', 'arduino']).isRequired,
    draggableWindowId: PropTypes.number.isRequired,
    idPrefix: PropTypes.string.isRequired,
    index: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    statusApi: PropTypes.object,
    onOpenPalette: PropTypes.func.isRequired
};

const mapDispatchToProps = (dispatch, ownProps) => ({
    onOpenPalette: () => {
        dispatch(ActionTriggerDraggableWindow(ownProps.draggableWindowId));
    }
});

export default connect(
    null,
    mapDispatchToProps
)(MenuBarDevicePreview);
