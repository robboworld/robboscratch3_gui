/* Desktop licence fingerprint material must not depend on the network being up. */

import {desktopMaterial} from '../../../src/lib/licensing/deviceFingerprint.js';

const osWith = ifaces => ({
    platform: () => 'linux',
    arch: () => 'x64',
    hostname: () => 'class-pc-07',
    networkInterfaces: () => ifaces
});

const online = osWith({
    lo: [{internal: true, mac: '00:00:00:00:00:00'}],
    enp3s0: [{internal: false, mac: '3c:7c:3f:aa:bb:cc'}]
});
const offline = osWith({
    lo: [{internal: true, mac: '00:00:00:00:00:00'}]
});
const onWifi = osWith({
    lo: [{internal: true, mac: '00:00:00:00:00:00'}],
    wlp2s0: [{internal: false, mac: '9c:b6:d0:11:22:33'}]
});

describe('desktop fingerprint material', () => {
    test('same with the cable in, out, or on Wi-Fi', () => {
        const material = desktopMaterial(online, 'mid-1');
        expect(desktopMaterial(offline, 'mid-1')).toBe(material);
        expect(desktopMaterial(onWifi, 'mid-1')).toBe(material);
        expect(material).toBe('rs3-desktop-v2|linux|x64|class-pc-07|mid-1');
    });

    test('cloned image: same machine id, different host names', () => {
        const other = Object.assign({}, online, {hostname: () => 'class-pc-08'});
        expect(desktopMaterial(other, 'mid-1')).not.toBe(desktopMaterial(online, 'mid-1'));
    });

    test('no machine id: falls back to the MAC', () => {
        expect(desktopMaterial(online, '')).toBe('rs3-desktop-v2|linux|x64|class-pc-07|3c:7c:3f:aa:bb:cc');
    });
});
