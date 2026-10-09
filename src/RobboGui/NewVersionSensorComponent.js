import classNames from 'classnames';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import {injectIntl} from 'react-intl';
import styles from './SensorComponent.css';
import CommonFieldsSensorComponent from './CommonFieldsSensorComponent';
import { ActionDropSensorChooseWindow, ActionTriggerSensorChooseWindow } from './actions/sensor_actions';
import {resolveTelemetryValueVariant} from './telemetry-value-variant';
import {chooseSensorMessage, sensorTypeMessages} from './sensor-type-messages';

/** Size of the sensor choose window (SensorChooseWindowComponent.css) to place it next to the button. */
const CHOOSE_WINDOW_WIDTH = 352;
const CHOOSE_WINDOW_HEIGHT = 240;
const CHOOSE_WINDOW_GAP = 8;

class NewVersionSensorComponent extends Component {
  constructor (props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

  /** The window opens next to the clicked button, inside the screen. */
  handleClick (event) {
    const rect = event.currentTarget.getBoundingClientRect();
    let left = rect.right + CHOOSE_WINDOW_GAP;
    if (left + CHOOSE_WINDOW_WIDTH > window.innerWidth - CHOOSE_WINDOW_GAP) {
      left = rect.left - CHOOSE_WINDOW_WIDTH - CHOOSE_WINDOW_GAP;
    }
    left = Math.max(CHOOSE_WINDOW_GAP, left);
    const top = Math.max(CHOOSE_WINDOW_GAP,
      Math.min(rect.top - 40, window.innerHeight - CHOOSE_WINDOW_HEIGHT - CHOOSE_WINDOW_GAP));
    this.props.onPlaceChooseWindow(top, left);
    this.props.onSensorNameChoosen(ReactDOM.findDOMNode(this).parentElement.id);
  }

  render () {
    const {intl} = this.props;
    const sensorMessage = sensorTypeMessages[this.props.sensorName];
    const sensorLabel = sensorMessage ? intl.formatMessage(sensorMessage) : this.props.sensorName;
    // Tooltip: just the sensor type; screen readers also hear the port and the action.
    const label = intl.formatMessage(chooseSensorMessage, {port: this.props.fieldText, sensor: sensorLabel});
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
          <button
            type="button"
            className={classNames(styles.sensor_choose_icon)}
            title={sensorLabel}
            aria-label={label}
            onClick={this.handleClick}
          >
            <img src={this.props.sensorPictureUrl} alt="" />
          </button>
        }
      />
    );
  }
}

const mapStateToProps = () => ({});

const mapDispatchToProps = dispatch => ({
  onPlaceChooseWindow: (top, left) => {
    dispatch(ActionDropSensorChooseWindow(top, left));
  },
  onSensorNameChoosen: payload => {
    dispatch(ActionTriggerSensorChooseWindow(payload));
  }
});

export default injectIntl(connect(
  mapStateToProps,
  mapDispatchToProps
)(NewVersionSensorComponent));
