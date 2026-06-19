import React, { Component } from 'react';
import { connect } from 'react-redux';
import SensorPallete from './SensorPallete';
import ColorCorrectorTableComponent from './ColorCorrectorTableComponent';
import { ItemTypes } from './drag_constants';
import { DropTarget } from 'react-dnd';
import SensorChooseWindowComponent from './SensorChooseWindowComponent';
import {ActionSearchRobotDevices} from './actions/sensor_actions';
import {ActionSearchLaboratoryDevices} from './actions/sensor_actions';
import {ActionRobotStopSearchProcess} from './actions/sensor_actions';
import {ActionRobotStopDataRecievingProcess}  from './actions/sensor_actions';
import {
  ActionSetLCALocal,
  ActionSetRCALocal,
  ActionTriggerExtensionPack
} from './actions/sensor_actions';
import {ActionTriggerColorCorrectorTable} from './actions/sensor_actions';
//import {ActionTriggerNeedLanguageReload} from './actions/sensor_actions';

import RobboMenu from './RobboMenu';
import PremiumUpdateProgress from './PremiumUpdateProgress';
import FirmwareFlasherComponent from './FirmwareFlasherComponent';
import DraggableWindowComponent from './DraggableWindowComponent';
import SettingsWindowComponent from './SettingsWindowComponent';

import styles from './RobboGui.css';

import SearchPanelComponent from './SearchPanelComponent';
import AboutWindowComponent from './AboutWindowComponent';
import LicenseWindowComponent from './LicenseWindowComponent';

import NewDraggableWindowComponent from './NewDraggableWindowComponent';
import ProfilerWindowComponent from './ProfilerWindowComponent';
import {
  ROBBO_POPUP_SIZE_ABOUT,
  ROBBO_POPUP_SIZE_FIRMWARE,
  ROBBO_POPUP_SIZE_SETTINGS
} from '../lib/robbo-popup-position';

import IotConnectionComponent from './IotConnectionComponent';
import {
  getSettingsFromStorage,
  applySettingsToDCA,
  applyFirmwareSettingsToRuntime,
  normalizeFullscreenRenderQuality,
  applySimulationStepMsToRuntime
} from '../lib/settingsLoader';
import { isRobboLinkMobileWebContext } from '../lib/platform';
import { setFullscreenRenderQuality } from './reducers/settings';

import { withAlert } from 'react-alert';
import {defineMessages, intlShape, injectIntl, FormattedMessage} from 'react-intl';

const messages = defineMessages({
    update_firm_msg: {

        id: 'gui.RobboGui.update_firm_msg',
        description: ' ',
        defaultMessage: 'Please update  firmware.'
    },
    cr_firm_msg: {

        id: 'gui.RobboGui.cr_firm_msg',
        description: ' ',
        defaultMessage: '(current: {current_firmware} required: {required_firmware})'
    },
    differ_firm_msg: {

        id: 'gui.RobboGui.differ_firm_msg',
        description: ' ',
        defaultMessage: 'The current firmware version of the device differs from the required one.'
    },
    device_lost: {

        id: 'gui.RobboGui.device_lost',
        description: ' ',
        defaultMessage: 'Lost connection to device'
    },
    devices_not_found: {

        id: 'gui.RobboGui.devices_not_found',
        description: ' ',
        defaultMessage: 'No devices available for connection.'
    } 
});


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

  componentDidMount(){
      if (this.props.vm) {
        const RCA = this.props.vm.getRCA();
        const LCA = this.props.vm.getLCA();
        if (RCA) {
          this.props.onSetRCALocal(RCA);
        }
        if (LCA) {
          this.props.onSetLCALocal(LCA);
        }
        getSettingsFromStorage().then((r) => {
          let firmwareSettingsApplied = false;
          let fullscreenRenderQuality = normalizeFullscreenRenderQuality();
          if (r.file_exists && r.file) {
            try {
              const data = JSON.parse(r.file);
              applySettingsToDCA(this.props.vm, data);
              applyFirmwareSettingsToRuntime(this.props.vm, data);
              applySimulationStepMsToRuntime(this.props.vm, data);
              fullscreenRenderQuality = normalizeFullscreenRenderQuality(data);
              firmwareSettingsApplied = true;
            } catch (e) {
              // ignore parse errors
            }
          }
          if (!firmwareSettingsApplied) {
            applyFirmwareSettingsToRuntime(this.props.vm, {});
            applySimulationStepMsToRuntime(this.props.vm, {});
          }
          this.props.onSetFullscreenRenderQuality(fullscreenRenderQuality);
        });
      }

      // this.DCA.registerFirmwareVersionDiffersCallback((result) => {

      //   this.props.alert.info(<div  className={styles.alert}>{this.props.intl.formatMessage(messages.differ_firm_msg)}<br/><br/>{this.props.intl.formatMessage(messages.cr_firm_msg,{current_firmware:result.current_device_firmware,required_firmware:result.need_firmware})} <br/><br/> {this.props.intl.formatMessage(messages.update_firm_msg)}  </div>,{timeout:10000});


      // });

      // this.DCA.registerErrorCallback((error) => {

      // //    this.props.alert.error(<div style={{ backgroundColor: 'green' }}>{`Error:  ${error.msg} Error code: ${error.code}`}</div>);

      //     if (error.code == 1){

      // //      this.props.alert.error(<div className={styles.alert}>{`Error!`}<br/><br/>{error.msg}<br/><br/>{this.props.intl.formatMessage(messages.device_lost)}</div>);

      //     }else if (error.code == 2){

      //         this.props.alert.error(<div className={styles.alert}>{`Error!`}<br/><br/>{`${error.msg}`}</div>,{timeout:5000});

      //     }else{

      //           this.props.alert.error(<div className={styles.alert}>{`Error!`}<br/><br/>{`${error.msg}`}</div>);

      //     }



      // //  this.props.alert.error(<div  className={styles.alert}>{`Error!`}<br/><br/>{`Error!Error!Error!Error!Error!Error!Error!Error!Error!Error!Error!Error!Error!Error!Error!Error!`}</div>);


      // });

      //  this.props.alert.error(<div  className={styles.alert}>{`Error!`}<br/><br/>{`Error!Error!Error!Error!Error!Error!Error!Error!Error!Error!Error!Error!Error!Error!Error!Error!`}</div>);
    //    this.props.alert.error(<div>{`Error!`}<br/><br/>{`[Error!Error!Error!Error!Error!Error!Error!Error!Error!Error!Error!Error!Error!Error!Error!Error!]`}</div>);


    //  this.DCA.registerDevicesNotFoundCallback(() => {

    //      this.props.alert.info(<div className={styles.alert}>{this.props.intl.formatMessage(messages.devices_not_found)}</div>)

    //  });

        // this.props.alert.info(<div className={styles.alert}><button> {"test"} </button> </div>)

        // const performance = typeof window === 'object' && window.performance;

        // let time_1 = performance.now();
        // let time_2 = performance.now();
        // let counter = 0;
        // let average_time = 0;
        // let time_delta = 0;
        // let time_delta_sum = 0;

        // var av_time_comp = document.getElementById(`raw-8-about-window-content-column-2`);



        // setInterval(() => {

        //   time_2 = performance.now();
        //   time_delta = time_2 - time_1;
        //   time_1 = performance.now();

        //   time_delta_sum+=time_delta;
        //   counter++;

        //   if (counter>=100){
        //       average_time = time_delta_sum / counter;
        //       counter = 0;

        //       //console.log(`RobboGui average_time: ${average_time}`);
        //       av_time_comp.innerHTML = average_time;

        //   }

        // },0);
  }


  stopSearchProcess(){

    console.log("stopSearchProcess");
  //  this.props.stopSearchProcess(this.props.vm.getRCA());

  this.props.vm.getRCA().stopSearchProcess();
  this.props.vm.getLCA().stopSearchProcess();

  this.OCA.stopSearchProcess();
  this.ACA.stopSearchProcess();


  }

  stopDataRecievingProcess(){


    console.log("stopDataRecievingProcess");
  //  this.props.stopDataRecievingProcess(this.props.vm.getRCA());

  this.props.vm.getRCA().stopDataRecievingProcess();
  this.props.vm.getLCA().stopDataRecievingProcess();
  this.OCA.stopDataRecievingProcess();
  this.ACA.stopDataRecievingProcess();

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
  this.QCA =  this.props.vm.getQCA();
  this.OCA =  this.props.vm.getOCA();
  this.ACA =  this.props.vm.getACA();

  this.IOT = this.props.vm.getIOT();
  const isMobileBridgeContext = isRobboLinkMobileWebContext();

  var initial_coords_profiler = [300,300];

  var initial_coords_license = [380, 320];

  var initial_coords_iot = [500,500];

  return (

    <div
      className={styles.robbo_gui}
      style={{display: this.props.isRobboUiHidden ? 'none' : undefined}}
    >


          <div className={styles.version}> </div>

         <SensorPallete RCA={this.RCA} LCA={this.LCA} QCA={this.QCA} OCA={this.OCA} ACA={this.ACA} VM={this.props.vm} />

         {!isMobileBridgeContext ? (
           <DraggableWindowComponent
             draggableWindowId={3}
             centerOnCreate
             estimatedPopupSize={ROBBO_POPUP_SIZE_FIRMWARE}
           >

              <FirmwareFlasherComponent DCA={this.DCA} RCA={this.RCA} LCA={this.LCA} QCA={this.QCA} OCA={this.OCA} ACA={this.ACA} />

            </DraggableWindowComponent>
         ) : null}

        <DraggableWindowComponent
          draggableWindowId={4}
          centerOnCreate
          estimatedPopupSize={ROBBO_POPUP_SIZE_SETTINGS}
        >

          <SettingsWindowComponent VM={this.props.vm} />

        </DraggableWindowComponent>


          <SensorChooseWindowComponent key="SensorChooseWindowComponent" isShowing={this.props.sensorsChooseWindow.sensors_choose_window_showing}
           top={this.props.sensorsChooseWindow.sensors_choose_window_drag_top} left={this.props.sensorsChooseWindow.sensors_choose_window_drag_left}
           CallerSensorId={this.props.sensorsChooseWindow.sensors_choose_window_sensor_caller}
           SensorCallerDeviceName={this.props.sensorsChooseWindow.sensors_choose_window_sensor_caller_device_name}
           CallerSensorType={this.props.sensorsChooseWindow.sensors_choose_window_sensor_caller_type}/>



         <ColorCorrectorTableComponent RCA={this.RCA}/>

         <RobboMenu VM={this.props.vm} />

         <PremiumUpdateProgress />

         <SearchPanelComponent VM={this.props.vm} DCA={this.DCA} RCA={this.RCA} LCA={this.LCA} QCA={this.QCA} OCA={this.OCA} ACA={this.ACA} />

          <NewDraggableWindowComponent draggableWindowId={"profiler-window"} initialCoords={initial_coords_profiler}>

            <ProfilerWindowComponent />

          </NewDraggableWindowComponent>

         

         <NewDraggableWindowComponent
           draggableWindowId={"about-window"}
           centerOnCreate
           estimatedPopupSize={ROBBO_POPUP_SIZE_ABOUT}
         >

            <AboutWindowComponent VM={this.props.vm} RCA={this.RCA} DCA={this.DCA}/>

         </NewDraggableWindowComponent>

         <NewDraggableWindowComponent draggableWindowId={'license-window'} initialCoords={initial_coords_license}>

            <LicenseWindowComponent />

         </NewDraggableWindowComponent>


        {/*  <NewDraggableWindowComponent draggableWindowId={"iot_connection"} initialCoords={initial_coords_iot}>

            <IotConnectionComponent VM={this.props.vm} IOT={this.IOT}/>

          </NewDraggableWindowComponent>  */}
        

    </div>
  );
//  );
};

};



const mapStateToProps =  state => ({


  sensorsChooseWindow:state.scratchGui.sensors_choose_window,
  isRobboUiHidden: state.scratchGui.layoutVisibility.isRobboUiHidden

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
    onTriggerExtensionPack: RCA => {
        dispatch(ActionTriggerExtensionPack(RCA));
      },
    onSetRCALocal: RCA => {
        dispatch(ActionSetRCALocal(RCA));
      },
    onSetLCALocal: LCA => {
        dispatch(ActionSetLCALocal(LCA));
      },


      onTriggerColorCorrectorTable:  (sensor_caller_id) => {

          dispatch(ActionTriggerColorCorrectorTable(sensor_caller_id));
        },
      onSetFullscreenRenderQuality: (fullscreenRenderQuality) => {
        dispatch(setFullscreenRenderQuality(fullscreenRenderQuality));
      }

        // onTriggerNeedLanguageReload:  () => {
        //
        //     dispatch(ActionTriggerNeedLanguageReload());
        //   }



});


// RobboGui.propTypes = {
//   connectDropTarget: PropTypes.func.isRequired,
//   isOver: PropTypes.bool.isRequired,
//
// };


export default injectIntl(connect(
  mapStateToProps,
  mapDispatchToProps
)(withAlert()(RobboGui)));

// export default connect(
//         mapStateToProps,
//         mapDispatchToProps
//
//     ) (DropTarget(ItemTypes.SENSOR_CHOOSE_WINDOW, Target, collect)(RobboGui));
