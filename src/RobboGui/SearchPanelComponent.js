
import classNames from 'classnames';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';


import styles from './SearchPanelComponent.css';
import { ActionAddNewFoundDevice } from './actions/sensor_actions';

import FirmwareFlasherFlashingStatusComponent from './FirmwareFlasherFlashingStatusComponent';
import SearchPanelDeviceComponent from './SearchPanelDeviceComponent';

import DraggableWindowComponent from './DraggableWindowComponent';

import { defineMessages, intlShape, injectIntl, FormattedMessage } from 'react-intl';
import { isDesktopWithBluetooth } from '../lib/platform';

const messages = defineMessages({

  devices_not_found: {

    id: 'gui.RobboGui.devices_not_found',
    description: ' ',
    defaultMessage: 'No devices available for connection.'
  },
  bluetooth_devices_not_found: {

    id: 'gui.RobboGui.bluetooth_devices_not_found',
    description: ' ',
    defaultMessage: 'No Bluetooth devices available for connection. See user manual (FAQ).'
  },
  bluetooth_searching: {

    id: 'gui.RobboGui.bluetooth_searching',
    description: ' ',
    defaultMessage: 'Searching for Bluetooth devices'
  },
  try_to_install_drivers: {

    id: 'gui.RobboGui.try_to_install_drivers',
    description: ' ',
    defaultMessage: 'Try installing or updating USB port drivers.'
  }
});



class SearchPanelComponent extends Component {


  constructor() {

    super();
    this.state = {
      devices: []
    };

    this.device_list = [];

    this.bluetooth_devices_state = "searching";

  }


  componentDidMount() {
    this._isMounted = true;

    // this.DCA =  this.props.deviceControlInterfaces.DCA;
    // this.RCA =  this.props.deviceControlInterfaces.RCA;
    // this.LCA =  this.props.deviceControlInterfaces.LCA;
    // this.QCA =  this.props.deviceControlInterfaces.QCA;
    // this.OCA =  this.props.deviceControlInterfaces.OCA;
    // this.ACA =  this.props.deviceControlInterfaces.ACA;

    this.DCA = this.props.DCA;
    this.RCA = this.props.RCA;
    this.LCA = this.props.LCA;
    this.QCA = this.props.QCA;
    this.OCA = this.props.OCA;
    this.ACA = this.props.ACA;
    this.VM = this.props.VM;

    this.draggableWindowId = this.props.draggableWindowId;

    this.DCA.registerBluetoothDevicesFoundCallback(() => {

      this.bluetooth_devices_state = "found";

    });

    this.DCA.registerDevicesStartSearchingCallback(() => {


      this.bluetooth_devices_state = "searching";

    });

    this.DCA.registerDevicesNotFoundCallback(() => {
      let search_device_button = document.getElementById(`robbo_search_devices`);
      if (search_device_button) {
        search_device_button.style.pointerEvents = "auto";
      }
      this._refreshDeviceList();
    });

    this.DCA.registerBluetoothDevicesNotFoundCallback(() => {
      this.bluetooth_devices_state = "not_found";
      this._refreshDeviceList();
    });



    this.DCA.registerDeviceFoundCallback(() => {
      this.is_bluetooth_devices_not_found = false;
      this._refreshDeviceList();
    });

    if (this.QCA) {
      this._wasDongleAvailable = false;
      this.QCA.registerQuadcopterStatusChangeCallback(() => {
        let now = typeof this.QCA.isDongleAvailable === 'function' && this.QCA.isDongleAvailable();
        if (now !== this._wasDongleAvailable) {
          this._wasDongleAvailable = now;
          this._refreshDeviceList();
        }
      });
    }







  }

  _refreshDeviceList() {
    let allDevices = this.DCA.getDevices();
    let newList = [];
    for (let index = 0; index < allDevices.length; index++) {
      newList.push({
        devicePort: allDevices[index].getPortName(),
        isBluetooth: allDevices[index].isBluetoothDevice(),
        isMacBluetooth: false
      });
    }
    if (this.QCA && typeof this.QCA.isDongleAvailable === 'function' && this.QCA.isDongleAvailable()) {
      newList.push({
        devicePort: 'Quadcopter',
        isBluetooth: false,
        isMacBluetooth: false,
        isQuadcopter: true
      });
    }
    if (!this._isMounted) return;
    this.device_list = newList;
    const prev = this.state.devices;
    const listChanged = prev.length !== newList.length ||
      newList.some((d, i) => !prev[i] || prev[i].devicePort !== d.devicePort || Boolean(prev[i].isQuadcopter) !== Boolean(d.isQuadcopter));
    if (listChanged) {
      this.setState({ devices: newList });
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  onThisWindowClose() {
    ReactDOM.findDOMNode(this).style.display = "none";
  }

  render() {

    return (


      <div id="SearchPanelComponent" className={styles.search_panel}>


        <div id="SearchPanelComponent-tittle" className={styles.search_panel_tittle}>


          <div className={styles.close_icon} onClick={this.onThisWindowClose.bind(this)}>


          </div>

        </div>

        <div id="SearchPanelComponent-body" className={styles.search_panel_body}>

          <div id="SearchPanelComponent-devices-list">

            {


              this.state.devices.map((device, index) => {





                return <SearchPanelDeviceComponent Id={index} flashingStatusComponentId={index} draggableWindowId={7 + index} key={device.devicePort + "-search-panel-devices-list"} devicePort={device.devicePort} isBluetooth={device.isBluetooth} isMacBluetooth={device.isMacBluetooth} isQuadcopter={device.isQuadcopter} VM={this.VM} DCA={this.DCA} RCA={this.RCA} LCA={this.LCA} QCA={this.QCA} OCA={this.OCA} ACA={this.ACA} />



              }

              )

            }


            {

              this.state.devices.map((device, index) => {





                return <DraggableWindowComponent key={index + "devices-list-draggable"} draggableWindowId={7 + index}>

                  <FirmwareFlasherFlashingStatusComponent key={index + "devices-list-status"} componentId={index} draggableWindowId={7 + index} DCA={this.DCA} RCA={this.RCA} LCA={this.LCA} QCA={this.QCA} OCA={this.OCA} ACA={this.ACA} />

                </DraggableWindowComponent>




              }

              )



            }

            {

              (this.state.devices.length == 0) ? <div className={styles.devices_not_found}>{this.props.intl.formatMessage(messages.devices_not_found)}</div> : ""

            }

            {

              ((this.bluetooth_devices_state == "searching") && isDesktopWithBluetooth()) ? <div className={styles.bluetooth_devices_not_found}>{this.props.intl.formatMessage(messages.bluetooth_searching)}</div> : ""

            }

            {
              ((this.bluetooth_devices_state == "not_found") && isDesktopWithBluetooth()) ? <div className={styles.bluetooth_devices_not_found}>{this.props.intl.formatMessage(messages.bluetooth_devices_not_found)}</div> : ""

            }


          </div>


        </div>

      </div>

    )
  };



}

// const mapStateToProps =  state => ({

//       devices:state.scratchGui.devices_search_panel,
//       draggable_window:state.scratchGui.new_draggable_window

//   });

// const mapDispatchToProps = dispatch => ({

// //   onGetDevicesInfo: (DCA,RCA,LCA,QCA,OCA) => {

// //       dispatch(ActionFirmwareFlasherGetDevicesInfo(DCA,RCA,LCA,QCA,OCA));

// //   },

//     onDeviceFound: (device) => {

//           dispatch(ActionAddNewFoundDevice(device));
//     },


//     onSearchPanelWindowClose: (window_id) => {

//         dispatch(ActionTriggerDraggableWindow(window_id));
//       }


// });

// export default injectIntl(connect(
//   mapStateToProps,
//   mapDispatchToProps
// )(SearchPanelComponent));

export default injectIntl(SearchPanelComponent);