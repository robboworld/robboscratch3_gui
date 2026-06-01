/**
 * NW.js desktop: shared helpers for opening .sb / .sb2 / .sb3 from argv or App "open".
 */

export const isNwRuntime = () => (
    typeof window !== 'undefined' &&
    window.nw &&
    typeof window.nw.require === 'function'
);

export const normalizeNwPath = rawPath => {
    if (!rawPath || typeof rawPath !== 'string') {
        return null;
    }
    let normalized = rawPath.trim();
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

const PROJECT_EXT_RE = /\.(sb3|sb2|sb)\b/i;

export const isScratchProjectPath = filePath => {
    const normalized = normalizeNwPath(filePath);
    if (!normalized) {
        return false;
    }
    const ext = normalized.slice(normalized.lastIndexOf('.')).toLowerCase();
    return ext === '.sb3' || ext === '.sb2' || ext === '.sb';
};

/**
 * Parse project path from NW App "open" cmdline (may contain spaces, NW flags).
 * @param {string} cmdline full command line string
 * @returns {string|null} absolute or relative path
 */
export const parseProjectPathFromCmdline = cmdline => {
    if (!cmdline || typeof cmdline !== 'string') {
        return null;
    }
    const quotedRe = /"([^"]+\.(?:sb3|sb2|sb))\b/gi;
    let quotedMatch = null;
    let m;
    while ((m = quotedRe.exec(cmdline)) !== null) {
        quotedMatch = m[1];
    }
    if (quotedMatch) {
        return quotedMatch;
    }

    const tokens = cmdline.split(/\s+/).filter(Boolean);
    let endTok = -1;
    for (let i = tokens.length - 1; i >= 0; i--) {
        if (PROJECT_EXT_RE.test(tokens[i])) {
            endTok = i;
            break;
        }
    }
    if (endTok < 0) {
        return null;
    }

    let startTok = endTok;
    while (startTok > 0) {
        const prev = tokens[startTok - 1];
        if (prev.startsWith('-') || /^--[^\s]+=/.test(prev)) {
            break;
        }
        if (prev.startsWith('/') || /^[A-Za-z]:\\/.test(prev)) {
            startTok--;
            break;
        }
        startTok--;
    }

    return tokens.slice(startTok, endTok + 1).join(' ');
};

/**
 * Merge NW argv sources; prefer App.argv (filtered) then fullArgv.
 * @param {object} nwApp nw.gui.App
 * @returns {string[]}
 */
export const collectNwArgv = nwApp => {
    const seen = new Set();
    const out = [];
    const addList = list => {
        if (!list || !list.length) {
            return;
        }
        for (let i = 0; i < list.length; i++) {
            const item = list[i];
            if (typeof item !== 'string' || !item || seen.has(item)) {
                continue;
            }
            seen.add(item);
            out.push(item);
        }
    };
    addList(nwApp.argv);
    addList(nwApp.fullArgv);
    addList(nwApp.filteredArgv);
    return out;
};

export const findProjectPathInArgv = argv => {
    if (!argv || !argv.length) {
        return null;
    }
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (!arg || arg[0] === '-') {
            continue;
        }
        if (isScratchProjectPath(arg)) {
            return normalizeNwPath(arg);
        }
    }
    return null;
};

export const readProjectFromAbsolutePath = absPath => {
    const normalizedPath = normalizeNwPath(absPath);
    if (!normalizedPath || !isNwRuntime()) {
        return null;
    }
    const nwPath = window.nw.require('path');
    const fs = window.nw.require('fs');
    const ext = nwPath.extname(normalizedPath).toLowerCase();
    if (!PROJECT_EXT_RE.test(ext)) {
        return null;
    }
    const buf = fs.readFileSync(normalizedPath);
    // Node Buffer / backing ArrayBuffer may not pass "instanceof ArrayBuffer" in the
    // NW renderer; VM would JSON.stringify it and validation fails (SB1 fallback).
    const bytes = new Uint8Array(buf.length);
    bytes.set(buf);
    return {
        data: bytes.buffer,
        title: nwPath.basename(normalizedPath, ext)
    };
};
