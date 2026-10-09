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

export {
    clearProjectSaveTarget,
    getProjectSaveTarget,
    isSb3FileName,
    setProjectSaveFile,
    setProjectSaveTarget,
    subscribeProjectSaveTarget
};
