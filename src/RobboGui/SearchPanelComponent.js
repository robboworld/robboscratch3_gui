
import classNames from 'classnames';
import React, { Component } from 'react';
import RobboPopupTransition from './RobboPopupTransition';
import styles from './SearchPanelComponent.css';
import SearchPanelStatusBlock from './SearchPanelStatusBlock';
import {getMenuBarDropdownTopPx} from '../lib/menu-bar-dropdown-anchor';
import {
    hideSearchPanel,
    showSearchPanel,
    subscribeSearchPanelVisibility
} from './search-panel-visibility';
import {notifyDeviceCount, notifySearchIdle} from './search-button-feedback';
import {registerEscapeClosable} from '../lib/robbo-popup-escape';
import {updateSettingsInStorage} from '../lib/settingsLoader';

import SearchPanelDeviceComponent from './SearchPanelDeviceComponent';


import { defineMessages, injectIntl } from 'react-intl';
import { isDesktopWithBluetooth, isRobboAndroidAppContext, isRobboLinkMobileWebContext, node_process } from '../lib/platform';
import {
    ROBBO_POPUP_Z_INDEX_BASE,
    raiseRobboPopupZIndex
} from '../lib/robbo-popup-z-index';
import {closeMessage} from './sensor-type-messages';

/** Same gate as RobboGui.searchDevices → searchQuadcopterDevices() */
function shouldProbeQuadcopterOnDeviceSearch(QCA) {
  return isDesktopWithBluetooth() && !!QCA;
}

/** The panel never says «Searching…» longer than this, even if a search forgets to report its end. */
const SEARCH_WAIT_MAX_MS = 8000;

/** DCA device states while port open / identify / flash — search button stays busy until settled */
const USB_SEARCH_CONNECTING_STATES = [0, 2, 3, 9, 10];

const messages = defineMessages({
  search_again: {
    id: 'gui.SearchPanel.search_again',
    description: 'Button in the Devices panel header and in the empty panel: search for devices again',
    defaultMessage: 'Search again'
  },
  devices_not_found_step_cable: {
    id: 'gui.SearchPanel.devices_not_found_step_cable',
    description: 'Devices panel, nothing found, step 1',
    defaultMessage: 'Connect the robot or the laboratory with a USB cable.'
  },
  devices_not_found_step_power: {
    id: 'gui.SearchPanel.devices_not_found_step_power',
    description: 'Devices panel, nothing found, step 2',
    defaultMessage: 'Check that the device is switched on.'
  },
  devices_not_found_step_bluetooth_disabled: {
    id: 'gui.SearchPanel.devices_not_found_step_bluetooth_disabled',
    description: 'Empty Devices panel: Bluetooth robots are not searched (the switch in the panel header is off)',
    defaultMessage: 'Bluetooth robot? Its search is off: press the Bluetooth button above.'
  },
  bluetooth_search_label: {
    id: 'gui.SearchPanel.bluetooth_search_label',
    description: 'Devices panel header switch (screen readers): search robots over Bluetooth',
    defaultMessage: 'Search Bluetooth robots'
  },
  bluetooth_search_on: {
    id: 'gui.SearchPanel.bluetooth_search_on',
    description: 'Tooltip of the Devices panel Bluetooth switch while Bluetooth robots are searched',
    defaultMessage: 'Bluetooth robots are searched. Click to stop searching them'
  },
  bluetooth_search_off: {
    id: 'gui.SearchPanel.bluetooth_search_off',
    description: 'Tooltip of the Devices panel Bluetooth switch while Bluetooth robots are not searched',
    defaultMessage: 'Bluetooth robots are not searched. Click to search them'
  },
  bluetooth_adapter_off: {
    id: 'gui.SearchPanel.bluetooth_adapter_off',
    description: 'Tooltip of the Devices panel Bluetooth switch: the search is on, but Bluetooth is off on the computer',
    defaultMessage: 'Bluetooth is off on the computer. Turn it on and press «Search again». Click to stop searching Bluetooth robots'
  },
  devices_not_found_step_bluetooth_off: {
    id: 'gui.SearchPanel.devices_not_found_step_bluetooth_off',
    description: 'Empty Devices panel: Bluetooth is off on the computer, so Bluetooth robots are not searched',
    defaultMessage: 'Bluetooth robot? Turn Bluetooth on on the computer: while it is off, they are not searched.'
  },
  devices_not_found_step_port: {
    id: 'gui.SearchPanel.devices_not_found_step_port',
    description: 'Devices panel, nothing found, step 3',
    defaultMessage: 'If that does not help, try another USB port or cable.'
  },

  devices_not_found: {

    id: 'gui.RobboGui.devices_not_found',
    description: ' ',
    defaultMessage: 'No devices found'
  },
  devices_searching: {

    id: 'gui.RobboGui.devices_searching',
    description: 'Shown while USB and/or Bluetooth device scan is in progress',
    defaultMessage: 'Searching…'
  },
  search_panel_title: {
    id: 'gui.RobboGui.search_panel_title',
    description: 'Title for device search popup window',
    defaultMessage: 'Devices'
  },
  devices_not_found_hint: {
    id: 'gui.RobboGui.devices_not_found_hint',
    description: 'Secondary hint when no devices were found during search',
    defaultMessage: 'Check that the device is powered on and connected, then search again.'
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
    // «Search again» presses the menu bar search button: the same search (and the port chooser on web)
    this.searchAgain = () => {
      const button = document.getElementById('robbo_search_devices');
      if (button && !button.disabled) button.click();
    };

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
    // Escape closes the panel like its ✕ (the topmost Robbo window first)
    this._unregisterEscape = registerEscapeClosable({
      isOpen: () => this.state.isShowing === true,
      getZIndex: () => this.state.popupZIndex,
      close: () => hideSearchPanel()
    });
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

    this.DCA.registerBluetoothDevicesFoundCallback(() => {

      this.bluetooth_devices_state = "found";
      this.bluetooth_search_finished = true;

    });

    this.DCA.registerDevicesStartSearchingCallback(() => {
      this._quadcopterAwaitingFirstSearchingEmit = shouldProbeQuadcopterOnDeviceSearch(this.QCA);
      // No Crazyradio plugged in: there is no copter to wait for
      if (this._quadcopterAwaitingFirstSearchingEmit && typeof this.QCA.checkDonglePresent === 'function') {
        this.QCA.checkDonglePresent().then(present => {
          if (present || !this._quadcopterAwaitingFirstSearchingEmit) return;
          this._quadcopterAwaitingFirstSearchingEmit = false;
          if (this._isMounted) this.setState({ uiRev: Date.now() });
        });
      }
      clearTimeout(this._searchWaitTimer);
      this._searchWaitTimer = setTimeout(() => this._finishSearchWait(), SEARCH_WAIT_MAX_MS);
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
      showSearchPanel();
    });

    this.DCA.registerDevicesNotFoundCallback(() => {
      this.usb_search_finished = true;
      // Do not clear _quadcopterAwaitingFirstSearchingEmit here when USB finishes first:
      // Crazyflie search() emits searching:true only after async link teardown.
      if (this._quadcopterAwaitingFirstSearchingEmit && !shouldProbeQuadcopterOnDeviceSearch(this.QCA)) {
        this._quadcopterAwaitingFirstSearchingEmit = false;
      } else if (this._quadcopterAwaitingFirstSearchingEmit && this.QCA && !this.QCA.crazyflieSession) {
        this._quadcopterAwaitingFirstSearchingEmit = false;
      }
      let search_device_button = document.getElementById(`robbo_search_devices`);
      if (search_device_button) {
        // Toggle inline style so MenuBarDeviceControls MutationObserver always fires (repeat search).
        search_device_button.style.pointerEvents = 'none';
        search_device_button.style.pointerEvents = 'auto';
        search_device_button.removeAttribute('disabled');
      }
      notifySearchIdle();
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
      this.usb_search_finished = true;
      this._refreshDeviceList();
      this._maybeNotifySearchIdleWhenSettled();
    });

    // The copter search is over (with or without Crazyradio): stop waiting for it. Without a dongle no copter
    // session starts, so «searching» is never reported and only this tells that the search ended.
    if (this.QCA && typeof this.QCA.subscribeScanFinished === 'function') {
      this._unsubscribeCopterScan = this.QCA.subscribeScanFinished(() => {
        if (!this._quadcopterAwaitingFirstSearchingEmit) return;
        this._quadcopterAwaitingFirstSearchingEmit = false;
        this._refreshDeviceList();
        if (this._isMounted) this.setState({ uiRev: Date.now() });
      });
    }

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
        const qcaFirmwareBusy = this.QCA && (
          this.QCA._firmwareFlashInProgress === true ||
          this.QCA._firmwareVersionProbeInProgress === true
        );
        if (!dongleNow && !searchingNow && !qcaFirmwareBusy) {
          this._quadcopterRowPinnedForSession = false;
        }
        this._refreshDeviceList();
        if (this._isMounted) {
          this.setState({ uiRev: Date.now() });
        }
      };
      this.QCA.registerQuadcopterStatusChangeCallback(this._quadcopterStatusCallback);
    }







  }

  /**
   * Web Serial: cancel or re-select an already-connected port does not emit a new state-6
   * transition, so the menu-bar search spinner must be cleared explicitly when no device
   * is still connecting.
   */
  _maybeNotifySearchIdleWhenSettled() {
    if (!this.DCA || typeof this.DCA.getDevices !== 'function') {
      return;
    }
    const allDevices = this.DCA.getDevices();
    if (!allDevices || allDevices.length === 0) {
      return;
    }
    const anyConnecting = allDevices.some(dev => {
      if (!dev || typeof dev.getState !== 'function') {
        return false;
      }
      return USB_SEARCH_CONNECTING_STATES.indexOf(dev.getState()) !== -1;
    });
    if (!anyConnecting) {
      notifySearchIdle();
    }
  }

  /**
   * The header switch: Bluetooth robots are searched or not. On: the Bluetooth search runs now (USB devices stay as
   * they are). Off: robots that are not connected leave the list. Kept in settings.json.
   */
  toggleBluetoothSearch () {
    const enabled = !this.DCA.isBluetoothSearchEnabled();
    this.DCA.setBluetoothSearchEnabled(enabled);
    updateSettingsInStorage({bluetooth_search_enabled: enabled});
    if (enabled) {
      this.bluetooth_devices_state = 'searching';
      this.bluetooth_search_finished = false;
      this.DCA.searchBluetoothRobots();
    } else {
      this.bluetooth_devices_state = 'idle';
      this.bluetooth_search_finished = true;
    }
    this._refreshDeviceList();
    this.setState({ uiRev: Date.now() });
  }

  /** Safety net: whatever did not report its end, the panel shows what it has. */
  _finishSearchWait() {
    this._searchWaitTimer = null;
    if (!this._isMounted) return;
    this.usb_search_finished = true;
    this.bluetooth_search_finished = true;
    if (this.bluetooth_devices_state === 'searching') this.bluetooth_devices_state = 'not_found';
    this._quadcopterAwaitingFirstSearchingEmit = false;
    this._refreshDeviceList();
    this.setState({ uiRev: Date.now() });
  }

  _refreshDeviceList() {
    let allDevices = this.DCA.getDevices().filter(Boolean);
    let newList = [];
    for (let index = 0; index < allDevices.length; index++) {
      newList.push({
        devicePort: allDevices[index].getPortName(),
        isBluetooth: allDevices[index].isBluetoothDevice(),
        isMacBluetooth: false
      });
    }
    const qcaDongleAvailable = this.QCA && typeof this.QCA.isDongleAvailable === 'function' && this.QCA.isDongleAvailable();
    const qcaFirmwareBusy = this.QCA && (
      this.QCA._firmwareFlashInProgress === true ||
      this.QCA._firmwareVersionProbeInProgress === true
    );
    if (qcaDongleAvailable) {
      this._quadcopterRowPinnedForSession = true;
    }
    /** Do not show the row while radio search runs before the dongle is detected (searching + !dongle). */
    const showQuadcopterRow = this.QCA && (
      qcaDongleAvailable ||
      this._quadcopterRowPinnedForSession ||
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
    const prev = this.state.devices;
    const listChanged = prev.length !== newList.length ||
      newList.some((d, i) => !prev[i] || prev[i].devicePort !== d.devicePort || Boolean(prev[i].isQuadcopter) !== Boolean(d.isQuadcopter));
    if (listChanged) {
      this.setState({ devices: newList });
      // the menu bar shows how many rows the panel has: opening it does not need a new search
      notifyDeviceCount(newList.length);
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
    if (this._unregisterEscape) this._unregisterEscape();
    if (this._unsubscribeCopterScan) this._unsubscribeCopterScan();
    clearTimeout(this._searchWaitTimer);
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
    // Bluetooth robots are searched through chrome.bluetooth on Windows and Linux desktop only
    const bluetoothSwitch = !isMobileBridgeContext && supportsBluetoothSearchUi && this.DCA &&
      typeof this.DCA.setBluetoothSearchEnabled === 'function' && typeof node_process !== 'undefined' &&
      (node_process.platform === 'win32' || node_process.platform === 'linux');
    const bluetoothOff = supportsBluetoothSearchUi && this.DCA &&
      typeof this.DCA.isBluetoothAdapterOff === 'function' && this.DCA.isBluetoothAdapterOff();
    const showBluetoothNotFound = supportsBluetoothSearchUi && bluetoothSearchEnabled && this.bluetooth_devices_state === "not_found";
    const shouldDelayNoDevicesMessage = bluetoothSearchEnabled && !this.bluetooth_search_finished;
    const qcaSearchingNow = this.QCA &&
      typeof this.QCA.isQuadcopterSearching === 'function' &&
      this.QCA.isQuadcopterSearching() === true;
    const quadcopterProbePending = shouldProbeQuadcopterOnDeviceSearch(this.QCA) &&
      this._quadcopterAwaitingFirstSearchingEmit &&
      this.usb_search_finished &&
      this.state.devices.length === 0;
    const quadcopterSearchActive = qcaSearchingNow;
    const showDevicesSearching = this.state.devices.length === 0 &&
      (!this.usb_search_finished || showBluetoothPhaseSearching ||
        quadcopterSearchActive || quadcopterProbePending);
    const showDevicesNotFound = this.state.devices.length === 0 && this.usb_search_finished &&
      !showDevicesSearching && !shouldDelayNoDevicesMessage &&
      !this._quadcopterAwaitingFirstSearchingEmit && !qcaSearchingNow;

    void this.state.uiRev;

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
          <div className={styles.search_panel_header}>
            <span className={styles.search_panel_header_title}>
              {this.props.intl.formatMessage(messages.search_panel_title)}
            </span>
            {bluetoothSwitch ? (
              <button
                  type="button"
                  className={classNames(styles.bluetooth_switch, {
                    [styles.bluetooth_switch_on]: bluetoothSearchEnabled && !bluetoothOff,
                    [styles.bluetooth_switch_adapter_off]: bluetoothSearchEnabled && bluetoothOff
                  })}
                  aria-pressed={bluetoothSearchEnabled}
                  aria-label={this.props.intl.formatMessage(messages.bluetooth_search_label)}
                  title={this.props.intl.formatMessage(!bluetoothSearchEnabled ? messages.bluetooth_search_off :
                    bluetoothOff ? messages.bluetooth_adapter_off : messages.bluetooth_search_on)}
                  onClick={() => this.toggleBluetoothSearch()}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 7l10 10-5 5V2l5 5L7 17" />
                  {bluetoothSearchEnabled && bluetoothOff ? <path d="M4 4l16 16" /> : null}
                </svg>
              </button>
            ) : null}
            <button
                type="button"
                className={styles.search_again}
                onClick={this.searchAgain}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
                <path d="M13.5 2.5v3.6H9.9" />
              </svg>
              {this.props.intl.formatMessage(messages.search_again)}
            </button>
            <button
                type="button"
                className={styles.search_panel_close}
                aria-label={this.props.intl.formatMessage(closeMessage)}
                    title={this.props.intl.formatMessage(closeMessage)}
                onClick={this.onThisWindowClose}
            />
          </div>
          <div id="SearchPanelComponent-body" className={styles.search_panel_body}>

            <div id="SearchPanelComponent-devices-list">

              {
                this.state.devices.map((device, index) => (
                  <SearchPanelDeviceComponent
                      Id={index}
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
                  <SearchPanelStatusBlock
                      variant="searching"
                      title={this.props.intl.formatMessage(messages.devices_searching)}
                  />
                ) : null
              }

              {
                showDevicesNotFound ? (
                  <SearchPanelStatusBlock
                      variant="empty"
                      title={this.props.intl.formatMessage(messages.devices_not_found)}
                      steps={[
                        this.props.intl.formatMessage(messages.devices_not_found_step_cable),
                        this.props.intl.formatMessage(messages.devices_not_found_step_power),
                        this.props.intl.formatMessage(messages.devices_not_found_step_port),
                        bluetoothOff ? this.props.intl.formatMessage(messages.devices_not_found_step_bluetooth_off) : null,
                        bluetoothSwitch && !bluetoothSearchEnabled ?
                          this.props.intl.formatMessage(messages.devices_not_found_step_bluetooth_disabled) : null
                      ].filter(Boolean)}
                      actionLabel={this.props.intl.formatMessage(messages.search_again)}
                      onAction={this.searchAgain}
                  />
                ) : null
              }

              {
                showBluetoothNotFound && isMobileBridgeContext ? (
                  <SearchPanelStatusBlock
                      variant="info"
                      title={this.props.intl.formatMessage(
                        isEmbeddedAndroidApp ?
                          messages.robbo_android_devices_not_found :
                          messages.robbolink_mobile_devices_not_found
                      )}
                  />
                ) : null
              }

            </div>

          </div>

        </div>
      </RobboPopupTransition>
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