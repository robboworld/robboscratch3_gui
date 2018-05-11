import classNames from 'classnames';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import SensorPallete from './SensorPallete';
import ColorCorrectorTableComponent from './ColorCorrectorTableComponent';
import SensorPaletteCollapsed from './SensorPaletteCollapsed';
import { ItemTypes } from './drag_constants';
import { DropTarget } from 'react-dnd';
import SensorChooseWindowComponent from './SensorChooseWindowComponent';
import {ActionSearchRobotDevices} from './actions/sensor_actions';
import {ActionSearchLaboratoryDevices} from './actions/sensor_actions';
import {ActionRobotStopSearchProcess} from './actions/sensor_actions';
import {ActionRobotStopDataRecievingProcess}  from './actions/sensor_actions';
import {ActionTriggerExtensionPack} from './actions/sensor_actions';
import {ActionTriggerColorCorrectorTable} from './actions/sensor_actions';
import styles from './RobboGui.css'


// const Target = {
//   drop(props,monitor) {
//
//     let coords = monitor.getClientOffset();
//
//     props.onSensorChooseWindowDrop(coords.y, coords.x);
//   }
// };
//
//
// const  collect = (connect, monitor) =>  ({
//
//     connectDropTarget: connect.dropTarget(),
//     isOver: monitor.isOver()
//
// });

class RobboGui extends Component {



  componentWillReceiveProps (props) {




  }



  searchDevices(){

    console.log("searchDevices");


    this.props.vm.getDCA().searchAllDevices();

    //this.props.searchRobotDevices(this.props.vm.getRCA());
  //  this.props.searchLaboratoryDevices(this.props.vm.getLCA());

    this.props.vm.getRCA().searchRobotDevices();
    this.props.vm.getLCA().searchLaboratoryDevices();

  }

  stopSearchProcess(){

    console.log("stopSearchProcess");
  //  this.props.stopSearchProcess(this.props.vm.getRCA());

  this.props.vm.getRCA().stopSearchProcess();
  this.props.vm.getLCA().stopSearchProcess();


  }

  stopDataRecievingProcess(){


    console.log("stopDataRecievingProcess");
  //  this.props.stopDataRecievingProcess(this.props.vm.getRCA());

  this.props.vm.getRCA().stopDataRecievingProcess();
  this.props.vm.getLCA().stopDataRecievingProcess();

  }

  triggerExtensionPack(){

    console.log("triggerExtensionPack");
    this.props.onTriggerExtensionPack();


  }

  triggerColorCorrectorTable(sensor_caller_id){

    console.log("triggerColorCorrectorTable");
    this.props.onTriggerColorCorrectorTable(sensor_caller_id);

  }



  render() {

//  return this.props.connectDropTarget(

  this.DCA =  this.props.vm.getDCA();
  this.RCA =  this.props.vm.getRCA();
  this.LCA =  this.props.vm.getLCA();

  return (

    <div className={classNames(

                  {[styles.robbo_gui]: true},
                  {[styles.content_collapsed]: this.props.sensorsPalette.sensors_pallete_collapsed},
                  {[styles.content_expand]:    !this.props.sensorsPalette.sensors_pallete_collapsed}


                  )}>

         {
              (!this.props.sensorsPalette.sensors_pallete_collapsed)?  <SensorPallete RCA={this.RCA} LCA={this.LCA} />: <SensorPaletteCollapsed />


         }


              <button className="connector-start-stop" onClick={this.searchDevices.bind(this)}>Search devices</button>
             <button className="connector-start-stop" onClick={this.stopSearchProcess.bind(this)}>Stop searching</button>
             <button className="connector-start-stop" onClick={this.stopDataRecievingProcess.bind(this)}>Stop data recieve!</button>
             <button className="connector-start-stop" onClick={this.triggerExtensionPack.bind(this)}>Trigger extension pack</button>
            <button className="connector-start-stop" onClick={this.triggerColorCorrectorTable.bind(this,0)}>Trigger color corrector table!</button>



          <SensorChooseWindowComponent key="SensorChooseWindowComponent" isShowing={this.props.sensorsChooseWindow.sensors_choose_window_showing}
           top={this.props.sensorsChooseWindow.sensors_choose_window_drag_top} left={this.props.sensorsChooseWindow.sensors_choose_window_drag_left}
           CallerSensorId={this.props.sensorsChooseWindow.sensors_choose_window_sensor_caller}
           SensorCallerDeviceName={this.props.sensorsChooseWindow.sensors_choose_window_sensor_caller_device_name}
           CallerSensorType={this.props.sensorsChooseWindow.sensors_choose_window_sensor_caller_type}/>



         <ColorCorrectorTableComponent/>



    </div>
  );
//  );
};

};



const mapStateToProps =  state => ({


  sensorsChooseWindow: state.sensors_choose_window,
  sensorsPalette: state.sensors_palette


  });

const mapDispatchToProps = dispatch => ({

  searchRobotDevices: (RCA) => {

      dispatch(ActionSearchRobotDevices(RCA));
    },

    // searchLaboratoryDevices: (LCA) => {
    //
    //     dispatch(ActionSearchLaboratoryDevices(LCA));
    //   },


    stopSearchProcess: (RCA) => {


          dispatch(ActionRobotStopSearchProcess(RCA));

    },

    stopDataRecievingProcess: (RCA) => {

            dispatch(ActionRobotStopDataRecievingProcess(RCA));

    },
    onTriggerExtensionPack: () => {

        dispatch(ActionTriggerExtensionPack());
      },


      onTriggerColorCorrectorTable:  (sensor_caller_id) => {

          dispatch(ActionTriggerColorCorrectorTable(sensor_caller_id));
        }

});


// RobboGui.propTypes = {
//   connectDropTarget: PropTypes.func.isRequired,
//   isOver: PropTypes.bool.isRequired,
//
// };


export default connect(
  mapStateToProps,
  mapDispatchToProps
)(RobboGui);

// export default connect(
//         mapStateToProps,
//         mapDispatchToProps
//
//     ) (DropTarget(ItemTypes.SENSOR_CHOOSE_WINDOW, Target, collect)(RobboGui));