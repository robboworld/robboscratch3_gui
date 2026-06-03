import React, { Component } from 'react';
import CommonFieldsSensorComponent from './CommonFieldsSensorComponent';
import {resolveTelemetryValueVariant} from './telemetry-value-variant';

class SensorDataBlockComponent extends Component {
  render () {
    const valueVariant = this.props.valueVariant || resolveTelemetryValueVariant({
      deviceName: this.props.deviceName,
      sensorName: this.props.sensorName,
      sensorType: this.props.sensorType
    });

    return (
      <div id={`${this.props.deviceName}_sensor-data-block-${this.props.sensorId}_type-${this.props.sensorType}`}>
        <CommonFieldsSensorComponent
          NameFieldText={`${this.props.sensorFieldText}`}
          sensorId={this.props.sensorId}
          sensorName={this.props.sensorName}
          sensorData={this.props.sensorData}
          sensorValueClassName={this.props.sensorValueClassName}
          valueVariant={valueVariant}
        />
      </div>
    );
  }
}

export default SensorDataBlockComponent;
