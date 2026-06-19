/**
 * NW.js desktop: detect .sb3/.sb2/.sb in command line; subscribe to second-instance open (file association).
 * Must run before React. Sets window.__ROBBO_NW_PENDING_PROJECT__ = { data: ArrayBuffer, title: string }.
 */
import {
    collectNwArgv,
    findProjectPathInArgv,
    isScratchProjectPath,
    normalizeNwPath,
    parseProjectPathFromCmdline,
    readProjectFromAbsolutePath
} from './nw-open-project-utils';

export default function initNwDesktopFileBootstrap () {
    try {
        const nw = typeof window !== 'undefined' && window.nw;
        if (!nw || typeof nw.require !== 'function') {
            return;
        }
        const nwGui = nw.require('nw.gui');
        const pathMod = nw.require('path');
        const fs = nw.require('fs');
        const os = nw.require('os');
        const debugLogPath = pathMod.join(os.tmpdir(), 'robbo-nw-open-debug.log');
        const debugLog = (stage, payload) => {
            try {
                const row = `[${new Date().toISOString()}] [bootstrap] ${stage} ${payload ? JSON.stringify(payload) : ''}\n`;
                fs.appendFileSync(debugLogPath, row, 'utf8');
            } catch (e) {
                // no-op
            }
        };
        window.__ROBBO_NW_DEBUG_LOG_PATH__ = debugLogPath;
        window.__ROBBO_NW_DEBUG_LOG__ = debugLog;
        debugLog('init', {});

        const consumePath = filePath => {
            const normalizedPath = normalizeNwPath(filePath);
            debugLog('consumePath:candidate', {filePath, normalizedPath});
            if (!normalizedPath || !isScratchProjectPath(normalizedPath)) {
                debugLog('consumePath:skip-extension', {normalizedPath});
                return;
            }
            const read = readProjectFromAbsolutePath(normalizedPath);
            if (!read) {
                debugLog('consumePath:read-failed', {normalizedPath});
                return;
            }
            window.__ROBBO_NW_PENDING_PROJECT__ = read;
            debugLog('consumePath:pending-set', {
                normalizedPath,
                title: read.title,
                byteLength: read.data && read.data.byteLength
            });
        };

        const argv = collectNwArgv(nwGui.App);
        debugLog('argv-detected', {argvLength: argv.length, argv});
        const argvPath = findProjectPathInArgv(argv);
        if (argvPath) {
            consumePath(argvPath);
        }

        nwGui.App.on('open', cmdline => {
            debugLog('app-open:event', {cmdline});
            const filePath = parseProjectPathFromCmdline(cmdline);
            debugLog('app-open:parsed', {filePath});
            if (!filePath) {
                return;
            }
            consumePath(filePath);
            window.dispatchEvent(new CustomEvent('robboNwOpenProject', {detail: {path: filePath}}));
            debugLog('app-open:dispatched', {filePath});
            try {
                const win = nwGui.Window.get();
                if (win && typeof win.focus === 'function') {
                    win.focus();
                }
            } catch (e) {
                // no-op
            }
        });
    } catch (e) {
        /* Not NW or fs unavailable */
    }
}
