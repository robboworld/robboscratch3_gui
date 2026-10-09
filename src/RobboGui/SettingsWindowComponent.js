import classNames from 'classnames';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withAlert } from 'react-alert';

import { defineMessages, intlShape, injectIntl, FormattedMessage } from 'react-intl';

import sharedStyles from './DevicePaletteShared.css';
import formStyles from './RobboPaletteForm.css';
import styles from './SettingsWindowComponent.css';
import { ActionTriggerDraggableWindow } from './actions/sensor_actions';
import { isDesktopWithBluetooth } from '../lib/platform';
import {
  getSettingsFromStorage,
  applySettingsToDCA,
  applyFirmwareSettingsToRuntime,
  FULLSCREEN_RENDER_QUALITY_DEFAULT,
  getFullscreenRenderQualityStorageData,
  normalizeFullscreenRenderQuality,
  SIMULATION_STEP_MS_DEFAULT,
  getSimulationStepMsStorageData,
  normalizeSimulationStepMs,
  applySimulationStepMsToRuntime
} from '../lib/settingsLoader';
import { setFullscreenRenderQuality, setSimSensorDebugOverlayEnabled } from './reducers/settings';
import RobboSelect, { syncRobboSelectFromNative } from './RobboSelect';
import {robboConfirm} from './RobboConfirmDialog';
import {closeMessage} from './sensor-type-messages';
import {
  showTransientButtonFeedback,
  clearTransientButtonFeedbackTimer,
  isTransientButtonFeedbackActive,
  renderTransientActionLabel
} from '../lib/transient-button-feedback';

const SAVE_FEEDBACK_TOKEN = 'saved';
const SAVE_BUTTON_FEEDBACK_KEY = 'saveButtonFeedback';

const messages = defineMessages({
  settings_window: {
    id: 'gui.RobboGui.settings_window',
    description: ' ',
    defaultMessage: 'Device settings'
  },
  uno_search_timeout: {
    id: 'gui.RobboGui.uno_search_timeout',
    description: ' ',
    defaultMessage: 'Robbo search timeout'
  },
  save_settings: {
    id: 'gui.RobboGui.save_settings',
    description: ' ',
    defaultMessage: 'Save'
  },
  settings_saved: {
    id: 'gui.RobboGui.settings_saved',
    description: 'Settings save button success label',
    defaultMessage: 'Saved'
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
  vm_section_title: {
    id: 'gui.RobboGui.settings_window.vm_section_title',
    description: ' ',
    defaultMessage: 'VM'
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
  sim_sensor_debug_overlay: {
    id: 'gui.RobboGui.settings_window.sim_sensor_debug_overlay',
    description: ' ',
    defaultMessage: 'Show simulator sensor debug overlay'
  },
  simulation_step_ms: {
    id: 'gui.RobboGui.settings_window.simulation_step_ms',
    description: ' ',
    defaultMessage: 'Simulation step (ms)'
  },
  simulation_step_ms_hint: {
    id: 'gui.RobboGui.settings_window.simulation_step_ms_hint',
    description: ' ',
    defaultMessage: 'Lower values run faster but increase CPU load.'
  },
  devices_section_title: {
    id: 'gui.RobboGui.settings_window.devices_section_title',
    description: 'Settings window: section with the device search options',
    defaultMessage: 'Devices'
  },
  display_section_title: {
    id: 'gui.RobboGui.settings_window.display_section_title',
    description: 'Settings window: section with the stage rendering options',
    defaultMessage: 'Stage'
  },
  advanced_section_title: {
    id: 'gui.RobboGui.settings_window.advanced_section_title',
    description: 'Settings window: collapsed section with technical options',
    defaultMessage: 'Advanced'
  },
  advanced_section_hint: {
    id: 'gui.RobboGui.settings_window.advanced_section_hint',
    description: 'Settings window: why the technical options are hidden',
    defaultMessage: 'Change these only if devices are not found or the simulator is slow.'
  },
  reset_defaults: {
    id: 'gui.RobboGui.settings_window.reset_defaults',
    description: 'Settings window: restore default values',
    defaultMessage: 'Reset'
  },
  reset_defaults_confirm: {
    id: 'gui.RobboGui.settings_window.reset_defaults_confirm',
    description: 'Question before restoring the default settings',
    defaultMessage: 'Restore the default device and simulator settings?'
  },
  reset_defaults_yes: {
    id: 'gui.RobboGui.settings_window.reset_defaults_yes',
    description: 'Confirm button of the reset question',
    defaultMessage: 'Reset'
  },
  reset_defaults_cancel: {
    id: 'gui.RobboGui.settings_window.reset_defaults_cancel',
    description: 'Cancel button of the reset question',
    defaultMessage: 'Cancel'
  },
  unsaved_changes: {
    id: 'gui.RobboGui.settings_window.unsaved_changes',
    description: 'Settings window: there are changes that are not saved yet',
    defaultMessage: 'Not saved'
  },
  number_range_error: {
    id: 'gui.RobboGui.settings_window.number_range_error',
    description: 'Settings window: the number is outside the allowed range',
    defaultMessage: 'Enter a whole number from {min} to {max}'
  },
  experimental_section_title: {
    id: 'gui.RobboGui.settings_window.experimental_section_title',
    description: ' ',
    defaultMessage: 'Experimental settings'
  }
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
    defaultMessage: 'Device response timeout (ms)'
  },
  no_start_timeout: {
    id: 'gui.dca.no_start_timeout',
    description: ' ',
    defaultMessage: 'First telemetry packet timeout (ms)'
  },
  device_handle_timeout: {
    id: 'gui.dca.device_handle_timeout',
    description: ' ',
    defaultMessage: 'Full search cycle (ms)'
  },
  uno_timeout: {
    id: 'gui.dca.uno_timeout',
    description: ' ',
    defaultMessage: 'Switch to Scratchduino search after (ms)'
  },
  bluetooth_search_enabled: {
    id: 'gui.dca.bluetooth_search_enabled',
    description: ' ',
    defaultMessage: 'Bluetooth search'
  },
});

class SettingsWindowComponent extends Component {
  constructor (props) {
    super(props);
    this.state = {
      [SAVE_BUTTON_FEEDBACK_KEY]: null,
      errors: {},
      dirty: false,
      advancedOpen: false,
      maxes: null
    };
    this.onThisWindowClose = this.onThisWindowClose.bind(this);
    this.saveSettings = this.saveSettings.bind(this);
    this.handleFormChange = this.handleFormChange.bind(this);
    this.handleResetDefaults = this.handleResetDefaults.bind(this);
    this.handleAdvancedToggle = this.handleAdvancedToggle.bind(this);
  }

  componentWillUnmount () {
    clearTransientButtonFeedbackTimer(this, SAVE_BUTTON_FEEDBACK_KEY);
  }

  onThisWindowClose () {
    this.props.onSettingsWindowClose(4);
  }

  handleFormChange () {
    if (!this.state.dirty) this.setState({dirty: true});
  }

  /** Controlled <details>: the state also opens it when a field there has an error. */
  handleAdvancedToggle (event) {
    event.preventDefault();
    this.setState(state => ({advancedOpen: !state.advancedOpen}));
  }

  handleResetDefaults () {
    const {intl} = this.props;
    robboConfirm({
      message: intl.formatMessage(messages.reset_defaults_confirm),
      confirmLabel: intl.formatMessage(messages.reset_defaults_yes),
      cancelLabel: intl.formatMessage(messages.reset_defaults_cancel)
    }).then(confirmed => {
      if (!confirmed) return;
      this.setDefaultsDCAValues();
      this.saveSettings();
    });
  }

  /**
   * Connection timeouts typed by the teacher: a wrong value is shown at its field instead of
   * being silently replaced by the default.
   * @returns {{values: object, errors: object}} parsed values and error texts by input id
   */
  validateConnectionInputs () {
    const max = this.DCA_maxes;
    const {intl} = this.props;
    const errors = {};
    const read = (id, maxValue) => {
      const el = this.getInput(id);
      const raw = el ? String(el.value).trim() : '';
      const value = Number(raw);
      if (!raw || !Number.isInteger(value) || value < 1 || value > maxValue) {
        errors[id] = intl.formatMessage(messages.number_range_error, {min: 1, max: maxValue});
      }
      return value;
    };
    const noResponse = read('raw-connection-1-settings-window-content-column-2', max.NO_RESPONSE_TIME_MAX);
    const noStart = read('raw-connection-2-settings-window-content-column-2', max.NO_START_TIMEOUT_MAX);
    const handle = read('raw-connection-3-settings-window-content-column-2', max.DEVICE_HANDLE_TIMEOUT_MAX);
    // The Scratchduino switch happens inside the search cycle.
    const uno = read('raw-connection-4-settings-window-content-column-2',
      errors['raw-connection-3-settings-window-content-column-2'] ? max.DEVICE_HANDLE_TIMEOUT_MAX : handle);
    const step = read('raw-simulation-step-ms-settings-window-content-column-2', 10);
    return {values: {noResponse, noStart, handle, uno, step}, errors};
  }

  readSettings() {
    console.warn(`readSettings`);
    return getSettingsFromStorage();
  }

  getInput(id) {
    const component = document.getElementById(id);
    if (!component) {
      return null;
    }
    const select = component.querySelector('select');
    if (select) {
      return select;
    }
    return component.children && component.children[0] ? component.children[0] : null;
  }

  saveDCASettings(values) {
    return {
      device_response_timeout: values.noResponse,
      device_no_start_timeout: values.noStart,
      device_handle_timeout: values.handle,
      device_uno_start_search_timeout: values.uno,
      device_response_timeout_bluetooth: values.noResponse,
      device_no_start_timeout_bluetooth: values.noStart,
      device_handle_timeout_bluetooth: values.handle,
      device_uno_start_search_timeout_bluetooth: values.uno
    };
  }

  saveSettings() {
    const {values, errors} = this.validateConnectionInputs();
    if (Object.keys(errors).length) {
      // Errors are in the advanced section: open it so they are visible.
      this.setState({errors, advancedOpen: true});
      return;
    }
    const fullscreenRenderQualityInput = this.getInput("raw-fullscreen-quality-settings-window-content-column-2");
    const simulationStepMsInput = this.getInput("raw-simulation-step-ms-settings-window-content-column-2");
    const simSensorDebugOverlayInput = this.getInput("raw-sim-sensor-debug-overlay-settings-window-content-column-2");
    const settings_data = {
      ...this.saveDCASettings(values),
      ...getFullscreenRenderQualityStorageData({
        fullscreen_render_quality: fullscreenRenderQualityInput ? fullscreenRenderQualityInput.value : undefined
      }),
      ...getSimulationStepMsStorageData({
        simulation_step_ms: simulationStepMsInput ? simulationStepMsInput.value : undefined
      }),
      sim_sensor_debug_overlay_enabled: simSensorDebugOverlayInput ? simSensorDebugOverlayInput.checked === true : false
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
    applySimulationStepMsToRuntime(this.VM, settings_data);
    this.props.onSetFullscreenRenderQuality(settings_data.fullscreen_render_quality);
    this.props.onSetSimSensorDebugOverlayEnabled(settings_data.sim_sensor_debug_overlay_enabled);

    this.deleteSettingsFile(() => {
      this.saveSettingsData(settings_data_serialized);
    });

    this.setState({errors: {}, dirty: false});
    showTransientButtonFeedback(this, {
      stateKey: SAVE_BUTTON_FEEDBACK_KEY,
      feedbackToken: SAVE_FEEDBACK_TOKEN
    });
  }

  saveSettingsData(settings_data) {
    console.warn("saveSettings" + " data: " + settings_data);

    function errorHandler(e) {
      console.error("Error during saving settings: " + e);
    };

    function onInitFs(fs) {
      fs.root.getFile("settings" + "." + "json", { create: true }, function (fileEntry) {
        fileEntry.createWriter(function (fileWriter) {
          fileWriter.onwriteend = function (e) {
          }
          fileWriter.onerror = function (e) {
            console.error('Settings writing failed: ' + e.toString());
          };
          var bb = new Blob([settings_data]);
          fileWriter.write(bb);
        });
      }, errorHandler);
    };

    navigator.webkitPersistentStorage.requestQuota(500 * 1024 * 1024, //500Мб
      function (grantedBytes) {
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
      syncRobboSelectFromNative(fullscreenQualityInput);
    }
    const simSensorOverlay = this.getInput("raw-sim-sensor-debug-overlay-settings-window-content-column-2");
    if (simSensorOverlay) {
      simSensorOverlay.checked = false;
    }
    const simulationStepMsInput = this.getInput("raw-simulation-step-ms-settings-window-content-column-2");
    if (simulationStepMsInput) {
      simulationStepMsInput.value = SIMULATION_STEP_MS_DEFAULT;
    }

  }


  componentDidMount() {
    this.VM = this.props.VM;
    this.DCA_defaults = this.VM.DCA.getDefaultValuesOfIntervals();
    this.DCA_maxes = this.VM.DCA.getMaxValuesOfIntervals();
    this.DCA_defaults_bluetooth = this.VM.DCA.getDefaultValuesOfIntervalsBluetooth();
    this.DCA_maxes_bluetooth = this.VM.DCA.getMaxValuesOfIntervalsBluetooth();
    this.setState({maxes: this.DCA_maxes});

    this.readSettings().then((result) => {
      const child0 = (id) => this.getInput(id);

      const c1 = child0("raw-connection-1-settings-window-content-column-2");
      const c2 = child0("raw-connection-2-settings-window-content-column-2");
      const c3 = child0("raw-connection-3-settings-window-content-column-2");
      const c4 = child0("raw-connection-4-settings-window-content-column-2");
      const fullscreenQuality = child0("raw-fullscreen-quality-settings-window-content-column-2");
      const simulationStepMs = child0("raw-simulation-step-ms-settings-window-content-column-2");
      const simSensorOverlay = child0("raw-sim-sensor-debug-overlay-settings-window-content-column-2");

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
          if (fullscreenQuality) {
            fullscreenQuality.value = fullscreenRenderQuality;
            syncRobboSelectFromNative(fullscreenQuality);
          }
          const simulationStepMsValue = normalizeSimulationStepMs(settings_data);
          if (simulationStepMs) simulationStepMs.value = simulationStepMsValue;
          const simSensorDebugOverlayEnabled = settings_data.sim_sensor_debug_overlay_enabled === true;
          if (simSensorOverlay) simSensorOverlay.checked = simSensorDebugOverlayEnabled;

          applySettingsToDCA(this.VM, settings_data);
          this.props.onSetFullscreenRenderQuality(fullscreenRenderQuality);
          this.props.onSetSimSensorDebugOverlayEnabled(simSensorDebugOverlayEnabled);

          this.VM.runtime.left_motor_inverted = settings_data.left_motor_inverted_setting_checked === 1 || settings_data.left_motor_inverted_setting_checked === true;
          this.VM.runtime.right_motor_inverted = settings_data.right_motor_inverted_setting_checked === 1 || settings_data.right_motor_inverted_setting_checked === true;

          applyFirmwareSettingsToRuntime(this.VM, settings_data);
          applySimulationStepMsToRuntime(this.VM, settings_data);
        } catch (error) {
          console.error(error);
          this.deleteSettingsFile();
          this.setDefaultsDCAValues();
          this.props.onSetFullscreenRenderQuality(FULLSCREEN_RENDER_QUALITY_DEFAULT);
          this.props.onSetSimSensorDebugOverlayEnabled(false);
          this.VM.runtime.left_motor_inverted = false;
          this.VM.runtime.right_motor_inverted = false;
          applyFirmwareSettingsToRuntime(this.VM, {});
          applySimulationStepMsToRuntime(this.VM, {});
        }
      } else {
        this.setDefaultsDCAValues();
        this.props.onSetFullscreenRenderQuality(FULLSCREEN_RENDER_QUALITY_DEFAULT);
        this.props.onSetSimSensorDebugOverlayEnabled(false);
        this.VM.runtime.left_motor_inverted = false;
        this.VM.runtime.right_motor_inverted = false;
        applyFirmwareSettingsToRuntime(this.VM, {});
        applySimulationStepMsToRuntime(this.VM, {});
      }
    });
  }

  render () {
    const { intl } = this.props;
    const saveFeedbackActive = isTransientButtonFeedbackActive(
      this.state,
      SAVE_BUTTON_FEEDBACK_KEY,
      SAVE_FEEDBACK_TOKEN
    );

    const maxes = this.state.maxes;

    return (
      <div id="settings-window" className={classNames(sharedStyles.palette, styles.settings_window)}>

        <div id="settings-window-tittle" className={sharedStyles.header}>
          <span className={sharedStyles.headerTitle}>
            {intl.formatMessage(messages.settings_window)}
          </span>
          <button
            type="button"
            className={sharedStyles.closeButton}
            aria-label={intl.formatMessage(closeMessage)}
            onClick={this.onThisWindowClose}
          />
        </div>

        <div
          id="settings-window-content"
          className={classNames(sharedStyles.body, formStyles.palette_content, styles.settings_content)}
          onChange={this.handleFormChange}
        >

          <div
            id="settings-window-content-raw-connection-title"
            className={classNames(formStyles.section, styles.settings_section)}
            role="group"
            aria-labelledby="raw-connection-title-settings-window-content-column-1"
          >
            <h3
              id="raw-connection-title-settings-window-content-column-1"
              className={formStyles.section_title}
            >
              {intl.formatMessage(messages.devices_section_title)}
            </h3>

            {isDesktopWithBluetooth() && this.renderField('raw-bt-search', messages_for_DCA_intervals.bluetooth_search_enabled,
              <input id="settings-input-raw-bt-search" type="checkbox" defaultChecked />, {checkbox: true})}
          </div>

          <div
            id="settings-window-content-raw-vm-section-title"
            className={classNames(formStyles.section, styles.settings_section)}
            role="group"
            aria-labelledby="raw-vm-section-title-settings-window-content-column-1"
          >
            <h3
              id="raw-vm-section-title-settings-window-content-column-1"
              className={formStyles.section_title}
            >
              {intl.formatMessage(messages.display_section_title)}
            </h3>

            {this.renderField('raw-fullscreen-quality', messages.fullscreen_render_quality, (
              <RobboSelect
                defaultValue={FULLSCREEN_RENDER_QUALITY_DEFAULT}
                triggerAriaLabel={intl.formatMessage(messages.fullscreen_render_quality)}
                options={[
                  {value: '1', label: intl.formatMessage(messages.fullscreen_quality_performance)},
                  {value: '2', label: intl.formatMessage(messages.fullscreen_quality_balanced)},
                  {value: '3', label: intl.formatMessage(messages.fullscreen_quality_quality)}
                ]}
              />
            ), {hint: messages.fullscreen_quality_note, noLabelFor: true})}
          </div>

          <details
            className={classNames(formStyles.section, styles.settings_section, styles.advanced)}
            open={this.state.advancedOpen}
          >
            <summary
              className={classNames(formStyles.section_title, styles.advanced_summary)}
              onClick={this.handleAdvancedToggle}
            >
              {intl.formatMessage(messages.advanced_section_title)}
            </summary>
            <div className={formStyles.field_hint}>{intl.formatMessage(messages.advanced_section_hint)}</div>

            {this.renderNumberField('raw-connection-1', messages_for_DCA_intervals.no_response_time,
              maxes && maxes.NO_RESPONSE_TIME_MAX)}
            {this.renderNumberField('raw-connection-2', messages_for_DCA_intervals.no_start_timeout,
              maxes && maxes.NO_START_TIMEOUT_MAX)}
            {this.renderNumberField('raw-connection-3', messages_for_DCA_intervals.device_handle_timeout,
              maxes && maxes.DEVICE_HANDLE_TIMEOUT_MAX)}
            {this.renderNumberField('raw-connection-4', messages_for_DCA_intervals.uno_timeout,
              maxes && maxes.DEVICE_HANDLE_TIMEOUT_MAX)}
            {this.renderNumberField('raw-simulation-step-ms', messages.simulation_step_ms, 10,
              {hint: messages.simulation_step_ms_hint, defaultValue: SIMULATION_STEP_MS_DEFAULT})}
            {this.renderField('raw-sim-sensor-debug-overlay', messages.sim_sensor_debug_overlay,
              <input id="settings-input-raw-sim-sensor-debug-overlay" type="checkbox" defaultChecked={false} />,
              {checkbox: true})}
          </details>
        </div>

        <div
          id="settings-window-content-raw-3"
          className={classNames(formStyles.footer, styles.settings_footer, styles.settings_footer_outside)}
        >
          <div id="raw-13-settings-window-content-column-1" className={classNames(formStyles.footer_actions, styles.footer_row)}>
            <button
              type="button"
              className={classNames(formStyles.action_button, styles.reset_button)}
              onClick={this.handleResetDefaults}
            >
              {intl.formatMessage(messages.reset_defaults)}
            </button>
            {this.state.dirty ? (
              <span className={styles.unsaved} role="status">{intl.formatMessage(messages.unsaved_changes)}</span>
            ) : null}
            <button
              type="button"
              className={classNames(formStyles.action_button, styles.save_button, {
                [styles.save_button_dirty]: this.state.dirty
              })}
              onClick={this.saveSettings}
            >
              {renderTransientActionLabel({
                feedbackActive: saveFeedbackActive,
                defaultMessage: messages.save_settings,
                successMessage: messages.settings_saved,
                intl,
                labelClassName: formStyles.action_button_label
              })}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /**
   * One settings row; the label is a real <label>, so clicking the text toggles a checkbox.
   * @param {string} key row key: ids "<key>-settings-window-content-column-1/2", input "settings-input-<key>"
   * @param {object} labelMessage react-intl message
   * @param {React.Element} control input
   * @param {object} [options] checkbox, hint (message), noLabelFor (custom control)
   * @returns {React.Element} row
   */
  renderField (key, labelMessage, control, options = {}) {
    const {intl} = this.props;
    const controlId = `${key}-settings-window-content-column-2`;
    const error = this.state.errors[controlId];
    const LabelTag = options.noLabelFor ? 'div' : 'label';
    const labelProps = options.noLabelFor ? {} : {htmlFor: `settings-input-${key}`};
    return (
      <div
        id={`settings-window-content-${key}`}
        className={classNames(formStyles.field_row, formStyles.field_row_ratio_70_30,
          {[formStyles.checkbox_row]: options.checkbox})}
      >
        <LabelTag
          id={`${key}-settings-window-content-column-1`}
          className={formStyles.field_label}
          {...labelProps}
        >
          <div>{intl.formatMessage(labelMessage)}</div>
          {options.hint ? <div className={formStyles.field_hint}>{intl.formatMessage(options.hint)}</div> : null}
          {error ? <div className={styles.field_error} role="alert">{error}</div> : null}
        </LabelTag>
        <div
          id={controlId}
          className={classNames(formStyles.field_control, {[styles.field_control_error]: error})}
        >
          {control}
        </div>
      </div>
    );
  }

  renderNumberField (key, labelMessage, maxValue, options = {}) {
    return this.renderField(key, labelMessage, (
      <input
        id={`settings-input-${key}`}
        type="number"
        min="1"
        max={maxValue || null}
        step="1"
        inputMode="numeric"
        defaultValue={options.defaultValue}
        aria-invalid={Boolean(this.state.errors[`${key}-settings-window-content-column-2`])}
      />
    ), options);
  }
}

const mapStateToProps = state => ({});

const mapDispatchToProps = dispatch => ({
  onSettingsWindowClose: () => {
    dispatch(ActionTriggerDraggableWindow(4));
  },
  onSetFullscreenRenderQuality: (fullscreenRenderQuality) => {
    dispatch(setFullscreenRenderQuality(fullscreenRenderQuality));
  },
  onSetSimSensorDebugOverlayEnabled: (enabled) => {
    dispatch(setSimSensorDebugOverlayEnabled(enabled));
  }
});

export default injectIntl(connect(
  mapStateToProps,
  mapDispatchToProps
)(SettingsWindowComponent));
