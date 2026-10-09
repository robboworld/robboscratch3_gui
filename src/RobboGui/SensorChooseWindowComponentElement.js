import classNames from 'classnames';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import styles from './SensorChooseWindowComponentElement.css';
import {ActionTriggerSensorName} from './actions/sensor_actions'

/** One sensor type: picture + name; the current one is highlighted (aria-pressed). */
class SensorChooseWindowComponentElement extends Component {

  constructor (props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

  elementId () {
    // Parsed by ActionTriggerSensorName: <device>-sensor-name-<sensor>_CallerSensorId-<id>.
    return `${this.props.deviceName}-sensor-name-${this.props.sensorName}_CallerSensorId-${this.props.CallerSensorId}`;
  }

  handleClick () {
    this.props.onSensorNameChoosen(this.elementId());
  }

  render() {
    return (
      <button
        type="button"
        id={this.elementId()}
        className={classNames(styles.sensor_choose_window_component_element, {
          [styles.selected]: this.props.selected
        })}
        aria-pressed={Boolean(this.props.selected)}
        onClick={this.handleClick}
      >
        <img
          src={this.props.sensorPictureUrl}
          alt=""
          draggable={false}
        />
        <span className={styles.label}>{this.props.label}</span>
      </button>
    );
  }
}

const mapStateToProps = () => ({});

const mapDispatchToProps = dispatch => ({
  onSensorNameChoosen: (payload) => {
    dispatch(ActionTriggerSensorName(payload));
  }
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SensorChooseWindowComponentElement);
