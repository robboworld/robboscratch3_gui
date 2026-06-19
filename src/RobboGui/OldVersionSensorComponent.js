import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import CommonFieldsSensorComponent from './CommonFieldsSensorComponent';
import { ActionTriggerOldAnalogSensorState } from './actions/sensor_actions';
import {resolveTelemetryValueVariant} from './telemetry-value-variant';

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
            onChange={this.triggerOldAnalogSensorState.bind(this)}
          />
        }
      />
    );
  }
}

const mapStateToProps = state => ({
  sensorsChooseWindow: state.scratchGui.sensors_choose_window,
  sensorsPalette: state.scratchGui.sensors_palette
});

const mapDispatchToProps = dispatch => ({
  triggerOldAnalogSensorState: payload => {
    dispatch(ActionTriggerOldAnalogSensorState(payload));
  }
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OldVersionSensorComponent);
