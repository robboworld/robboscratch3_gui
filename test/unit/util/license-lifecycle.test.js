/* Desktop licence lifecycle: start-up check reasons, token refresh, seat release. */

jest.mock('../../../src/lib/platform.js', () => ({
    isDesktopWithBluetooth: () => true,
    openExternalUrl: jest.fn()
}));
jest.mock('../../../src/RobboGui/AboutWindowComponent.js', () => ({APP_VERSION: '0.0.0-test'}));
jest.mock('../../../src/lib/licensing/activationClient.js', () => ({
    postActivate: jest.fn(),
    postDeviceLinkStart: jest.fn(),
    postDeviceLinkPoll: jest.fn(),
    postTokenRefresh: jest.fn(),
    postSeatRelease: jest.fn()
}));
jest.mock('../../../src/lib/licensing/verifyJwtRs256.js', () => ({verifyActivationJwt: jest.fn()}));
jest.mock('../../../src/lib/licensing/deviceFingerprint.js', () => ({
    computeDeviceFingerprint: () => Promise.resolve('fp-a'),
    getCachedDeviceFingerprint: () => 'fp-a',
    LS_FP_CACHE: 'rs3_fp_cache'
}));
jest.mock('../../../src/lib/licensing/loadPaidAddon.js', () => ({
    loadPaidAddonFromManifestUrl: jest.fn(() => Promise.resolve()),
    clearAddonCache: jest.fn()
}));
jest.mock('../../../src/lib/licensing/paidAddonRegistry.js', () => ({reset: jest.fn()}));
jest.mock('../../../src/lib/licensing/capabilityGateway.js', () => ({
    assertPremiumAutoUpdateCapability: () => ({ok: false, code: 'TEST'})
}));

import {postSeatRelease, postTokenRefresh} from '../../../src/lib/licensing/activationClient.js';
import {verifyActivationJwt} from '../../../src/lib/licensing/verifyJwtRs256.js';
import {loadPaidAddonFromManifestUrl} from '../../../src/lib/licensing/loadPaidAddon.js';
import licenseReducer, {
    LS_BOUND_FP,
    LS_TOKEN,
    licenseInitialState
} from '../../../src/RobboGui/reducers/license.js';
import {
    hydrateLicenseThunk,
    refreshLicenseThunk,
    releaseLicenseThunk
} from '../../../src/RobboGui/actions/licenseActions.js';

const DAY = 24 * 60 * 60;
const now = () => Math.floor(Date.now() / 1000);

const claims = extra => Object.assign({
    licenseId: 'lic-1-seat-1',
    seatId: 'seat-1',
    capabilities: ['premium.auto_update'],
    exp: now() + (30 * DAY),
    deviceBinding: 'fp-a',
    tariff: 'Individual',
    ownerName: 'Ivan Petrov'
}, extra);

/** Real license reducer behind a dispatch that runs thunks. */
const makeStore = license => {
    let state = {scratchGui: {license: Object.assign(licenseInitialState(), license)}};
    const actions = [];
    const getState = () => state;
    const dispatch = action => {
        if (typeof action === 'function') return action(dispatch, getState);
        actions.push(action);
        state = {scratchGui: {license: licenseReducer(state.scratchGui.license, action)}};
        return action;
    };
    return {dispatch, getState, actions, license: () => state.scratchGui.license};
};

const storeToken = token => {
    localStorage.setItem(LS_TOKEN, token);
    localStorage.setItem(LS_BOUND_FP, 'fp-a');
};

const httpError = (status, reason) => Object.assign(new Error(`http_${status}`), {status, reason});
const offlineError = () => Object.assign(new Error('device_token_offline'), {offline: true});

// The refresh pause is per module: every test forces it.
const refresh = store => store.dispatch(refreshLicenseThunk({force: true}));

beforeEach(() => {
    // jsdom 9 has no localStorage.
    const items = {};
    window.localStorage = {
        getItem: key => (Object.prototype.hasOwnProperty.call(items, key) ? items[key] : null),
        setItem: (key, value) => {
            items[key] = String(value);
        },
        removeItem: key => {
            delete items[key];
        }
    };
    jest.clearAllMocks();
    postTokenRefresh.mockImplementation(() => Promise.reject(offlineError()));
});

describe('start-up check of the stored licence', () => {
    test('a valid token activates the licence with tariff and owner', () => {
        storeToken('tok-1');
        verifyActivationJwt.mockReturnValue(Promise.resolve(claims()));
        const store = makeStore();
        return store.dispatch(hydrateLicenseThunk()).then(() => {
            expect(store.license().status).toBe('valid_offline');
            expect(store.license().tariff).toBe('Individual');
            expect(store.license().ownerName).toBe('Ivan Petrov');
            expect(store.license().reason).toBe('');
        });
    });

    test('an expired token is kept, says when it expired and asks the ЛК for a renewal', () => {
        storeToken('tok-old');
        const exp = now() - DAY;
        verifyActivationJwt.mockImplementation(() => Promise.reject(
            Object.assign(new Error('license_expired'), {payload: claims({exp})})
        ));
        const store = makeStore();
        return store.dispatch(hydrateLicenseThunk()).then(() => {
            expect(localStorage.getItem(LS_TOKEN)).toBe('tok-old');
            expect(store.license().status).toBe('expired');
            expect(store.license().reason).toBe('expired');
            expect(store.license().expiresAt).toBe(exp);
            expect(store.license().feedback.phase).toBe('lapsed');
            expect(postTokenRefresh).toHaveBeenCalled();
        });
    });

    test('a token of another computer is removed with its reason', () => {
        storeToken('tok-1');
        localStorage.setItem(LS_BOUND_FP, 'fp-other');
        const store = makeStore();
        return store.dispatch(hydrateLicenseThunk()).then(() => {
            expect(localStorage.getItem(LS_TOKEN)).toBeNull();
            expect(store.license().status).toBe('inactive');
            expect(store.license().reason).toBe('other_device');
            expect(store.license().feedback.phase).toBe('lapsed');
        });
    });

    test('a forged token is removed as damaged', () => {
        storeToken('tok-bad');
        verifyActivationJwt.mockImplementation(() => Promise.reject(new Error('invalid_signature')));
        const store = makeStore();
        return store.dispatch(hydrateLicenseThunk()).then(() => {
            expect(localStorage.getItem(LS_TOKEN)).toBeNull();
            expect(store.license().reason).toBe('invalid');
        });
    });

    test('the expired notice is shown once per expiry', () => {
        const exp = now() - DAY;
        const expired = () => Promise.reject(
            Object.assign(new Error('license_expired'), {payload: claims({exp})})
        );
        storeToken('tok-old');
        verifyActivationJwt.mockImplementation(expired);
        const first = makeStore();
        return first.dispatch(hydrateLicenseThunk()).then(() => {
            const second = makeStore();
            return second.dispatch(hydrateLicenseThunk()).then(() => {
                expect(first.license().feedback.phase).toBe('lapsed');
                expect(second.license().feedback.phase).toBe('idle');
                expect(second.license().reason).toBe('expired');
            });
        });
    });
});

describe('token refresh', () => {
    test('a renewed token replaces the old one and loads the addon of an expired licence', () => {
        storeToken('tok-old');
        const exp = now() + (365 * DAY);
        postTokenRefresh.mockReturnValue(Promise.resolve({signedOfflineToken: 'tok-new', addonManifestUrl: 'm'}));
        verifyActivationJwt.mockReturnValue(Promise.resolve(claims({exp, tariff: 'Class', ownerName: ''})));
        const store = makeStore({status: 'expired', reason: 'expired', signedOfflineToken: 'tok-old'});
        return refresh(store).then(result => {
            expect(result).toBe('renewed');
            expect(localStorage.getItem(LS_TOKEN)).toBe('tok-new');
            expect(store.license().status).toBe('valid_offline');
            expect(store.license().reason).toBe('');
            expect(store.license().expiresAt).toBe(exp);
            expect(store.license().tariff).toBe('Class');
            expect(store.license().ownerName).toBe('');
            expect(loadPaidAddonFromManifestUrl).toHaveBeenCalled();
        });
    });

    test('a seat removed in the ЛК ends the licence here', () => {
        storeToken('tok-1');
        postTokenRefresh.mockImplementation(() => Promise.reject(httpError(403, 'seat_removed')));
        const store = makeStore({status: 'valid_offline', signedOfflineToken: 'tok-1'});
        return refresh(store).then(result => {
            expect(result).toBe('ended');
            expect(localStorage.getItem(LS_TOKEN)).toBeNull();
            expect(store.license().status).toBe('inactive');
            expect(store.license().reason).toBe('seat_removed');
        });
    });

    test('a licence ended early in the ЛК turns expired but keeps the token', () => {
        storeToken('tok-1');
        postTokenRefresh.mockImplementation(() => Promise.reject(httpError(403, 'expired')));
        const store = makeStore({status: 'valid_offline', signedOfflineToken: 'tok-1', tariff: 'Individual'});
        return refresh(store).then(result => {
            expect(result).toBe('ended');
            expect(localStorage.getItem(LS_TOKEN)).toBe('tok-1');
            expect(store.license().status).toBe('expired');
            expect(store.license().tariff).toBe('Individual');
        });
    });

    test('offline nothing changes', () => {
        storeToken('tok-1');
        const store = makeStore({status: 'valid_offline', signedOfflineToken: 'tok-1'});
        return refresh(store).then(result => {
            expect(result).toBe('unchanged');
            expect(localStorage.getItem(LS_TOKEN)).toBe('tok-1');
            expect(store.license().status).toBe('valid_offline');
            expect(store.license().isRefreshing).toBe(false);
        });
    });
});

describe('Deactivate', () => {
    test('frees the seat in the ЛК, then forgets the licence', () => {
        storeToken('tok-1');
        postSeatRelease.mockReturnValue(Promise.resolve({ok: true, seatId: 'seat-1'}));
        const store = makeStore({status: 'valid_offline', signedOfflineToken: 'tok-1'});
        return store.dispatch(releaseLicenseThunk()).then(result => {
            expect(result).toBe('released');
            expect(postSeatRelease.mock.calls[0][1]).toEqual({signedOfflineToken: 'tok-1', deviceFingerprint: 'fp-a'});
            expect(localStorage.getItem(LS_TOKEN)).toBeNull();
            expect(store.license().status).toBe('inactive');
        });
    });

    test('a seat already free still forgets the licence', () => {
        storeToken('tok-1');
        postSeatRelease.mockImplementation(() => Promise.reject(httpError(404, 'seat_removed')));
        const store = makeStore({status: 'valid_offline', signedOfflineToken: 'tok-1'});
        return store.dispatch(releaseLicenseThunk()).then(result => {
            expect(result).toBe('released');
            expect(localStorage.getItem(LS_TOKEN)).toBeNull();
        });
    });

    test('a ЛК without the release request (bare 404) keeps the licence and asks', () => {
        storeToken('tok-1');
        postSeatRelease.mockImplementation(() => Promise.reject(httpError(404, '')));
        const store = makeStore({status: 'valid_offline', signedOfflineToken: 'tok-1'});
        return store.dispatch(releaseLicenseThunk()).then(result => {
            expect(result).toBe('offline');
            expect(localStorage.getItem(LS_TOKEN)).toBe('tok-1');
        });
    });

    test('offline keeps the licence until the user confirms', () => {
        storeToken('tok-1');
        postSeatRelease.mockImplementation(() => Promise.reject(offlineError()));
        const store = makeStore({status: 'valid_offline', signedOfflineToken: 'tok-1'});
        return store.dispatch(releaseLicenseThunk()).then(result => {
            expect(result).toBe('offline');
            expect(localStorage.getItem(LS_TOKEN)).toBe('tok-1');
            expect(store.license().status).toBe('valid_offline');
        });
    });
});
