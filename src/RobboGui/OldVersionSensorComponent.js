import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import CommonFieldsSensorComponent from './CommonFieldsSensorComponent';
import { ActionTriggerOldAnalogSensorState } from './actions/sensor_actions';
import {defineMessages, injectIntl} from 'react-intl';
import {resolveTelemetryValueVariant} from './telemetry-value-variant';

const messages = defineMessages({
  enable: {
    id: 'gui.RobboGui.SensorChoose.enableOld',
    description: 'Checkbox of an old-firmware robot port: read the analog sensor on it ({port} is "Sensor 1")',
    defaultMessage: '{port}: read the sensor'
  }
});

class OldVersionSensorComponent extends Component {
  triggerOldAnalogSensorState () {
    this.props.triggerOldAnalogSensorState(
      ReactDOM.findDOMNode(this).parentElement.id
    );
  }

  render () {
    return (
      <CommonFieldsSensorComponent
        NameFieldText={this.props.fieldText}
        sensorId={this.props.sensorId}
        sensorName={this.props.sensorName}
        sensorData={this.props.sensorData}
        valueVariant={resolveTelemetryValueVariant({
          deviceName: this.props.deviceName,
          sensorName: this.props.sensorName,
          sensorType: this.props.sensorType
        })}
        control={
          <input
            type="checkbox"
            // Controlled by the store: the palette remounts when reopened, an uncontrolled
            // checkbox came back unchecked while the sensor stayed on (and the next click inverted it).
            checked={this.props.sensorActive}
            title={this.props.intl.formatMessage(messages.enable, {port: this.props.fieldText})}
            aria-label={this.props.intl.formatMessage(messages.enable, {port: this.props.fieldText})}
            onChange={this.triggerOldAnalogSensorState.bind(this)}
          />
        }
      />
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  const sensor = (state.scratchGui.robot_sensors || []).find(item => item.sensor_id === ownProps.sensorId);
  return {
    sensorActive: Boolean(sensor && sensor.sensor_active),
    sensorsChooseWindow: state.scratchGui.sensors_choose_window,
    sensorsPalette: state.scratchGui.sensors_palette
  };
};

const mapDispatchToProps = dispatch => ({
  triggerOldAnalogSensorState: payload => {
    dispatch(ActionTriggerOldAnalogSensorState(payload));
  }
});

export default injectIntl(connect(
  mapStateToProps,
  mapDispatchToProps
)(OldVersionSensorComponent));
