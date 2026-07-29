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
import {bridgeNwNodeModulesToWindow} from './nw-node-window-bridge';

export default function initNwDesktopFileBootstrap () {
    try {
        const nw = typeof window !== 'undefined' && window.nw;
        if (!nw || typeof nw.require !== 'function') {
            return;
        }
        const nwGui = nw.require('nw.gui');
        const pathMod = nw.require('path');
        const os = nw.require('os');
        bridgeNwNodeModulesToWindow({
            process: nw.require('process'),
            os,
            path: pathMod,
            child_process: nw.require('child_process')
        });

        const consumePath = filePath => {
            const normalizedPath = normalizeNwPath(filePath);
            if (!normalizedPath || !isScratchProjectPath(normalizedPath)) {
                return;
            }
            const read = readProjectFromAbsolutePath(normalizedPath);
            if (!read) {
                return;
            }
            window.__ROBBO_NW_PENDING_PROJECT__ = read;
        };

        const argv = collectNwArgv(nwGui.App);
        const argvPath = findProjectPathInArgv(argv);
        if (argvPath) {
            consumePath(argvPath);
        }

        nwGui.App.on('open', cmdline => {
            const filePath = parseProjectPathFromCmdline(cmdline);
            if (!filePath) {
                return;
            }
            consumePath(filePath);
            window.dispatchEvent(new CustomEvent('robboNwOpenProject', {detail: {path: filePath}}));
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
