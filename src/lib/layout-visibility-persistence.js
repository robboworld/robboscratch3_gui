import {
    BLOCKS_PALETTE_FLYOUT_WIDTH_DEFAULT,
    clampFlyoutWidth,
    layoutVisibilityInitialState
} from '../reducers/layout-visibility';

// Layout panel state + user-selected UI locale (scratch-gui-layout-visibility-v1)
const STORAGE_KEY = 'scratch-gui-layout-visibility-v1';
const SELECT_LOCALE = 'scratch-gui/locales/SELECT_LOCALE';

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
        const result = {
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
        if (typeof parsed.locale === 'string') {
            result.locale = parsed.locale;
        }
        return result;
    } catch (e) {
        return null;
    }
};

const readPersistedLocale = function (supportedLocales) {
    const persisted = readPersistedLayoutVisibility();
    if (!persisted || typeof persisted.locale !== 'string') {
        return null;
    }
    if (supportedLocales.includes(persisted.locale)) {
        return persisted.locale;
    }
    return null;
};

const writePersistedLayoutVisibility = function (layout, locale) {
    if (typeof window === 'undefined' || !window.localStorage || !layout) {
        return;
    }
    try {
        const persisted = readPersistedLayoutVisibility();
        const payload = {
            isRightPanelHidden: layout.isRightPanelHidden,
            isBlocksPaletteCollapsed: layout.isBlocksPaletteCollapsed,
            blocksPaletteFlyoutWidth: layout.blocksPaletteFlyoutWidth
        };
        if (locale !== undefined) {
            payload.locale = locale;
        } else if (persisted && persisted.locale) {
            payload.locale = persisted.locale;
        }
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
        // Ignore quota / private mode errors.
    }
};

const getLayoutVisibilityInitialState = function () {
    const persisted = readPersistedLayoutVisibility();
    if (!persisted) {
        return layoutVisibilityInitialState;
    }
    const {locale, ...layoutFields} = persisted;
    return Object.assign({}, layoutVisibilityInitialState, layoutFields);
};

const persistLayoutAndLocale = function (store) {
    const state = store.getState();
    const localesState = state.locales;
    const layout = state.scratchGui && state.scratchGui.layoutVisibility;
    const persisted = readPersistedLayoutVisibility();
    const layoutSnapshot = layout || {
        isRightPanelHidden: persisted ?
            persisted.isRightPanelHidden :
            layoutVisibilityInitialState.isRightPanelHidden,
        isBlocksPaletteCollapsed: persisted ?
            persisted.isBlocksPaletteCollapsed :
            layoutVisibilityInitialState.isBlocksPaletteCollapsed,
        blocksPaletteFlyoutWidth: persisted ?
            persisted.blocksPaletteFlyoutWidth :
            layoutVisibilityInitialState.blocksPaletteFlyoutWidth
    };
    const locale = localesState ? localesState.locale : undefined;
    writePersistedLayoutVisibility(layoutSnapshot, locale);
};

const layoutVisibilityPersistenceMiddleware = store => next => action => {
    const result = next(action);
    if (action.type && action.type.indexOf('scratch-gui/layout-visibility/') === 0) {
        const layout = store.getState().scratchGui && store.getState().scratchGui.layoutVisibility;
        if (layout) {
            writePersistedLayoutVisibility(layout);
        }
    } else if (action.type === SELECT_LOCALE) {
        persistLayoutAndLocale(store);
    }
    return result;
};

export {
    STORAGE_KEY,
    SELECT_LOCALE,
    readPersistedLayoutVisibility,
    readPersistedLocale,
    writePersistedLayoutVisibility,
    getLayoutVisibilityInitialState,
    layoutVisibilityPersistenceMiddleware,
    BLOCKS_PALETTE_FLYOUT_WIDTH_DEFAULT
};
