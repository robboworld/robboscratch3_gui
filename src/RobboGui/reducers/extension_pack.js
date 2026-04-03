/** Must match scratch-vm VirtualMachine.ROBBO_SIMULATOR_PROJECT_META_APPLIED */
const ROBBO_SIMULATOR_PROJECT_META_APPLIED = 'ROBBO_SIMULATOR_PROJECT_META_APPLIED';

const initialState = {

  is_extension_pack_activated:false,


};

const  reducer = function (state, action) {



  if (typeof state === 'undefined') state = initialState;


  let sensors_pallete_state = {};


switch (action.type) {

  case 'TRIGGER_EXTENSION_PACK':


  sensors_pallete_state = Object.assign({}, state);

  sensors_pallete_state.is_extension_pack_activated = !sensors_pallete_state.is_extension_pack_activated;



  return sensors_pallete_state;


    break;

  case ROBBO_SIMULATOR_PROJECT_META_APPLIED:
    if (!action.payload) return state;
    sensors_pallete_state = Object.assign({}, state);
    sensors_pallete_state.is_extension_pack_activated = action.payload.extensionPackActivated === true;
    return sensors_pallete_state;



  default:

      return state;

}




  return state;


}


export {
    reducer as default,
    initialState as extension_pack_InitialState

};
