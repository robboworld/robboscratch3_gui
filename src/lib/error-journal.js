/**
 * Error journal: keeps the last uncaught errors so they can be attached to a bug report.
 *
 * Sources: window 'error' / 'unhandledrejection', React ErrorBoundary (recordError),
 * and on NW.js Desktop the Node 'uncaughtException' (errors thrown from serialport / usb callbacks).
 * Storage: in-memory ring buffer mirrored to localStorage (survives the crash-screen reload);
 * on Desktop entries are also appended to a log file in the NW.js data directory.
 */

const STORAGE_KEY = 'robbo-error-journal-v1';
const LOG_FILE_NAME = 'robbo-scratch-errors.log';
const MAX_ENTRIES = 30;
const MAX_STACK_LENGTH = 3000;
const MAX_LOG_FILE_BYTES = 512 * 1024;

let entries = [];
let installed = false;
let logFilePath = null;
let nodeFs = null;

const readStoredEntries = function () {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
};

const writeStoredEntries = function () {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
        // storage unavailable or full: the journal stays in memory only
    }
};

const describeError = function (error) {
    if (error && typeof error === 'object') {
        const name = error.name ? `${error.name}: ` : '';
        let message = '';
        if (typeof error.message === 'string') {
            message = error.message;
        } else {
            try {
                message = JSON.stringify(error);
            } catch (e) {
                message = String(error);
            }
        }
        return {
            message: `${name}${message}`,
            stack: typeof error.stack === 'string' ? error.stack.slice(0, MAX_STACK_LENGTH) : ''
        };
    }
    return {message: String(error), stack: ''};
};

const formatEntry = function (entry) {
    const lines = [`[${entry.time}] ${entry.kind}${entry.count > 1 ? ` (x${entry.count})` : ''}: ${entry.message}`];
    if (entry.details) lines.push(entry.details);
    if (entry.stack) lines.push(entry.stack);
    return lines.join('\n');
};

const initLogFile = function () {
    try {
        if (!window.nw || typeof window.nw.require !== 'function' || !window.nw.App) return;
        const fs = window.nw.require('fs');
        const path = window.nw.require('path');
        const filePath = path.join(window.nw.App.dataPath, LOG_FILE_NAME);
        try {
            if (fs.statSync(filePath).size > MAX_LOG_FILE_BYTES) {
                fs.renameSync(filePath, `${filePath}.old`);
            }
        } catch (e) {
            // no log file yet
        }
        nodeFs = fs;
        logFilePath = filePath;
    } catch (e) {
        logFilePath = null;
    }
};

const appendToLogFile = function (entry) {
    if (!logFilePath || !nodeFs) return;
    try {
        nodeFs.appendFile(logFilePath, `${formatEntry(entry)}\n\n`, () => {});
    } catch (e) {
        // never let the journal itself throw
    }
};

/**
 * Add an error to the journal.
 * @param {string} kind - source of the error, e.g. 'window.error', 'react'.
 * @param {*} error - Error object or any thrown value.
 * @param {string} [details] - extra context (component stack, file:line).
 */
const recordError = function (kind, error, details) {
    try {
        const {message, stack} = describeError(error);
        const last = entries[entries.length - 1];
        // An error thrown from a timer repeats many times per second: count it instead of flooding.
        if (last && last.kind === kind && last.message === message && last.stack === stack) {
            last.count++;
            last.lastTime = new Date().toISOString();
            writeStoredEntries();
            return;
        }
        const entry = {
            time: new Date().toISOString(),
            kind,
            message,
            stack,
            details: details ? String(details).slice(0, MAX_STACK_LENGTH) : '',
            count: 1
        };
        entries.push(entry);
        if (entries.length > MAX_ENTRIES) {
            entries = entries.slice(entries.length - MAX_ENTRIES);
        }
        writeStoredEntries();
        appendToLogFile(entry);
    } catch (e) {
        // never let the journal itself throw
    }
};

/**
 * Start collecting uncaught errors. Safe to call more than once.
 */
const installErrorJournal = function () {
    if (installed || typeof window === 'undefined') return;
    installed = true;
    entries = readStoredEntries();
    initLogFile();

    window.addEventListener('error', event => {
        // resource load failures (img/script) also arrive here, without an error object
        if (!event || (!event.error && !event.message)) return;
        const location = event.filename ? `at ${event.filename}:${event.lineno}:${event.colno}` : '';
        recordError('window.error', event.error || event.message, location);
    });
    window.addEventListener('unhandledrejection', event => {
        recordError('unhandledrejection', event ? event.reason : 'unknown');
    });

    // NW.js Desktop: errors thrown in the Node context never reach window 'error'.
    // uncaughtExceptionMonitor only observes: NW.js still handles the exception as before.
    const nodeProcess = window.__node_process__ || (typeof process === 'undefined' ? null : process);
    if (nodeProcess && typeof nodeProcess.on === 'function' && nodeProcess.versions && nodeProcess.versions.node) {
        try {
            nodeProcess.on('uncaughtExceptionMonitor', error => {
                recordError('node.uncaughtException', error);
            });
        } catch (e) {
            // monitoring is best-effort
        }
    }
};

/**
 * @returns {string} recent errors as plain text for a bug report, '' when there are none.
 */
const getErrorJournalText = function () {
    if (!entries.length) return '';
    return entries.map(formatEntry).join('\n\n');
};

/**
 * @returns {?string} path of the Desktop error log file, null in the browser.
 */
const getErrorJournalFilePath = function () {
    return logFilePath;
};

const clearErrorJournal = function () {
    entries = [];
    writeStoredEntries();
};

export {
    clearErrorJournal,
    getErrorJournalFilePath,
    getErrorJournalText,
    installErrorJournal,
    recordError
};
