import classNames from 'classnames';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withAlert } from 'react-alert';

import { defineMessages, intlShape, injectIntl, FormattedMessage } from 'react-intl';

import styles from './SettingsWindowComponent.css';
import { ActionTriggerDraggableWindow } from './actions/sensor_actions';
import { isDesktopWithBluetooth } from '../lib/platform';
import {
  getSettingsFromStorage,
  applySettingsToDCA,
  applyFirmwareSettingsToRuntime,
  FULLSCREEN_RENDER_QUALITY_DEFAULT,
  getFullscreenRenderQualityStorageData,
  normalizeFullscreenRenderQuality
} from '../lib/settingsLoader';
import { setFullscreenRenderQuality } from './reducers/settings';

const messages = defineMessages({
  settings_window: {
    id: 'gui.RobboGui.settings_window',
    description: ' ',
    defaultMessage: 'Settings'
  },
  uno_search_timeout: {
    id: 'gui.RobboGui.uno_search_timeout',
    description: ' ',
    defaultMessage: 'Robbo search timeout'
  },
  save_settings: {
    id: 'gui.RobboGui.save_settings',
    description: ' ',
    defaultMessage: 'Save settings'
  },
  fullscreen_render_quality: {
    id: 'gui.RobboGui.settings_window.fullscreen_render_quality',
    description: ' ',
    defaultMessage: 'Rendering quality'
  },
  fullscreen_quality_note: {
    id: 'gui.RobboGui.settings_window.fullscreen_quality_note',
    description: ' ',
    defaultMessage: 'The parameter affects GPU and CPU load'
  },
  fullscreen_section_title: {
    id: 'gui.RobboGui.settings_window.fullscreen_section_title',
    description: ' ',
    defaultMessage: 'Fullscreen mode settings'
  },
  fullscreen_quality_performance: {
    id: 'gui.RobboGui.settings_window.fullscreen_quality_performance',
    description: ' ',
    defaultMessage: 'Performance'
  },
  fullscreen_quality_balanced: {
    id: 'gui.RobboGui.settings_window.fullscreen_quality_balanced',
    description: ' ',
    defaultMessage: 'Balanced'
  },
  fullscreen_quality_quality: {
    id: 'gui.RobboGui.settings_window.fullscreen_quality_quality',
    description: ' ',
    defaultMessage: 'Quality'
  },
});

const messages_for_DCA_intervals = defineMessages({
  // id must stay a string literal (babel-plugin-react-intl extraction); same value as RobboMessageIds.dca.deviceConnectionSection
  device_connection_section: {
    id: 'gui.dca.device_connection_section',
    description: ' ',
    defaultMessage: 'Device connection'
  },
  no_response_time: {
    id: 'gui.dca.no_response_time',
    description: ' ',
    defaultMessage: 'NO RESPONSE TIME'
  },
  no_start_timeout: {
    id: 'gui.dca.no_start_timeout',
    description: ' ',
    defaultMessage: 'NO START TIMEOUT'
  },
  device_handle_timeout: {
    id: 'gui.dca.device_handle_timeout',
    description: ' ',
    defaultMessage: 'DEVICE HANDLE TIMEOUT'
  },
  uno_timeout: {
    id: 'gui.dca.uno_timeout',
    description: ' ',
    defaultMessage: 'UNO TIMEOUT'
  },
  bluetooth_search_enabled: {
    id: 'gui.dca.bluetooth_search_enabled',
    description: ' ',
    defaultMessage: 'Bluetooth search'
  },
});

class SettingsWindowComponent extends Component {
  onThisWindowClose() {

    console.log("SettingsWindow close");
    this.props.onSettingsWindowClose(4);

  }

  readSettings() {
    console.warn(`readSettings`);
    return getSettingsFromStorage();
  }

  getInput(id) {
    const component = document.getElementById(id);
    return component && component.children && component.children[0] ? component.children[0] : null;
  }

  saveDCASettings() {
    const def = this.DCA_defaults;
    const max = this.DCA_maxes;
    const v = (id) => { const el = this.getInput(id); return Number(el != null ? el.value : undefined); };
    let no_response_time = Math.round(v("raw-connection-1-settings-window-content-column-2"));
    let no_start_timeout = Math.round(v("raw-connection-2-settings-window-content-column-2"));
    let device_handle_timeout = Math.round(v("raw-connection-3-settings-window-content-column-2"));
    let uno_search_timeout = Math.round(v("raw-connection-4-settings-window-content-column-2"));

    if (typeof no_response_time !== 'number' || no_response_time <= 0 || no_response_time > max.NO_RESPONSE_TIME_MAX) {
      no_response_time = def.NO_RESPONSE_TIME_DEFAULT;
    }
    if (typeof no_start_timeout !== 'number' || no_start_timeout <= 0 || no_start_timeout > max.NO_START_TIMEOUT_MAX) {
      no_start_timeout = def.NO_START_TIMEOUT_DEFAULT;
    }
    if (typeof device_handle_timeout !== 'number' || device_handle_timeout <= 0 || device_handle_timeout > max.DEVICE_HANDLE_TIMEOUT_MAX) {
      device_handle_timeout = def.DEVICE_HANDLE_TIMEOUT_DEFAULT;
    }
    if (typeof uno_search_timeout !== 'number' || uno_search_timeout <= 0 || uno_search_timeout > device_handle_timeout) {
      uno_search_timeout = Math.round(device_handle_timeout / 2);
      const unoInput = this.getInput("raw-connection-4-settings-window-content-column-2");
      if (unoInput) unoInput.value = uno_search_timeout;
    }

    return {
      device_response_timeout: no_response_time,
      device_no_start_timeout: no_start_timeout,
      device_handle_timeout: device_handle_timeout,
      device_uno_start_search_timeout: uno_search_timeout,
      device_response_timeout_bluetooth: no_response_time,
      device_no_start_timeout_bluetooth: no_start_timeout,
      device_handle_timeout_bluetooth: device_handle_timeout,
      device_uno_start_search_timeout_bluetooth: uno_search_timeout
    };
  }

  saveSettings() {
    const fullscreenRenderQualityInput = this.getInput("raw-fullscreen-quality-settings-window-content-column-2");
    const settings_data = {
      ...this.saveDCASettings(),
      ...getFullscreenRenderQualityStorageData({
        fullscreen_render_quality: fullscreenRenderQualityInput ? fullscreenRenderQualityInput.value : undefined
      })
    };

    const btSearchEl = document.getElementById("raw-bt-search-settings-window-content-column-2");
    if (btSearchEl && btSearchEl.children[0]) {
      settings_data.bluetooth_search_enabled = btSearchEl.children[0].checked;
    }

    const settings_data_serialized = JSON.stringify(settings_data);

    this.VM.runtime.clearAvTimeInterval();
    this.VM.runtime.setSettingsSaved();

    applySettingsToDCA(this.VM, settings_data);
    applyFirmwareSettingsToRuntime(this.VM, {});
    this.props.onSetFullscreenRenderQuality(settings_data.fullscreen_render_quality);

    this.deleteSettingsFile(() => {
      this.saveSettingsData(settings_data_serialized);
    });
  }

  saveSettingsData(settings_data) {
    console.warn("saveSettings" + " data: " + settings_data);

    function errorHandler(e) {
      console.error("Error during saving settings: " + e);
    };

    function onInitFs(fs) {
      console.log('Opened file system: ' + fs.name);
      fs.root.getFile("settings" + "." + "json", { create: true }, function (fileEntry) {
        fileEntry.createWriter(function (fileWriter) {
          fileWriter.onwriteend = function (e) {
            console.log('Settings write completed.');
          }
          fileWriter.onerror = function (e) {
            console.log('Settings writing failed: ' + e.toString());
          };
          var bb = new Blob([settings_data]);
          fileWriter.write(bb);
        });
      }, errorHandler);
    };

    navigator.webkitPersistentStorage.requestQuota(500 * 1024 * 1024, //500Мб
      function (grantedBytes) {
        console.log("byte granted=" + grantedBytes);
        window.webkitRequestFileSystem(PERSISTENT, grantedBytes, onInitFs, errorHandler);
      }, errorHandler
    );
  }

  deleteSettingsFile(callback) {
    var errorHandler = function (e) {
      if (('' + e).localeCompare("NotFoundError: A requested file or directory could not be found at the time an operation was processed.") != 0)
        console.error("File error during removing bad settings file: " + e);
      else
        if (typeof (callback) === 'function') callback();
    };

    var _onInitFs = function (fs) {
      fs.root.getFile("settings.json", { create: false }, function (fileEntry) {
        fileEntry.remove(() => {
          console.log('File settings.json was removed.');
          if (typeof (callback) === 'function') callback();
        }, errorHandler);
      }, errorHandler);
    }

    navigator.webkitPersistentStorage.requestQuota(500 * 1024 * 1024,
      function (grantedBytes) {
        //      console.log("byte granted=" + grantedBytes);
        window.webkitRequestFileSystem(PERSISTENT, grantedBytes, _onInitFs, errorHandler);
      }, errorHandler);
  }

  setDefaultsDCAValues() {
    const def = this.DCA_defaults;
    const c1 = this.getInput("raw-connection-1-settings-window-content-column-2");
    const c2 = this.getInput("raw-connection-2-settings-window-content-column-2");
    const c3 = this.getInput("raw-connection-3-settings-window-content-column-2");
    const c4 = this.getInput("raw-connection-4-settings-window-content-column-2");
    if (c1) c1.value = def.NO_RESPONSE_TIME_DEFAULT;
    if (c2) c2.value = def.NO_START_TIMEOUT_DEFAULT;
    if (c3) c3.value = def.DEVICE_HANDLE_TIMEOUT_DEFAULT;
    if (c4) c4.value = def.UNO_TIMEOUT_DEFAULT;

    const btSearchEl = document.getElementById("raw-bt-search-settings-window-content-column-2");
    if (btSearchEl && btSearchEl.children[0]) {
      btSearchEl.children[0].checked = true;
    }

    const fullscreenQualityInput = this.getInput("raw-fullscreen-quality-settings-window-content-column-2");
    if (fullscreenQualityInput) {
      fullscreenQualityInput.value = FULLSCREEN_RENDER_QUALITY_DEFAULT;
    }

  }


  componentDidMount() {
    this.VM = this.props.VM;
    this.DCA_defaults = this.VM.DCA.getDefaultValuesOfIntervals();
    this.DCA_maxes = this.VM.DCA.getMaxValuesOfIntervals();
    this.DCA_defaults_bluetooth = this.VM.DCA.getDefaultValuesOfIntervalsBluetooth();
    this.DCA_maxes_bluetooth = this.VM.DCA.getMaxValuesOfIntervalsBluetooth();

    this.readSettings().then((result) => {
      const child0 = (id) => {
        const n = document.getElementById(id);
        return n && n.children && n.children[0] ? n.children[0] : null;
      };

      const c1 = child0("raw-connection-1-settings-window-content-column-2");
      const c2 = child0("raw-connection-2-settings-window-content-column-2");
      const c3 = child0("raw-connection-3-settings-window-content-column-2");
      const c4 = child0("raw-connection-4-settings-window-content-column-2");
      const fullscreenQuality = child0("raw-fullscreen-quality-settings-window-content-column-2");

      if (result.file_exists) {
        try {
          const settings_data = JSON.parse(result.file);

          const no_response = Math.round(Number(settings_data.device_response_timeout != null ? settings_data.device_response_timeout : settings_data.device_response_timeout_bluetooth));
          const no_start = Math.round(Number(settings_data.device_no_start_timeout != null ? settings_data.device_no_start_timeout : settings_data.device_no_start_timeout_bluetooth));
          const device_handle = Math.round(Number(settings_data.device_handle_timeout != null ? settings_data.device_handle_timeout : settings_data.device_handle_timeout_bluetooth));
          const uno_timeout = Math.round(Number(settings_data.device_uno_start_search_timeout != null ? settings_data.device_uno_start_search_timeout : settings_data.device_uno_start_search_timeout_bluetooth));
          if (c1) c1.value = no_response;
          if (c2) c2.value = no_start;
          if (c3) c3.value = device_handle;
          if (c4) c4.value = uno_timeout;

          const btSearchEl = child0("raw-bt-search-settings-window-content-column-2");
          if (btSearchEl) btSearchEl.checked = settings_data.bluetooth_search_enabled !== false;

          const fullscreenRenderQuality = normalizeFullscreenRenderQuality(settings_data);
          if (fullscreenQuality) fullscreenQuality.value = fullscreenRenderQuality;

          applySettingsToDCA(this.VM, settings_data);
          this.props.onSetFullscreenRenderQuality(fullscreenRenderQuality);

          this.VM.runtime.left_motor_inverted = settings_data.left_motor_inverted_setting_checked === 1 || settings_data.left_motor_inverted_setting_checked === true;
          this.VM.runtime.right_motor_inverted = settings_data.right_motor_inverted_setting_checked === 1 || settings_data.right_motor_inverted_setting_checked === true;

          applyFirmwareSettingsToRuntime(this.VM, settings_data);
        } catch (error) {
          console.error(error);
          this.deleteSettingsFile();
          this.setDefaultsDCAValues();
          this.props.onSetFullscreenRenderQuality(FULLSCREEN_RENDER_QUALITY_DEFAULT);
          this.VM.runtime.left_motor_inverted = false;
          this.VM.runtime.right_motor_inverted = false;
          applyFirmwareSettingsToRuntime(this.VM, {});
        }
      } else {
        this.setDefaultsDCAValues();
        this.props.onSetFullscreenRenderQuality(FULLSCREEN_RENDER_QUALITY_DEFAULT);
        this.VM.runtime.left_motor_inverted = false;
        this.VM.runtime.right_motor_inverted = false;
        applyFirmwareSettingsToRuntime(this.VM, {});
      }
    });
  }

  render() {
    return (
      <div id="settings-window" className={styles.settings_window}>

        <div id="settings-window-tittle" className={styles.settings_window_tittle}>

          {this.props.intl.formatMessage(messages.settings_window)}
          <div className={styles.close_icon} onClick={this.onThisWindowClose.bind(this)}></div>

        </div>

        <div id="settings-window-content" className={styles.settings_window_content}>

          <div id="settings-window-content-raw-connection-title" className={styles.settings_window_content_raw}>
            <div id="raw-connection-title-settings-window-content-column-1" className={styles.settings_window_content_column}>
              <b>{this.props.intl.formatMessage(messages_for_DCA_intervals.device_connection_section)}</b>
            </div>
          </div>

          {isDesktopWithBluetooth() && (
            <div id="settings-window-content-raw-bt-search" className={styles.settings_window_content_raw}>
              <div id="raw-bt-search-settings-window-content-column-1" className={styles.settings_window_content_column}>
                {this.props.intl.formatMessage(messages_for_DCA_intervals.bluetooth_search_enabled)}
              </div>
              <div id="raw-bt-search-settings-window-content-column-2" className={styles.settings_window_content_column}>
                <input type="checkbox" defaultChecked />
              </div>
            </div>
          )}

          <div id="settings-window-content-raw-2" className={styles.settings_window_content_raw}>
            <div id="raw-connection-1-settings-window-content-column-1" className={styles.settings_window_content_column}>
              {this.props.intl.formatMessage(messages_for_DCA_intervals.no_response_time)}
            </div>
            <div id="raw-connection-1-settings-window-content-column-2" className={styles.settings_window_content_column}>
              <input type="number" />
            </div>
          </div>
          <div id="settings-window-content-raw-2" className={styles.settings_window_content_raw}>
            <div id="raw-connection-2-settings-window-content-column-1" className={styles.settings_window_content_column}>
              {this.props.intl.formatMessage(messages_for_DCA_intervals.no_start_timeout)}
            </div>
            <div id="raw-connection-2-settings-window-content-column-2" className={styles.settings_window_content_column}>
              <input type="number" />
            </div>
          </div>
          <div id="settings-window-content-raw-2" className={styles.settings_window_content_raw}>
            <div id="raw-connection-3-settings-window-content-column-1" className={styles.settings_window_content_column}>
              {this.props.intl.formatMessage(messages_for_DCA_intervals.device_handle_timeout)}
            </div>
            <div id="raw-connection-3-settings-window-content-column-2" className={styles.settings_window_content_column}>
              <input type="number" />
            </div>
          </div>
          <div id="settings-window-content-raw-2" className={styles.settings_window_content_raw}>
            <div id="raw-connection-4-settings-window-content-column-1" className={styles.settings_window_content_column}>
              {this.props.intl.formatMessage(messages_for_DCA_intervals.uno_timeout)}
            </div>
            <div id="raw-connection-4-settings-window-content-column-2" className={styles.settings_window_content_column}>
              <input type="number" />
            </div>
          </div>

          <div id="settings-window-content-raw-fullscreen-quality" className={styles.settings_window_content_raw}>
            <div id="raw-fullscreen-quality-settings-window-content-column-1" className={styles.settings_window_content_column}>
              <b>{this.props.intl.formatMessage(messages.fullscreen_section_title)}</b>
              <div>{this.props.intl.formatMessage(messages.fullscreen_render_quality)}</div>
              <div className={styles.settings_window_hint}>
                {this.props.intl.formatMessage(messages.fullscreen_quality_note)}
              </div>
            </div>
            <div id="raw-fullscreen-quality-settings-window-content-column-2" className={styles.settings_window_content_column}>
              <select defaultValue={FULLSCREEN_RENDER_QUALITY_DEFAULT}>
                <option value="1">{this.props.intl.formatMessage(messages.fullscreen_quality_performance)}</option>
                <option value="2">{this.props.intl.formatMessage(messages.fullscreen_quality_balanced)}</option>
                <option value="3">{this.props.intl.formatMessage(messages.fullscreen_quality_quality)}</option>
              </select>
            </div>
          </div>

          <div id="settings-window-content-raw-3" className={styles.settings_window_content_raw}>

            <div id="raw-13-settings-window-content-column-1" className={styles.settings_window_content_column}>
              <button onClick={this.saveSettings.bind(this)}> {this.props.intl.formatMessage(messages.save_settings)} </button>
            </div>
            <div id="raw-13-settings-window-content-column-2" className={styles.settings_window_content_column}></div>

          </div>
        </div>
      </div>
    )
  };
}

const mapStateToProps = state => ({});

const mapDispatchToProps = dispatch => ({
  onSettingsWindowClose: () => {
    dispatch(ActionTriggerDraggableWindow(4));
  },
  onSetFullscreenRenderQuality: (fullscreenRenderQuality) => {
    dispatch(setFullscreenRenderQuality(fullscreenRenderQuality));
  }
});

export default injectIntl(connect(
  mapStateToProps,
  mapDispatchToProps
)(SettingsWindowComponent));
