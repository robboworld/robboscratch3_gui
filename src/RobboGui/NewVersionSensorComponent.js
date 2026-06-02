import classNames from 'classnames';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import styles from './SensorComponent.css';
import CommonFieldsSensorComponent from './CommonFieldsSensorComponent';
import { ActionTriggerSensorChooseWindow } from './actions/sensor_actions';

class NewVersionSensorComponent extends Component {
  ChooseSensorName () {
    this.props.onSensorNameChoosen(ReactDOM.findDOMNode(this).parentElement.id);
  }

  render () {
    return (
      <CommonFieldsSensorComponent
        NameFieldText={this.props.fieldText}
        sensorId={this.props.sensorId}
        sensorName={this.props.sensorName}
        sensorData={this.props.sensorData}
        control={
          <button
            type="button"
            className={classNames(styles.sensor_choose_icon)}
            onClick={this.ChooseSensorName.bind(this)}
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
  onSensorNameChoosen: payload => {
    dispatch(ActionTriggerSensorChooseWindow(payload));
  }
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NewVersionSensorComponent);
