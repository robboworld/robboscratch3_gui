import React, { Component } from 'react';
import { connect } from 'react-redux';

import {
  defineMessages,
  injectIntl
} from 'react-intl';

import classNames from 'classnames';
import sharedStyles from './DevicePaletteShared.css';
import formStyles from './RobboPaletteForm.css';
import styles from './AboutWindowComponent.css';
import {
  ActionTriggerNewDraggableWindow,
  ActionCreateNewDraggableWindow
} from './actions/sensor_actions';
import {
  node_process,
  node_os,
  getSystemInfoAsync,
  formatArchitectureDisplay,
  openExternalUrl
} from '../lib/platform';
import {
  showTransientButtonFeedback,
  clearTransientButtonFeedbackTimer,
  isTransientButtonFeedbackActive,
  renderTransientActionLabel
} from '../lib/transient-button-feedback';
import {hasPremiumAutoUpdateCapability} from '../lib/licensing/capabilityGateway';
import {
  premiumAutoUpdateCheckThunk,
  premiumStartUpdateThunk
} from './actions/licenseActions';

const COPY_FEEDBACK_TOKEN = 'copied';
const COPY_BUTTON_FEEDBACK_KEY = 'copyButtonFeedback';
const SUPPORT_URL = 'https://support.robbo.world/';

const VERSION = 'Robbo Scratch v.3.126.4';
export {VERSION};
export const APP_VERSION = (VERSION.match(/v\.(.+)$/) || [])[1] || '';
const BUILD_VERSION_SUFFIX = (typeof process !== 'undefined' &&
  process &&
  process.env &&
  typeof process.env.ROBBO_BUILD_VERSION_SUFFIX === 'string')
  ? process.env.ROBBO_BUILD_VERSION_SUFFIX
  : '';
const DISPLAY_VERSION = `${VERSION}${BUILD_VERSION_SUFFIX}`;

const EMPTY_PROFILING_METRICS = {
  stepDuration: '',
  recieveDelta: '',
  averageDelay: ''
};

const formatProfilingMetric = value => {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : '';
};

const messages = defineMessages({
  about_window: {
    id: 'gui.RobboGui.about_window',
    description: ' ',
    defaultMessage: 'About'
  },
  start_profiling: {
    id: 'gui.RobboGui.start_profiling',
    description: ' ',
    defaultMessage: 'Enable performance measurement'
  },
  stop_profiling: {
    id: 'gui.RobboGui.stop_profiling',
    description: ' ',
    defaultMessage: 'Disable performance measurement'
  },
  step_duration: {
    id: 'gui.RobboGui.step_duration',
    description: ' ',
    defaultMessage:
      'Full block chain execution time (ms): '
  },
  recieve_delta: {
    id: 'gui.RobboGui.recieve_delta',
    description: ' ',
    defaultMessage:
      'Delay between receiving full telemetry packet (ms): '
  },
  average_step_delay_time: {
    id: 'gui.RobboGui.average_step_delay_time',
    description: ' ',
    defaultMessage:
      'Average delay between block chain execution iterations (ms): '
  },
  os_name_and_version: {
    id: 'gui.RobboGui.os_name_and_version',
    description: ' ',
    defaultMessage: 'Operating system: '
  },
  arch: {
    id: 'gui.RobboGui.arch',
    description: ' ',
    defaultMessage: 'Architecture: '
  },
  cpu: {
    id: 'gui.RobboGui.cpu',
    description: ' ',
    defaultMessage: 'Processor: '
  },
  platform: {
    id: 'gui.RobboGui.platform',
    description: ' ',
    defaultMessage: 'Platform: '
  },
  browser: {
    id: 'gui.RobboGui.browser',
    description: ' ',
    defaultMessage: 'Browser: '
  },
  logical_cores: {
    id: 'gui.RobboGui.logical_cores',
    description: ' ',
    defaultMessage: 'Logical cores: '
  },
  not_available_in_browser: {
    id: 'gui.RobboGui.not_available_in_browser',
    description: ' ',
    defaultMessage: 'Not available in browser'
  },
  copy_to_clipboard: {
    id: 'gui.RobboGui.copy_to_clipboard',
    description: ' ',
    defaultMessage: 'Copy to clipboard'
  },
  copy_system_info: {
    id: 'gui.RobboGui.copy_system_info',
    description: ' ',
    defaultMessage: 'Copy system information'
  },
  copied_to_clipboard: {
    id: 'gui.RobboGui.copied_to_clipboard',
    description: 'About window copy button success label',
    defaultMessage: 'Copied'
  },
  profiling_section: {
    id: 'gui.RobboGui.profiling_section',
    description: 'About window profiling block title',
    defaultMessage: 'Performance measurement'
  },
  system_section: {
    id: 'gui.RobboGui.about_system_section',
    description: 'About window system info block title',
    defaultMessage: 'System information'
  },
  check_for_updates: {
    id: 'gui.RobboGui.check_for_updates',
    description: 'About window check for updates tooltip',
    defaultMessage: 'Check for updates'
  },
  update_available: {
    id: 'gui.RobboGui.update_available',
    description: 'About window update available button',
    defaultMessage: 'Update to v{version}'
  },
  update_uptodate: {
    id: 'gui.RobboGui.update_uptodate',
    description: 'About window up to date tooltip',
    defaultMessage: 'Up to date'
  },
  update_checking: {
    id: 'gui.RobboGui.update_checking',
    description: 'About window checking for updates',
    defaultMessage: 'Checking for updates…'
  },
  update_error: {
    id: 'gui.RobboGui.update_error',
    description: 'About window update check failed',
    defaultMessage: 'Update check failed'
  },
  update_preparing: {
    id: 'gui.RobboGui.update_preparing',
    description: 'About window preparing updates',
    defaultMessage: 'Preparing updates…'
  },
  waiting_addon_tooltip: {
    id: 'gui.RobboMenu.premium_waiting_addon_tooltip',
    description: 'Tooltip while paid addon is loading',
    defaultMessage: 'Paid addon is still loading from the activation server…'
  },
  premium_error_license_inactive: {
    id: 'gui.licenseWindow.premium_error_license_inactive',
    defaultMessage: 'Activate a valid license first.'
  },
  premium_error_device_mismatch: {
    id: 'gui.licenseWindow.premium_error_device_mismatch',
    defaultMessage: 'License is bound to another device.'
  },
  premium_error_capability_denied: {
    id: 'gui.licenseWindow.premium_error_capability_denied',
    defaultMessage: 'License does not include premium auto-update.'
  },
  premium_error_addon_not_loaded: {
    id: 'gui.licenseWindow.premium_error_addon_not_loaded',
    defaultMessage: 'Paid addon is not loaded yet.'
  },
  premium_update_desktop_only: {
    id: 'gui.RobboMenu.premium_update_desktop_only',
    defaultMessage: 'Premium auto-update is available only in the Desktop app.'
  },
  help: {
    id: 'gui.RobboGui.help',
    description: 'About window help button',
    defaultMessage: 'Help'
  }
});

const UPDATE_ERROR_MESSAGES = {
  LICENSE_INACTIVE: messages.premium_error_license_inactive,
  DEVICE_BINDING_MISMATCH: messages.premium_error_device_mismatch,
  CAPABILITY_DENIED: messages.premium_error_capability_denied,
  ADDON_NOT_LOADED: messages.premium_error_addon_not_loaded,
  DESKTOP_ONLY: messages.premium_update_desktop_only
};

class AboutWindowComponent extends Component {
  constructor (props) {
    super(props);
    this.state = {
      systemInfo: null,
      profilingEnabled: false,
      profilingMetrics: { ...EMPTY_PROFILING_METRICS },
      [COPY_BUTTON_FEEDBACK_KEY]: null
    };
    this.onThisWindowClose = this.onThisWindowClose.bind(this);
    this.toggleProfiling = this.toggleProfiling.bind(this);
    this.onCheckForUpdatesClick = this.onCheckForUpdatesClick.bind(this);
    this.onStartUpdateClick = this.onStartUpdateClick.bind(this);
    this.onHelpClick = this.onHelpClick.bind(this);
  }

  onThisWindowClose () {
    console.log('aboutWindow close');
    this.props.onAboutWindowClose('about-window');
  }

  onCheckForUpdatesClick () {
    if (this.props.license && hasPremiumAutoUpdateCapability(this.props.license)) {
      this.props.onCheckForUpdates();
    }
  }

  onStartUpdateClick () {
    if (this.props.license && hasPremiumAutoUpdateCapability(this.props.license)) {
      this.props.onStartUpdate();
    }
  }

  onHelpClick () {
    openExternalUrl(SUPPORT_URL);
  }

  resolveCheckErrorText (check) {
    const intl = this.props.intl;
    const code = check.errorCode || '';
    if (UPDATE_ERROR_MESSAGES[code]) {
      return intl.formatMessage(UPDATE_ERROR_MESSAGES[code]);
    }
    return check.errorMessage || code || intl.formatMessage(messages.update_error);
  }

  renderUpdateIndicator () {
    const license = this.props.license;
    const intl = this.props.intl;
    if (!license || !hasPremiumAutoUpdateCapability(license)) {
      return null;
    }

    if (!license.addonReady) {
      return (
        <div
          className={styles.about_update_indicator}
          title={intl.formatMessage(messages.update_preparing)}
        >
          <span
            className={styles.about_update_spinner}
            aria-hidden="true"
          />
          <span className={styles.about_update_status_text}>
            {intl.formatMessage(messages.update_preparing)}
          </span>
        </div>
      );
    }

    const check = license.check || {};
    const status = check.status || 'unknown';

    if (status === 'checking') {
      return (
        <div
          className={styles.about_update_indicator}
          title={intl.formatMessage(messages.update_checking)}
        >
          <span
            className={styles.about_update_spinner}
            aria-hidden="true"
          />
          <span className={styles.about_update_status_text}>
            {intl.formatMessage(messages.update_checking)}
          </span>
        </div>
      );
    }

    if (status === 'uptodate') {
      return (
        <button
          type="button"
          id="about-window-update-uptodate"
          className={classNames(styles.about_update_indicator, styles.about_update_icon_button)}
          title={intl.formatMessage(messages.update_uptodate)}
          aria-label={intl.formatMessage(messages.update_uptodate)}
          onClick={this.onCheckForUpdatesClick}
        >
          <span
            className={classNames(styles.about_update_icon, styles.about_update_icon_success)}
            aria-hidden="true"
          />
        </button>
      );
    }

    if (status === 'available') {
      return (
        <button
          type="button"
          id="about-window-update-available"
          className={classNames(
            formStyles.action_button,
            styles.about_update_button
          )}
          onClick={this.onStartUpdateClick}
        >
          {intl.formatMessage(messages.update_available, {
            version: check.latestVersion || ''
          })}
        </button>
      );
    }

    if (status === 'error') {
      const errorText = this.resolveCheckErrorText(check);
      return (
        <button
          type="button"
          id="about-window-update-error"
          className={classNames(styles.about_update_indicator, styles.about_update_icon_button)}
          title={errorText}
          aria-label={errorText}
          onClick={this.onCheckForUpdatesClick}
        >
          <span
            className={classNames(styles.about_update_icon, styles.about_update_icon_error)}
            aria-hidden="true"
          />
        </button>
      );
    }

    return (
      <button
        type="button"
        id="about-window-update-unknown"
        className={classNames(styles.about_update_indicator, styles.about_update_icon_button)}
        title={intl.formatMessage(messages.check_for_updates)}
        aria-label={intl.formatMessage(messages.check_for_updates)}
        onClick={this.onCheckForUpdatesClick}
      >
        <span
          className={classNames(styles.about_update_icon, styles.about_update_icon_refresh)}
          aria-hidden="true"
        />
      </button>
    );
  }

  componentDidMount() {
    this.VM = this.props.VM;
    this.RCA = this.props.RCA;
    this.DCA = this.props.DCA;

    this.avTimeInterval = null;
    this.averageTime = 0;

    getSystemInfoAsync().then(systemInfo => {
      this.setState({ systemInfo });
    });
  }

  componentWillUnmount () {
    clearTransientButtonFeedbackTimer(this, COPY_BUTTON_FEEDBACK_KEY);
    if (this.state.profilingEnabled) {
      this.stopProfiling({ updateState: false });
    }
  }

  clearProfilingMetrics () {
    this.setState({ profilingMetrics: { ...EMPTY_PROFILING_METRICS } });
  }

  toggleProfiling () {
    if (this.state.profilingEnabled) {
      this.stopProfiling();
    } else {
      this.startProfiling();
    }
  }

  startProfiling () {
    if (this.state.profilingEnabled) {
      return;
    }

    console.warn('start profiling');

    this.setState({
      profilingEnabled: true,
      profilingMetrics: { ...EMPTY_PROFILING_METRICS }
    }, () => {
      this.attachProfilingListeners();
    });
  }

  attachProfilingListeners () {
    let time_counter = 0;

    let self_time_summ = 0;
    let total_time_summ = 0;

    let recieve_time_delta = 0;
    let recieve_time_delta_sum = 0;

    const performanceApi =
      typeof window === 'object' && window.performance;

    let time_1 = performanceApi ? performanceApi.now() : 0;
    let time_2 = time_1;
    let counter = 0;
    let time_delta = 0;
    let time_delta_sum = 0;

    this.avTimeInterval = setInterval(() => {
      if (!performanceApi) {
        return;
      }

      time_2 = performanceApi.now();
      time_delta = time_2 - time_1;
      time_1 = performanceApi.now();

      time_delta_sum += time_delta;
      counter++;

      if (counter >= 300) {
        this.averageTime = time_delta_sum / counter;
        counter = 0;
        time_delta_sum = 0;

        this.setState(prevState => ({
          profilingMetrics: {
            ...prevState.profilingMetrics,
            averageDelay: formatProfilingMetric(this.averageTime)
          }
        }));
      }
    }, 0);

    this.VM.runtime.enableProfiling(frame => {
      const frame_id = this.VM.runtime.profiler.nameById(
        frame.id
      );

      if (frame_id === 'Runtime._step') {
        time_counter++;

        self_time_summ += frame.selfTime;
        total_time_summ += frame.totalTime;

        recieve_time_delta = this.DCA.getRecieveTimeDelta();
        recieve_time_delta_sum += recieve_time_delta;

        if (time_counter === 100) {
          const average_total_time = total_time_summ / time_counter;
          const recieve_time_delta_average = recieve_time_delta_sum / time_counter;

          time_counter = 0;
          self_time_summ = 0;
          total_time_summ = 0;
          recieve_time_delta_sum = 0;

          this.setState(prevState => ({
            profilingMetrics: {
              ...prevState.profilingMetrics,
              stepDuration: formatProfilingMetric(average_total_time),
              recieveDelta: formatProfilingMetric(recieve_time_delta_average)
            }
          }));
        }
      }

      return;
    });
  }

  stopProfiling ({ updateState = true } = {}) {
    console.warn(`stop profiling`);

    if (this.avTimeInterval) {
      clearInterval(this.avTimeInterval);
      this.avTimeInterval = null;
    }

    if (this.VM && this.VM.runtime) {
      this.VM.runtime.disableProfiling();
    }

    if (updateState && this.state.profilingEnabled) {
      this.setState({
        profilingEnabled: false,
        profilingMetrics: { ...EMPTY_PROFILING_METRICS }
      });
    } else {
      this.clearProfilingMetrics();
    }
  }

  onCopySystemInfoClick (systemInfoText) {
    this.copyToClipboard(systemInfoText, () => {
      showTransientButtonFeedback(this, {
        stateKey: COPY_BUTTON_FEEDBACK_KEY,
        feedbackToken: COPY_FEEDBACK_TOKEN
      });
    });
  }

  copyToClipboard (textToCopy, onSuccess) {
    const text = textToCopy != null ? String(textToCopy) : '';
    if (!text) {
      return;
    }

    const notifySuccess = () => {
      if (typeof onSuccess === 'function') {
        onSuccess();
      }
    };

    if (typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text)
        .then(notifySuccess)
        .catch(() => {
          if (this.copyToClipboardWithExecCommand(text)) {
            notifySuccess();
          }
        });
      return;
    }

    if (this.copyToClipboardWithExecCommand(text)) {
      notifySuccess();
    }
  }

  copyToClipboardWithExecCommand (text) {
    if (typeof document === 'undefined' || !document.body) {
      return false;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    let copied = false;
    try {
      copied = document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
    }
    return copied;
  }

  buildSystemInfoText(rows) {
    const details = rows
      .filter(row => row && row.label && row.value)
      .map(row => `${row.label}${row.value}`);

    return [DISPLAY_VERSION].concat(details).join('\n');
  }

  renderInfoRow (rowId, label, value) {
    return (
      <div
        key={rowId}
        id={`about-window-content-raw-${rowId}`}
        className={styles.about_info_row}
      >
        <div
          id={`raw-${rowId}-about-window-content-column-1`}
          className={styles.about_info_label}
        >
          {label}
        </div>

        <div
          id={`raw-${rowId}-about-window-content-column-2`}
          className={styles.about_info_value}
        >
          {value}
        </div>
      </div>
    );
  }

  render() {
    const si = this.state.systemInfo || {};
    const intl = this.props.intl;
    const browserUnavailable = intl.formatMessage(messages.not_available_in_browser);
    const isWebSystemInfo = si.source === 'web';
    const desktopCpuList = typeof node_os.cpus === 'function' ? node_os.cpus() : [];
    const desktopRows = [
      {
        id: '5',
        label: intl.formatMessage(messages.os_name_and_version),
        value: si.source === 'desktop'
          ? (si.osLabel || [si.platform, si.release].filter(Boolean).join(' ') || '—')
          : (node_process.platform ? `${node_process.platform} ${node_os.release()}` : '—')
      },
      {
        id: '6',
        label: intl.formatMessage(messages.arch),
        value: si.source === 'desktop'
          ? (si.arch || '—')
          : (formatArchitectureDisplay(node_process.arch) || '—')
      },
      {
        id: '7',
        label: intl.formatMessage(messages.cpu),
        value: si.source === 'desktop'
          ? (si.cpuModel || '—')
          : (desktopCpuList.length ? desktopCpuList[0].model : '—')
      }
    ];
    const webRows = [
      {
        id: '5',
        label: intl.formatMessage(messages.platform),
        value: si.platform || browserUnavailable
      },
      {
        id: '6',
        label: intl.formatMessage(messages.browser),
        value: si.browser || browserUnavailable
      },
      {
        id: '7',
        label: intl.formatMessage(messages.arch),
        value: formatArchitectureDisplay(si.arch) || browserUnavailable
      },
      {
        id: '9',
        label: intl.formatMessage(messages.logical_cores),
        value: si.logicalCores || browserUnavailable
      }
    ];
    const infoRows = isWebSystemInfo ? webRows : desktopRows;
    const systemInfoText = this.buildSystemInfoText(infoRows);
    const { profilingEnabled, profilingMetrics } = this.state;
    const copyFeedbackActive = isTransientButtonFeedbackActive(
      this.state,
      COPY_BUTTON_FEEDBACK_KEY,
      COPY_FEEDBACK_TOKEN
    );
    const updateIndicator = this.renderUpdateIndicator();
    return (
      <div id="about-window" className={classNames(sharedStyles.palette, styles.about_window)}>
        <div
          id="about-window-tittle"
          className={sharedStyles.header}
        >
          <span className={sharedStyles.headerTitle}>
            {this.props.intl.formatMessage(messages.about_window)}
          </span>
          <button
            type="button"
            className={sharedStyles.closeButton}
            aria-label="Close"
            onClick={this.onThisWindowClose}
          />
        </div>

        <div
          id="about-window-content"
          className={classNames(
            sharedStyles.body,
            formStyles.palette_content,
            styles.about_content
          )}
        >
          <div
            id="about-window-content-raw-1"
            className={classNames(formStyles.section, styles.about_section)}
          >
            <div className={styles.about_version_block}>
              <div className={styles.about_version_row}>
                <div
                  id="raw-1-about-window-content-column-1"
                  className={formStyles.version_label}
                >
                  {DISPLAY_VERSION}
                </div>
                {updateIndicator}
              </div>
              <button
                type="button"
                id="about-window-copy-system-info"
                className={classNames(
                  formStyles.action_button,
                  formStyles.footer_action_button,
                  styles.about_button
                )}
                onClick={() => this.onCopySystemInfoClick(systemInfoText)}
              >
                {renderTransientActionLabel({
                  feedbackActive: copyFeedbackActive,
                  defaultMessage: messages.copy_system_info,
                  successMessage: messages.copied_to_clipboard,
                  intl,
                  labelClassName: formStyles.action_button_label
                })}
              </button>
              {!profilingEnabled ? (
                <button
                  type="button"
                  id="about-window-toggle-profiling"
                  className={classNames(
                    formStyles.action_button,
                    formStyles.footer_action_button,
                    styles.about_button
                  )}
                  aria-pressed={false}
                  onClick={this.toggleProfiling}
                >
                  {intl.formatMessage(messages.start_profiling)}
                </button>
              ) : null}
            </div>
          </div>

          {profilingEnabled ? (
          <div
            id="about-window-content-raw-2"
            className={classNames(formStyles.section, styles.about_section)}
          >
            <h3 className={classNames(formStyles.section_title, styles.about_section_title)}>
              {intl.formatMessage(messages.profiling_section)}
            </h3>
            <button
              type="button"
              id="about-window-toggle-profiling"
              className={classNames(
                formStyles.action_button,
                formStyles.footer_action_button,
                styles.about_button,
                styles.about_button_active
              )}
              aria-pressed
              onClick={this.toggleProfiling}
            >
              {intl.formatMessage(messages.stop_profiling)}
            </button>

            <div className={styles.about_metrics}>
              <div
                id="about-window-content-raw-3"
                className={styles.about_metric_row}
              >
                <div className={styles.about_metric_label}>
                  {intl.formatMessage(messages.step_duration)}
                </div>
                <span
                  id="raw-3-about-window-content-column-2"
                  className={styles.about_metric_value}
                >
                  {profilingMetrics.stepDuration}
                </span>
              </div>

              <div
                id="about-window-content-raw-4"
                className={styles.about_metric_row}
              >
                <div className={styles.about_metric_label}>
                  {intl.formatMessage(messages.recieve_delta)}
                </div>
                <span
                  id="raw-4-about-window-content-column-2"
                  className={styles.about_metric_value}
                >
                  {profilingMetrics.recieveDelta}
                </span>
              </div>

              <div
                id="about-window-content-raw-8"
                className={styles.about_metric_row}
              >
                <div className={styles.about_metric_label}>
                  {intl.formatMessage(messages.average_step_delay_time)}
                </div>
                <span
                  id="raw-8-about-window-content-column-2"
                  className={styles.about_metric_value}
                >
                  {profilingMetrics.averageDelay}
                </span>
              </div>
            </div>
          </div>
          ) : null}

          {infoRows.length > 0 ? (
            <div className={classNames(formStyles.section, styles.about_section)}>
              <h3 className={classNames(formStyles.section_title, styles.about_section_title)}>
                {intl.formatMessage(messages.system_section)}
              </h3>
              <div className={styles.about_info_list}>
                {infoRows.map(row => this.renderInfoRow(row.id, row.label, row.value))}
              </div>
            </div>
          ) : null}
        </div>

        <div
          id="about-window-footer"
          className={classNames(formStyles.footer, styles.about_footer, styles.about_footer_outside)}
        >
          <div className={classNames(formStyles.footer_actions, styles.about_footer_actions)}>
            <button
              type="button"
              id="about-window-help"
              className={classNames(
                formStyles.action_button,
                styles.about_help_button
              )}
              onClick={this.onHelpClick}
            >
              <span
                className={styles.about_help_icon}
                aria-hidden="true"
              />
              <span className={formStyles.action_button_label}>
                {intl.formatMessage(messages.help)}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => ({
  license: state.scratchGui.license
});

const mapDispatchToProps = dispatch => ({
  onAboutWindowClose: window_id => {
    dispatch(ActionTriggerNewDraggableWindow(window_id));
  },

  onCheckForUpdates: () => {
    dispatch(premiumAutoUpdateCheckThunk());
  },

  onStartUpdate: () => {
    dispatch(premiumStartUpdateThunk());
  },

  createWindow: (top, left, window_id) => {
    ActionCreateNewDraggableWindow(top, left, window_id);
  }
});

export default injectIntl(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(AboutWindowComponent)
);
