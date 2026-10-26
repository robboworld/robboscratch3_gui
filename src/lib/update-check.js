/**
 * New version check (desktop): latest.json on the file mirrors, written by scripts/release.sh
 * (scripts/lib/latest-json.mjs). Two channels, offered alike: the stable release and the alpha.
 *
 *   RobboScratch3.0/latest.json        {channel, version, date, important, downloads, notes,
 *                                       packages: {windows|deb|rpm: {version, download}},
 *                                       releases: {<version>: {date, important, notes}}}
 *   RobboScratch3.0/alpha/latest.json  downloads are relative to the file: release/Linux/…, Linux/…
 *
 * Each OS has its own version in `packages` (a Windows build is offered before the Linux packages of
 * that version are out); a latest.json without `packages` has one version for every kind.
 *
 * Mirrors back each other up: a mirror whose web server refuses .json (files.robbo.world answers 403)
 * is read through latest.txt, the same file; the installer is downloaded from the first mirror that
 * has it (resolveDownloadUrl).
 *
 * Plain GET through Node http(s) (no CORS in NW.js, no identifiers sent); no network — nothing shown.
 * The result is cached in localStorage and the mirrors are asked at most every CHECK_INTERVAL_MS.
 */

import {compareVersions} from './whats-new-state';

const MIRRORS = [
    'http://files.robbo.ru/Software/RobboScratch3.0/',
    'https://files.robbo.world/Software/RobboScratch3.0/'
];
const CHANNEL_FILES = {release: 'latest.json', alpha: 'alpha/latest.json'};
/**
 * The same latest.json under a name every web server hands out as a plain file.
 * @param {string} file latest.json path
 * @returns {string} latest.txt path
 */
const textCopy = file => file.replace(/\.json$/, '.txt');
const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_REDIRECTS = 3;

const CACHE_KEY = 'robbo.update.cache';
const ENABLED_KEY = 'robbo.update.enabled';
const SEEN_KEY = 'robbo.update.seen';
const PROMPTED_KEY = 'robbo.update.prompted';

const nwRequire = () => {
    if (typeof window === 'undefined' || !window.nw || typeof window.nw.require !== 'function') return null;
    return window.nw.require;
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
        // storage unavailable: the check simply runs again next time
    }
};

/** @returns {boolean} desktop app on an OS we publish packages for */
export const isUpdateCheckSupported = () => {
    const req = nwRequire();
    if (!req) return false;
    try {
        const platform = req('process').platform;
        return platform === 'win32' || platform === 'linux';
    } catch (e) {
        return false;
    }
};

/** @returns {boolean} the user has not turned the check off */
export const isUpdateCheckEnabled = () => readKey(ENABLED_KEY) !== '0';

/**
 * @param {boolean} enabled check the mirrors for new versions
 * @returns {void}
 */
export const setUpdateCheckEnabled = enabled => writeKey(ENABLED_KEY, enabled ? '1' : '0');

/**
 * Package type the update is downloaded as: Windows installer, or deb / rpm by the Linux distribution.
 * @returns {string} windows | deb | rpm
 */
export const packageKind = () => {
    const req = nwRequire();
    if (!req) return '';
    try {
        if (req('process').platform === 'win32') return 'windows';
        const fs = req('fs');
        if (fs.existsSync('/etc/debian_version')) return 'deb';
        if (fs.existsSync('/usr/bin/rpm') && !fs.existsSync('/usr/bin/dpkg')) return 'rpm';
        const osRelease = fs.existsSync('/etc/os-release') ? fs.readFileSync('/etc/os-release', 'utf8') : '';
        if (/^ID(_LIKE)?=.*(fedora|rhel|centos|suse|altlinux|alt|redos|rosa)/im.test(osRelease)) return 'rpm';
    } catch (e) {
        // fall through to deb, the most common
    }
    return 'deb';
};

const requestText = (url, redirects = 0, method = 'GET') => new Promise((resolve, reject) => {
    const req = nwRequire();
    const lib = req(url.startsWith('https:') ? 'https' : 'http');
    const request = lib.request(url, {method, timeout: REQUEST_TIMEOUT_MS}, response => {
        const {statusCode, headers} = response;
        if (statusCode >= 300 && statusCode < 400 && headers.location && redirects < MAX_REDIRECTS) {
            response.resume();
            resolve(requestText(new URL(headers.location, url).href, redirects + 1, method));
            return;
        }
        if (statusCode !== 200) {
            response.resume();
            reject(new Error(`HTTP ${statusCode}`));
            return;
        }
        let body = '';
        response.setEncoding('utf8');
        response.on('data', chunk => {
            body += chunk;
        });
        response.on('end', () => resolve(body));
    });
    request.on('timeout', () => request.destroy(new Error('timeout')));
    request.on('error', reject);
    request.end();
});

const isLatest = data => Boolean(data && typeof data.version === 'string' && data.downloads &&
    typeof data.downloads === 'object');

/**
 * @param {string} relative download path from latest.json
 * @param {string} channel release | alpha
 * @param {string} first mirror the latest.json came from
 * @returns {Array<string>} absolute links, that mirror first, then the others
 */
const mirrorLinks = (relative, channel, first) => [first].concat(MIRRORS.filter(m => m !== first))
    .map(mirror => new URL(relative, `${mirror}${CHANNEL_FILES[channel]}`).href);

/**
 * @param {string} mirror mirror base URL
 * @param {string} channel release | alpha
 * @returns {Promise<object>} parsed latest.json of the mirror (its .json, else its .txt copy)
 */
const fetchFromMirror = (mirror, channel) => {
    const read = file => requestText(`${mirror}${file}`).then(text => {
        const data = JSON.parse(text);
        if (!isLatest(data)) throw new Error('not a latest.json');
        return data;
    });
    return read(CHANNEL_FILES[channel]).catch(() => read(textCopy(CHANNEL_FILES[channel])));
};

/**
 * @param {string} channel release | alpha
 * @returns {Promise<object|null>} latest.json of the channel from the first mirror that answers, with
 *     absolute download links (`mirrors`: the same file on every mirror); null when no mirror answered
 */
const fetchChannel = channel => MIRRORS.reduce(
    (previous, mirror) => previous.catch(() => fetchFromMirror(mirror, channel).then(data => {
        const downloads = {};
        const mirrors = {};
        Object.keys(data.downloads).forEach(kind => {
            const links = mirrorLinks(data.downloads[kind], channel, mirror);
            downloads[kind] = links[0];
            mirrors[links[0]] = links;
        });
        const packages = {};
        if (data.packages && typeof data.packages === 'object') {
            Object.keys(data.packages).forEach(kind => {
                const entry = data.packages[kind];
                if (entry && typeof entry.version === 'string' && typeof entry.download === 'string') {
                    const links = mirrorLinks(entry.download, channel, mirror);
                    packages[kind] = {version: entry.version, download: links[0]};
                    mirrors[links[0]] = links;
                }
            });
        }
        return Object.assign({}, data, {channel, downloads, packages, mirrors});
    })),
    Promise.reject(new Error('no mirror'))
).catch(() => null);

/**
 * What a channel offers to this kind of package: its own entry in `packages`, else the common version.
 * @param {object} item latest.json of a channel
 * @param {string} kind package kind of this computer
 * @returns {object|null} {channel, version, date, important, notes, downloadUrl}
 */
const offerFor = (item, kind) => {
    const linksOf = url => (item.mirrors && item.mirrors[url]) || [url];
    const own = item.packages && item.packages[kind];
    if (own) {
        const release = (item.releases && item.releases[own.version]) || {};
        return {
            channel: item.channel,
            version: own.version,
            date: release.date || '',
            important: Boolean(release.important),
            notes: release.notes || null,
            downloadUrl: own.download,
            downloadUrls: linksOf(own.download)
        };
    }
    if (!item.downloads[kind]) return null;
    return {
        channel: item.channel,
        version: item.version,
        date: item.date || '',
        important: Boolean(item.important),
        notes: item.notes || null,
        downloadUrl: item.downloads[kind],
        downloadUrls: linksOf(item.downloads[kind])
    };
};

/**
 * Versions to offer: newer than this build; an alpha only when it is newer than the stable one too.
 * @param {Array<object>} latest latest.json of each channel (null for a channel that did not answer)
 * @param {string} current this build's version
 * @param {string} kind package kind of this computer
 * @returns {Array<object>} offers, stable first: {channel, version, date, important, notes, downloadUrl}
 */
export const selectOffers = (latest, current, kind) => {
    const valid = latest
        .map(item => (item ? offerFor(item, kind) : null))
        .filter(offer => offer && compareVersions(offer.version, current) > 0);
    const stable = valid.find(offer => offer.channel === 'release');
    return valid
        .filter(offer => offer.channel === 'release' ||
            !stable || compareVersions(offer.version, stable.version) > 0)
        .sort((a, b) => (a.channel === 'release' ? 0 : 1) - (b.channel === 'release' ? 0 : 1));
};

/**
 * The installer link to open: the first mirror whose file answers, so a mirror that is down or
 * missed the upload does not leave the user with a browser error.
 * @param {object} offer from checkForUpdates
 * @returns {Promise<string>} download link (the first one when no mirror answered: the browser says why)
 */
export const resolveDownloadUrl = offer => {
    const links = (offer.downloadUrls && offer.downloadUrls.length) ? offer.downloadUrls : [offer.downloadUrl];
    if (!nwRequire()) return Promise.resolve(links[0]);
    return links.reduce(
        (previous, link) => previous.catch(() => requestText(link, 0, 'HEAD').then(() => link)),
        Promise.reject(new Error('no mirror'))
    ).catch(() => links[0]);
};

const readCache = () => {
    try {
        const cache = JSON.parse(readKey(CACHE_KEY) || 'null');
        return cache && Array.isArray(cache.latest) && typeof cache.at === 'number' ? cache : null;
    } catch (e) {
        return null;
    }
};

/**
 * @param {string} current this build's version
 * @param {object} [opts] force: ask the mirrors even if the last check is recent
 * @returns {Promise<Array<object>>} offers (see selectOffers); [] when off, unsupported or offline
 */
export const checkForUpdates = (current, opts = {}) => {
    if (!isUpdateCheckSupported() || !isUpdateCheckEnabled()) return Promise.resolve([]);
    const kind = packageKind();
    const cache = readCache();
    if (!opts.force && cache && Date.now() - cache.at < CHECK_INTERVAL_MS) {
        return Promise.resolve(selectOffers(cache.latest, current, kind));
    }
    return Promise.all(Object.keys(CHANNEL_FILES).map(fetchChannel)).then(latest => {
        // offline: keep the previous answer instead of forgetting a known update
        if (latest.some(Boolean)) writeKey(CACHE_KEY, JSON.stringify({at: Date.now(), latest}));
        return selectOffers(latest.some(Boolean) ? latest : ((cache && cache.latest) || []), current, kind);
    });
};

const seenVersions = () => {
    const stored = readKey(SEEN_KEY);
    return stored.split(',').filter(Boolean);
};

/**
 * @param {Array<object>} offers from checkForUpdates
 * @returns {boolean} some offered version has not been seen in the window yet
 */
export const hasUnseenOffers = offers => offers.some(offer => !seenVersions().includes(offer.version));

/** @param {Array<object>} offers shown in the closed window */
export const markOffersSeen = offers => {
    if (offers.length) writeKey(SEEN_KEY, offers.map(offer => offer.version).join(','));
};

/**
 * @param {Array<object>} offers from checkForUpdates
 * @returns {object|undefined} an [Important] offer the window has not opened for by itself yet
 */
export const offerToPrompt = offers => offers.find(offer => offer.important && readKey(PROMPTED_KEY) !== offer.version);

/**
 * @param {string} version the window opened by itself for this offered version
 * @returns {void}
 */
export const markOfferPrompted = version => writeKey(PROMPTED_KEY, version);
