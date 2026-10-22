import {selectOffers} from '../../../src/lib/update-check';

const latest = (channel, version, important = false) => ({
    channel,
    version,
    date: '01.01.2026',
    important,
    notes: null,
    downloads: {
        windows: `https://mirror/${channel}/robboScratch-${version}-x64.exe`,
        deb: `https://mirror/${channel}/robboScratch_${version}_amd64.deb`
    }
});

describe('update-check selectOffers', () => {
    test('nothing newer than the build: no offers', () => {
        expect(selectOffers([latest('release', '3.124.1'), latest('alpha', '3.124.0-alpha')], '3.124.1', 'deb'))
            .toEqual([]);
    });

    test('a newer stable release is offered with the link for this computer', () => {
        const offers = selectOffers([latest('release', '3.140.0'), null], '3.124.1', 'windows');
        expect(offers.map(o => [o.channel, o.version])).toEqual([['release', '3.140.0']]);
        expect(offers[0].downloadUrl).toBe('https://mirror/release/robboScratch-3.140.0-x64.exe');
    });

    test('alpha is offered alike when it is newer than the build and the stable one', () => {
        const offers = selectOffers([latest('release', '3.124.1'), latest('alpha', '3.137.0-alpha')], '3.124.1', 'deb');
        expect(offers.map(o => [o.channel, o.version])).toEqual([['alpha', '3.137.0-alpha']]);
    });

    test('newer stable and newer alpha: both, stable first', () => {
        const offers = selectOffers([latest('alpha', '3.141.0-alpha'), latest('release', '3.140.0')], '3.124.1', 'deb');
        expect(offers.map(o => o.version)).toEqual(['3.140.0', '3.141.0-alpha']);
    });

    test('an alpha older than the stable release is not offered', () => {
        const offers = selectOffers([latest('release', '3.137.0'), latest('alpha', '3.137.0-alpha')], '3.124.1', 'deb');
        expect(offers.map(o => o.version)).toEqual(['3.137.0']);
    });

    test('an alpha user gets the next alpha and the final release', () => {
        expect(selectOffers([latest('alpha', '3.138.0-alpha')], '3.137.0-alpha', 'deb').map(o => o.version))
            .toEqual(['3.138.0-alpha']);
        expect(selectOffers([latest('release', '3.137.0')], '3.137.0-alpha', 'deb').map(o => o.version))
            .toEqual(['3.137.0']);
    });

    test('no package for this computer: not offered', () => {
        expect(selectOffers([latest('release', '3.140.0')], '3.124.1', 'rpm')).toEqual([]);
    });
});
