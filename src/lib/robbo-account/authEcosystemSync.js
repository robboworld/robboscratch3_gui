import {getSessionStatus, clearAccessTokenMemory} from './robboAccountClient';

const DEFAULT_POLL_MS = 5000;

/**
 * Poll BFF session so logout in ЛК/LMS clears RS UI (shared lk_bff_session on :8080).
 * @param {{isAuthenticated: function(): boolean, onSessionLost: function(): void, pollIntervalMs?: number}} opts
 * @returns {function(): void} stop
 */
export function startBffSessionWatch ({
    isAuthenticated,
    onSessionLost,
    pollIntervalMs = DEFAULT_POLL_MS
}) {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return () => {};
    }

    let lastAuthenticated = Boolean(isAuthenticated());
    let stopped = false;

    const runCheck = () => {
        if (stopped) {
            return Promise.resolve();
        }
        return getSessionStatus()
            .then(status => {
                const authenticated = Boolean(status && status.authenticated);
                if (lastAuthenticated && !authenticated) {
                    clearAccessTokenMemory();
                    onSessionLost();
                }
                lastAuthenticated = authenticated;
            })
            .catch(() => {});
    };

    const onVisibility = () => {
        if (document.visibilityState === 'visible') {
            runCheck();
        }
    };

    document.addEventListener('visibilitychange', onVisibility);
    const timer = window.setInterval(runCheck, pollIntervalMs);
    runCheck();

    return () => {
        stopped = true;
        document.removeEventListener('visibilitychange', onVisibility);
        window.clearInterval(timer);
    };
}
