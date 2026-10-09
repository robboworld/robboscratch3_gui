import downloadBlob from './download-blob';
import {isNwRuntime} from './nw-open-project-utils';
import {
    deletePersistenceValue,
    setPersistenceValue
} from './project-persistence-db';
import {
    clearProjectSaveTarget,
    getProjectSaveTarget,
    setProjectSaveFile
} from './project-save-target';

const FILE_HANDLE_KEY = 'project-save-file-handle-v1';
const PROJECT_FILE_MIME = 'application/x.scratch.sb3';

let cachedFileHandle = null;

const hasFilePickerSupport = () => typeof window !== 'undefined' &&
    typeof window.showSaveFilePicker === 'function';

const isAbortError = error => error && error.name === 'AbortError';

const isWritableFileHandle = handle => handle &&
    handle.kind === 'file' &&
    typeof handle.createWritable === 'function';

const rememberFileHandle = handle => {
    if (!isWritableFileHandle(handle)) {
        return Promise.resolve();
    }
    cachedFileHandle = handle;
    return setPersistenceValue(FILE_HANDLE_KEY, handle)
        .catch(() => {});
};

const clearRememberedFileHandle = () => {
    cachedFileHandle = null;
    return deletePersistenceValue(FILE_HANDLE_KEY)
        .catch(() => {});
};

const pickFileHandle = filename => window.showSaveFilePicker({
    suggestedName: filename,
    types: [{
        description: 'Robbo Scratch Project',
        accept: {
            [PROJECT_FILE_MIME]: ['.sb3']
        }
    }]
});

const prepareProjectSaveTarget = filename => {
    if (!hasFilePickerSupport()) {
        return Promise.resolve({
            mode: 'download'
        });
    }

    // Always show the location picker for "Save to your computer".
    // Reusing a cached FileSystemFileHandle skipped the dialog and could
    // overwrite a different previously saved file.
    return pickFileHandle(filename)
        .then(handle => rememberFileHandle(handle).then(() => ({
            mode: 'file-handle',
            handle
        })))
        .catch(error => {
            if (isAbortError(error)) {
                return {
                    mode: 'aborted'
                };
            }
            return {
                mode: 'download'
            };
        });
};

const writeBlobToHandle = (handle, blob) => handle.createWritable()
    .then(writable => writable.write(blob)
        .then(() => writable.close())
        .catch(error => writable.abort().catch(() => {})
            .then(() => Promise.reject(error))));

const savePreparedProject = (preparedTarget, {filename, blob}) => {
    if (!preparedTarget || preparedTarget.mode === 'aborted') {
        return Promise.resolve({method: 'aborted'});
    }

    if (preparedTarget.mode !== 'file-handle') {
        downloadBlob(filename, blob);
        return Promise.resolve({method: 'download'});
    }

    return writeBlobToHandle(preparedTarget.handle, blob)
        .then(() => ({
            method: 'file-handle'
        }))
        .catch(error => clearRememberedFileHandle()
            .then(() => {
                if (isAbortError(error)) {
                    return {
                        method: 'aborted'
                    };
                }
                downloadBlob(filename, blob);
                return {
                    method: 'download'
                };
            }));
};

/**
 * NW.js: write next to the file, then rename over it, so a failed write does not damage the project.
 * @param {string} filePath absolute path
 * @param {Blob} blob project data
 * @returns {Promise} resolves when the file is replaced
 */
const writeBlobToPath = (filePath, blob) => blob.arrayBuffer().then(arrayBuffer => new Promise((resolve, reject) => {
    const fs = window.nw.require('fs');
    const {Buffer} = window.nw.require('buffer');
    const tmpPath = `${filePath}.saving`;
    fs.writeFile(tmpPath, Buffer.from(new Uint8Array(arrayBuffer)), writeError => {
        if (writeError) {
            fs.unlink(tmpPath, () => reject(writeError));
            return;
        }
        fs.rename(tmpPath, filePath, renameError => {
            if (renameError) {
                fs.unlink(tmpPath, () => reject(renameError));
                return;
            }
            resolve();
        });
    });
}));

/**
 * A handle from the open dialog is read-only until the user allows editing.
 * @param {FileSystemFileHandle} handle file handle
 * @returns {Promise<boolean>} true when writing is allowed
 */
const ensureWritePermission = handle => {
    if (typeof handle.queryPermission !== 'function') {
        return Promise.resolve(true);
    }
    return handle.queryPermission({mode: 'readwrite'})
        .then(state => {
            if (state === 'granted') return true;
            return handle.requestPermission({mode: 'readwrite'})
                .then(result => result === 'granted');
        });
};

/**
 * "Save as": pick a location, then write. The picker opens before serializing the project
 * so it still has the user gesture.
 * @param {{filename: string, getBlob: function(): Promise<Blob>}} options file name and project data
 * @returns {Promise<{method: string, name: (string|undefined)}>} method: file-handle / download / aborted
 */
const saveProjectAs = ({filename, getBlob}) => prepareProjectSaveTarget(filename)
    .then(preparedTarget => {
        if (!preparedTarget || preparedTarget.mode === 'aborted') {
            return {method: 'aborted'};
        }
        return getBlob()
            .then(blob => savePreparedProject(preparedTarget, {filename, blob}))
            .then(result => {
                if (result.method === 'file-handle') {
                    setProjectSaveFile({handle: preparedTarget.handle});
                    return Object.assign({name: preparedTarget.handle.name}, result);
                }
                return result;
            });
    });

/**
 * "Save" (Ctrl+S): overwrite the file the project came from or was last saved to;
 * without one — "Save as". A failed write forgets the file, so the next "Save" asks for a location.
 * @param {{filename: string, getBlob: function(): Promise<Blob>}} options file name and project data
 * @returns {Promise<{method: string, name: (string|undefined)}>} method: path / file-handle / download / aborted
 */
const saveProjectToFile = ({filename, getBlob}) => {
    const target = getProjectSaveTarget();
    const forgetOnError = error => {
        clearProjectSaveTarget();
        return Promise.reject(error);
    };
    if (target && target.kind === 'path' && isNwRuntime()) {
        return getBlob()
            .then(blob => writeBlobToPath(target.path, blob))
            .then(() => ({method: 'path', name: target.name}), forgetOnError);
    }
    if (target && target.kind === 'handle') {
        return ensureWritePermission(target.handle)
            .then(granted => {
                if (!granted) {
                    return saveProjectAs({filename, getBlob});
                }
                return getBlob()
                    .then(blob => writeBlobToHandle(target.handle, blob))
                    .then(() => ({method: 'file-handle', name: target.name}), forgetOnError);
            });
    }
    return saveProjectAs({filename, getBlob});
};

export {
    prepareProjectSaveTarget,
    savePreparedProject,
    saveProjectAs,
    saveProjectToFile
};
