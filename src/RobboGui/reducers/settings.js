import { FULLSCREEN_RENDER_QUALITY_DEFAULT } from '../../lib/settingsLoader';

const SET_FULLSCREEN_RENDER_QUALITY = 'SET_FULLSCREEN_RENDER_QUALITY';

const initialState = {
  is_lab_ext_enabled: false,
  robot_is_scratchduino: false,
  fullscreen_render_quality: FULLSCREEN_RENDER_QUALITY_DEFAULT
};

const reducer = function (state, action) {
  if (typeof state === 'undefined') state = initialState;

  let settings_state = {};

  switch (action.type) {
  case 'TRIGGER_SIM_EN':
    settings_state = Object.assign({}, state);
    settings_state.is_sim_activated = !settings_state.is_sim_activated;
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

export {
  reducer as default,
  initialState as settings_InitialState,
  setFullscreenRenderQuality
};
