import classNames from 'classnames';
import React, { Component } from 'react';
import rowStyles from './DevicePaletteRows.css';
import styles from './SensorComponent.css';
import {getTelemetryValueVariantClassNames} from './telemetry-value-variant';

class CommonFieldsSensorComponent extends Component {
  formatDisplayValue (rawValue) {
    if (
      rawValue == null ||
      rawValue === '' ||
      (typeof rawValue === 'number' && isNaN(rawValue))
    ) {
      return '---';
    }
    return rawValue;
  }

  renderValue () {
    const sensors_data = this.props.sensorData;
    const sensorName = this.props.sensorName;

    if (
      sensorName === 'nosensor' ||
      typeof sensorName === 'undefined' ||
      sensors_data == null ||
      typeof sensors_data === 'undefined'
    ) {
      return '---';
    }

    if (sensorName === 'color') {
      if (!Array.isArray(sensors_data) || sensors_data[0] === -1) {
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
      return this.formatDisplayValue(sensors_data[3]);
    }

    return this.formatDisplayValue(sensors_data);
  }

  render () {
    const valueContent = this.renderValue();
    const hasControl = Boolean(this.props.control);
    const isColorSwatch = this.props.sensorName === 'color' &&
      valueContent !== '---' &&
      typeof valueContent !== 'string';
    const variant = this.props.valueVariant || 'small';
    const variantClassNames = isColorSwatch
      ? {valueClassName: null, rowClassName: rowStyles.telemetry_row_value_small}
      : getTelemetryValueVariantClassNames(variant, rowStyles);

    return (
      <div
        className={classNames(
          rowStyles.telemetry_row,
          variantClassNames.rowClassName,
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
              variantClassNames.valueClassName,
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
