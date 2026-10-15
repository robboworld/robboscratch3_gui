import classNames from 'classnames';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import sharedStyles from './DevicePaletteShared.css';
import formStyles from './RobboPaletteForm.css';
import styles from './FirmwareFlasherFlashingStatusComponent.css';
import './RobboDeviceStatus.css';

import {ActionTriggerDraggableWindow} from './actions/sensor_actions';

import {defineMessages, injectIntl} from 'react-intl';
import {closeMessage} from './sensor-type-messages';
import {FLASH_STEP_MESSAGES} from '../lib/flash-status-phase';

const messages = defineMessages({
    flashing_status: {
        id: 'gui.FirmwareFlasherFlashingStatusComponent.flashing_status',
        description: ' ',
        defaultMessage: 'Firmware update'
    },
    details: {
        id: 'gui.FirmwareFlasherFlashingStatusComponent.details',
        description: 'Collapsible block with the raw technical lines of the firmware flasher',
        defaultMessage: 'Details'
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
                data-flash-window
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
                        aria-label={this.props.intl.formatMessage(closeMessage)}
                    title={this.props.intl.formatMessage(closeMessage)}
                        onClick={this.closeWindow.bind(this)}
                    />
                </div>

                <div className={classNames(sharedStyles.body, formStyles.palette_body)}>
                    <div className={formStyles.section}>
                    {/* Steps repeat the status line for the eye; the status line speaks for the screen reader. */}
                    <ol
                        className={styles.flashing_steps}
                        aria-hidden="true"
                    >
                        {FLASH_STEP_MESSAGES.map(message => (
                            <li
                                key={message.id}
                                className={styles.flashing_step}
                            >
                                <span className={styles.flashing_step_dot} />
                                <span className={styles.flashing_step_label}>
                                    {this.props.intl.formatMessage(message)}
                                </span>
                            </li>
                        ))}
                    </ol>
                    <div
                        id={`firmware-flasher-flashing-status-component-${componentId}-log-status`}
                        className={styles.flashing_status_log_status}
                        role="status"
                        aria-live="polite"
                    />

                    {/* Raw flasher lines are for support; the status line above speaks plainly. */}
                    <details className={styles.flashing_status_details}>
                        <summary className={styles.flashing_status_details_summary}>
                            {this.props.intl.formatMessage(messages.details)}
                        </summary>
                        <div
                            id={`firmware-flasher-flashing-status-component-${componentId}-log-content`}
                            className={formStyles.log_panel}
                        />
                    </details>
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
