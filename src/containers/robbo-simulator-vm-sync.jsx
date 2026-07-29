import PropTypes from 'prop-types';
import React, {useEffect} from 'react';
import Renderer from 'scratch-render';
import {connect} from 'react-redux';
import VM from 'scratch-vm';

import {getDefaultSimulationRobotSpriteJson} from '../lib/robbo-simulation-sprite';
import {getDefaultSimulationCopterSpriteJson} from '../lib/robbo-simulation-copter-sprite';

/**
 * Registers Robbo SB3 save context, simulation sprite provider, and WebGL/load policy on the VM.
 * Must not be mounted as a child of GUIComponent when children is set (would hide Stage).
 * VM hooks are optional: stock scratch-vm in Docker may not include Robbo patches.
 */
const callVmHook = (vm, method, ...args) => {
    if (vm && typeof vm[method] === 'function') {
        vm[method](...args);
    }
};

const RobboSimulatorVmSync = props => {
    const {vm, robotSensors, isSimActivated, extensionPackActivated, isCopterSimActivated} = props;

    useEffect(() => {
        const getter = () => ({
            simEnabled: isSimActivated,
            extensionPackActivated: extensionPackActivated,
            copterSimEnabled: isCopterSimActivated,
            sensors: robotSensors
        });
        callVmHook(vm, 'setRobboSimulatorSaveContextGetter', getter);
        return () => callVmHook(vm, 'setRobboSimulatorSaveContextGetter', null);
    }, [vm, robotSensors, isSimActivated, extensionPackActivated, isCopterSimActivated]);

    useEffect(() => {
        callVmHook(vm, 'setRobboSimulationSpriteJsonProvider', getDefaultSimulationRobotSpriteJson);
        return () => callVmHook(vm, 'setRobboSimulationSpriteJsonProvider', null);
    }, [vm]);

    useEffect(() => {
        callVmHook(vm, 'setCopterSimulationSpriteJsonProvider', getDefaultSimulationCopterSpriteJson);
        return () => callVmHook(vm, 'setCopterSimulationSpriteJsonProvider', null);
    }, [vm]);

    useEffect(() => {
        const supported = Renderer.isSupported();
        callVmHook(vm, 'setAllowProjectLoadWithoutRenderer', !supported);
        return () => callVmHook(vm, 'setAllowProjectLoadWithoutRenderer', false);
    }, [vm]);

    return null;
};

RobboSimulatorVmSync.propTypes = {
    vm: PropTypes.instanceOf(VM).isRequired,
    robotSensors: PropTypes.array.isRequired,
    isSimActivated: PropTypes.bool,
    extensionPackActivated: PropTypes.bool,
    isCopterSimActivated: PropTypes.bool
};

export default connect(state => ({
    vm: state.scratchGui.vm,
    robotSensors: state.scratchGui.robot_sensors,
    isSimActivated: state.scratchGui.settings.is_sim_activated === true,
    extensionPackActivated: state.scratchGui.extension_pack.is_extension_pack_activated === true,
    isCopterSimActivated: state.scratchGui.settings.is_copter_sim_activated === true
}))(RobboSimulatorVmSync);
