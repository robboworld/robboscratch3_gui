import React, { Component } from 'react';
import { connect } from 'react-redux';
import styles from './RobboMenu.css';
import classNames from 'classnames';
import {ActionTriggerSim, ActionTriggerExtensionPack} from './actions/sensor_actions';
import {ActionTriggerLabExtSensors} from  './actions/sensor_actions';
import spriteLibraryContent from '../lib/libraries/sprites.json';
import {ActionTriggerColorCorrectorTable} from './actions/sensor_actions';
import {ActionTriggerDraggableWindow} from './actions/sensor_actions';
import {ActionTriggerRobboMenu} from './actions/sensor_actions.js'; 
import {ActionTriggerNewDraggableWindow} from './actions/sensor_actions'

import {defineMessages, intlShape, injectIntl, FormattedMessage} from 'react-intl';

import {createDiv,createDivShort} from './lib/lib.js';

//import Blockly_Arduino from 'blocks-compiler';

const SIMULATION_ROBOT_SPRITE_NAMES = ['Robbo Robot', 'RobboPlatform', 'Robot'];

const hasSimulationRobotSprite = function (vm) {
    if (!vm || !vm.runtime || !vm.runtime.targets) return false;
    return vm.runtime.targets.some(t =>
        t.isOriginal && !t.isStage && SIMULATION_ROBOT_SPRITE_NAMES.includes(t.sprite.name)
    );
};

const messages = defineMessages({
    sim_enable: {
        id: 'gui.RobboMenu.sim_enable',
        description: ' ',
        defaultMessage: 'Enable robot simulation'
    },
    sim_disable: {
        id: 'gui.RobboMenu.sim_disable',
        description: ' ',
        defaultMessage: 'Disable robot simulation'
    },
    extension_pack: {
        id: 'gui.RobboMenu.extension_pack',
        description: ' ',
        defaultMessage: 'Extension pack '
    },
    extension_pack_enable: {
        id: 'gui.RobboMenu.extension_pack_enable',
        description: ' ',
        defaultMessage: 'Enable extended robot sensors pack'
    },
    extension_pack_disable: {
        id: 'gui.RobboMenu.extension_pack_disable',
        description: ' ',
        defaultMessage: 'Disable extended robot sensors pack'
    }, 
    lab_ext_sensors: {
        id: 'gui.RobboMenu.lab_ext_sensors',
        description: ' ',
        defaultMessage: 'Laboratory external sensors'
    },
      lab_ext_sensors_enable: {
        id: 'gui.RobboMenu.lab_ext_sensors_enable',
        description: ' ',
        defaultMessage: 'Enable laboratory external sensors'
    },
     lab_ext_sensors_disable: {
        id: 'gui.RobboMenu.lab_ext_sensors_disable',
        description: ' ',
        defaultMessage: 'Disable laboratory external sensors'
    }, 
    trigger_logging:{

      id: 'gui.RobboMenu.trigger_logging',
      description: ' ',
      defaultMessage: 'Trigger logging'

    },
    trigger_firmware_flasher:{

      id: 'gui.RobboMenu.trigger_firmware_flasher',
      description: ' ',
      defaultMessage: 'Trigger firmware flasher'

    },
    trigger_settings_window:{

      id: 'gui.RobboMenu.trigger_settings_window',
      description: ' ',
      defaultMessage: 'Settings'

    },
    trigger_about_window:{

      id: 'gui.RobboMenu.trigger_about_window',
      description: ' ',
      defaultMessage: 'About'

    },
    color_sensor_correction1:{

      id: 'gui.RobboMenu.color_sensor_correction1',
      description: ' ',
      defaultMessage: 'Color sensor correction 1'

    },
    color_sensor_correction2:{

      id: 'gui.RobboMenu.color_sensor_correction2',
      description: ' ',
      defaultMessage: 'Color sensor correction 2'

    },
    color_sensor_correction3:{

      id: 'gui.RobboMenu.color_sensor_correction3',
      description: ' ',
      defaultMessage: 'Color sensor correction 3'

    },
    color_sensor_correction4:{

      id: 'gui.RobboMenu.color_sensor_correction4',
      description: ' ',
      defaultMessage: 'Color sensor correction 4'

    },
    color_sensor_correction5:{

      id: 'gui.RobboMenu.color_sensor_correction5',
      description: ' ',
      defaultMessage: 'Color sensor correction 5'

    },
    iot_connection: {
      id: 'gui.RobboMenu.iot_connection',
      description: ' ',
      defaultMessage: 'Iot connection'
    }
});


class RobboMenu extends Component {

  constructor(){
    super();

    this.is_sim_en = false;
    this.is_extension_pack_enabled = false;
    this.is_lab_ext_enabled = false;
    this.state = {
      menuCoords: null
    };
    this.boundCloseRobboMenu = this.closeRobboMenu.bind(this);
    this.boundUpdateMenuCoords = this.updateMenuCoords.bind(this);

  }

  componentDidMount(){

       document.addEventListener('click', this.boundCloseRobboMenu);
       window.addEventListener('resize', this.boundUpdateMenuCoords);

  }

  componentDidUpdate(prevProps){
    if (!prevProps.robbo_menu.isShowing && this.props.robbo_menu.isShowing) {
      this.updateMenuCoords();
    }
  }

  componentWillUnmount(){
    document.removeEventListener('click', this.boundCloseRobboMenu);
    window.removeEventListener('resize', this.boundUpdateMenuCoords);
  }

  updateMenuCoords(){
    const triggerMenu = document.getElementById('trigger-robbo-menu');
    if (!triggerMenu) return;
    const rect = triggerMenu.getBoundingClientRect();
    this.setState({
      menuCoords: {
        top: rect.bottom,
        left: rect.left
      }
    });
  }


  searchDevices(){

    console.log("searchDevices");


  //  this.DCA.searchAllDevices();



  //  this.RCA.searchRobotDevices();
//    this.LCA.searchLaboratoryDevices();

//    this.QCA.searchQuadcopterDevices();

  }

  stopSearchProcess(){

    console.log("stopSearchProcess");
  //  this.props.stopSearchProcess(this.props.vm.getRCA());

  this.RCA.stopSearchProcess();
  this.LCA.stopSearchProcess();


  }

  stopDataRecievingProcess(){


    console.log("stopDataRecievingProcess");
  //  this.props.stopDataRecievingProcess(this.props.vm.getRCA());

  this.RCA.stopDataRecievingProcess();
  this.LCA.stopDataRecievingProcess();

  }

  closeRobboMenu(e){

    let trigger_menu = document.getElementById(`trigger-robbo-menu`);
    let menu = document.getElementById(`robbo-menu`);

    if (!trigger_menu || !menu) return;

    if ( ( this.props.robbo_menu.isShowing) && (!trigger_menu.contains(e.target)) && (!menu.contains(e.target)) ){

       /* && (e.target !== trigger_menu) && (e.target !== menu)*/

        this.props.onTriggerRobboMenu();

    }

     
  }

  triggerSimEn() {
    const item = spriteLibraryContent.find(s => s.name === 'RobboPlatform') || spriteLibraryContent.find(s => s.name === 'Robot') || spriteLibraryContent[0];
    if (!item || !item.json) return;
    // SB2 sprite deserialization uses `scale` (1 = 100%), not `size`. Start scale matches
    // the library entry (e.g. RobboPlatform scale 0.25) so the sim robot matches the sprite library.
    // Scratch angle convention: 90 = right, 0 = up — align with right-facing platform art.
    const baseJson = Object.assign({}, item.json);
    if (typeof baseJson.scale !== 'number' || !Number.isFinite(baseJson.scale)) {
      baseJson.scale = 0.25;
    }
    const spriteJson = Object.assign({}, baseJson, { objName: 'Robbo Robot', direction: 90 });
    this.is_sim_en = !this.is_sim_en;
    this.props.VM.runtime.sim_ac = !this.props.VM.runtime.sim_ac;
    if (this.props.VM.runtime.sim_ac) {
      if (hasSimulationRobotSprite(this.props.VM)) {
        if (this.props.VM.setUTIL) this.props.VM.setUTIL();
      } else {
        this.props.VM.addSprite(spriteJson).then(() => {
          if (this.props.VM.setUTIL) this.props.VM.setUTIL();
        }).catch(() => {});
      }
    }
    this.props.onTriggerSimEn();
  }

  triggerExtensionPack(){

    console.log("triggerExtensionPack");
    this.props.onTriggerExtensionPack();

    this.is_extension_pack_enabled = !this.is_extension_pack_enabled


  }

  triggerLabExtSensors(){

    console.log("triggerLabExtSensors");
    this.props.onTriggerLabExtSensors();

    this.is_lab_ext_enabled = !this.is_lab_ext_enabled;

  }

  triggerColorCorrectorTable(sensor_caller_id){

    console.log("triggerColorCorrectorTable");
    this.props.onTriggerColorCorrectorTable(sensor_caller_id);

  }

  triggerLogging(){

        console.log("triggerLogging");
        this.DCA.triggerLogging();

       

  }

  triggerFirmwareFlasher(){


        this.props.onTriggerFirmwareFlasher();

  }

  triggerSettingsWindow(){

    this.props.onTriggerSettingsWindow();

  }

  triggerAboutWindow(){

      this.props.onTriggerAboutWindow("about-window");
  }

  triggerIotConnectionWindow() {

        this.props.onTriggerIotConnection("iot_connection");

  }

  enableProfiling(){

     let profiler_window_content_body = document.getElementById(`profiler-window-content-body`);
    profiler_window_content_body.innerHTML = "";

    let time_counter = 0;

    let steps_ids_list = [];

    let average_self_time = 0;
    let average_total_time = 0;

    let self_time_summ = 0;
    let total_time_summ = 0;

    let recieve_time_delta = 0;
    let recieve_time_delta_sum = 0;
    let recieve_time_delta_average = 0;

    let profiler_window_average_time_field =  document.getElementById("profiler-window-average-time");

      this.props.VM.runtime.enableProfiling((frame) => {

            // console.warn("frame: ");
            // console.warn(frame);

            //let frame_id = frame.id;

             let frame_id = this.props.VM.runtime.profiler.nameById(frame.id);

              if (frame_id == "Runtime._step"){

                time_counter++;

                self_time_summ+= frame.selfTime;
                total_time_summ+= frame.totalTime;

                 recieve_time_delta = this.RCA.getRecieveTimeDelta();
                 recieve_time_delta_sum+= recieve_time_delta;

              //   if (time_counter == 5){

              //      recieve_time_delta = this.RCA.getRecieveTimeDelta().toFixed(7);

              //       profiler_window_average_time_field.innerHTML = `<div>Runtime._step total_time:${average_total_time} self_time: ${average_self_time} </div>
              //                                                       <div>Recieve time delta: ${recieve_time_delta}</div>
              //                                                       <div>Recieve time delta average: ${recieve_time_delta_average}</div>`;

              //  }

                if (time_counter == 100){

                    average_self_time = (self_time_summ / time_counter).toFixed(7);
                    average_total_time = (total_time_summ / time_counter).toFixed(7);

                    recieve_time_delta_average = ( recieve_time_delta_sum / time_counter).toFixed(7);

                    time_counter = 0;

                  

                    profiler_window_average_time_field.innerHTML = `<div>Runtime._step total_time:${average_total_time} self_time: ${average_self_time} </div>
                                                                    <div>Recieve time delta: ${recieve_time_delta}</div>
                                                                    <div>Recieve time delta average: ${recieve_time_delta_average}</div>`;

                    self_time_summ = 0;
                    total_time_summ = 0;
                    recieve_time_delta_sum = 0;
                }

              }

               //if (frame_id != "Runtime._step") return;

               return;

             let total_time = frame.totalTime.toFixed(7);

             let self_time = frame.selfTime.toFixed(7);


            if (steps_ids_list.indexOf(frame_id) == -1){

              steps_ids_list.push(frame_id);

              var styles = {

                margin: '10px'

              };

                let  profiler_window_content_body_row = createDivShort(profiler_window_content_body,styles,"",{id:`profiler_window_content_body_row-${frame_id}`});

                
                
                let column_style = {

                    marginLeft:'7px',

                    marginRight:'7px',

                    display:'inline-block',

                    minWidth: '100px'
                }

                 createDivShort(profiler_window_content_body_row,column_style,"",{id:`profiler_window_content_body_row-${frame_id}-column_id`});      

                 createDivShort(profiler_window_content_body_row,column_style,self_time,{id:`profiler_window_content_body_row-${frame_id}-column_self_time`});      

                 createDivShort(profiler_window_content_body_row,column_style,total_time,{id:`profiler_window_content_body_row-${frame_id}-column_total_time`});      
              

            }else{

                let profiler_window_content_body_row_column_id =  document.getElementById(`profiler_window_content_body_row-${frame_id}-column_id`); 
                profiler_window_content_body_row_column_id.innerHTML = frame_id;


                let profiler_window_content_body_row_column_self_time = document.getElementById(`profiler_window_content_body_row-${frame_id}-column_self_time`); 
                profiler_window_content_body_row_column_self_time.innerHTML = self_time;


                let profiler_window_content_body_row_column_total_time = document.getElementById(`profiler_window_content_body_row-${frame_id}-column_total_time`); 
                profiler_window_content_body_row_column_total_time.innerHTML = total_time;


            }

            
  

        });
  }

  disableProfiling(){

       this.props.VM.runtime.disableProfiling();
  }

  triggerProfilerWindow(){

    this.props.onTriggerProfilerWindow("profiler-window");

  }

  render() {

//  return this.props.connectDropTarget(

  this.DCA =  this.props.VM.getDCA();
  this.RCA =  this.props.VM.getRCA();
  this.LCA =  this.props.VM.getLCA();
  if (typeof globalThis !== 'undefined') {
    globalThis.__RS3_VM__ = this.props.VM;
  }

  return (


      <div id="robbo-menu" className={classNames(

                    {[styles.robbo_menu]: true},
                    {[styles.robbo_menu_show]:   this.props.robbo_menu.isShowing},
                    {[styles.robbo_menu_hidden]: !this.props.robbo_menu.isShowing}


                    )}
           style={this.state.menuCoords || undefined}>

          <div id="trigger-sim-en" onClick={this.triggerSimEn.bind(this)} className={classNames(
                        {[styles.robbo_menu_item]: true}
                      )}>{(this.is_sim_en) ? this.props.intl.formatMessage(messages.sim_disable) : this.props.intl.formatMessage(messages.sim_enable)}</div>

          <div id="trigger-extension-pack" onClick={this.triggerExtensionPack.bind(this)} className={classNames(

                        {[styles.robbo_menu_item]: true}

                      )}>{ (this.is_extension_pack_enabled)?this.props.intl.formatMessage(messages.extension_pack_disable):this.props.intl.formatMessage(messages.extension_pack_enable)  }</div>

                        <div id="trigger-lab-ext-sensors" onClick={this.triggerLabExtSensors.bind(this)} className={classNames(

                        {[styles.robbo_menu_item]: true}

                      )}>{ (this.is_lab_ext_enabled)?this.props.intl.formatMessage(messages.lab_ext_sensors_disable):this.props.intl.formatMessage(messages.lab_ext_sensors_enable)  } </div>

                 {/*   <div id="trigger-logging" onClick={this.triggerLogging.bind(this)} className={classNames(

                      {[styles.robbo_menu_item]: true}

                    )}> {this.props.intl.formatMessage(messages.trigger_logging)} </div> */}

                {/*  <div id="trigger-firmware-flasher" onClick={this.triggerFirmwareFlasher.bind(this)} className={classNames(

                      {[styles.robbo_menu_item]: true}

                    )}> {this.props.intl.formatMessage(messages.trigger_firmware_flasher)} </div> */}




                  <hr className={styles.hrDevider}/>

          <div id="trigger-color-corrector-table-0" onClick={this.triggerColorCorrectorTable.bind(this,0)} className={classNames(

                        {[styles.robbo_menu_item]: true}

                      )}> {this.props.intl.formatMessage(messages.color_sensor_correction1)} </div>

          <div id="trigger-color-corrector-table-1" onClick={this.triggerColorCorrectorTable.bind(this,1)} className={classNames(

                        {[styles.robbo_menu_item]: true}

                      )}>{this.props.intl.formatMessage(messages.color_sensor_correction2)} </div>

          <div id="trigger-color-corrector-table-2" onClick={this.triggerColorCorrectorTable.bind(this,2)} className={classNames(

                        {[styles.robbo_menu_item]: true}

                      )}>{this.props.intl.formatMessage(messages.color_sensor_correction3)} </div>

          <div id="trigger-color-corrector-table-3" onClick={this.triggerColorCorrectorTable.bind(this,3)} className={classNames(

                        {[styles.robbo_menu_item]: true}

                      )}> {this.props.intl.formatMessage(messages.color_sensor_correction4)} </div>

          <div id="trigger-color-corrector-table-4" onClick={this.triggerColorCorrectorTable.bind(this,4)} className={classNames(

                        {[styles.robbo_menu_item]: true}

                      )}>{this.props.intl.formatMessage(messages.color_sensor_correction5)} </div>

          <hr className={styles.hrDevider}/>    

               {/*  <div id="enable-profiling" onClick={this.enableProfiling.bind(this)} className={classNames(

                        {[styles.robbo_menu_item]: true}

                      )}>{"Enable profiling"} </div>

                 <div id="disable-profiling" onClick={this.disableProfiling.bind(this)} className={classNames(

                        {[styles.robbo_menu_item]: true}

                      )}>{"Disable profiling"} </div>     

             <div id="trigger-profiler-window" onClick={this.triggerProfilerWindow.bind(this)} className={classNames(

                        {[styles.robbo_menu_item]: true}

                      )}>{"Trigger profiler window"} </div>   */}  

           {/*  <div id="trigger-iot-connection" onClick={this.triggerIotConnectionWindow.bind(this)} className={classNames(
 
                         { [styles.robbo_menu_item]: true }
 
                        )}>{this.props.intl.formatMessage(messages.iot_connection)}</div>   */}  



               <div id="trigger-settings-window" onClick={this.triggerSettingsWindow.bind(this)} className={classNames(

                        {[styles.robbo_menu_item]: true}

                      )}>{this.props.intl.formatMessage(messages.trigger_settings_window)} </div>           


              <div id="trigger-about-window" onClick={this.triggerAboutWindow.bind(this)} className={classNames(

                        {[styles.robbo_menu_item]: true}

                      )}>{this.props.intl.formatMessage(messages.trigger_about_window)} </div>                   


      </div>



  );



}

}

const mapStateToProps =  state => ({


    robbo_menu:state.scratchGui.robbo_menu,
    robot_sensors:state.scratchGui.robot_sensors,
    settings:state.scratchGui.settings


  });

const mapDispatchToProps = dispatch => ({

    onTriggerSimEn: () => {
      dispatch(ActionTriggerSim());
    },
    onTriggerExtensionPack: () => {

        dispatch(ActionTriggerExtensionPack());
      },

    onTriggerLabExtSensors: () => {

          dispatch(ActionTriggerLabExtSensors());
        },


    onTriggerColorCorrectorTable:  (sensor_caller_id) => {

          dispatch(ActionTriggerColorCorrectorTable(sensor_caller_id));
        },

    onTriggerFirmwareFlasher: () => {

            dispatch(ActionTriggerDraggableWindow(3));
          },

    onTriggerSettingsWindow: () => {

              dispatch(ActionTriggerDraggableWindow(4));
            },

    onTriggerProfilerWindow: (window_id) => {

              dispatch(ActionTriggerNewDraggableWindow(window_id));
            },
    
    onTriggerAboutWindow: (window_id) => {

              dispatch(ActionTriggerNewDraggableWindow(window_id));
            },
    onTriggerRobboMenu: () => {

      dispatch(ActionTriggerRobboMenu());
    },
    
    onTriggerIotConnection: (window_id) => {
            
      dispatch(ActionTriggerNewDraggableWindow(window_id));
    }

});

export default injectIntl(connect(

  mapStateToProps,
  mapDispatchToProps

)(RobboMenu));
