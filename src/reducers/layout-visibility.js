const SET_RIGHT_PANEL_HIDDEN = 'scratch-gui/layout-visibility/SET_RIGHT_PANEL_HIDDEN';
const SET_BLOCKS_PALETTE_COLLAPSED = 'scratch-gui/layout-visibility/SET_BLOCKS_PALETTE_COLLAPSED';
const HYDRATE_LAYOUT_VISIBILITY = 'scratch-gui/layout-visibility/HYDRATE_LAYOUT_VISIBILITY';

const initialState = {
    isRightPanelHidden: false,
    isBlocksPaletteCollapsed: false
};

const normalizeBooleanField = (value, fallback) => (
    typeof value === 'boolean' ? value : fallback
);

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SET_RIGHT_PANEL_HIDDEN:
        return Object.assign({}, state, {
            isRightPanelHidden: action.isRightPanelHidden
        });
    case SET_BLOCKS_PALETTE_COLLAPSED:
        return Object.assign({}, state, {
            isBlocksPaletteCollapsed: action.isBlocksPaletteCollapsed
        });
    case HYDRATE_LAYOUT_VISIBILITY: {
        const layout = action.layout || {};
        return {
            isRightPanelHidden: normalizeBooleanField(
                layout.isRightPanelHidden,
                initialState.isRightPanelHidden
            ),
            isBlocksPaletteCollapsed: normalizeBooleanField(
                layout.isBlocksPaletteCollapsed,
                initialState.isBlocksPaletteCollapsed
            )
        };
    }
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

const setBlocksPaletteCollapsed = function (isBlocksPaletteCollapsed) {
    return {
        type: SET_BLOCKS_PALETTE_COLLAPSED,
        isBlocksPaletteCollapsed: isBlocksPaletteCollapsed
    };
};

const hydrateLayoutVisibility = function (layout) {
    return {
        type: HYDRATE_LAYOUT_VISIBILITY,
        layout: layout || {}
    };
};

export {
    reducer as default,
    initialState as layoutVisibilityInitialState,
    setRightPanelHidden,
    setBlocksPaletteCollapsed,
    hydrateLayoutVisibility
};
