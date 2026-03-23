/**
 * NW.js desktop: detect .sb3/.sb2/.sb in command line; subscribe to second-instance open (file association).
 * Must run before React. Sets window.__ROBBO_NW_PENDING_PROJECT__ = { data: ArrayBuffer, title: string }.
 */
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

        const normalizeCandidatePath = candidate => {
            if (!candidate || typeof candidate !== 'string') {
                return null;
            }
            let normalized = candidate.trim();
            if (!normalized) {
                return null;
            }
            if ((normalized[0] === '"' && normalized[normalized.length - 1] === '"') ||
                (normalized[0] === '\'' && normalized[normalized.length - 1] === '\'')) {
                normalized = normalized.slice(1, -1).trim();
            }
            if (/^file:\/\//i.test(normalized)) {
                try {
                    normalized = decodeURIComponent(normalized.replace(/^file:\/\/\/?/i, ''));
                    if (/^\/[A-Za-z]:\//.test(normalized)) {
                        normalized = normalized.slice(1);
                    }
                } catch (e) {
                    return null;
                }
            }
            if (/^[A-Za-z]:\//.test(normalized)) {
                normalized = normalized.replace(/\//g, '\\');
            }
            return normalized;
        };

        const consumePath = filePath => {
            const normalizedPath = normalizeCandidatePath(filePath);
            debugLog('consumePath:candidate', {filePath, normalizedPath});
            if (!normalizedPath) {
                return;
            }
            const ext = pathMod.extname(normalizedPath).toLowerCase();
            if (ext !== '.sb3' && ext !== '.sb2' && ext !== '.sb') {
                debugLog('consumePath:skip-extension', {normalizedPath, ext});
                return;
            }
            const buf = fs.readFileSync(normalizedPath);
            const data = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
            window.__ROBBO_NW_PENDING_PROJECT__ = {
                data,
                title: pathMod.basename(normalizedPath, ext)
            };
            debugLog('consumePath:pending-set', {
                normalizedPath,
                title: window.__ROBBO_NW_PENDING_PROJECT__.title,
                byteLength: buf.byteLength
            });
        };

        const argv = (nwGui.App.fullArgv && nwGui.App.fullArgv.length) ?
            nwGui.App.fullArgv : (nwGui.App.argv || []);
        debugLog('argv-detected', {argvLength: argv.length, argv});
        for (let i = 0; i < argv.length; i++) {
            const arg = argv[i];
            if (!arg || arg[0] === '-') {
                continue;
            }
            consumePath(arg);
            if (window.__ROBBO_NW_PENDING_PROJECT__) {
                break;
            }
        }

        nwGui.App.on('open', cmdline => {
            debugLog('app-open:event', {cmdline});
            if (!cmdline || typeof cmdline !== 'string') {
                return;
            }
            const re = /"([^"]+\.(?:sb3|sb2|sb))"|(\S+\.(?:sb3|sb2|sb))\b/i;
            const m = cmdline.match(re);
            const filePath = m ? (m[1] || m[2]) : null;
            debugLog('app-open:parsed', {filePath});
            if (filePath) {
                window.dispatchEvent(new CustomEvent('robboNwOpenProject', {detail: {path: filePath}}));
                debugLog('app-open:dispatched', {filePath});
            }
        });
    } catch (e) {
        /* Not NW or fs unavailable */
    }
}
