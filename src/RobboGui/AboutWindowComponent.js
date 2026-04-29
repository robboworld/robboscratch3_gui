import React, { Component } from 'react';
import { connect } from 'react-redux';

import {
  defineMessages,
  injectIntl
} from 'react-intl';

import styles from './AboutWindowComponent.css';
import {
  ActionTriggerNewDraggableWindow,
  ActionCreateNewDraggableWindow
} from './actions/sensor_actions';
import {
  node_process,
  node_os,
  getSystemInfoAsync,
  formatArchitectureDisplay
} from '../lib/platform';

const VERSION = 'Robbo Scratch v.3.114.2';
const BUILD_VERSION_SUFFIX = (typeof process !== 'undefined' &&
  process &&
  process.env &&
  typeof process.env.ROBBO_BUILD_VERSION_SUFFIX === 'string')
  ? process.env.ROBBO_BUILD_VERSION_SUFFIX
  : '';
const DISPLAY_VERSION = `${VERSION}${BUILD_VERSION_SUFFIX}`;

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
  }
});

class AboutWindowComponent extends Component {
  constructor(props) {
    super(props);
    this.state = { systemInfo: null };
  }

  onThisWindowClose() {
    console.log('aboutWindow close');
    this.props.onAboutWindowClose('about-window');
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

  startProfiling() {
    console.warn(`start profiling`);

    let time_counter = 0;

    let steps_ids_list = [];

    let average_self_time = 0;
    let average_total_time = 0;

    let self_time_summ = 0;
    let total_time_summ = 0;

    let recieve_time_delta = 0;
    let recieve_time_delta_sum = 0;
    let recieve_time_delta_average = 0;

    const step_time_field = document.getElementById(
      `raw-3-about-window-content-column-2`
    );
    const robot_recieve_time_field = document.getElementById(
      `raw-4-about-window-content-column-2`
    );

    // ///////////////////av_time

    const performance =
      typeof window === 'object' && window.performance;

    let time_1 = performance.now();
    let time_2 = performance.now();
    let counter = 0;
    // let average_time = 0;
    let time_delta = 0;
    let time_delta_sum = 0;

    const av_time_comp = document.getElementById(
      `raw-8-about-window-content-column-2`
    );

    this.avTimeInterval = setInterval(() => {
      time_2 = performance.now();
      time_delta = time_2 - time_1;
      time_1 = performance.now();

      time_delta_sum += time_delta;
      counter++;

      if (counter >= 300) {
        this.averageTime = time_delta_sum / counter;
        counter = 0;

        // console.log(`RobboGui average_time: ${average_time}`);
        av_time_comp.innerHTML = this.averageTime.toFixed(7);

        time_delta_sum = 0;

        // this.VM.runtime.setFullscreenInterval(this.averageTime);
      }
    }, 0);

    // /////////////////////////////////end of av_time

    this.VM.runtime.enableProfiling(frame => {
      const frame_id = this.VM.runtime.profiler.nameById(
        frame.id
      );

      if (frame_id == 'Runtime._step') {
        time_counter++;

        self_time_summ += frame.selfTime;
        total_time_summ += frame.totalTime;

        recieve_time_delta = this.DCA.getRecieveTimeDelta();
        recieve_time_delta_sum += recieve_time_delta;

        if (time_counter == 100) {
          average_self_time = (
            self_time_summ / time_counter
          ).toFixed(7);
          average_total_time = (
            total_time_summ / time_counter
          ).toFixed(7);

          recieve_time_delta_average = (
            recieve_time_delta_sum / time_counter
          ).toFixed(7);

          time_counter = 0;

          step_time_field.innerHTML = average_total_time;
          robot_recieve_time_field.innerHTML =
            recieve_time_delta_average;

          // profiler_window_average_time_field.innerHTML = `<div>Runtime._step total_time:${average_total_time} self_time: ${average_self_time} </div>
          //                                                 <div>Recieve time delta: ${recieve_time_delta}</div>
          //                                                 <div>Recieve time delta average: ${recieve_time_delta_average}</div>`;

          self_time_summ = 0;
          total_time_summ = 0;
          recieve_time_delta_sum = 0;
        }
      }

      // if (frame_id != "Runtime._step") return;

      return;
    });
  }

  stopProfiling() {
    console.warn(`stop profiling`);

    clearInterval(this.avTimeInterval);

    this.VM.runtime.disableProfiling();
  }

  copyToClipboard(textToCopy) {
    console.warn(`copyToClipboard()`);

    const text = textToCopy != null ? String(textToCopy) : '';
    if (!text) return;

    if (typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text).catch(() => {
        this.copyToClipboardWithExecCommand(text);
      });
      return;
    }

    this.copyToClipboardWithExecCommand(text);
  }

  copyToClipboardWithExecCommand(text) {
    if (typeof document === 'undefined' || !document.body) return;

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
    }
  }

  buildSystemInfoText(rows) {
    const details = rows
      .filter(row => row && row.label && row.value)
      .map(row => `${row.label}${row.value}`);

    return [DISPLAY_VERSION].concat(details).join('\n');
  }

  renderInfoRow(rowId, label, value) {
    return (
      <div
        key={rowId}
        id={`about-window-content-raw-${rowId}`}
        className={styles.about_window_content_raw}
      >
        <div
          id={`raw-${rowId}-about-window-content-column-1`}
          className={styles.about_window_content_column}
        >
          {label}
        </div>

        <div
          id={`raw-${rowId}-about-window-content-column-2`}
          className={styles.about_window_value_column}
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
    return (
      <div id="about-window" className={styles.about_window}>
        <div
          id="about-window-tittle"
          className={styles.about_window_tittle}
        >
          {this.props.intl.formatMessage(messages.about_window)}
          <div
            className={styles.close_icon}
            onClick={this.onThisWindowClose.bind(this)}
          ></div>
        </div>

        <div
          id="about-window-content"
          className={styles.about_window_content}
        >
          <div
            id="about-window-content-raw-1"
            className={styles.about_window_content_raw}
          >
            <div
              id="raw-1-about-window-content-column-1"
              className={styles.about_window_content_column}
            >
              {DISPLAY_VERSION}
            </div>

            <div
              id="raw-1-about-window-content-column-2"
              className={styles.about_window_content_column}
            >
              <button
                id={`about-window-copy-system-info`}
                onClick={this.copyToClipboard.bind(this, systemInfoText)}
              >
                {this.props.intl.formatMessage(
                  messages.copy_system_info
                )}{' '}
              </button>
            </div>
          </div>

          <div
            id="about-window-content-raw-2"
            className={styles.about_window_content_raw}
          >
            <div
              id="raw-2-about-window-content-column-1"
              className={styles.about_window_content_column}
            >
              <button
                id={`about-window-start-profiling`}
                onClick={this.startProfiling.bind(this)}
              >
                {this.props.intl.formatMessage(
                  messages.start_profiling
                )}{' '}
              </button>
            </div>

            <div
              id="raw-2-about-window-content-column-2"
              className={styles.about_window_content_column}
            >
              <button
                id={`about-window-stop-profiling`}
                onClick={this.stopProfiling.bind(this)}
              >
                {this.props.intl.formatMessage(
                  messages.stop_profiling
                )}{' '}
              </button>
            </div>
          </div>

          <div
            id="about-window-content-raw-3"
            className={styles.about_window_content_raw}
          >
            <div
              id="raw-3-about-window-content-column-1"
              className={styles.about_window_content_column}
            >
              {this.props.intl.formatMessage(
                messages.step_duration
              )}
            </div>

            <div
              id="raw-3-about-window-content-column-2"
              className={styles.about_window_content_column}
            ></div>
          </div>

          <div
            id="about-window-content-raw-4"
            className={styles.about_window_content_raw}
          >
            <div
              id="raw-4-about-window-content-column-1"
              className={styles.about_window_content_column}
            >
              {this.props.intl.formatMessage(
                messages.recieve_delta
              )}
            </div>

            <div
              id="raw-4-about-window-content-column-2"
              className={styles.about_window_content_column}
            ></div>
          </div>

          <div
            id="about-window-content-raw-8"
            className={styles.about_window_content_raw}
          >
            <div
              id="raw-7-about-window-content-column-1"
              className={styles.about_window_content_column}
            >
              {this.props.intl.formatMessage(
                messages.average_step_delay_time
              )}
            </div>

            <div
              id="raw-8-about-window-content-column-2"
              className={styles.about_window_content_column}
            ></div>
          </div>

          {infoRows.map(row => this.renderInfoRow(row.id, row.label, row.value))}
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => ({});

const mapDispatchToProps = dispatch => ({
  onAboutWindowClose: window_id => {
    dispatch(ActionTriggerNewDraggableWindow(window_id));
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
