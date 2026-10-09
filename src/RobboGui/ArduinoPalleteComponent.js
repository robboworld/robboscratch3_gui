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

import {ActionTriggerDraggableWindow} from './actions/sensor_actions'

import {defineMessages, injectIntl} from 'react-intl';
import {closeMessage} from './sensor-type-messages';

function formatArduinoPinLabel (pinIndex) {
    if (pinIndex < 14) return `D${pinIndex}`;
    return `A${pinIndex - 14}`;
}

const messages = defineMessages({
    arduino: {
        id: 'gui.RobboGui.ArduinoPalette.arduino',
        description: ' ',
        defaultMessage: 'Arduino'
    }
});

/** D0–D13 and A0–A5; pins 20–21 are not shown. */
const PIN_COUNT = 20;
const COLUMN_SIZE = 10;
const PINS = Array.from({length: PIN_COUNT}, (value, pin) => pin);

class ArduinoPalleteComponent extends Component {
  onThisWindowClose(){
    this.props.onArduinoPaletteWindowClose(6);
  }

  pinSensorId (pin) {
    return `arduino-${this.props.arduinoIndex}-pin${pin}`;
  }

  startGetDataLoop(){
    const valueFields = PINS.map(pin => getPaletteSensorValueNode(
      document.getElementById(`arduino_sensor-data-block-${this.pinSensorId(pin)}_type-analog`)
    ));
    if (this.getDataLoopInterval) {
      clearInterval(this.getDataLoopInterval);
    }
    this.getDataLoopInterval = setInterval(() => {
      // No board: show "---", not the API default 0.
      const live = isDeviceLinkLive(getDeviceLinkKind(this.props.ACA, 'ConnectedArduinos', false));
      valueFields.forEach((field, pin) => {
        setPaletteSensorTextValue(field, live ? this.props.ACA.get_pin(pin) : '---');
      });
    }, 50);
  }

  componentDidMount(){
      this.startGetDataLoop();
  }

  componentWillUnmount () {
    if (this.getDataLoopInterval) {
      clearInterval(this.getDataLoopInterval);
      this.getDataLoopInterval = null;
    }
  }

  renderPin (pin) {
    return (
      <SensorDataBlockComponent
        key={this.pinSensorId(pin)}
        sensorId={this.pinSensorId(pin)}
        deviceName="arduino"
        sensorType="analog"
        sensorFieldText={formatArduinoPinLabel(pin)}
        sensorName={`pin${pin}`}
        sensorData={null}
      />
    );
  }

  render() {
    return (
          <div id="arduino-1" className={classNames(sharedStyles.palette, sharedStyles.device_palette, sharedStyles.device_palette_wide)}>
                <div id="arduino-tittle" className={sharedStyles.header}>
                    <span className={sharedStyles.headerTitle}>
                        <DevicePaletteStatusDot
                            api={this.props.ACA}
                            connectedKey="ConnectedArduinos"
                        />
                        {this.props.intl.formatMessage(messages.arduino)}
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
                          api={this.props.ACA}
                          connectedKey="ConnectedArduinos"
                      />
                      <div className={classNames(rowStyles.palette_device_list, rowStyles.palette_device_list_dual)}>
                          <div className={rowStyles.palette_device_column}>
                              {PINS.slice(0, COLUMN_SIZE).map(pin => this.renderPin(pin))}
                          </div>
                          <div className={rowStyles.palette_device_column}>
                              {PINS.slice(COLUMN_SIZE).map(pin => this.renderPin(pin))}
                          </div>
                      </div>
                </div>
          </div>
    );
  }
}

const mapStateToProps =  state => ({
  });

const mapDispatchToProps = dispatch => ({
  onArduinoPaletteWindowClose: () => {
      dispatch(ActionTriggerDraggableWindow(6));
    }
});

export default injectIntl(connect(
  mapStateToProps,
  mapDispatchToProps
)(ArduinoPalleteComponent));
