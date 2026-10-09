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



/** Left edge of the code area: category menu + block palette. */
const CODE_AREA_LEFT = 320;
const CODE_AREA_TOP = 110;
const CASCADE_STEP = 32;

/**
 * @param {number} index palette order
 * @returns {Array<number>} [left, top]
 */
const cascadeCoords = index => [CODE_AREA_LEFT + (index * CASCADE_STEP), CODE_AREA_TOP + (index * CASCADE_STEP)];

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

    this.props.onTriggerSensorsPalette();

  }

  triggerExtensionPack(){

      this.props.onTriggerExtensionPack();

  }

  triggerSensorChooseWindow(){

      this.props.onTriggerSensorChooseWindow(0);

  }

  render() {
const showQuadcopterUi = isDesktopWithBluetooth() || this.props.is_copter_sim_activated;

 // A cascade over the code area (right of the block palette), not a row reaching the stage;
 // DraggableWindowComponent moves a window back on screen if it does not fit.
 var initial_coords_robot = cascadeCoords(0);
 var initial_coords_lab = cascadeCoords(1);
 var initial_coords_quadcopter = cascadeCoords(2);
 var initial_coords_otto = cascadeCoords(3);
 var initial_coords_arduino = cascadeCoords(4);

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
