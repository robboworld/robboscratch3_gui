const SET_RIGHT_PANEL_HIDDEN = 'scratch-gui/layout-visibility/SET_RIGHT_PANEL_HIDDEN';

const initialState = {
    isRightPanelHidden: false
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SET_RIGHT_PANEL_HIDDEN:
        return Object.assign({}, state, {
            isRightPanelHidden: action.isRightPanelHidden
        });
    default:
        return state;
    }
};

const setRightPanelHidden = function (isRightPanelHidden) {
    return {
        type: SET_RIGHT_PANEL_HIDDEN,
        isRightPanelHidden: isRightPanelHidden
    };
};

export {
    reducer as default,
    initialState as layoutVisibilityInitialState,
    setRightPanelHidden
};

