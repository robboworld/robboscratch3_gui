import React, { Component } from 'react';
import { connect } from 'react-redux';
import CommonFieldsSensorComponent from './CommonFieldsSensorComponent';



class SensorDataBlockComponent extends Component {




  render() {

  //  let sensorPictureUrl = `/assets/16/sensor_${this.props.sensors[this.props.sensorId].sensor_name}.png`;

    return (
            <div id={`${this.props.deviceName}_sensor-data-block-${this.props.sensorId}_type-${this.props.sensorType}`}>

          {




                  <CommonFieldsSensorComponent NameFieldText={`${this.props.sensorFieldText}`} sensorId={this.props.sensorId}
                    sensorName={this.props.sensorName} sensorData={this.props.sensorData}
                    sensorValueClassName={this.props.sensorValueClassName}/>





            }


              </div>

            );





    };




  }





  // const mapStateToProps =  state => ({
  //
  //       sensors:state.scratchGui.sensors,
  //
  //   });
  //
  // const mapDispatchToProps = dispatch => ({
  //
  //
  // });

  export default SensorDataBlockComponent;
