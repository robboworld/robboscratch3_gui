const SET_RIGHT_PANEL_HIDDEN = 'scratch-gui/layout-visibility/SET_RIGHT_PANEL_HIDDEN';
const SET_BLOCKS_PALETTE_COLLAPSED = 'scratch-gui/layout-visibility/SET_BLOCKS_PALETTE_COLLAPSED';
const SET_BLOCKS_PALETTE_FLYOUT_WIDTH = 'scratch-gui/layout-visibility/SET_BLOCKS_PALETTE_FLYOUT_WIDTH';
const SET_BLOCKS_WORKSPACE_LAYOUT_PENDING = 'scratch-gui/layout-visibility/SET_BLOCKS_WORKSPACE_LAYOUT_PENDING';
const HYDRATE_LAYOUT_VISIBILITY = 'scratch-gui/layout-visibility/HYDRATE_LAYOUT_VISIBILITY';

const BLOCKS_PALETTE_FLYOUT_WIDTH_MIN = 180;
const BLOCKS_PALETTE_FLYOUT_WIDTH_MAX = 480;
const BLOCKS_PALETTE_FLYOUT_WIDTH_DEFAULT = 250;

const initialState = {
    isRightPanelHidden: false,
    isBlocksPaletteCollapsed: false,
    blocksPaletteFlyoutWidth: BLOCKS_PALETTE_FLYOUT_WIDTH_DEFAULT,
    isBlocksWorkspaceLayoutPending: false
};

const normalizeBooleanField = (value, fallback) => (
    typeof value === 'boolean' ? value : fallback
);

const clampFlyoutWidth = width => {
    const n = typeof width === 'number' ? width : parseFloat(width);
    if (!Number.isFinite(n)) {
        return BLOCKS_PALETTE_FLYOUT_WIDTH_DEFAULT;
    }
    return Math.max(
        BLOCKS_PALETTE_FLYOUT_WIDTH_MIN,
        Math.min(BLOCKS_PALETTE_FLYOUT_WIDTH_MAX, Math.round(n))
    );
};

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
    case SET_BLOCKS_PALETTE_FLYOUT_WIDTH:
        return Object.assign({}, state, {
            blocksPaletteFlyoutWidth: clampFlyoutWidth(action.blocksPaletteFlyoutWidth)
        });
    case SET_BLOCKS_WORKSPACE_LAYOUT_PENDING:
        return Object.assign({}, state, {
            isBlocksWorkspaceLayoutPending: action.isBlocksWorkspaceLayoutPending
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
            ),
            blocksPaletteFlyoutWidth: clampFlyoutWidth(
                layout.blocksPaletteFlyoutWidth != null ?
                    layout.blocksPaletteFlyoutWidth :
                    state.blocksPaletteFlyoutWidth
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

const setBlocksPaletteFlyoutWidth = function (blocksPaletteFlyoutWidth) {
    return {
        type: SET_BLOCKS_PALETTE_FLYOUT_WIDTH,
        blocksPaletteFlyoutWidth: blocksPaletteFlyoutWidth
    };
};

const setBlocksWorkspaceLayoutPending = function (isBlocksWorkspaceLayoutPending) {
    return {
        type: SET_BLOCKS_WORKSPACE_LAYOUT_PENDING,
        isBlocksWorkspaceLayoutPending: isBlocksWorkspaceLayoutPending
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
    setBlocksPaletteFlyoutWidth,
    setBlocksWorkspaceLayoutPending,
    hydrateLayoutVisibility,
    BLOCKS_PALETTE_FLYOUT_WIDTH_MIN,
    BLOCKS_PALETTE_FLYOUT_WIDTH_MAX,
    BLOCKS_PALETTE_FLYOUT_WIDTH_DEFAULT,
    clampFlyoutWidth
};
