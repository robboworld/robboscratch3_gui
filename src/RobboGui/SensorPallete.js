import React, { Component } from 'react';
import { connect } from 'react-redux';
import QuadcopterPalleteComponent from './QuadcopterPalleteComponent';

import RobotPalleteComponent from './RobotPalleteComponent';

import LaboratoryPalleteComponent from './LaboratoryPalleteComponent';

import OttoPalleteComponent from './OttoPalleteComponent';

import ArduinoPalleteComponent from './ArduinoPalleteComponent';

import DraggableWindowComponent from './DraggableWindowComponent';
import { isDesktopWithBluetooth } from '../lib/platform';


import {ActionTriggerExtensionPack} from './actions/sensor_actions';
import {ActionTriggerSensorChooseWindow} from './actions/sensor_actions';
import {ActionTriggerSensorsPalette} from './actions/sensor_actions';
import {ActionRobotsConnectionStatusCheckStart} from './actions/sensor_actions';
import {ActionLaboratoriesConnectionStatusCheckStart} from './actions/sensor_actions';
import {ActionRobotGetDataStart} from  './actions/sensor_actions';
import {ActionLaboratoryGetDataStart} from './actions/sensor_actions';



class SensorPallete extends Component {


  componentDidMount () {


      //console.log("triggerSensorsPalette");
      //this.props.startSensorsGetDataLoop();

    //  console.log("startRobotsConnectionStatusCheck");
  //    this.props.startRobotsConnectionStatusCheck(0,this.props.RCA);

      // console.log("startLaboratoriesConnectionStatusCheck");
      // this.props.startLaboratoriesConnectionStatusCheck(0,this.props.LCA);
      //
      //
      //
      // console.log("startLaboratoryGetData");
      // this.props.startLaboratoryGetData(0);

  }


  triggerSensorsPalette(){

    console.log("triggerSensorsPalette");
    this.props.onTriggerSensorsPalette();

  }

  triggerExtensionPack(){

      console.log("triggerExtensionPack()");
      this.props.onTriggerExtensionPack();

  }

  triggerSensorChooseWindow(){

      console.log("triggerSensorChooseWindow()");
      this.props.onTriggerSensorChooseWindow(0);

  }

  render() {
const showQuadcopterUi = isDesktopWithBluetooth() || this.props.is_copter_sim_activated;

 var initial_coords_robot = [200,200];
 var initial_coords_lab = [400,200];
 var initial_coords_quadcopter = [600,200];
 var initial_coords_otto = [800,200];
 var initial_coords_arduino = [900,200];

  return (
      <React.Fragment>

       {showQuadcopterUi && (
         <DraggableWindowComponent draggableWindowId={0} initialCoords={initial_coords_quadcopter}>

                <QuadcopterPalleteComponent QCA={this.props.QCA} quadcopterIndex={0} VM={this.props.VM}/>

          </DraggableWindowComponent>
       )}


        <DraggableWindowComponent draggableWindowId={1} initialCoords={initial_coords_robot}>

              <RobotPalleteComponent RCA={this.props.RCA} robotIndex={0} VM={this.props.VM}/>

        </DraggableWindowComponent>

        

        <DraggableWindowComponent draggableWindowId={2} initialCoords={initial_coords_lab}>

              <LaboratoryPalleteComponent LCA={this.props.LCA} labIndex={0}/>

        </DraggableWindowComponent>

        <DraggableWindowComponent draggableWindowId={5} initialCoords={initial_coords_otto}>

              <OttoPalleteComponent OCA={this.props.OCA} ottoIndex={0}/>

        </DraggableWindowComponent>  

        <DraggableWindowComponent draggableWindowId={6} initialCoords={initial_coords_arduino}>

              <ArduinoPalleteComponent ACA={this.props.ACA} arduinoIndex={0}/>

        </DraggableWindowComponent> 

      </React.Fragment>
  );
}

}

const mapStateToProps =  state => ({

      is_copter_sim_activated: state.scratchGui.settings.is_copter_sim_activated === true
  });

const mapDispatchToProps = dispatch => ({

  onTriggerExtensionPack: () => {

      dispatch(ActionTriggerExtensionPack());
    },

  onTriggerSensorChooseWindow: (sensor_caller_id) => {

         dispatch(ActionTriggerSensorChooseWindow(sensor_caller_id));
       },

  onTriggerSensorsPalette: () => {

           dispatch(ActionTriggerSensorsPalette());
         },

  startRobotsConnectionStatusCheck: (robot_number,RCA) => {

       dispatch(ActionRobotsConnectionStatusCheckStart(robot_number,RCA));

  },

  startLaboratoriesConnectionStatusCheck: (laboratory_number,LCA) => {

       dispatch(ActionLaboratoriesConnectionStatusCheckStart(laboratory_number,LCA));

  },

  startRobotGetData: (robot_number) => {

      dispatch(ActionRobotGetDataStart(robot_number));

  },

  startLaboratoryGetData: (laboratory_number) => {

      dispatch(ActionLaboratoryGetDataStart(laboratory_number));

  }


});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SensorPallete);
