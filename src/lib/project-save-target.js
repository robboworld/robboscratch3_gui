/**
 * Where "Save" (Ctrl+S) writes the open project.
 *
 *  {kind: 'handle', handle, name} — File System Access handle (Chromium, NW.js);
 *  {kind: 'path', path, name}     — absolute path, written with Node fs (NW.js desktop);
 *  {kind: 'cloud', name}          — the Robbo account cloud project.
 *
 * Every project load clears the target (gui.jsx listens to PROJECT_LOADED); a loader that knows
 * the source sets it after vm.loadProject resolves, which happens after PROJECT_LOADED.
 * Without a target "Save" falls back to "Save as".
 */

import {isNwRuntime} from './nw-open-project-utils';
import {
    getPersistenceValue,
    isIndexedDbAvailable,
    setPersistenceValue
} from './project-persistence-db';

let currentTarget = null;
const listeners = [];

const notify = () => {
    listeners.slice().forEach(listener => {
        try {
            listener(currentTarget);
        } catch (e) {
            // A broken listener must not break saving.
        }
    });
};

const getProjectSaveTarget = () => currentTarget;

const setProjectSaveTarget = target => {
    currentTarget = target || null;
    notify();
};

const clearProjectSaveTarget = () => {
    if (currentTarget) {
        currentTarget = null;
        notify();
    }
};

const subscribeProjectSaveTarget = listener => {
    listeners.push(listener);
    return () => {
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
    };
};

/**
 * Only .sb3 files may be overwritten by "Save": an opened .sb / .sb2 must not be replaced with sb3 data.
 * @param {string} name file name or path
 * @returns {boolean} true for *.sb3
 */
const isSb3FileName = name => typeof name === 'string' && /\.sb3$/i.test(name);

const baseName = filePath => {
    const parts = String(filePath || '').split(/[\\/]/);
    return parts[parts.length - 1];
};

/**
 * Remember an opened or saved file on disk as the "Save" target (ignored for non-sb3 files).
 * @param {{path: (string|undefined), handle: (FileSystemFileHandle|undefined)}} source opened file
 */
const setProjectSaveFile = source => {
    if (!source) return;
    if (source.handle && isSb3FileName(source.handle.name)) {
        setProjectSaveTarget({kind: 'handle', handle: source.handle, name: source.handle.name});
    } else if (source.path && isSb3FileName(source.path)) {
        setProjectSaveTarget({kind: 'path', path: source.path, name: baseName(source.path)});
    }
};

const DRAFT_HANDLE_KEY = 'project-session-save-handle-v1';
/** A restored draft is applied only to the project load that follows right after (ms). */
const PENDING_RESTORE_TTL_MS = 60000;
let pendingRestore = null;

/**
 * Describe the target for the session draft metadata. A file handle is stored under its own
 * IndexedDB key (rememberDraftFileHandle) so a failed clone never breaks the draft itself.
 * @param {?object} target current target
 * @returns {?object} {kind, name, path?} or null (cloud projects reopen from the URL)
 */
const describeSaveTargetForDraft = target => {
    if (!target) return null;
    if (target.kind === 'path') return {kind: 'path', name: target.name, path: target.path};
    if (target.kind === 'handle') return {kind: 'handle', name: target.name};
    return null;
};

const rememberDraftFileHandle = target => {
    if (!target || target.kind !== 'handle' || !isIndexedDbAvailable()) {
        return Promise.resolve();
    }
    return setPersistenceValue(DRAFT_HANDLE_KEY, target.handle).catch(() => {});
};

/**
 * Target of a restored draft: the path must still exist, the handle must match the saved name.
 * @param {?object} saved describeSaveTargetForDraft() result from the snapshot metadata
 * @returns {Promise<?object>} target or null
 */
const restoreSaveTargetFromDraft = saved => {
    if (!saved || !isSb3FileName(saved.name)) {
        return Promise.resolve(null);
    }
    if (saved.kind === 'path') {
        try {
            if (isNwRuntime() && saved.path && window.nw.require('fs').existsSync(saved.path)) {
                return Promise.resolve({kind: 'path', path: saved.path, name: saved.name});
            }
        } catch (e) {
            // Unreadable path: fall back to "Save as".
        }
        return Promise.resolve(null);
    }
    if (saved.kind === 'handle' && isIndexedDbAvailable()) {
        return getPersistenceValue(DRAFT_HANDLE_KEY)
            .then(handle => (handle && handle.name === saved.name &&
                typeof handle.createWritable === 'function' ?
                {kind: 'handle', handle, name: handle.name} :
                null))
            .catch(() => null);
    }
    return Promise.resolve(null);
};

/**
 * The session draft is about to be loaded: remember its file and info for the notice.
 * Consumed by the next PROJECT_LOADED (takePendingRestoredDraft in gui.jsx).
 * @param {{target: ?object, title: string, savedAt: ?number}} info restored draft
 */
const setPendingRestoredDraft = info => {
    pendingRestore = Object.assign({at: Date.now()}, info);
};

const takePendingRestoredDraft = () => {
    const info = pendingRestore;
    pendingRestore = null;
    if (!info || Date.now() - info.at > PENDING_RESTORE_TTL_MS) {
        return null;
    }
    return info;
};

export {
    describeSaveTargetForDraft,
    rememberDraftFileHandle,
    restoreSaveTargetFromDraft,
    setPendingRestoredDraft,
    takePendingRestoredDraft,
    clearProjectSaveTarget,
    getProjectSaveTarget,
    isSb3FileName,
    setProjectSaveFile,
    setProjectSaveTarget,
    subscribeProjectSaveTarget
};
