/**
 * Saves the report where the user finds it without help: the Desktop (NW.js) or a download (web).
 * UTF-8 with BOM, so Notepad shows Cyrillic correctly.
 */
import downloadBlob from '../download-blob';

const BOM = '﻿';

const nodeRequire = function (moduleId) {
    try {
        if (typeof window !== 'undefined' && window.nw && typeof window.nw.require === 'function') {
            return window.nw.require(moduleId);
        }
    } catch (e) {
        // not NW.js
    }
    return null;
};

const pad2 = n => String(n).padStart(2, '0');

/**
 * @param {Date} [date] report time
 * @returns {string} RobboScratch-report-2026-10-22-1430.txt
 */
const reportFileName = function (date) {
    const d = date || new Date();
    return `RobboScratch-report-${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}-` +
        `${pad2(d.getHours())}${pad2(d.getMinutes())}.txt`;
};

const execFileText = (cp, file, args) => new Promise(resolve => {
    try {
        cp.execFile(file, args, {timeout: 5000, windowsHide: true, encoding: 'utf8'},
            (error, stdout) => resolve(error ? '' : String(stdout || '')));
    } catch (e) {
        resolve('');
    }
});

/**
 * The real Desktop folder: on Windows it may be moved (OneDrive), on Linux it is localised («Рабочий стол»).
 * @returns {Promise<?string>} folder, null when there is no Desktop
 */
const findDesktopDir = function () {
    const fs = nodeRequire('fs');
    const path = nodeRequire('path');
    const os = nodeRequire('os');
    const proc = nodeRequire('process');
    const cp = nodeRequire('child_process');
    if (!fs || !path || !os || !proc) return Promise.resolve(null);

    const isDir = dir => {
        try {
            return Boolean(dir) && fs.statSync(dir).isDirectory();
        } catch (e) {
            return false;
        }
    };
    const fallback = () => {
        const desktop = path.join(os.homedir(), 'Desktop');
        return isDir(desktop) ? desktop : null;
    };
    if (!cp) return Promise.resolve(fallback());

    if (proc.platform === 'win32') {
        return execFileText(cp, 'reg', ['query',
            'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders', '/v', 'Desktop'])
            .then(stdout => {
                const match = /Desktop\s+REG_(?:EXPAND_)?SZ\s+(.+)$/im.exec(stdout);
                const dir = match ? match[1].trim().replace(/%([^%]+)%/g,
                    (whole, name) => (proc.env[name] === undefined ? whole : proc.env[name])) : '';
                return isDir(dir) ? dir : fallback();
            });
    }
    if (proc.platform === 'linux') {
        return execFileText(cp, 'xdg-user-dir', ['DESKTOP']).then(stdout => {
            const dir = stdout.trim();
            // xdg-user-dir answers with the home folder when no Desktop is configured
            return isDir(dir) && dir !== os.homedir() ? dir : fallback();
        });
    }
    return Promise.resolve(fallback());
};

/**
 * @param {string} text report text
 * @returns {Promise<{path: ?string, downloaded: boolean}>} where it went
 */
const saveReport = function (text) {
    const fileName = reportFileName();
    const fs = nodeRequire('fs');
    const path = nodeRequire('path');
    if (!fs || !path) {
        downloadBlob(fileName, new Blob([BOM + text], {type: 'text/plain;charset=utf-8'}));
        return Promise.resolve({path: null, downloaded: true});
    }
    return findDesktopDir()
        .then(dir => dir || window.nw.App.dataPath)
        .then(dir => new Promise((resolve, reject) => {
            const filePath = path.join(dir, fileName);
            fs.writeFile(filePath, BOM + text, 'utf8', error => {
                if (error) reject(error);
                else resolve({path: filePath, downloaded: false});
            });
        }));
};

/**
 * Opens the file manager with the report selected (NW.js).
 * @param {string} filePath saved report
 */
const showReportInFolder = function (filePath) {
    try {
        if (filePath && window.nw && window.nw.Shell) window.nw.Shell.showItemInFolder(filePath);
    } catch (e) {
        // no file manager: the path is shown in the window anyway
    }
};

export {saveReport, showReportInFolder, reportFileName};
