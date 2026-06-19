import classNames from 'classnames';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {defineMessages, injectIntl} from 'react-intl';
import PropTypes from 'prop-types';

import MenuBarDevicePreview from './MenuBarDevicePreview';
import {ActionTriggerSensorsPalette} from './actions/sensor_actions';
import {hydrateLicenseThunk} from './actions/licenseActions';
import {isDesktopWithBluetooth} from '../lib/platform';
import {showSearchPanel} from './search-panel-visibility';
import {
    beginSearchButtonFeedbackSession,
    subscribeSearchButtonFeedback
} from './search-button-feedback';
import {
    clearTransientButtonFeedbackTimer,
    TRANSIENT_BUTTON_FEEDBACK_MS
} from '../lib/transient-button-feedback';
import styles from './MenuBarDeviceControls.css';

const messages = defineMessages({
    search_devices: {
        id: 'gui.RobboGui.search_devices',
        description: ' ',
        defaultMessage: 'Search devices'
    },
    robot: {
        id: 'gui.RobboGui.RobotPalette.robot',
        defaultMessage: 'Robot'
    },
    laboratory: {
        id: 'gui.RobboGui.LaboratoryPalette.laboratory',
        defaultMessage: 'Laboratory'
    },
    quadcopter: {
        id: 'gui.RobboGui.QuadcopterPalette.quadcopter',
        defaultMessage: 'Quadcopter'
    },
    otto: {
        id: 'gui.RobboGui.OttoPalette.otto',
        defaultMessage: 'Dancing robot'
    },
    arduino: {
        id: 'gui.RobboGui.ArduinoPalette.arduino',
        defaultMessage: 'Arduino'
    },
    sensors_palette: {
        id: 'gui.RobboGui.sensors_palette',
        description: 'Collapsed menu bar label to open sensors palette',
        defaultMessage: 'Sensors palette'
    },
    search_device_connected: {
        id: 'gui.RobboGui.search_device_connected',
        description: 'Brief feedback on search button after device connects',
        defaultMessage: 'Connected'
    },
    search_device_error: {
        id: 'gui.RobboGui.search_device_error',
        description: 'Brief feedback on search button after connection error',
        defaultMessage: 'Connection error'
    }
});

class MenuBarDeviceControls extends Component {
    constructor (props) {
        super(props);
        this.state = {
            searchBusy: false,
            searchFeedback: null
        };
        this.unsubscribeSearchFeedback = null;
        this.searchDevices = this.searchDevices.bind(this);
        this.triggerSensorsPalette = this.triggerSensorsPalette.bind(this);
    }

    componentDidMount () {
        this.unsubscribeSearchFeedback = subscribeSearchButtonFeedback(kind => {
            if (kind === 'idle') {
                if (this.state.searchBusy) {
                    this.setState({searchBusy: false});
                }
                return;
            }
            if (kind === 'error' &&
                this.state.searchFeedback === 'error' &&
                !this.state.searchBusy) {
                return;
            }
            const feedbackToken = kind === 'connected' ? 'connected' : 'error';
            clearTransientButtonFeedbackTimer(this, 'searchFeedback');
            this.setState({searchFeedback: feedbackToken, searchBusy: false});
            this._transientFeedbackTimer_searchFeedback = setTimeout(() => {
                this._transientFeedbackTimer_searchFeedback = null;
                this.setState(prevState => (
                    prevState.searchFeedback === feedbackToken ? {searchFeedback: null} : null
                ));
            }, TRANSIENT_BUTTON_FEEDBACK_MS);
        });
    }

    componentWillUnmount () {
        if (this.unsubscribeSearchFeedback) {
            this.unsubscribeSearchFeedback();
            this.unsubscribeSearchFeedback = null;
        }
        clearTransientButtonFeedbackTimer(this, 'searchFeedback');
    }

    searchDevices () {
        if (this.state.searchBusy) return;

        const searchPanel = document.getElementById('SearchPanelComponent');
        if (searchPanel) {
            searchPanel.style.display = 'block';
        }
        showSearchPanel();

        beginSearchButtonFeedbackSession();
        this.setState({searchBusy: true});

        const vm = this.props.vm;
        if (!vm) return;

        vm.getDCA().searchAllDevices();
        vm.getRCA().searchRobotDevices();
        vm.getLCA().searchLaboratoryDevices();
        vm.getOCA().searchOttoDevices();
        vm.getACA().searchArduinoDevices();

        if (isDesktopWithBluetooth()) {
            vm.getQCA().searchQuadcopterDevices();
        }

        this.props.onHydrateDemoLicense();
    }

    triggerSensorsPalette () {
        this.props.onTriggerSensorsPalette();
    }

    renderDevicePreviews () {
        const vm = this.props.vm;
        const {intl} = this.props;
        const showQuadcopterUi = isDesktopWithBluetooth() || this.props.is_copter_sim_activated;

        return (
            <div className={styles.devicePreviews}>
                <MenuBarDevicePreview
                    deviceType="robot"
                    draggableWindowId={1}
                    idPrefix="robot"
                    index={0}
                    statusApi={vm.getRCA()}
                    title={intl.formatMessage(messages.robot)}
                />
                <MenuBarDevicePreview
                    deviceType="lab"
                    draggableWindowId={2}
                    idPrefix="lab"
                    index={0}
                    statusApi={vm.getLCA()}
                    title={intl.formatMessage(messages.laboratory)}
                />
                {showQuadcopterUi ? (
                    <MenuBarDevicePreview
                        deviceType="quadcopter"
                        draggableWindowId={0}
                        idPrefix="quadcopter"
                        index={0}
                        statusApi={vm.getQCA()}
                        title={intl.formatMessage(messages.quadcopter)}
                    />
                ) : null}
                <MenuBarDevicePreview
                    deviceType="otto"
                    draggableWindowId={5}
                    idPrefix="otto"
                    index={0}
                    statusApi={vm.getOCA()}
                    title={intl.formatMessage(messages.otto)}
                />
                <MenuBarDevicePreview
                    deviceType="arduino"
                    draggableWindowId={6}
                    idPrefix="arduino"
                    index={0}
                    statusApi={vm.getACA()}
                    title={intl.formatMessage(messages.arduino)}
                />
            </div>
        );
    }

    render () {
        if (!this.props.vm) return null;

        const searchButtonLabel = this.props.intl.formatMessage(messages.search_devices);
        const searchFeedbackLabel = this.state.searchFeedback === 'connected'
            ? this.props.intl.formatMessage(messages.search_device_connected)
            : this.state.searchFeedback === 'error'
                ? this.props.intl.formatMessage(messages.search_device_error)
                : null;
        const searchFeedbackKind = this.state.searchFeedback;

        if (this.props.sensors_pallete_collapsed) {
            return (
                <div
                    className={classNames(styles.deviceToolbar, styles.deviceToolbarCollapsed)}
                >
                    <button
                        type="button"
                        className={styles.collapsedToggle}
                        onClick={this.triggerSensorsPalette}
                    >
                        {this.props.intl.formatMessage(messages.sensors_palette)}
                    </button>
                </div>
            );
        }

        return (
            <div className={styles.deviceToolbar}>
                <button
                    type="button"
                    id="robbo_search_devices"
                    className={classNames(styles.searchDevices, {
                        [styles.searchBusy]: this.state.searchBusy,
                        [styles.searchFeedbackOk]: searchFeedbackKind === 'connected',
                        [styles.searchFeedbackError]: searchFeedbackKind === 'error'
                    })}
                    title={searchButtonLabel}
                    aria-label={searchButtonLabel}
                    aria-busy={this.state.searchBusy ? 'true' : 'false'}
                    onClick={event => {
                        this.searchDevices();
                        event.currentTarget.blur();
                    }}
                >
                    {this.state.searchBusy ? (
                        <span className={styles.searchSpinner} aria-hidden="true" />
                    ) : (
                        <span className={styles.searchIcon} aria-hidden="true" />
                    )}
                    <span className={styles.searchLabel}>
                        {searchFeedbackLabel || searchButtonLabel}
                    </span>
                </button>
                {this.renderDevicePreviews()}
            </div>
        );
    }
}

MenuBarDeviceControls.propTypes = {
    intl: PropTypes.object.isRequired,
    is_copter_sim_activated: PropTypes.bool,
    sensors_pallete_collapsed: PropTypes.bool,
    vm: PropTypes.object,
    onTriggerSensorsPalette: PropTypes.func
};

const mapStateToProps = state => ({
    is_copter_sim_activated: state.scratchGui.settings.is_copter_sim_activated === true,
    sensors_pallete_collapsed: state.scratchGui.sensors_palette.sensors_pallete_collapsed
});

const mapDispatchToProps = dispatch => ({
    onTriggerSensorsPalette: () => {
        dispatch(ActionTriggerSensorsPalette());
    },
    onHydrateDemoLicense: () => {
        dispatch(hydrateLicenseThunk());
    }
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(MenuBarDeviceControls));
