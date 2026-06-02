import classNames from 'classnames';
import React, { Component } from 'react';
import rowStyles from './DevicePaletteRows.css';
import styles from './SensorComponent.css';

class CommonFieldsSensorComponent extends Component {
  renderValue () {
    const sensors_data = this.props.sensorData;
    const sensorName = this.props.sensorName;

    if (
      sensorName === 'nosensor' ||
      typeof sensorName === 'undefined' ||
      typeof sensors_data === 'undefined'
    ) {
      return '---';
    }

    if (sensorName === 'color') {
      if (sensors_data[0] === -1) {
        return '---';
      }
      return (
        <span
          className={styles.color_value_swatch}
          style={{
            backgroundColor: `rgb(${sensors_data[0]},${sensors_data[1]},${sensors_data[2]})`
          }}
        />
      );
    }

    if (Array.isArray(sensors_data)) {
      return sensors_data[3];
    }

    return sensors_data;
  }

  render () {
    const valueContent = this.renderValue();
    const hasControl = Boolean(this.props.control);

    return (
      <div
        className={classNames(
          rowStyles.telemetry_row,
          hasControl && rowStyles.telemetry_row_with_control
        )}
      >
        {hasControl ? (
          <div className={rowStyles.telemetry_control_leading}>
            {this.props.control}
          </div>
        ) : null}
        <div className={rowStyles.telemetry_label}>
          {this.props.NameFieldText}
        </div>
        <div className={rowStyles.telemetry_value_group}>
          <span
            className={classNames(
              rowStyles.telemetry_value,
              this.props.sensorValueClassName
            )}
          >
            {valueContent}
          </span>
        </div>
      </div>
    );
  }
}

export default CommonFieldsSensorComponent;
