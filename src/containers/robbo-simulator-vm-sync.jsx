import PropTypes from 'prop-types';
import React, {useEffect} from 'react';
import Renderer from 'scratch-render';
import {connect} from 'react-redux';
import VM from 'scratch-vm';

import {getDefaultSimulationRobotSpriteJson} from '../lib/robbo-simulation-sprite';

/**
 * Registers Robbo SB3 save context, simulation sprite provider, and WebGL/load policy on the VM.
 * Must not be mounted as a child of GUIComponent when children is set (would hide Stage).
 */
const RobboSimulatorVmSync = props => {
    const {vm, robotSensors, isSimActivated, extensionPackActivated} = props;

    useEffect(() => {
        const getter = () => ({
            simEnabled: isSimActivated,
            extensionPackActivated: extensionPackActivated,
            sensors: robotSensors
        });
        vm.setRobboSimulatorSaveContextGetter(getter);
        return () => vm.setRobboSimulatorSaveContextGetter(null);
    }, [vm, robotSensors, isSimActivated, extensionPackActivated]);

    useEffect(() => {
        vm.setRobboSimulationSpriteJsonProvider(getDefaultSimulationRobotSpriteJson);
        return () => vm.setRobboSimulationSpriteJsonProvider(null);
    }, [vm]);

    useEffect(() => {
        const supported = Renderer.isSupported();
        vm.setAllowProjectLoadWithoutRenderer(!supported);
        return () => vm.setAllowProjectLoadWithoutRenderer(false);
    }, [vm]);

    return null;
};

RobboSimulatorVmSync.propTypes = {
    vm: PropTypes.instanceOf(VM).isRequired,
    robotSensors: PropTypes.array.isRequired,
    isSimActivated: PropTypes.bool,
    extensionPackActivated: PropTypes.bool
};

export default connect(state => ({
    vm: state.scratchGui.vm,
    robotSensors: state.scratchGui.robot_sensors,
    isSimActivated: state.scratchGui.settings.is_sim_activated === true,
    extensionPackActivated: state.scratchGui.extension_pack.is_extension_pack_activated === true
}))(RobboSimulatorVmSync);
