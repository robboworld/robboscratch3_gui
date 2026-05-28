import {
    BLOCKS_PALETTE_FLYOUT_WIDTH_DEFAULT,
    clampFlyoutWidth,
    layoutVisibilityInitialState
} from '../reducers/layout-visibility';

const STORAGE_KEY = 'scratch-gui-layout-visibility-v1';

const readPersistedLayoutVisibility = function () {
    if (typeof window === 'undefined' || !window.localStorage) {
        return null;
    }
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }
        return {
            isRightPanelHidden: typeof parsed.isRightPanelHidden === 'boolean' ?
                parsed.isRightPanelHidden :
                layoutVisibilityInitialState.isRightPanelHidden,
            isBlocksPaletteCollapsed: typeof parsed.isBlocksPaletteCollapsed === 'boolean' ?
                parsed.isBlocksPaletteCollapsed :
                layoutVisibilityInitialState.isBlocksPaletteCollapsed,
            blocksPaletteFlyoutWidth: clampFlyoutWidth(
                parsed.blocksPaletteFlyoutWidth != null ?
                    parsed.blocksPaletteFlyoutWidth :
                    layoutVisibilityInitialState.blocksPaletteFlyoutWidth
            )
        };
    } catch (e) {
        return null;
    }
};

const writePersistedLayoutVisibility = function (layout) {
    if (typeof window === 'undefined' || !window.localStorage || !layout) {
        return;
    }
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
            isRightPanelHidden: layout.isRightPanelHidden,
            isBlocksPaletteCollapsed: layout.isBlocksPaletteCollapsed,
            blocksPaletteFlyoutWidth: layout.blocksPaletteFlyoutWidth
        }));
    } catch (e) {
        // Ignore quota / private mode errors.
    }
};

const getLayoutVisibilityInitialState = function () {
    const persisted = readPersistedLayoutVisibility();
    if (!persisted) {
        return layoutVisibilityInitialState;
    }
    return Object.assign({}, layoutVisibilityInitialState, persisted);
};

const layoutVisibilityPersistenceMiddleware = store => next => action => {
    const result = next(action);
    if (action.type && action.type.indexOf('scratch-gui/layout-visibility/') === 0) {
        const layout = store.getState().scratchGui.layoutVisibility;
        if (layout) {
            writePersistedLayoutVisibility(layout);
        }
    }
    return result;
};

export {
    STORAGE_KEY,
    readPersistedLayoutVisibility,
    writePersistedLayoutVisibility,
    getLayoutVisibilityInitialState,
    layoutVisibilityPersistenceMiddleware,
    BLOCKS_PALETTE_FLYOUT_WIDTH_DEFAULT
};
