import {CAPABILITY_PREMIUM_AUTO_UPDATE} from '../../RobboGui/reducers/license_demo';

/**
 * Single gateway for premium.auto_update capability (UI + services).
 *
 * @param {object|null|undefined} licenseState Redux license_demo slice
 * @returns {boolean}
 */
export function hasPremiumAutoUpdateCapability (licenseState) {
    if (!licenseState || licenseState.status !== 'valid_offline') {
        return false;
    }
    if (licenseState.deviceBindingValid === false) {
        return false;
    }
    if (!Array.isArray(licenseState.capabilities)) {
        return false;
    }
    return licenseState.capabilities.indexOf(CAPABILITY_PREMIUM_AUTO_UPDATE) >= 0;
}

/**
 * @param {object|null|undefined} licenseState
 * @returns {{ok: boolean, code?: string}}
 */
export function assertPremiumAutoUpdateCapability (licenseState) {
    if (!licenseState || licenseState.status !== 'valid_offline') {
        return {ok: false, code: 'LICENSE_INACTIVE'};
    }
    if (licenseState.deviceBindingValid === false) {
        return {ok: false, code: 'DEVICE_BINDING_MISMATCH'};
    }
    if (!hasPremiumAutoUpdateCapability(licenseState)) {
        return {ok: false, code: 'CAPABILITY_DENIED'};
    }
    if (!licenseState.addonReady) {
        return {ok: false, code: 'ADDON_NOT_LOADED'};
    }
    return {ok: true};
}
