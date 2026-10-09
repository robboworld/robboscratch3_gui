import {addLocaleData} from 'react-intl';

import {localeData, isRtl} from 'scratch-l10n';
// Robbo: only the default (ru) and fallback (en) languages are bundled; the other locales (~55) are
// separate chunks loaded on demand by loadLocaleMessages (all of them together weigh ~4 MB)
import enMessages from 'scratch-l10n/locales/editor/en.json';
import ruMessages from 'scratch-l10n/locales/editor/ru.json';

addLocaleData(localeData);

const UPDATE_LOCALES = 'scratch-gui/locales/UPDATE_LOCALES';
const SELECT_LOCALE = 'scratch-gui/locales/SELECT_LOCALE';

const loadedMessages = {
    en: enMessages,
    ru: ruMessages
};

/**
 * Make sure messages for `locale` are loaded.
 * @param {string} locale - locale code from scratch-l10n
 * @returns {Promise<object>} all messages loaded so far, keyed by locale
 */
const loadLocaleMessages = function (locale) {
    if (Object.prototype.hasOwnProperty.call(loadedMessages, locale)) {
        return Promise.resolve(Object.assign({}, loadedMessages));
    }
    return import(
        /* webpackChunkName: "locale-[request]" */
        `scratch-l10n/locales/editor/${locale}.json`
    ).then(module => {
        loadedMessages[locale] = module.default || module;
        return Object.assign({}, loadedMessages);
    });
};

const mergeWithEnglishFallback = (messagesByLocale, locale) => (
    Object.assign({}, messagesByLocale.en, messagesByLocale[locale])
);

const initialState = {
    isRtl: false,
    locale: 'ru',
    messagesByLocale: Object.assign({}, loadedMessages),
    messages: mergeWithEnglishFallback(loadedMessages, 'ru')
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SELECT_LOCALE:
        return Object.assign({}, state, {
            isRtl: isRtl(action.locale),
            locale: action.locale,
            messagesByLocale: state.messagesByLocale,
            messages: mergeWithEnglishFallback(state.messagesByLocale, action.locale)
        });
    case UPDATE_LOCALES:
        return Object.assign({}, state, {
            isRtl: state.isRtl,
            locale: state.locale,
            messagesByLocale: action.messagesByLocale,
            messages: mergeWithEnglishFallback(action.messagesByLocale, state.locale)
        });
    default:
        return state;
    }
};

const selectLocale = function (locale) {
    return {
        type: SELECT_LOCALE,
        locale: locale
    };
};

const setLocales = function (localesMessages) {
    return {
        type: UPDATE_LOCALES,
        messagesByLocale: localesMessages
    };
};

/**
 * Load the messages for `locale` if needed, then switch to it.
 * Works with a plain dispatch (no thunk middleware required).
 * @param {function} dispatch - redux dispatch
 * @param {string} locale - locale code from scratch-l10n
 * @returns {Promise} resolves once the locale is selected
 */
const changeLocale = function (dispatch, locale) {
    return loadLocaleMessages(locale).then(messagesByLocale => {
        dispatch(setLocales(messagesByLocale));
        dispatch(selectLocale(locale));
    });
};

const initLocale = function (currentState, locale) {
    if (currentState.messagesByLocale.hasOwnProperty(locale)) {
        return Object.assign(
            {},
            currentState,
            {
                isRtl: isRtl(locale),
                locale: locale,
                messagesByLocale: currentState.messagesByLocale,
                messages: mergeWithEnglishFallback(currentState.messagesByLocale, locale)
            }
        );
    }
    // don't change locale if it's not in the current messages (lazy locales: see changeLocale)
    return currentState;
};
export {
    reducer as default,
    initialState as localesInitialState,
    changeLocale,
    initLocale,
    loadLocaleMessages,
    selectLocale,
    setLocales
};
