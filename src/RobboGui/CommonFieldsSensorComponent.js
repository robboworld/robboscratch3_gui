import classNames from 'classnames';
import React, { Component } from 'react';
import rowStyles from './DevicePaletteRows.css';
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
      return '---';
    }

    if (Array.isArray(sensors_data)) {
      return this.formatDisplayValue(sensors_data[3]);
    }

    return this.formatDisplayValue(sensors_data);
  }

  render () {
    const valueContent = this.renderValue();
    const hasControl = Boolean(this.props.control);
    const variant = this.props.valueVariant || 'small';
    const variantClassNames = getTelemetryValueVariantClassNames(variant, rowStyles);

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
