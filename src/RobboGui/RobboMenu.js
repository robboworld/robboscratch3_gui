import React, { Component } from 'react';
import { connect } from 'react-redux';
import styles from './RobboMenu.css';
import classNames from 'classnames';
import {ActionTriggerExtensionPack} from './actions/sensor_actions';
import {ActionTriggerLabExtSensors} from  './actions/sensor_actions';
import {ActionTriggerColorCorrectorTable} from './actions/sensor_actions';
import {ActionTriggerDraggableWindow} from './actions/sensor_actions';

import {ActionTriggerNewDraggableWindow} from './actions/sensor_actions'

import {defineMessages, intlShape, injectIntl, FormattedMessage} from 'react-intl';

import {createDiv,createDivShort} from './lib/lib.js';

//import Blockly_Arduino from 'blocks-compiler';


const messages = defineMessages({
    extension_pack: {
        id: 'gui.RobboMenu.extension_pack',
        description: ' ',
        defaultMessage: 'Extension pack '
    },
    lab_ext_sensors: {
        id: 'gui.RobboMenu.lab_ext_sensors',
        description: ' ',
        defaultMessage: 'Laboratory external sensors'
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
      defaultMessage: 'Trigger settings window'

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

    }
});


class RobboMenu extends Component {


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

  triggerExtensionPack(){

    console.log("triggerExtensionPack");
    this.props.onTriggerExtensionPack();


  }

  triggerLabExtSensors(){

    console.log("triggerLabExtSensors");
    this.props.onTriggerLabExtSensors();

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

  enableProfiling(){

     let profiler_window_content_body = document.getElementById(`profiler-window-content-body`);
    profiler_window_content_body.innerHTML = "";

    let time_counter = 0;

    let steps_ids_list = [];

    let average_self_time = 0;
    let average_total_time = 0;

    let self_time_summ = 0;
    let total_time_summ = 0;

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

                if (time_counter == 100){

                    average_self_time = (self_time_summ / time_counter).toFixed(7);
                    average_total_time = (total_time_summ / time_counter).toFixed(7);

                    time_counter = 0;

                    profiler_window_average_time_field.innerHTML = `Runtime._step total_time:${average_total_time} self_time: ${average_self_time}`;

                    self_time_summ = 0;
                    total_time_summ = 0;
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

  return (


      <div id="robbo-menu" className={classNames(

                    {[styles.robbo_menu]: true},
                    {[styles.robbo_menu_show]:   this.props.robbo_menu.isShowing},
                    {[styles.robbo_menu_hidden]: !this.props.robbo_menu.isShowing}


                    )}>







          <div id="trigger-extension-pack" onClick={this.triggerExtensionPack.bind(this)} className={classNames(

                        {[styles.robbo_menu_item]: true}

                      )}> {this.props.intl.formatMessage(messages.extension_pack)}  </div>

                        <div id="trigger-lab-ext-sensors" onClick={this.triggerLabExtSensors.bind(this)} className={classNames(

                        {[styles.robbo_menu_item]: true}

                      )}> {this.props.intl.formatMessage(messages.lab_ext_sensors)} </div>

                 {/*   <div id="trigger-logging" onClick={this.triggerLogging.bind(this)} className={classNames(

                      {[styles.robbo_menu_item]: true}

                    )}> {this.props.intl.formatMessage(messages.trigger_logging)} </div> */}

                {  <div id="trigger-firmware-flasher" onClick={this.triggerFirmwareFlasher.bind(this)} className={classNames(

                      {[styles.robbo_menu_item]: true}

                    )}> {this.props.intl.formatMessage(messages.trigger_firmware_flasher)} </div> }




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

                 <div id="enable-profiling" onClick={this.enableProfiling.bind(this)} className={classNames(

                        {[styles.robbo_menu_item]: true}

                      )}>{"Enable profiling"} </div>

                 <div id="disable-profiling" onClick={this.disableProfiling.bind(this)} className={classNames(

                        {[styles.robbo_menu_item]: true}

                      )}>{"Disable profiling"} </div>     

             <div id="trigger-profiler-window" onClick={this.triggerProfilerWindow.bind(this)} className={classNames(

                        {[styles.robbo_menu_item]: true}

                      )}>{"Trigger profiler window"} </div>            


      </div>



  );



}

}

const mapStateToProps =  state => ({


    robbo_menu:state.scratchGui.robbo_menu


  });

const mapDispatchToProps = dispatch => ({


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
            }    

});

export default injectIntl(connect(

  mapStateToProps,
  mapDispatchToProps

)(RobboMenu));
