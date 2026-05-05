/**
 * Holds the paid-addon-registered Premium auto-update implementation (demo).
 */
let paidAutoUpdateService = null;

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

    reset () {
        paidAutoUpdateService = null;
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
    invokePremiumAutoUpdateDemo () {
        if (!paidAutoUpdateService || typeof paidAutoUpdateService.checkForUpdates !== 'function') {
            return Promise.resolve({
                error: 'premium_addon_not_ready',
                message: 'Paid addon stub is not registered yet.'
            });
        }
        return paidAutoUpdateService.checkForUpdates();
    }
};

export default paidAddonRegistry;
