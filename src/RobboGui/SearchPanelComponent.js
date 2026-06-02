
import classNames from 'classnames';
import React, { Component } from 'react';
import RobboPopupTransition from './RobboPopupTransition';
import styles from './SearchPanelComponent.css';
import {getMenuBarDropdownTopPx} from '../lib/menu-bar-dropdown-anchor';
import {
    hideSearchPanel,
    subscribeSearchPanelVisibility
} from './search-panel-visibility';

import FirmwareFlasherFlashingStatusComponent from './FirmwareFlasherFlashingStatusComponent';
import SearchPanelDeviceComponent from './SearchPanelDeviceComponent';

import DraggableWindowComponent from './DraggableWindowComponent';

import { defineMessages, intlShape, injectIntl, FormattedMessage } from 'react-intl';
import { isDesktopWithBluetooth, isRobboAndroidAppContext, isRobboLinkMobileWebContext, node_process } from '../lib/platform';
import {
    ROBBO_POPUP_Z_INDEX_BASE,
    raiseRobboPopupZIndex
} from '../lib/robbo-popup-z-index';

/** Same gate as RobboGui.searchDevices → searchQuadcopterDevices() */
function shouldProbeQuadcopterOnDeviceSearch(QCA) {
  return isDesktopWithBluetooth() && !!QCA;
}

const messages = defineMessages({

  devices_not_found: {

    id: 'gui.RobboGui.devices_not_found',
    description: ' ',
    defaultMessage: 'No devices available for connection.'
  },
  devices_searching: {

    id: 'gui.RobboGui.devices_searching',
    description: 'Shown while USB and/or Bluetooth device scan is in progress',
    defaultMessage: 'Searching…'
  },
  robbo_android_searching: {
    id: 'gui.RobboGui.robbo_android_searching',
    description: ' ',
    defaultMessage: 'Searching paired Robbo devices through Android Bluetooth...'
  },
  robbo_android_devices_not_found: {
    id: 'gui.RobboGui.robbo_android_devices_not_found',
    description: ' ',
    defaultMessage: 'No paired Robbo devices found. Pair the robot in Android Bluetooth settings, grant Bluetooth permissions to Robbo Scratch, and search again.'
  },
  robbolink_mobile_devices_not_found: {
    id: 'gui.RobboGui.robbolink_mobile_devices_not_found',
    description: ' ',
    defaultMessage: 'No paired Robbo devices found. Open Robbo Scratch on this phone, pair the robot in Android Bluetooth settings, and search again.'
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
      devices: [],
      /** Bumps when instance fields used in render change without device list updates */
      uiRev: 0,
      popupZIndex: ROBBO_POPUP_Z_INDEX_BASE,
      searchEpoch: 0,
      isShowing: false,
      anchorStyle: {}
    };

    this._panelRef = null;
    this._handleSearchPanelShow = this._handleSearchPanelShow.bind(this);
    this._handleSearchPanelHide = this._handleSearchPanelHide.bind(this);
    this._handleWindowResize = this._handleWindowResize.bind(this);
    this._handleTransitionEntered = this._handleTransitionEntered.bind(this);
    this.onThisWindowClose = this.onThisWindowClose.bind(this);

    this.device_list = [];

    this.bluetooth_devices_state = "idle";
    this.usb_search_finished = true;
    this.bluetooth_search_finished = true;
    /** True until Crazyflie session emits searching — avoids «no devices» flash before dongle probe starts */
    this._quadcopterAwaitingFirstSearchingEmit = false;
    this._lastQuadcopterSearchPanelSig = null;
    /** Keep Quadcopter row while cf2tool/cfloader temporarily release the radio (dongleAvailable flickers). */
    this._quadcopterRowPinnedForSession = false;

    this.handleSearchPanelMouseDown = this.handleSearchPanelMouseDown.bind(this);

  }


  handleSearchPanelMouseDown () {
    this.setState({popupZIndex: raiseRobboPopupZIndex()});
  }

  _getSearchPanelAnchorElement () {
    return document.getElementById('robbo_search_devices');
  }

  updateAnchorPosition () {
    const anchor = this._getSearchPanelAnchorElement();
    if (!anchor || typeof window === 'undefined') {
      return {};
    }
    const rect = anchor.getBoundingClientRect();
    const margin = 8;
    const panelWidth = (this._panelRef && this._panelRef.offsetWidth) || 220;
    const panelHeight = (this._panelRef && this._panelRef.offsetHeight) || 200;
    const menuBarTop = getMenuBarDropdownTopPx();
    let top = menuBarTop != null ? menuBarTop : rect.bottom;
    let left = rect.left;
    left = Math.max(margin, Math.min(left, window.innerWidth - panelWidth - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - panelHeight - margin));
    return {
      top: `${top}px`,
      left: `${left}px`
    };
  }

  _handleSearchPanelShow () {
    const anchorStyle = this.updateAnchorPosition();
    this.setState({isShowing: true, anchorStyle}, () => {
      requestAnimationFrame(() => {
        if (this._isMounted && this.state.isShowing) {
          this.setState({anchorStyle: this.updateAnchorPosition()});
        }
      });
    });
    if (typeof window !== 'undefined' && !this._resizeListenerAttached) {
      window.addEventListener('resize', this._handleWindowResize);
      this._resizeListenerAttached = true;
    }
  }

  _handleSearchPanelHide () {
    if (typeof window !== 'undefined' && this._resizeListenerAttached) {
      window.removeEventListener('resize', this._handleWindowResize);
      this._resizeListenerAttached = false;
    }
    this.setState({isShowing: false});
  }

  _handleWindowResize () {
    if (this.state.isShowing) {
      this.setState({anchorStyle: this.updateAnchorPosition()});
    }
  }

  _handleTransitionEntered () {
    this.setState({
      popupZIndex: raiseRobboPopupZIndex(),
      anchorStyle: this.updateAnchorPosition()
    });
  }

  componentDidMount() {
    this._isMounted = true;
    this._unsubscribeSearchPanelVisibility = subscribeSearchPanelVisibility(showing => {
      if (showing) {
        this._handleSearchPanelShow();
      } else {
        this._handleSearchPanelHide();
      }
    });

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
      this.bluetooth_search_finished = true;

    });

    this.DCA.registerDevicesStartSearchingCallback(() => {
      this._quadcopterAwaitingFirstSearchingEmit = shouldProbeQuadcopterOnDeviceSearch(this.QCA);
      this._quadcopterRowPinnedForSession = false;
      if (this.QCA && typeof this.QCA.resetFirmwareSessionOnDeviceSearch === 'function') {
        this.QCA.resetFirmwareSessionOnDeviceSearch();
      }
      this.usb_search_finished = false;
      // Same condition as DeviceControlAPI.searchAllDevices — Chrome Bluetooth scan only on Win/Linux desktop
      const useChromeBluetooth = typeof node_process !== 'undefined' &&
        (node_process.platform === 'win32' || node_process.platform === 'linux');
      const willRunBtScan = useChromeBluetooth &&
        typeof this.DCA.isBluetoothSearchEnabled === 'function' &&
        this.DCA.isBluetoothSearchEnabled();
      if (willRunBtScan) {
        this.bluetooth_devices_state = 'searching';
        this.bluetooth_search_finished = false;
      } else {
        this.bluetooth_devices_state = 'idle';
        this.bluetooth_search_finished = true;
      }
      if (this._isMounted) {
        this.setState(prev => ({ uiRev: Date.now(), searchEpoch: prev.searchEpoch + 1 }));
      }
    });

    this.DCA.registerDevicesNotFoundCallback(() => {
      this.usb_search_finished = true;
      let search_device_button = document.getElementById(`robbo_search_devices`);
      if (search_device_button) {
        // Toggle inline style so MenuBarDeviceControls MutationObserver always fires (repeat search).
        search_device_button.style.pointerEvents = 'none';
        search_device_button.style.pointerEvents = 'auto';
        search_device_button.removeAttribute('disabled');
      }
      this._refreshDeviceList();
      if (this._isMounted) {
        this.setState({ uiRev: Date.now() });
      }
    });

    this.DCA.registerBluetoothDevicesNotFoundCallback(() => {
      this.bluetooth_devices_state = "not_found";
      this.bluetooth_search_finished = true;
      this._refreshDeviceList();
      if (this._isMounted) {
        this.setState({ uiRev: Date.now() });
      }
    });



    this.DCA.registerDeviceFoundCallback(() => {
      this.is_bluetooth_devices_not_found = false;
      this.usb_search_finished = true;
      let search_device_button = document.getElementById(`robbo_search_devices`);
      if (search_device_button) {
        search_device_button.style.pointerEvents = 'none';
        search_device_button.style.pointerEvents = 'auto';
        search_device_button.removeAttribute('disabled');
      }
      this._refreshDeviceList();
    });

    if (this.QCA) {
      this._quadcopterStatusCallback = (state, searching, snapshot) => {
        const snap = snapshot || {};
        const dongleNow = typeof snap.dongleAvailable === 'boolean'
          ? snap.dongleAvailable
          : (typeof this.QCA.isDongleAvailable === 'function' && this.QCA.isDongleAvailable());
        const searchingNow = snap.searching === true;
        const panelSig = `${dongleNow}|${searchingNow}`;
        if (panelSig === this._lastQuadcopterSearchPanelSig) {
          return;
        }
        this._lastQuadcopterSearchPanelSig = panelSig;
        if (searchingNow) {
          this._quadcopterAwaitingFirstSearchingEmit = false;
        }
        this._refreshDeviceList();
        if (this._isMounted) {
          this.setState({ uiRev: Date.now() });
        }
      };
      this.QCA.registerQuadcopterStatusChangeCallback(this._quadcopterStatusCallback);
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
    const qcaDongleAvailable = this.QCA && typeof this.QCA.isDongleAvailable === 'function' && this.QCA.isDongleAvailable();
    const qcaSearchingNow = this.QCA && typeof this.QCA.isQuadcopterSearching === 'function' && this.QCA.isQuadcopterSearching();
    const qcaFirmwareBusy = this.QCA && (
      this.QCA._firmwareFlashInProgress === true ||
      this.QCA._firmwareVersionProbeInProgress === true
    );
    if (qcaDongleAvailable) {
      this._quadcopterRowPinnedForSession = true;
    }
    const showQuadcopterRow = this.QCA && (
      qcaDongleAvailable ||
      this._quadcopterRowPinnedForSession ||
      qcaSearchingNow ||
      qcaFirmwareBusy
    );
    if (showQuadcopterRow) {
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
    if (this._unsubscribeSearchPanelVisibility) {
      this._unsubscribeSearchPanelVisibility();
      this._unsubscribeSearchPanelVisibility = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this._handleWindowResize);
    }
    if (this.QCA && this._quadcopterStatusCallback && typeof this.QCA.unregisterQuadcopterStatusChangeCallback === 'function') {
      this.QCA.unregisterQuadcopterStatusChangeCallback(this._quadcopterStatusCallback);
    }
  }

  onThisWindowClose () {
    hideSearchPanel();
  }

  render() {
    const isMobileBridgeContext = isRobboLinkMobileWebContext();
    const isEmbeddedAndroidApp = isRobboAndroidAppContext();
    const showFirmwareUi = !isMobileBridgeContext;
    const bluetoothSearchEnabled = this.DCA && typeof this.DCA.isBluetoothSearchEnabled === 'function' ? this.DCA.isBluetoothSearchEnabled() : true;
    const supportsBluetoothSearchUi = isDesktopWithBluetooth() || isMobileBridgeContext;
    const showBluetoothPhaseSearching = supportsBluetoothSearchUi && bluetoothSearchEnabled &&
      this.bluetooth_devices_state === 'searching' && this.usb_search_finished;
    const showBluetoothNotFound = supportsBluetoothSearchUi && bluetoothSearchEnabled && this.bluetooth_devices_state === "not_found";
    const shouldDelayNoDevicesMessage = bluetoothSearchEnabled && !this.bluetooth_search_finished;
    const quadcopterSearchActive = this.QCA &&
      typeof this.QCA.isQuadcopterSearching === 'function' &&
      this.QCA.isQuadcopterSearching();
    const quadcopterUsbRaceGrace = shouldProbeQuadcopterOnDeviceSearch(this.QCA) &&
      this._quadcopterAwaitingFirstSearchingEmit &&
      this.usb_search_finished &&
      this.state.devices.length === 0;
    const showDevicesSearching = this.state.devices.length === 0 &&
      (!this.usb_search_finished || showBluetoothPhaseSearching ||
        quadcopterSearchActive || quadcopterUsbRaceGrace);
    const showDevicesNotFound = this.state.devices.length === 0 && this.usb_search_finished &&
      !showDevicesSearching && !shouldDelayNoDevicesMessage;

    void this.state.uiRev;

    const firmwareFlashWindows = showFirmwareUi ? this.state.devices.map((device, index) => (
      <DraggableWindowComponent key={index + 'devices-list-draggable'} draggableWindowId={7 + index}>
        <FirmwareFlasherFlashingStatusComponent
          key={index + 'devices-list-status'}
          componentId={index}
          draggableWindowId={7 + index}
          DCA={this.DCA}
          RCA={this.RCA}
          LCA={this.LCA}
          QCA={this.QCA}
          OCA={this.OCA}
          ACA={this.ACA}
        />
      </DraggableWindowComponent>
    )) : null;

    const panelStyle = {
      zIndex: this.state.popupZIndex,
      ...this.state.anchorStyle
    };

    return (
      <React.Fragment>
      <RobboPopupTransition
          in={this.state.isShowing}
          onEntered={this._handleTransitionEntered}
      >
        <div
            ref={el => {
              this._panelRef = el;
            }}
            id="SearchPanelComponent"
            className={styles.search_panel}
            style={panelStyle}
            aria-hidden={!this.state.isShowing}
            onMouseDown={this.handleSearchPanelMouseDown}
        >
          <button
              type="button"
              className={styles.search_panel_close}
              aria-label="Close"
              onClick={this.onThisWindowClose}
          />
          <div id="SearchPanelComponent-body" className={styles.search_panel_body}>

            <div id="SearchPanelComponent-devices-list">

              {
                this.state.devices.map((device, index) => (
                  <SearchPanelDeviceComponent
                      Id={index}
                      flashingStatusComponentId={index}
                      draggableWindowId={7 + index}
                      key={device.devicePort + '-search-panel-devices-list'}
                      devicePort={device.devicePort}
                      isBluetooth={device.isBluetooth}
                      isMacBluetooth={device.isMacBluetooth}
                      isQuadcopter={device.isQuadcopter}
                      disableFirmwareUi={!showFirmwareUi}
                      VM={this.VM}
                      DCA={this.DCA}
                      RCA={this.RCA}
                      LCA={this.LCA}
                      QCA={this.QCA}
                      OCA={this.OCA}
                      ACA={this.ACA}
                      searchEpoch={this.state.searchEpoch}
                  />
                ))
              }

              {
                showDevicesSearching ? (
                  <div className={styles.bluetooth_devices_not_found}>
                    {this.props.intl.formatMessage(messages.devices_searching)}
                  </div>
                ) : null
              }

              {
                showDevicesNotFound ? (
                  <div className={styles.devices_not_found}>
                    {this.props.intl.formatMessage(messages.devices_not_found)}
                  </div>
                ) : null
              }

              {
                showBluetoothNotFound && isMobileBridgeContext ? (
                  <div className={styles.bluetooth_devices_not_found}>
                    {this.props.intl.formatMessage(
                      isEmbeddedAndroidApp ?
                        messages.robbo_android_devices_not_found :
                        messages.robbolink_mobile_devices_not_found
                    )}
                  </div>
                ) : null
              }

            </div>

          </div>

        </div>
      </RobboPopupTransition>
      {firmwareFlashWindows}
      </React.Fragment>
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