import React, { Component } from 'react';
import { connect } from 'react-redux';
import styles from  './QuadcopterPalleteComponent.css';
import SensorDataBlockComponent  from './SensorDataBlockComponent'

import {ActionTriggerDraggableWindow} from './actions/sensor_actions'

import {defineMessages, injectIntl} from 'react-intl';



const messages = defineMessages({

    battery_level: {
        id: 'gui.RobboGui.QuadcopterPalette.battery_level',
        description: ' ',
        defaultMessage: 'Battery level: '
    },

    yaw: {
        id: 'gui.RobboGui.QuadcopterPalette.yaw',
        description: ' ',
        defaultMessage: 'Yaw: '
    },

    x_coord: {
        id: 'gui.RobboGui.QuadcopterPalette.x_coord',
        description: ' ',
        defaultMessage: 'X coord: '
    },

    y_coord: {
        id: 'gui.RobboGui.QuadcopterPalette.y_coord',
        description: ' ',
        defaultMessage: 'Y coord: '
    },
    z_coord: {
        id: 'gui.RobboGui.QuadcopterPalette.z_coord',
        description: ' ',
        defaultMessage: 'Z coord:  '
    },
    quadcopter: {
        id: 'gui.RobboGui.QuadcopterPalette.quadcopter',
        description: ' ',
        defaultMessage: 'Quadcopter'
    },
    meters:  {
        id: 'gui.RobboGui.QuadcopterPalette.meters',
        description: ' ',
        defaultMessage: 'meters'
    },
    degrees:{
        id: 'gui.RobboGui.QuadcopterPalette.degrees',
        description: ' ',
        defaultMessage: 'degrees'
    }

  });



class QuadcopterPalleteComponent extends Component {
  constructor (props) {
    super(props);

    this.state = {
      batteryLevelText: '---',
      batteryWarningClassName: '',
      xCoordText: '0',
      yCoordText: '0',
      zCoordText: '0',
      yawText: '0'
    };
  }

  onThisWindowClose(){

    console.log("QuadcopterPalette close");
    this.props.onQuadcopterPaletteWindowClose(0);

  }

  syncPaletteData () {
    const runtime = this.props.VM && this.props.VM.runtime;
    const simBlocks = runtime && runtime._copterSimBlocks;

    if (runtime && runtime.sim_copter_ac && simBlocks) {
      if (typeof simBlocks._syncFromSpritePositionIfNeeded === 'function') {
        simBlocks._syncFromSpritePositionIfNeeded();
      }

      this.setState({
        batteryLevelText: `${simBlocks.sim_battery.toFixed(0)} %`,
        batteryWarningClassName: '',
        xCoordText: `${simBlocks.sim_x.toFixed(3)} ${this.props.intl.formatMessage(messages.meters)}`,
        yCoordText: `${simBlocks.sim_y.toFixed(3)} ${this.props.intl.formatMessage(messages.meters)}`,
        zCoordText: `${simBlocks.sim_z.toFixed(3)} ${this.props.intl.formatMessage(messages.meters)}`,
        yawText: `${simBlocks.sim_yaw.toFixed(1)} ${this.props.intl.formatMessage(messages.degrees)}`
      });
      return;
    }

    if (!this.props.QCA || typeof this.props.QCA.getTelemetrySnapshot !== 'function') return;

    const telemetry = this.props.QCA.getTelemetrySnapshot();
    const isConnected = this.props.QCA.isQuadcopterConnected();
    let batteryWarningClassName = '';

    if (isConnected) {
      if (telemetry.batteryPercent < 5) {
        batteryWarningClassName = styles.battery_low_red_warning;
      } else if (telemetry.batteryPercent < 15) {
        batteryWarningClassName = styles.battery_low_yelolow_warning;
      }
    }

    this.setState({
      batteryLevelText: `${telemetry.batteryPercent} %`,
      batteryWarningClassName: batteryWarningClassName,
      xCoordText: `${Number(telemetry.x || 0).toFixed(2)} ${this.props.intl.formatMessage(messages.meters)}`,
      yCoordText: `${Number((telemetry.y || 0) * -1).toFixed(2)} ${this.props.intl.formatMessage(messages.meters)}`,
      zCoordText: `${Number(telemetry.z || 0).toFixed(2)} ${this.props.intl.formatMessage(messages.meters)}`,
      yawText: `${Number(telemetry.yaw || 0).toFixed(1)} ${this.props.intl.formatMessage(messages.degrees)}`
    });
  }

  componentDidMount(){
      this.syncPaletteData();
      this.getDataLoopInterval = setInterval(() => {
        this.syncPaletteData();
      }, 100);

  }

  componentWillUnmount() {
    if (this.getDataLoopInterval) {
      clearInterval(this.getDataLoopInterval);
      this.getDataLoopInterval = null;
    }
  }


  render() {



    return (

          <div id="quadcopter-1" className={styles.quadcopter_palette}>


                <div id="quadcopter-tittle" className={styles.quadcopter_panel_tittle}>

                    {this.props.intl.formatMessage(messages.quadcopter)}

                      <div className={styles.close_icon} onClick={this.onThisWindowClose.bind(this)}>

                      </div>

                </div>

                <SensorDataBlockComponent key={`copter-${this.props.quadcopterIndex}-battery-level`} sensorId={`copter-${this.props.quadcopterIndex}-battery-level`}
                                   deviceName={`quadcopter`} sensorType={`analog`}
                                   sensorFieldText={this.props.intl.formatMessage(messages.battery_level)}
                                   sensorName={`battery-level`}
                                   sensorValueClassName={this.state.batteryWarningClassName}
                                   sensorData={this.state.batteryLevelText} />

               <SensorDataBlockComponent key={`copter-${this.props.quadcopterIndex}-coord-x`} sensorId={`copter-${this.props.quadcopterIndex}-coord-x`}
                                                      deviceName={`quadcopter`} sensorType={`analog`}
                                                      sensorFieldText={this.props.intl.formatMessage(messages.x_coord)}
                                                      sensorName={`coord-x`}
                                                      sensorData={this.state.xCoordText} />

              <SensorDataBlockComponent key={`copter-${this.props.quadcopterIndex}-coord-y`} sensorId={`copter-${this.props.quadcopterIndex}-coord-y`}
                                                                                             deviceName={`quadcopter`} sensorType={`analog`}
                                                                                             sensorFieldText={this.props.intl.formatMessage(messages.y_coord)}
                                                                                             sensorName={`coord-y`}
                                                                                             sensorData={this.state.yCoordText} />

            <SensorDataBlockComponent key={`copter-${this.props.quadcopterIndex}-coord-z`} sensorId={`copter-${this.props.quadcopterIndex}-coord-z`}
                                                                                            deviceName={`quadcopter`} sensorType={`analog`}
                                                                                            sensorFieldText={this.props.intl.formatMessage(messages.z_coord)}
                                                                                            sensorName={`coord-z`}
                                                                                            sensorData={this.state.zCoordText} />

            <SensorDataBlockComponent key={`copter-${this.props.quadcopterIndex}-yaw`} sensorId={`copter-${this.props.quadcopterIndex}-yaw`}
              deviceName={`quadcopter`} sensorType={`analog`}
              sensorFieldText={this.props.intl.formatMessage(messages.yaw)}
              sensorName={`yaw`}
              sensorData={this.state.yawText} />


          </div>



    );


  }


}


const mapStateToProps =  state => ({


  });

const mapDispatchToProps = dispatch => ({



  onQuadcopterPaletteWindowClose: () => {

      dispatch(ActionTriggerDraggableWindow(0));
    }

});

export default injectIntl(connect(
  mapStateToProps,
  mapDispatchToProps
)(QuadcopterPalleteComponent));
