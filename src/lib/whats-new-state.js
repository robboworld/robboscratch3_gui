/**
 * «Что нового»: which release messages the user has not seen yet.
 *
 * Data: static/whats-new.json next to index.html, written by scripts/build.mjs from release-notes/*.md
 * (only for platforms where the feature is on; without the file the menu item is hidden).
 * Shape: {platform, current, releases: [{version, date, from, important, ru, en}]}, newest first.
 *
 * Storage (localStorage):
 *   lastSeen     — build version at the moment the user last closed the window: messages up to it are read;
 *   lastPrompted — build version for which the window was already opened by itself ([Important]).
 * Unread = releases newer than lastSeen and not newer than the build. Without lastSeen (first run of a
 * version with this feature, or a fresh install) the newest release counts as unread: a dot, no window.
 */

export const WHATS_NEW_URL = './static/whats-new.json';
const LAST_SEEN_KEY = 'robbo.whatsNew.lastSeen';
const LAST_PROMPTED_KEY = 'robbo.whatsNew.lastPrompted';

const parseVersion = text => {
    const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(String(text || '').trim());
    if (!match) return null;
    return {core: [Number(match[1]), Number(match[2]), Number(match[3])], pre: match[4] ? match[4].split('.') : []};
};

/**
 * SemVer order with prereleases (3.133.1-alpha < 3.133.1); an unparsable version sorts lowest.
 * Same rules as compareVersions in scripts/lib/whats-new.mjs.
 * @param {string} a version
 * @param {string} b version
 * @returns {number} <0, 0, >0
 */
export const compareVersions = (a, b) => {
    const left = parseVersion(a);
    const right = parseVersion(b);
    if (!left || !right) return (left ? 1 : 0) - (right ? 1 : 0);
    for (let i = 0; i < 3; i++) {
        if (left.core[i] !== right.core[i]) return left.core[i] - right.core[i];
    }
    if (!left.pre.length || !right.pre.length) return right.pre.length - left.pre.length;
    for (let i = 0; i < Math.max(left.pre.length, right.pre.length); i++) {
        const x = left.pre[i];
        const y = right.pre[i];
        if (typeof x === 'undefined' || typeof y === 'undefined') return typeof x === 'undefined' ? -1 : 1;
        if (x === y) continue;
        const xNum = /^\d+$/.test(x);
        const yNum = /^\d+$/.test(y);
        if (xNum && yNum) return Number(x) - Number(y);
        if (xNum !== yNum) return xNum ? -1 : 1;
        return x < y ? -1 : 1;
    }
    return 0;
};

const readKey = key => {
    try {
        return window.localStorage.getItem(key) || '';
    } catch (e) {
        return '';
    }
};

const writeKey = (key, value) => {
    try {
        window.localStorage.setItem(key, value);
    } catch (e) {
        // storage unavailable: the dot simply shows again next time
    }
};

const isRelease = release => Boolean(release && typeof release.version === 'string' && release.ru && release.en);

/**
 * @param {object} data whats-new.json
 * @returns {boolean} the file has the expected shape
 */
export const isWhatsNewData = data => Boolean(data && typeof data.current === 'string' &&
    Array.isArray(data.releases) && data.releases.every(isRelease));

/**
 * @param {object} data whats-new.json
 * @param {{lastSeen: string, lastPrompted: string}} stored values from localStorage
 * @returns {{unread: Array<object>, sinceVersion: string, autoOpen: boolean}} unread releases (newest first),
 * the version the unread changes start from, whether the window opens by itself
 */
export const computeWhatsNew = (data, {lastSeen, lastPrompted}) => {
    const releases = data.releases.filter(release => compareVersions(release.version, data.current) <= 0);
    let unread;
    if (!lastSeen) {
        unread = releases.slice(0, 1);
    } else if (compareVersions(lastSeen, data.current) >= 0) {
        unread = [];
    } else {
        unread = releases.filter(release => compareVersions(release.version, lastSeen) > 0);
    }
    const oldest = unread[unread.length - 1];
    // after a skipped release the changes start at what the user last opened, otherwise at the release base
    const sinceVersion = lastSeen && oldest && compareVersions(lastSeen, oldest.from || '') > 0 ?
        lastSeen : ((oldest && oldest.from) || '');
    return {
        unread,
        sinceVersion,
        autoOpen: unread.some(release => release.important) && lastPrompted !== data.current
    };
};

/** @returns {{lastSeen: string, lastPrompted: string}} values from localStorage, '' when absent */
export const readWhatsNewStorage = () => ({
    lastSeen: readKey(LAST_SEEN_KEY),
    lastPrompted: readKey(LAST_PROMPTED_KEY)
});

/**
 * @param {string} version build version the user has now seen
 * @returns {void}
 */
export const markWhatsNewSeen = version => writeKey(LAST_SEEN_KEY, version);

/**
 * @param {string} version build version for which the window opened by itself
 * @returns {void}
 */
export const markWhatsNewPrompted = version => writeKey(LAST_PROMPTED_KEY, version);

/**
 * @param {string} locale GUI locale
 * @returns {string} language of the release text: ru for Russian, en for every other interface language
 */
export const whatsNewLanguage = locale => {
    const language = String(locale || '').toLowerCase();
    return language.startsWith('ru') ? 'ru' : 'en';
};
