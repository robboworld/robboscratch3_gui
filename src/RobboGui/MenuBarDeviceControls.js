import classNames from 'classnames';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {defineMessages, injectIntl} from 'react-intl';
import PropTypes from 'prop-types';

import MenuBarDevicePreview from './MenuBarDevicePreview';
import {ActionTriggerSensorsPalette} from './actions/sensor_actions';
import {isDesktopWithBluetooth} from '../lib/platform';
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
        defaultMessage: 'Otto'
    },
    arduino: {
        id: 'gui.RobboGui.ArduinoPalette.arduino',
        defaultMessage: 'Arduino'
    }
});

class MenuBarDeviceControls extends Component {
    constructor (props) {
        super(props);
        this.state = {
            searchBusy: false
        };
        this.searchButtonObserver = null;
        this.searchDevices = this.searchDevices.bind(this);
        this.triggerSensorsPalette = this.triggerSensorsPalette.bind(this);
    }

    componentDidMount () {
        this.attachSearchButtonObserver();
    }

    componentDidUpdate () {
        if (!this.searchButtonObserver) {
            this.attachSearchButtonObserver();
        }
    }

    componentWillUnmount () {
        if (this.searchButtonObserver) {
            this.searchButtonObserver.disconnect();
            this.searchButtonObserver = null;
        }
    }

    attachSearchButtonObserver () {
        const searchButton = document.getElementById('robbo_search_devices');
        if (!searchButton || this.searchButtonObserver) return;

        this.searchButtonObserver = new MutationObserver(() => {
            // Legacy unlock (SearchPanel*) only sets style.pointerEvents = "auto".
            // Do not require !disabled: React used to keep disabled=true via searchBusy.
            if (searchButton.style.pointerEvents !== 'none' && this.state.searchBusy) {
                searchButton.style.pointerEvents = '';
                this.setState({searchBusy: false});
            }
        });
        this.searchButtonObserver.observe(searchButton, {
            attributes: true,
            attributeFilter: ['style', 'disabled']
        });
    }

    searchDevices () {
        if (this.state.searchBusy) return;

        const searchPanel = document.getElementById('SearchPanelComponent');
        if (searchPanel) {
            searchPanel.style.display = 'block';
        }

        const searchDeviceButton = document.getElementById('robbo_search_devices');
        if (searchDeviceButton) {
            searchDeviceButton.style.pointerEvents = 'none';
        }

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
                        Sensors pallete
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
                        [styles.searchBusy]: this.state.searchBusy
                    })}
                    title={searchButtonLabel}
                    aria-label={searchButtonLabel}
                    onClick={this.searchDevices}
                >
                    <span className={styles.searchIcon} aria-hidden="true" />
                    <span className={styles.searchLabel}>{searchButtonLabel}</span>
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
    }
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(MenuBarDeviceControls));
