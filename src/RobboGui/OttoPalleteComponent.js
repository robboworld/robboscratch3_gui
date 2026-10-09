import classNames from 'classnames';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import sharedStyles from './DevicePaletteShared.css';
import formStyles from './RobboPaletteForm.css';
import rowStyles from './DevicePaletteRows.css';
import SensorDataBlockComponent from './SensorDataBlockComponent';
import { getPaletteSensorValueNode, setPaletteSensorTextValue } from './sensor-palette-dom';
import DevicePaletteStatus, {DevicePaletteStatusDot} from './DevicePaletteStatus';
import {getDeviceLinkKind, isDeviceLinkLive} from './device-link-status';

import {ActionTriggerDraggableWindow} from './actions/sensor_actions';

import {defineMessages, injectIntl} from 'react-intl';
import {closeMessage} from './sensor-type-messages';

const messages = defineMessages({
    sound_level: {
        id: 'gui.RobboGui.OttoPalette.sound_level',
        description: ' ',
        defaultMessage: 'Sound'
    },

    distance: {
        id: 'gui.RobboGui.OttoPalette.distance',
        description: ' ',
        defaultMessage: 'Distance'
    },

    otto: {
        id: 'gui.RobboGui.OttoPalette.otto',
        description: ' ',
        defaultMessage: 'Dancing robot'
    }
});

class OttoPalleteComponent extends Component {
    onThisWindowClose () {
        this.props.onOttoPaletteWindowClose(5);
    }

    startGetDataLoop () {
        const sound_sensor_component = document.getElementById(`otto_sensor-data-block-otto-${this.props.ottoIndex}-sound-level_type-analog`);
        const sound_sensor_value_field = getPaletteSensorValueNode(sound_sensor_component);
        const distanse_sensor_component = document.getElementById(`otto_sensor-data-block-otto-${this.props.ottoIndex}-distanse_type-analog`);
        const distanse_sensor_value_field = getPaletteSensorValueNode(distanse_sensor_component);
        if (this.getDataLoopInterval) {
            clearInterval(this.getDataLoopInterval);
        }
        this.getDataLoopInterval = setInterval(() => {
            // No robot: show "---", not the API defaults (-1, 0).
            const live = isDeviceLinkLive(getDeviceLinkKind(this.props.OCA, 'ConnectedOttos', false));
            setPaletteSensorTextValue(sound_sensor_value_field, live ? this.props.OCA.get_sound() : '---');
            setPaletteSensorTextValue(distanse_sensor_value_field, live ? this.props.OCA.get_dist() : '---');
        }, 50);
    }

    componentDidMount () {
        this.startGetDataLoop();
    }

    componentWillUnmount () {
        if (this.getDataLoopInterval) {
            clearInterval(this.getDataLoopInterval);
            this.getDataLoopInterval = null;
        }
    }

    render () {
        return (
            <div id="otto-1" className={classNames(sharedStyles.palette, sharedStyles.device_palette)}>
                <div id="otto-tittle" className={sharedStyles.header}>
                    <span className={sharedStyles.headerTitle}>
                        <DevicePaletteStatusDot
                            api={this.props.OCA}
                            connectedKey="ConnectedOttos"
                        />
                        {this.props.intl.formatMessage(messages.otto)}
                    </span>
                    <button
                        type="button"
                        className={sharedStyles.closeButton}
                        aria-label={this.props.intl.formatMessage(closeMessage)}
                    title={this.props.intl.formatMessage(closeMessage)}
                        onClick={this.onThisWindowClose.bind(this)}
                    />
                </div>
                <div className={classNames(sharedStyles.body, formStyles.palette_body)}>
                    <DevicePaletteStatus
                        api={this.props.OCA}
                        connectedKey="ConnectedOttos"
                    />
                    <div className={rowStyles.palette_device_list}>
                    <SensorDataBlockComponent
                        key={`otto-${this.props.ottoIndex}-sound-level`}
                        sensorId={`otto-${this.props.ottoIndex}-sound-level`}
                        deviceName="otto"
                        sensorType="analog"
                        sensorFieldText={this.props.intl.formatMessage(messages.sound_level)}
                        sensorName="sound_level"
                        sensorData={null}
                    />
                    <SensorDataBlockComponent
                        key={`otto-${this.props.ottoIndex}-distanse`}
                        sensorId={`otto-${this.props.ottoIndex}-distanse`}
                        deviceName="otto"
                        sensorType="analog"
                        sensorFieldText={this.props.intl.formatMessage(messages.distance)}
                        sensorName="distanse"
                        sensorData={null}
                    />
                    </div>
                    </div>
            </div>
        );
    }
}

const mapStateToProps = state => ({});

const mapDispatchToProps = dispatch => ({
    onOttoPaletteWindowClose: () => {
        dispatch(ActionTriggerDraggableWindow(5));
    }
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(OttoPalleteComponent));
