/**
 * @fileoverview
 * Startup locale: URL, saved layout preference, browser, then en fallback.
 */

import queryString from 'query-string';

import {readPersistedLocale} from './layout-visibility-persistence';

const DEFAULT_LOCALE = 'en';

/**
 * @param {Array.string} supportedLocales
 * @return {?string} locale from URL or null
 */
const getLocaleFromUrl = function (supportedLocales) {
    const queryParams = queryString.parse(location.search);
    const potentialLocales = [].concat(queryParams.locale, queryParams.lang).filter(l => l);
    if (!potentialLocales.length) {
        return null;
    }
    const urlLocale = potentialLocales[0].toLowerCase();
    if (supportedLocales.includes(urlLocale)) {
        return urlLocale;
    }
    return null;
};

/**
 * @param {Array.string} supportedLocales
 * @return {string}
 */
const getLocaleFromBrowser = function (supportedLocales) {
    let locale = DEFAULT_LOCALE;
    let browserLocale = window.navigator.userLanguage || window.navigator.language;
    browserLocale = browserLocale.toLowerCase();
    if (supportedLocales.includes(browserLocale)) {
        locale = browserLocale;
    } else {
        browserLocale = browserLocale.split('-')[0];
        if (supportedLocales.includes(browserLocale)) {
            locale = browserLocale;
        }
    }
    return locale;
};

/**
 * @param {Array.string} supportedLocales
 * @return {string}
 */
const resolveStartupLocale = function (supportedLocales) {
    const fromUrl = getLocaleFromUrl(supportedLocales);
    if (fromUrl) {
        return fromUrl;
    }
    const fromStorage = readPersistedLocale(supportedLocales);
    if (fromStorage) {
        return fromStorage;
    }
    return getLocaleFromBrowser(supportedLocales);
};

/**
 * Browser + URL only (no localStorage). Kept for unit tests and legacy callers.
 * @param {Array.string} supportedLocales
 * @return {string}
 */
const detectLocale = function (supportedLocales) {
    const fromUrl = getLocaleFromUrl(supportedLocales);
    if (fromUrl) {
        return fromUrl;
    }
    return getLocaleFromBrowser(supportedLocales);
};

export {
    DEFAULT_LOCALE,
    detectLocale,
    getLocaleFromBrowser,
    getLocaleFromUrl,
    resolveStartupLocale
};
