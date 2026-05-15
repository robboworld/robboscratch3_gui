import classNames from 'classnames';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';

import {ActionTriggerDraggableWindow} from './actions/sensor_actions';
import styles from './MenuBarDevicePreview.css';

class MenuBarDevicePreview extends Component {
    constructor (props) {
        super(props);
        this.state = {
            connected: false,
            searching: false
        };
        this.handleStatusChange = this.handleStatusChange.bind(this);
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
    }

    handleStatusChange (state) {
        const connected = this.props.deviceType === 'quadcopter' ?
            state === 'connected' :
            state === 6;

        this.setState({
            connected,
            searching: false
        });
    }

    render () {
        const {label, idPrefix, index, title} = this.props;
        const {connected, searching} = this.state;

        return (
            <button
                type="button"
                id={`${idPrefix}-preview-${index}`}
                className={classNames(styles.previewButton, {
                    [styles.connected]: connected,
                    [styles.disconnected]: !connected,
                    [styles.searching]: searching
                })}
                title={title}
                aria-label={title}
                onClick={this.props.onOpenPalette}
            >
                <span className={styles.previewLabel}>{label}</span>
            </button>
        );
    }
}

MenuBarDevicePreview.propTypes = {
    deviceType: PropTypes.oneOf(['robot', 'lab', 'quadcopter', 'otto', 'arduino']).isRequired,
    draggableWindowId: PropTypes.number.isRequired,
    idPrefix: PropTypes.string.isRequired,
    index: PropTypes.number.isRequired,
    label: PropTypes.string.isRequired,
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
