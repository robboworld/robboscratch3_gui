/**
 * Holds the paid-addon-registered Premium auto-update implementation (demo).
 */
let paidAutoUpdateService = null;
let lastLicenseContext = null;

const CAPABILITY_PREMIUM_AUTO_UPDATE = 'premium.auto_update';

function licenseContextAllowsPremium (ctx) {
    if (!ctx || ctx.deviceBindingValid === false) {
        return false;
    }
    if (!Array.isArray(ctx.capabilities)) {
        return false;
    }
    return ctx.capabilities.indexOf(CAPABILITY_PREMIUM_AUTO_UPDATE) >= 0;
}

const paidAddonRegistry = {
    getHooksForBootstrap () {
        return {
            /**
             * @param {{ checkForUpdates: function (): Promise<object> }} impl
             */
            registerPaidAutoUpdate (impl) {
                paidAutoUpdateService = impl;
            }
        };
    },

    setLicenseContext (ctx) {
        lastLicenseContext = ctx || null;
    },

    reset () {
        paidAutoUpdateService = null;
        lastLicenseContext = null;
        try {
            if (typeof window !== 'undefined') {
                delete window.__RS3_PAID_ADDON_FACTORY__;
            }
        } catch (e) { /* ignore */ }
    },

    getPaidAutoUpdateService () {
        return paidAutoUpdateService;
    },

    /** @returns {Promise<object>} */
    invokePremiumAutoUpdateDemo (licenseContext) {
        const ctx = licenseContext || lastLicenseContext;
        if (!licenseContextAllowsPremium(ctx)) {
            return Promise.resolve({
                error: 'CAPABILITY_DENIED',
                message: 'Paid addon rejected: license context invalid or capability missing.'
            });
        }
        if (!paidAutoUpdateService || typeof paidAutoUpdateService.checkForUpdates !== 'function') {
            return Promise.resolve({
                error: 'ADDON_NOT_LOADED',
                message: 'Paid addon stub is not registered yet.'
            });
        }
        return paidAutoUpdateService.checkForUpdates(ctx);
    }
};

export default paidAddonRegistry;
