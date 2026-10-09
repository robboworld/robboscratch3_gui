/**
 * @fileoverview
 * scratch-paint (the costume and backdrop editor, ~3 MB with its own paper.js and fonts) is a
 * separate chunk instead of part of every page load: it is fetched in the background once the
 * editor has shown a project, or right away when a costume editor opens first.
 * Its reducer joins the store from the same chunk as the editor, so both use one paper.js
 * (the reducers check `instanceof paper.Matrix` on what the editor dispatches).
 */
import {combineReducers} from 'redux';

let store = null;
let baseReducers = null;
let loading = null;

/**
 * Remember the app store so the paint reducer can be added once scratch-paint loads.
 * @param {object} appStore - the redux store built by AppStateHOC
 * @param {object} reducers - the reducers that store was built from, by state key
 */
const registerPaintStore = function (appStore, reducers) {
    store = appStore;
    baseReducers = reducers;
};

/**
 * Load scratch-paint (once) and add its reducer to the store.
 * @returns {Promise<React.Component>} the PaintEditor component
 */
const loadPaintEditor = function () {
    if (!loading) {
        loading = import(/* webpackChunkName: "paint-editor" */ 'scratch-paint')
            .then(module => {
                // CommonJS bundle: the exports may come wrapped in `default`.
                const paint = module.ScratchPaintReducer ? module : module.default;
                if (store && baseReducers) {
                    store.replaceReducer(combineReducers(Object.assign({}, baseReducers, {
                        scratchPaint: paint.ScratchPaintReducer
                    })));
                }
                return paint.default;
            });
        // A failed download is retried on the next call.
        loading.catch(() => {
            loading = null;
        });
    }
    return loading;
};

/**
 * Fetch scratch-paint when the browser is idle, so the costume editor opens without waiting.
 */
const preloadPaintEditor = function () {
    const start = () => loadPaintEditor().catch(() => {});
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(start, {timeout: 5000});
    } else {
        setTimeout(start, 2000);
    }
};

export {
    loadPaintEditor,
    preloadPaintEditor,
    registerPaintStore
};
