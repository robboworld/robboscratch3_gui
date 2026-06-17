import classNames from 'classnames';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import sharedStyles from './DevicePaletteShared.css';
import formStyles from './RobboPaletteForm.css';
import rowStyles from './DevicePaletteRows.css';
import SensorDataBlockComponent from './SensorDataBlockComponent';
import SensorComponent from './SensorComponent';
import {
  getPaletteSensorValueNode,
  setPaletteSensorColorValue,
  setPaletteSensorTextValue
} from './sensor-palette-dom';

import {ActionRobotGetDataStart} from  './actions/sensor_actions';
import {ActionTriggerDraggableWindow} from './actions/sensor_actions';
import {ActionSetRCALocal}  from './actions/sensor_actions';
import {ActionHideNoneScratchduinoBlocks} from './actions/sensor_actions';
import {ActionShowRobboBlocks} from './actions/sensor_actions';

import {defineMessages, intlShape, injectIntl, FormattedMessage} from 'react-intl';



const messages = defineMessages({

    sensor: {
        id: 'gui.RobboGui.RobotPalette.sensor',
        description: ' ',
        defaultMessage: 'Sensor '
    },

    path_left: {
        id: 'gui.RobboGui.RobotPalette.path_left',
        description: ' ',
        defaultMessage: 'Path left'
    },

    path_right: {
        id: 'gui.RobboGui.RobotPalette.path_right',
        description: ' ',
        defaultMessage: 'Path right'
    },

    start_button_pushed: {
        id: 'gui.RobboGui.RobotPalette.start_button_pushed',
        description: ' ',
        defaultMessage: 'Start button pushed'
    },
    robot: {
        id: 'gui.RobboGui.RobotPalette.robot',
        description: ' ',
        defaultMessage: 'Robot'
    },
    true: {
        id: 'gui.RobboGui.true',
        description: ' ',
        defaultMessage: 'true'
    },
    false: {
        id: 'gui.RobboGui.false',
        description: ' ',
        defaultMessage: 'false'
    }

  });


class RobotPalleteComponent extends Component {

  constructor(){

     super();

     this.getDataInterval = null;
  }

  componentWillUnmount () {
    if (this.getDataInterval) {
      clearInterval(this.getDataInterval);
      this.getDataInterval = null;
    }
  }



  startGetDataLoop(){





  }

  isRobotSimulationActive (props = this.props) {
    return Boolean(
      props.is_sim_activated ||
      (props.VM && props.VM.runtime && props.VM.runtime.sim_ac)
    );
  }

  shouldComponentUpdate (nextProps) {
    if (nextProps.draggable_window[1].isShowing === false) {
      return false;
    }
    if (this.props.draggable_window[1].isShowing !== nextProps.draggable_window[1].isShowing) {
      return true;
    }
    if (this.isRobotSimulationActive(this.props) !== this.isRobotSimulationActive(nextProps)) {
      return true;
    }
    if (this.props.is_sim_activated !== nextProps.is_sim_activated) {
      return true;
    }
    if (this.props.robot_sensors !== nextProps.robot_sensors) {
      return true;
    }
    if (this.props.robot_special_sensors !== nextProps.robot_special_sensors) {
      return true;
    }
    return false;
  }

  componentDidMount(){


    console.log("startRobotGetData");
  //  this.props.startRobotGetData(0,this.props.RCA);

   

  this.props.setRCALocal(this.props.RCA);

  this.robotGetDataStart();

 this.props.RCA.registerRobotIsScratchduinoCallback(this.props.onRobotIsScratchduino);
 this.props.RCA.registerRobotIsRobboCallback(this.props.onRobotIsRobbo);

  }


componentDidUpdate(){

  this.sensors_values_field_list = [];
  var sensor;

  sensor = document.getElementById(`${this.props.robot_special_sensors[0].sensor_device_name}_sensor-data-block-${this.props.robot_special_sensors[0].sensor_id}_type-${this.props.robot_special_sensors[0].sensor_type}`);

  this.sensors_values_field_list[0] = getPaletteSensorValueNode(sensor);

  sensor = document.getElementById(`${this.props.robot_special_sensors[1].sensor_device_name}_sensor-data-block-${this.props.robot_special_sensors[1].sensor_id}_type-${this.props.robot_special_sensors[1].sensor_type}`);

  this.sensors_values_field_list[1] = getPaletteSensorValueNode(sensor);

  sensor = document.getElementById(`${this.props.robot_special_sensors[2].sensor_device_name}_sensor-data-block-${this.props.robot_special_sensors[2].sensor_id}_type-${this.props.robot_special_sensors[2].sensor_type}`);

  this.sensors_values_field_list[2] = getPaletteSensorValueNode(sensor);

  for (let index = 0; index < this.props.robot_sensors.length; index++) {
    sensor = document.getElementById(`${this.props.robot_sensors[index].sensor_device_name}_sensor-${this.props.robot_sensors[index].sensor_id}_type-${this.props.robot_sensors[index].sensor_type}`);

    this.sensors_values_field_list[3 + index] = getPaletteSensorValueNode(sensor);
  }

}

  onThisWindowClose(){

    console.log("RobotPalette close");
    this.props.onRobotPaletteWindowClose(1);

  }

  robotGetData(){

    var sensors_values_field_list =   this.sensors_values_field_list;

    if (this.props.draggable_window[1].isShowing == true){

          const isSimulation = Boolean(this.props.VM && this.props.VM.runtime && this.props.VM.runtime.sim_ac);
          const primitives = isSimulation ? this.props.VM.runtime._primitives : null;
          const hasLiveSensorData = Boolean(
            this.props.RCA &&
            typeof this.props.RCA.getSensorsData === 'function' &&
            this.props.RCA.getSensorsData() != null
          );

          if (!isSimulation) {
            sensors_values_field_list[0].innerHTML = this.props.RCA.getLeftPath();
            sensors_values_field_list[1].innerHTML = this.props.RCA.getRightPath();
            sensors_values_field_list[2].innerHTML = (this.props.RCA.getButtonStartPushed() == "true")?this.props.intl.formatMessage(messages.true):this.props.intl.formatMessage(messages.false);
          } else if (primitives && primitives.robot_get_sensor_data) {
            const leftArgs = {ROBOT_SENSORS: "sensor_trip_meter_left"};
            const rightArgs = {ROBOT_SENSORS: "sensor_trip_meter_right"};
            sensors_values_field_list[0].innerHTML = primitives.robot_get_sensor_data(leftArgs, null);
            sensors_values_field_list[1].innerHTML = primitives.robot_get_sensor_data(rightArgs, null);
            sensors_values_field_list[2].innerHTML = (this.props.RCA.getButtonStartPushed() == "true")?this.props.intl.formatMessage(messages.true):this.props.intl.formatMessage(messages.false);
          }


          const colorValueClass = rowStyles.telemetry_value_color;

          for (let index = 0; index < this.props.robot_sensors.length; index++) {
            const valueCell = sensors_values_field_list[3 + index];
            if (!valueCell) {
              continue;
            }

            if (!this.props.robot_sensors[index].sensor_active) {
              setPaletteSensorTextValue(valueCell, '---', colorValueClass);
              continue;
            }

            let sensor_data;

            if (this.props.robot_sensors[index].sensor_name === 'color') {
              if (isSimulation && primitives && primitives.getSensorDataFromLastUtil) {
                sensor_data = primitives.getSensorDataFromLastUtil(index);
              } else {
                sensor_data = this.props.RCA.colorFilter(index);
              }

              if (sensor_data && sensor_data[0] !== -1) {
                setPaletteSensorColorValue(
                  valueCell,
                  sensor_data[0],
                  sensor_data[1],
                  sensor_data[2],
                  colorValueClass
                );
              } else {
                setPaletteSensorTextValue(valueCell, '---', colorValueClass);
              }
            } else {
              if (isSimulation && primitives && primitives.getSensorDataFromLastUtil) {
                sensor_data = primitives.getSensorDataFromLastUtil(index);
              } else if (hasLiveSensorData) {
                sensor_data = this.props.RCA.getSensorData(index);
              } else {
                sensor_data = undefined;
              }

              if (typeof sensor_data !== 'undefined' && !isNaN(sensor_data)) {
                setPaletteSensorTextValue(valueCell, sensor_data, colorValueClass);
              } else {
                setPaletteSensorTextValue(valueCell, '---', colorValueClass);
              }
            }
          }


    }




  }

  robotGetDataStart(){

    this.sensors_values_field_list = [];
    var sensor;

    sensor = document.getElementById(`${this.props.robot_special_sensors[0].sensor_device_name}_sensor-data-block-${this.props.robot_special_sensors[0].sensor_id}_type-${this.props.robot_special_sensors[0].sensor_type}`);

    this.sensors_values_field_list[0] = getPaletteSensorValueNode(sensor);

    sensor = document.getElementById(`${this.props.robot_special_sensors[1].sensor_device_name}_sensor-data-block-${this.props.robot_special_sensors[1].sensor_id}_type-${this.props.robot_special_sensors[1].sensor_type}`);

    this.sensors_values_field_list[1] = getPaletteSensorValueNode(sensor);

    sensor = document.getElementById(`${this.props.robot_special_sensors[2].sensor_device_name}_sensor-data-block-${this.props.robot_special_sensors[2].sensor_id}_type-${this.props.robot_special_sensors[2].sensor_type}`);

    this.sensors_values_field_list[2] = getPaletteSensorValueNode(sensor);

    for (let index = 0; index < this.props.robot_sensors.length; index++) {
      sensor = document.getElementById(`${this.props.robot_sensors[index].sensor_device_name}_sensor-${this.props.robot_sensors[index].sensor_id}_type-${this.props.robot_sensors[index].sensor_type}`);

      this.sensors_values_field_list[3 + index] = getPaletteSensorValueNode(sensor);
    }

     this.getDataInterval =  setInterval(() => {

          this.robotGetData.call(this);

      },50);

  }

  render() {

  let sensor_data = "";

  if (this.props.robot_special_sensors[2].sensor_data == "false"){

    sensor_data = this.props.intl.formatMessage(messages.false);

  }else if (this.props.robot_special_sensors[2].sensor_data == "true"){

      sensor_data = this.props.intl.formatMessage(messages.true);

  }else{

    //  sensor_data =this.props.robot_special_sensors[2].sensor_data;

    sensor_data = this.props.intl.formatMessage(messages.false);

  }


    return (



      <div id="robot-1" className={classNames(sharedStyles.palette, sharedStyles.device_palette)}>


            <div id="robot-tittle" className={sharedStyles.header}>
                <span className={sharedStyles.headerTitle}>
                    {this.props.intl.formatMessage(messages.robot)}
                </span>
                <button
                    type="button"
                    className={sharedStyles.closeButton}
                    aria-label="Close"
                    onClick={this.onThisWindowClose.bind(this)}
                />
            </div>
            <div className={classNames(sharedStyles.body, formStyles.palette_body)}>
            <div className={rowStyles.palette_device_list}>
            <SensorDataBlockComponent key={this.props.robot_special_sensors[0].sensor_id} sensorId={this.props.robot_special_sensors[0].sensor_id}
                               deviceName={this.props.robot_special_sensors[0].sensor_device_name} sensorType={this.props.robot_special_sensors[0].sensor_type}
                               sensorFieldText={this.props.intl.formatMessage(messages.path_left)}
                               sensorName={this.props.robot_special_sensors[0].sensor_name}
                                sensorData={this.props.robot_special_sensors[0].sensor_data} />

            <SensorDataBlockComponent key={this.props.robot_special_sensors[1].sensor_id} sensorId={this.props.robot_special_sensors[1].sensor_id}
                                                  deviceName={this.props.robot_special_sensors[1].sensor_device_name} sensorType={this.props.robot_special_sensors[1].sensor_type}
                                                  sensorFieldText={this.props.intl.formatMessage(messages.path_right)}
                                                  sensorName={this.props.robot_special_sensors[1].sensor_name}
                                                  sensorData={this.props.robot_special_sensors[1].sensor_data} />

        {


              this.props.robot_sensors.map((sensor, index) => {
                   const sensorPictureUrl = `./static/robbo_assets/16/${sensor.sensor_device_name}_sensor_${sensor.sensor_name}.png`;
                   const field_text = `${this.props.intl.formatMessage(messages.sensor)} ${index + 1}`;
                   const useExtendedSensorUi = sensor.is_sensor_version_new || this.isRobotSimulationActive();

                   return (
                     <SensorComponent
                       key={index}
                       index={index}
                       sensorId={sensor.sensor_id}
                       isSensorVersionNew={useExtendedSensorUi}
                       sensorPictureUrl={sensorPictureUrl}
                       deviceName={sensor.sensor_device_name}
                       sensorType={sensor.sensor_type}
                       sensorFieldText={field_text}
                       sensorName={sensor.sensor_name}
                       sensorData={sensor.sensor_data}
                     />
                   );
              })

        }


        <SensorDataBlockComponent key={this.props.robot_special_sensors[2].sensor_id} sensorId={this.props.robot_special_sensors[2].sensor_id}
                           deviceName={this.props.robot_special_sensors[2].sensor_device_name} sensorType={this.props.robot_special_sensors[2].sensor_type}
                           sensorFieldText={this.props.intl.formatMessage(messages.start_button_pushed)}
                           sensorName={this.props.robot_special_sensors[2].sensor_name}
                           sensorData={sensor_data} />
            </div>
            </div>
      </div>


    );


  }


}


const mapStateToProps =  state => ({


  robot_sensors: state.scratchGui.robot_sensors,
  robot_special_sensors: state.scratchGui.robot_special_sensors,
  draggable_window: state.scratchGui.draggable_window,
  is_sim_activated: state.scratchGui.settings.is_sim_activated === true

  });

const mapDispatchToProps = dispatch => ({

  startRobotGetData: (robot_number,RCA) => {

      dispatch(ActionRobotGetDataStart(robot_number,RCA));

  },

  onRobotPaletteWindowClose: () => {

      dispatch(ActionTriggerDraggableWindow(1));
    },

    setRCALocal: (RCA) => {

          dispatch(ActionSetRCALocal(RCA));

    },

    onRobotIsScratchduino: () => {

      dispatch(ActionHideNoneScratchduinoBlocks());

    },

    onRobotIsRobbo: () => {

      dispatch(ActionShowRobboBlocks());

    }

});

export default injectIntl(connect(
  mapStateToProps,
  mapDispatchToProps
)(RobotPalleteComponent));
