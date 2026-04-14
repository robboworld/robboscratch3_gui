import { FULLSCREEN_RENDER_QUALITY_DEFAULT } from '../../lib/settingsLoader';

const SET_FULLSCREEN_RENDER_QUALITY = 'SET_FULLSCREEN_RENDER_QUALITY';
const SET_SIM_SENSOR_DEBUG_OVERLAY_ENABLED = 'SET_SIM_SENSOR_DEBUG_OVERLAY_ENABLED';

/** Must match scratch-vm VirtualMachine.ROBBO_SIMULATOR_PROJECT_META_APPLIED */
export const ROBBO_SIMULATOR_PROJECT_META_APPLIED = 'ROBBO_SIMULATOR_PROJECT_META_APPLIED';

const initialState = {
  is_sim_activated: false,
  is_copter_sim_activated: false,
  is_lab_ext_enabled: false,
  robot_is_scratchduino: false,
  fullscreen_render_quality: FULLSCREEN_RENDER_QUALITY_DEFAULT,
  sim_sensor_debug_overlay_enabled: false
};

const reducer = function (state, action) {
  if (typeof state === 'undefined') state = initialState;

  let settings_state = {};

  switch (action.type) {
  case 'TRIGGER_SIM_EN':
    settings_state = Object.assign({}, state);
    settings_state.is_sim_activated = !settings_state.is_sim_activated;
    return settings_state;

  case 'TRIGGER_COPTER_SIM_EN':
    settings_state = Object.assign({}, state);
    settings_state.is_copter_sim_activated = !settings_state.is_copter_sim_activated;
    return settings_state;

  case 'TRIGGER_LAB_EXT_SENSORS':
    settings_state = Object.assign({}, state);
    settings_state.is_lab_ext_enabled = !settings_state.is_lab_ext_enabled;
    return settings_state;

  case 'HIDE_NONE_SCRATCHDUINO_BLOCKS':
    settings_state = Object.assign({}, state);
    settings_state.robot_is_scratchduino = true;
    return settings_state;

  case 'SHOW_ROBBO_BLOCKS':
    settings_state = Object.assign({}, state);
    settings_state.robot_is_scratchduino = false;
    return settings_state;

  case SET_FULLSCREEN_RENDER_QUALITY:
    settings_state = Object.assign({}, state);
    settings_state.fullscreen_render_quality = action.fullscreenRenderQuality;
    return settings_state;

  case SET_SIM_SENSOR_DEBUG_OVERLAY_ENABLED:
    settings_state = Object.assign({}, state);
    // Strict boolean: Boolean("false") is true in JS; default must stay off unless explicitly true.
    settings_state.sim_sensor_debug_overlay_enabled = action.enabled === true;
    return settings_state;

  case ROBBO_SIMULATOR_PROJECT_META_APPLIED:
    if (!action.payload) return state;
    settings_state = Object.assign({}, state);
    settings_state.is_sim_activated = action.payload.simEnabled === true;
    if (action.payload.copterSimEnabled !== undefined) {
      settings_state.is_copter_sim_activated = action.payload.copterSimEnabled === true;
    }
    return settings_state;

  default:
    return state;
  }
};

const setFullscreenRenderQuality = function (fullscreenRenderQuality) {
  return {
    type: SET_FULLSCREEN_RENDER_QUALITY,
    fullscreenRenderQuality: fullscreenRenderQuality
  };
};

const setSimSensorDebugOverlayEnabled = function (enabled) {
  return {
    type: SET_SIM_SENSOR_DEBUG_OVERLAY_ENABLED,
    enabled: enabled
  };
};

export {
  reducer as default,
  initialState as settings_InitialState,
  setFullscreenRenderQuality,
  setSimSensorDebugOverlayEnabled
};
