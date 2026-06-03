/**
 * Palette telemetry value column width variant.
 * @typedef {'bool' | 'small' | 'signed' | 'medium' | 'coord'} TelemetryValueVariant
 */

/**
 * @param {{ deviceName?: string, sensorName?: string, sensorType?: string }} params
 * @returns {TelemetryValueVariant}
 */
export function resolveTelemetryValueVariant ({deviceName, sensorName, sensorType}) {
  if (deviceName === 'arduino') {
    return 'medium';
  }

  if (deviceName === 'quadcopter') {
    if (sensorName === 'battery-level' || sensorName === 'yaw') {
      return 'signed';
    }
    if (sensorName && sensorName.startsWith('coord-')) {
      return 'coord';
    }
  }

  if (
    sensorType === 'button_start' ||
    sensorName === 'button_start' ||
    sensorType === 'lab-button'
  ) {
    return 'bool';
  }

  if (sensorType === 'DIGITAL') {
    return 'bool';
  }

  return 'small';
}

/**
 * @param {TelemetryValueVariant} variant
 * @param {Record<string, string>} rowStyles CSS module map from DevicePaletteRows.css
 * @returns {{ valueClassName: string, rowClassName: string }}
 */
export function getTelemetryValueVariantClassNames (variant, rowStyles) {
  switch (variant) {
  case 'bool':
    return {
      valueClassName: rowStyles.telemetry_value_bool,
      rowClassName: rowStyles.telemetry_row_value_bool
    };
  case 'signed':
    return {
      valueClassName: rowStyles.telemetry_value_signed,
      rowClassName: rowStyles.telemetry_row_value_signed
    };
  case 'medium':
    return {
      valueClassName: rowStyles.telemetry_value_medium,
      rowClassName: rowStyles.telemetry_row_value_medium
    };
  case 'coord':
    return {
      valueClassName: rowStyles.telemetry_value_coord,
      rowClassName: rowStyles.telemetry_row_value_coord
    };
  default:
    return {
      valueClassName: rowStyles.telemetry_value_small,
      rowClassName: rowStyles.telemetry_row_value_small
    };
  }
}
