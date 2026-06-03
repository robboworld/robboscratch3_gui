import classNames from 'classnames';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import sharedStyles from './DevicePaletteShared.css';
import formStyles from './RobboPaletteForm.css';
import styles from './FirmwareFlasherFlashingStatusComponent.css';
import './RobboDeviceStatus.css';

import {ActionTriggerDraggableWindow} from './actions/sensor_actions';

import {defineMessages, injectIntl} from 'react-intl';

const messages = defineMessages({
    flashing_status: {
        id: 'gui.FirmwareFlasherFlashingStatusComponent.flashing_status',
        description: ' ',
        defaultMessage: 'Firmware process log'
    }
});

class FirmwareFlasherFlashingStatusComponent extends Component {

    componentDidMount () {
        this.DCA = this.props.DCA;
    }

    closeWindow () {
        this.props.onWindowClose(this.props.draggableWindowId);
    }

    render () {
        const componentId = this.props.componentId;

        return (
            <div
                id={`firmware-flasher-flashing-status-component-${componentId}`}
                className={classNames(sharedStyles.palette, styles.flashing_status_window)}
            >
                <div
                    id={`firmware-flasher-flashing-status-component-${componentId}-tittle`}
                    className={sharedStyles.header}
                >
                    <span className={sharedStyles.headerTitle}>
                        {this.props.intl.formatMessage(messages.flashing_status)}
                    </span>
                    <button
                        type="button"
                        className={sharedStyles.closeButton}
                        aria-label="Close"
                        onClick={this.closeWindow.bind(this)}
                    />
                </div>

                <div className={classNames(sharedStyles.body, formStyles.palette_body)}>
                    <div className={formStyles.section}>
                    <div
                        id={`firmware-flasher-flashing-status-component-${componentId}-log-status`}
                        className={styles.flashing_status_log_status}
                    />

                    <div
                        id={`firmware-flasher-flashing-status-component-${componentId}-log-content`}
                        className={formStyles.log_panel}
                    />
                    </div>
                </div>
            </div>
        );
    }
}

const mapStateToProps = () => ({});

const mapDispatchToProps = dispatch => ({
    onWindowClose: draggable_window_id => {
        dispatch(ActionTriggerDraggableWindow(draggable_window_id));
    }
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(FirmwareFlasherFlashingStatusComponent));
