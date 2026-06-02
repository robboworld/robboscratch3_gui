import classNames from 'classnames';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import sharedStyles from './DevicePaletteShared.css';
import formStyles from './RobboPaletteForm.css';
import rowStyles from './DevicePaletteRows.css';
import SensorDataBlockComponent from './SensorDataBlockComponent';
import { getPaletteSensorValueNode } from './sensor-palette-dom';

import {ActionTriggerDraggableWindow} from './actions/sensor_actions'

import {defineMessages, intlShape, injectIntl, FormattedMessage} from 'react-intl';

const messages = defineMessages({
    pin0: {
        id: 'gui.RobboGui.ArduinoPalette.pin0',
        description: ' ',
        defaultMessage: 'D0'
    },

    pin1: {
        id: 'gui.RobboGui.ArduinoPalette.pin1',
        description: ' ',
        defaultMessage: 'D1'
    },
    pin2: {
        id: 'gui.RobboGui.ArduinoPalette.pin2',
        description: ' ',
        defaultMessage: 'D2'
    },
    pin3: {
        id: 'gui.RobboGui.ArduinoPalette.pin3',
        description: ' ',
        defaultMessage: 'D3'
    },
    pin4: {
        id: 'gui.RobboGui.ArduinoPalette.pin4',
        description: ' ',
        defaultMessage: 'D4'
    },
    pin5: {
        id: 'gui.RobboGui.ArduinoPalette.pin5',
        description: ' ',
        defaultMessage: 'D5'
    },
    pin6: {
        id: 'gui.RobboGui.ArduinoPalette.pin6',
        description: ' ',
        defaultMessage: 'D6'
    },
    pin7: {
        id: 'gui.RobboGui.ArduinoPalette.pin7',
        description: ' ',
        defaultMessage: 'D7'
    },
    pin8: {
        id: 'gui.RobboGui.ArduinoPalette.pin8',
        description: ' ',
        defaultMessage: 'D8'
    },
    pin9: {
        id: 'gui.RobboGui.ArduinoPalette.pin9',
        description: ' ',
        defaultMessage: 'D9'
    },
    pin10: {
        id: 'gui.RobboGui.ArduinoPalette.pin10',
        description: ' ',
        defaultMessage: 'D10'
    },
    pin11: {
        id: 'gui.RobboGui.ArduinoPalette.pin11',
        description: ' ',
        defaultMessage: 'D11'
    },
    pin12: {
        id: 'gui.RobboGui.ArduinoPalette.pin12',
        description: ' ',
        defaultMessage: 'D12'
    },
    pin13: {
        id: 'gui.RobboGui.ArduinoPalette.pin13',
        description: ' ',
        defaultMessage: 'D13'
    },
    pin14: {
        id: 'gui.RobboGui.ArduinoPalette.pin14',
        description: ' ',
        defaultMessage: 'A0'
    },
    pin15: {
        id: 'gui.RobboGui.ArduinoPalette.pin15',
        description: ' ',
        defaultMessage: 'A1'
    },
    pin16: {
        id: 'gui.RobboGui.ArduinoPalette.pin16',
        description: ' ',
        defaultMessage: 'A2'
    },
    pin17: {
        id: 'gui.RobboGui.ArduinoPalette.pin17',
        description: ' ',
        defaultMessage: 'A3'
    },
    pin18: {
        id: 'gui.RobboGui.ArduinoPalette.pin18',
        description: ' ',
        defaultMessage: 'A4'
    },
    pin19: {
        id: 'gui.RobboGui.ArduinoPalette.pin19',
        description: ' ',
        defaultMessage: 'A5'
    },
    pin20: {
        id: 'gui.RobboGui.ArduinoPalette.pin20',
        description: ' ',
        defaultMessage: 'PIN 20'
    },
    pin21: {
        id: 'gui.RobboGui.ArduinoPalette.pin21',
        description: ' ',
        defaultMessage: 'PIN 21'
    },
    arduino: {
        id: 'gui.RobboGui.ArduinoPalette.arduino',
        description: ' ',
        defaultMessage: 'Arduino'
    }
  });

class ArduinoPalleteComponent extends Component {
  onThisWindowClose(){
    console.log("ArduinoPalette close");
    this.props.onArduinoPaletteWindowClose(6);
  }

  startGetDataLoop(){

    var pin0_sensor_component = document.getElementById(`arduino_sensor-data-block-arduino-${this.props.arduinoIndex}-pin0_type-analog`);
    var pin0_sensor_value_field = getPaletteSensorValueNode(pin0_sensor_component);
    var pin1_sensor_component = document.getElementById(`arduino_sensor-data-block-arduino-${this.props.arduinoIndex}-pin1_type-analog`);
    var pin1_sensor_value_field = getPaletteSensorValueNode(pin1_sensor_component);
    var pin2_sensor_component = document.getElementById(`arduino_sensor-data-block-arduino-${this.props.arduinoIndex}-pin2_type-analog`);
    var pin2_sensor_value_field = getPaletteSensorValueNode(pin2_sensor_component);
    var pin3_sensor_component = document.getElementById(`arduino_sensor-data-block-arduino-${this.props.arduinoIndex}-pin3_type-analog`);
    var pin3_sensor_value_field = getPaletteSensorValueNode(pin3_sensor_component);
    var pin4_sensor_component = document.getElementById(`arduino_sensor-data-block-arduino-${this.props.arduinoIndex}-pin4_type-analog`);
    var pin4_sensor_value_field = getPaletteSensorValueNode(pin4_sensor_component);
    var pin5_sensor_component = document.getElementById(`arduino_sensor-data-block-arduino-${this.props.arduinoIndex}-pin5_type-analog`);
    var pin5_sensor_value_field = getPaletteSensorValueNode(pin5_sensor_component);
    var pin6_sensor_component = document.getElementById(`arduino_sensor-data-block-arduino-${this.props.arduinoIndex}-pin6_type-analog`);
    var pin6_sensor_value_field = getPaletteSensorValueNode(pin6_sensor_component);
    var pin7_sensor_component = document.getElementById(`arduino_sensor-data-block-arduino-${this.props.arduinoIndex}-pin7_type-analog`);
    var pin7_sensor_value_field = getPaletteSensorValueNode(pin7_sensor_component);
    var pin8_sensor_component = document.getElementById(`arduino_sensor-data-block-arduino-${this.props.arduinoIndex}-pin8_type-analog`);
    var pin8_sensor_value_field = getPaletteSensorValueNode(pin8_sensor_component);
    var pin9_sensor_component = document.getElementById(`arduino_sensor-data-block-arduino-${this.props.arduinoIndex}-pin9_type-analog`);
    var pin9_sensor_value_field = getPaletteSensorValueNode(pin9_sensor_component);
    var pin10_sensor_component = document.getElementById(`arduino_sensor-data-block-arduino-${this.props.arduinoIndex}-pin10_type-analog`);
    var pin10_sensor_value_field = getPaletteSensorValueNode(pin10_sensor_component);
    var pin11_sensor_component = document.getElementById(`arduino_sensor-data-block-arduino-${this.props.arduinoIndex}-pin11_type-analog`);
    var pin11_sensor_value_field = getPaletteSensorValueNode(pin11_sensor_component);
    var pin12_sensor_component = document.getElementById(`arduino_sensor-data-block-arduino-${this.props.arduinoIndex}-pin12_type-analog`);
    var pin12_sensor_value_field = getPaletteSensorValueNode(pin12_sensor_component);
    var pin13_sensor_component = document.getElementById(`arduino_sensor-data-block-arduino-${this.props.arduinoIndex}-pin13_type-analog`);
    var pin13_sensor_value_field = getPaletteSensorValueNode(pin13_sensor_component);
    var pin14_sensor_component = document.getElementById(`arduino_sensor-data-block-arduino-${this.props.arduinoIndex}-pin14_type-analog`);
    var pin14_sensor_value_field = getPaletteSensorValueNode(pin14_sensor_component);
    var pin15_sensor_component = document.getElementById(`arduino_sensor-data-block-arduino-${this.props.arduinoIndex}-pin15_type-analog`);
    var pin15_sensor_value_field = getPaletteSensorValueNode(pin15_sensor_component);
    var pin16_sensor_component = document.getElementById(`arduino_sensor-data-block-arduino-${this.props.arduinoIndex}-pin16_type-analog`);
    var pin16_sensor_value_field = getPaletteSensorValueNode(pin16_sensor_component);
    var pin17_sensor_component = document.getElementById(`arduino_sensor-data-block-arduino-${this.props.arduinoIndex}-pin17_type-analog`);
    var pin17_sensor_value_field = getPaletteSensorValueNode(pin17_sensor_component);
    var pin18_sensor_component = document.getElementById(`arduino_sensor-data-block-arduino-${this.props.arduinoIndex}-pin18_type-analog`);
    var pin18_sensor_value_field = getPaletteSensorValueNode(pin18_sensor_component);
    var pin19_sensor_component = document.getElementById(`arduino_sensor-data-block-arduino-${this.props.arduinoIndex}-pin19_type-analog`);
    var pin19_sensor_value_field = getPaletteSensorValueNode(pin19_sensor_component);
    // var pin20_sensor_component = document.getElementById(`arduino_sensor-data-block-arduino-${this.props.arduinoIndex}-pin20_type-analog`);
    // var pin20_sensor_value_field = pin20_sensor_component;
    // var pin21_sensor_component = document.getElementById(`arduino_sensor-data-block-arduino-${this.props.arduinoIndex}-pin21_type-analog`);
    // var pin21_sensor_value_field = pin21_sensor_component;
    var getDataLoopInterval = setInterval(() => {
          pin0_sensor_value_field.innerHTML = this.props.ACA.get_pin(0);
          pin1_sensor_value_field.innerHTML = this.props.ACA.get_pin(1);
          pin2_sensor_value_field.innerHTML = this.props.ACA.get_pin(2);
          pin3_sensor_value_field.innerHTML = this.props.ACA.get_pin(3);
          pin4_sensor_value_field.innerHTML = this.props.ACA.get_pin(4);
          pin5_sensor_value_field.innerHTML = this.props.ACA.get_pin(5);
          pin6_sensor_value_field.innerHTML = this.props.ACA.get_pin(6);
          pin7_sensor_value_field.innerHTML = this.props.ACA.get_pin(7);
          pin8_sensor_value_field.innerHTML = this.props.ACA.get_pin(8);
          pin9_sensor_value_field.innerHTML = this.props.ACA.get_pin(9);
          pin10_sensor_value_field.innerHTML = this.props.ACA.get_pin(10);
          pin11_sensor_value_field.innerHTML = this.props.ACA.get_pin(11);
          pin12_sensor_value_field.innerHTML = this.props.ACA.get_pin(12);
          pin13_sensor_value_field.innerHTML = this.props.ACA.get_pin(13);
          pin14_sensor_value_field.innerHTML = this.props.ACA.get_pin(14);
          pin15_sensor_value_field.innerHTML = this.props.ACA.get_pin(15);
          pin16_sensor_value_field.innerHTML = this.props.ACA.get_pin(16);
          pin17_sensor_value_field.innerHTML = this.props.ACA.get_pin(17);
          pin18_sensor_value_field.innerHTML = this.props.ACA.get_pin(18);
          pin19_sensor_value_field.innerHTML = this.props.ACA.get_pin(19);
          // pin20_sensor_value_field.innerHTML = this.props.ACA.get_pin(20);
          // pin21_sensor_value_field.innerHTML = this.props.ACA.get_pin(21);

          },50);
  }

  componentDidMount(){
      this.startGetDataLoop();
  }

  render() {
    return (
          <div id="arduino-1" className={classNames(sharedStyles.palette, sharedStyles.device_palette, sharedStyles.device_palette_wide)}>
                <div id="arduino-tittle" className={sharedStyles.header}>
                    <span className={sharedStyles.headerTitle}>
                        {this.props.intl.formatMessage(messages.arduino)}
                    </span>
                    <button
                        type="button"
                        className={sharedStyles.closeButton}
                        aria-label="Close"
                        onClick={this.onThisWindowClose.bind(this)}
                    />
                </div>
                <div className={classNames(sharedStyles.body, formStyles.palette_body)}>
                      <div className={classNames(rowStyles.palette_device_list, rowStyles.palette_device_list_dual)}>
                      <div className={rowStyles.palette_device_column}> 


                     
                                  <SensorDataBlockComponent key={`arduino-${this.props.arduinoIndex}-pin0`} sensorId={`arduino-${this.props.arduinoIndex}-pin0`}
                                   deviceName={`arduino`} sensorType={`analog`}
                                   sensorFieldText={this.props.intl.formatMessage(messages.pin0)}
                                   sensorName={`pin0`}
                                   sensorData={`0`} />
                                 <SensorDataBlockComponent key={`arduino-${this.props.arduinoIndex}-pin1`} sensorId={`arduino-${this.props.arduinoIndex}-pin1`}
                                   deviceName={`arduino`} sensorType={`analog`}
                                   sensorFieldText={this.props.intl.formatMessage(messages.pin1)}
                                   sensorName={`pin1`}
                                   sensorData={`0`} />

                                 <SensorDataBlockComponent key={`arduino-${this.props.arduinoIndex}-pin2`} sensorId={`arduino-${this.props.arduinoIndex}-pin2`}
                                   deviceName={`arduino`} sensorType={`analog`}
                                   sensorFieldText={this.props.intl.formatMessage(messages.pin2)}
                                   sensorName={`pin2`}
                                   sensorData={`0`} />

                                 <SensorDataBlockComponent key={`arduino-${this.props.arduinoIndex}-pin3`} sensorId={`arduino-${this.props.arduinoIndex}-pin3`}
                                   deviceName={`arduino`} sensorType={`analog`}
                                   sensorFieldText={this.props.intl.formatMessage(messages.pin3)}
                                   sensorName={`pin3`}
                                   sensorData={`0`} />

                                 <SensorDataBlockComponent key={`arduino-${this.props.arduinoIndex}-pin4`} sensorId={`arduino-${this.props.arduinoIndex}-pin4`}
                                   deviceName={`arduino`} sensorType={`analog`}
                                   sensorFieldText={this.props.intl.formatMessage(messages.pin4)}
                                   sensorName={`pin4`}
                                   sensorData={`0`} />

                                 <SensorDataBlockComponent key={`arduino-${this.props.arduinoIndex}-pin5`} sensorId={`arduino-${this.props.arduinoIndex}-pin5`}
                                   deviceName={`arduino`} sensorType={`analog`}
                                   sensorFieldText={this.props.intl.formatMessage(messages.pin5)}
                                   sensorName={`pin5`}
                                   sensorData={`0`} />

                                 <SensorDataBlockComponent key={`arduino-${this.props.arduinoIndex}-pin6`} sensorId={`arduino-${this.props.arduinoIndex}-pin6`}
                                   deviceName={`arduino`} sensorType={`analog`}
                                   sensorFieldText={this.props.intl.formatMessage(messages.pin6)}
                                   sensorName={`pin6`}
                                   sensorData={`0`} />

                                 <SensorDataBlockComponent key={`arduino-${this.props.arduinoIndex}-pin7`} sensorId={`arduino-${this.props.arduinoIndex}-pin7`}
                                   deviceName={`arduino`} sensorType={`analog`}
                                   sensorFieldText={this.props.intl.formatMessage(messages.pin7)}
                                   sensorName={`pin7`}
                                   sensorData={`0`} />

                                 <SensorDataBlockComponent key={`arduino-${this.props.arduinoIndex}-pin8`} sensorId={`arduino-${this.props.arduinoIndex}-pin8`}
                                   deviceName={`arduino`} sensorType={`analog`}
                                   sensorFieldText={this.props.intl.formatMessage(messages.pin8)}
                                   sensorName={`pin8`}
                                   sensorData={`0`} />

                                 <SensorDataBlockComponent key={`arduino-${this.props.arduinoIndex}-pin9`} sensorId={`arduino-${this.props.arduinoIndex}-pin9`}
                                   deviceName={`arduino`} sensorType={`analog`}
                                   sensorFieldText={this.props.intl.formatMessage(messages.pin9)}
                                   sensorName={`pin9`}
                                   sensorData={`0`} />
                          </div>

                          <div className={rowStyles.palette_device_column}>

                                 <SensorDataBlockComponent key={`arduino-${this.props.arduinoIndex}-pin10`} sensorId={`arduino-${this.props.arduinoIndex}-pin10`}
                                   deviceName={`arduino`} sensorType={`analog`}
                                   sensorFieldText={this.props.intl.formatMessage(messages.pin10)}
                                   sensorName={`pin10`}
                                   sensorData={`0`} />

                                 <SensorDataBlockComponent key={`arduino-${this.props.arduinoIndex}-pin11`} sensorId={`arduino-${this.props.arduinoIndex}-pin11`}
                                   deviceName={`arduino`} sensorType={`analog`}
                                   sensorFieldText={this.props.intl.formatMessage(messages.pin11)}
                                   sensorName={`pin11`}
                                   sensorData={`0`} />

                                 <SensorDataBlockComponent key={`arduino-${this.props.arduinoIndex}-pin12`} sensorId={`arduino-${this.props.arduinoIndex}-pin12`}
                                   deviceName={`arduino`} sensorType={`analog`}
                                   sensorFieldText={this.props.intl.formatMessage(messages.pin12)}
                                   sensorName={`pin12`}
                                   sensorData={`0`} />

                                 <SensorDataBlockComponent key={`arduino-${this.props.arduinoIndex}-pin13`} sensorId={`arduino-${this.props.arduinoIndex}-pin13`}
                                   deviceName={`arduino`} sensorType={`analog`}
                                   sensorFieldText={this.props.intl.formatMessage(messages.pin13)}
                                   sensorName={`pin13`}
                                   sensorData={`0`} /> 

                                 <SensorDataBlockComponent key={`arduino-${this.props.arduinoIndex}-pin14`} sensorId={`arduino-${this.props.arduinoIndex}-pin14`}
                                   deviceName={`arduino`} sensorType={`analog`}
                                   sensorFieldText={this.props.intl.formatMessage(messages.pin14)}
                                   sensorName={`pin14`}
                                   sensorData={`0`} />

                                 <SensorDataBlockComponent key={`arduino-${this.props.arduinoIndex}-pin15`} sensorId={`arduino-${this.props.arduinoIndex}-pin15`}
                                   deviceName={`arduino`} sensorType={`analog`}
                                   sensorFieldText={this.props.intl.formatMessage(messages.pin15)}
                                   sensorName={`pin15`}
                                   sensorData={`0`} />

                                 <SensorDataBlockComponent key={`arduino-${this.props.arduinoIndex}-pin16`} sensorId={`arduino-${this.props.arduinoIndex}-pin16`}
                                   deviceName={`arduino`} sensorType={`analog`}
                                   sensorFieldText={this.props.intl.formatMessage(messages.pin16)}
                                   sensorName={`pin16`}
                                   sensorData={`0`} />

                                 <SensorDataBlockComponent key={`arduino-${this.props.arduinoIndex}-pin17`} sensorId={`arduino-${this.props.arduinoIndex}-pin17`}
                                   deviceName={`arduino`} sensorType={`analog`}
                                   sensorFieldText={this.props.intl.formatMessage(messages.pin17)}
                                   sensorName={`pin17`}
                                   sensorData={`0`} />

                                 <SensorDataBlockComponent key={`arduino-${this.props.arduinoIndex}-pin18`} sensorId={`arduino-${this.props.arduinoIndex}-pin18`}
                                   deviceName={`arduino`} sensorType={`analog`}
                                   sensorFieldText={this.props.intl.formatMessage(messages.pin18)}
                                   sensorName={`pin18`}
                                   sensorData={`0`} />

                                 <SensorDataBlockComponent key={`arduino-${this.props.arduinoIndex}-pin19`} sensorId={`arduino-${this.props.arduinoIndex}-pin19`}
                                   deviceName={`arduino`} sensorType={`analog`}
                                   sensorFieldText={this.props.intl.formatMessage(messages.pin19)}
                                   sensorName={`pin19`}
                                   sensorData={`0`} />

                                 {/*<SensorDataBlockComponent key={`arduino-${this.props.arduinoIndex}-pin20`} sensorId={`arduino-${this.props.arduinoIndex}-pin20`}
                                   deviceName={`arduino`} sensorType={`analog`}
                                   sensorFieldText={this.props.intl.formatMessage(messages.pin20)}
                                   sensorName={`pin20`}
                                   sensorData={`0`} />

                                 <SensorDataBlockComponent key={`arduino-${this.props.arduinoIndex}-pin21`} sensorId={`arduino-${this.props.arduinoIndex}-pin21`}
                                   deviceName={`arduino`} sensorType={`analog`}
                                   sensorFieldText={this.props.intl.formatMessage(messages.pin21)}
                                   sensorName={`pin21`}
                                   sensorData={`0`} /> */}

                            </div>
                      </div>
                      </div>
          </div>
    );
  }
}

const mapStateToProps =  state => ({
  });

const mapDispatchToProps = dispatch => ({
  onArduinoPaletteWindowClose: () => {
      dispatch(ActionTriggerDraggableWindow(6));
    }
});

export default injectIntl(connect(
  mapStateToProps,
  mapDispatchToProps
)(ArduinoPalleteComponent));
