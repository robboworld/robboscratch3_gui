import {
    compareVersions,
    computeWhatsNew,
    isWhatsNewData,
    whatsNewLanguage
} from '../../../src/lib/whats-new-state';

const text = {intro: '', sections: {added: [], changed: [], fixed: []}};
const release = (version, from, important = false) => ({version, date: '01.01.2026', from, important, ru: text, en: text});

// newest first, as scripts/lib/whats-new.mjs writes them
const data = (current, releases) => ({platform: 'desktop', current, releases});

describe('whats-new-state', () => {
    test('compareVersions orders prereleases before the release', () => {
        expect(compareVersions('3.133.1-alpha', '3.133.1')).toBeLessThan(0);
        expect(compareVersions('3.133.1', '3.133.0')).toBeGreaterThan(0);
        expect(compareVersions('3.124.1', '3.136.0-alpha')).toBeLessThan(0);
        expect(compareVersions('1.0.0-alpha', '1.0.0-alpha.1')).toBeLessThan(0);
        expect(compareVersions('1.0.0-alpha.2', '1.0.0-alpha.10')).toBeLessThan(0);
        expect(compareVersions('3.1.0', '3.1.0')).toBe(0);
        expect(compareVersions('garbage', '1.0.0')).toBeLessThan(0);
    });

    test('no lastSeen: the newest release is unread, the window does not open', () => {
        const result = computeWhatsNew(
            data('3.137.0', [release('3.137.0', '3.124.1'), release('3.130.0', '3.124.1')]),
            {lastSeen: '', lastPrompted: ''}
        );
        expect(result.unread.map(r => r.version)).toEqual(['3.137.0']);
        expect(result.sinceVersion).toBe('3.124.1');
        expect(result.autoOpen).toBe(false);
    });

    test('skipped releases: everything after the last opened version, newest first', () => {
        const result = computeWhatsNew(
            data('3.140.0', [release('3.140.0', '3.138.0'), release('3.138.0', '3.137.0'), release('3.137.0', '3.124.1')]),
            {lastSeen: '3.137.0', lastPrompted: ''}
        );
        expect(result.unread.map(r => r.version)).toEqual(['3.140.0', '3.138.0']);
        expect(result.sinceVersion).toBe('3.137.0');
    });

    test('lastSeen between a release base and the release: changes start at lastSeen', () => {
        const result = computeWhatsNew(
            data('3.137.0', [release('3.137.0', '3.124.1')]),
            {lastSeen: '3.130.0', lastPrompted: ''}
        );
        expect(result.unread.map(r => r.version)).toEqual(['3.137.0']);
        expect(result.sinceVersion).toBe('3.130.0');
    });

    test('seen this build or a newer one (downgrade): nothing unread', () => {
        const releases = [release('3.137.0', '3.124.1')];
        expect(computeWhatsNew(data('3.137.0', releases), {lastSeen: '3.137.0', lastPrompted: ''}).unread).toEqual([]);
        expect(computeWhatsNew(data('3.137.0', releases), {lastSeen: '3.140.0', lastPrompted: ''}).unread).toEqual([]);
    });

    test('alpha build without its own release message: no new unread after the last release was seen', () => {
        const result = computeWhatsNew(
            data('3.138.0-alpha', [release('3.137.0', '3.124.1')]),
            {lastSeen: '3.137.0', lastPrompted: ''}
        );
        expect(result.unread).toEqual([]);
    });

    test('releases newer than the build are ignored', () => {
        const result = computeWhatsNew(
            data('3.137.0', [release('3.140.0', '3.137.0'), release('3.137.0', '3.124.1')]),
            {lastSeen: '3.130.0', lastPrompted: ''}
        );
        expect(result.unread.map(r => r.version)).toEqual(['3.137.0']);
    });

    test('[Important] opens the window once per build', () => {
        const d = data('3.137.0', [release('3.137.0', '3.124.1', true)]);
        expect(computeWhatsNew(d, {lastSeen: '3.130.0', lastPrompted: ''}).autoOpen).toBe(true);
        expect(computeWhatsNew(d, {lastSeen: '3.130.0', lastPrompted: '3.137.0'}).autoOpen).toBe(false);
        expect(computeWhatsNew(d, {lastSeen: '3.137.0', lastPrompted: ''}).autoOpen).toBe(false);
    });

    test('isWhatsNewData rejects broken files', () => {
        expect(isWhatsNewData(null)).toBe(false);
        expect(isWhatsNewData({current: '1.0.0'})).toBe(false);
        expect(isWhatsNewData({current: '1.0.0', releases: [{version: '1.0.0'}]})).toBe(false);
        expect(isWhatsNewData(data('1.0.0', [release('1.0.0', '0.9.0')]))).toBe(true);
    });

    test('Russian interface gets ru, every other language en', () => {
        expect(whatsNewLanguage('ru')).toBe('ru');
        expect(whatsNewLanguage('de')).toBe('en');
        expect(whatsNewLanguage('zh-cn')).toBe('en');
        expect(whatsNewLanguage('')).toBe('en');
    });
});
