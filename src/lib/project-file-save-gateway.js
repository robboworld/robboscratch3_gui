import downloadBlob from './download-blob';
import {
    deletePersistenceValue,
    getPersistenceValue,
    setPersistenceValue
} from './project-persistence-db';

const FILE_HANDLE_KEY = 'project-save-file-handle-v1';
const PROJECT_FILE_MIME = 'application/x.scratch.sb3';

let cachedFileHandle = null;
let hasLoadedRememberedHandle = false;

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

const preloadRememberedFileHandle = () => {
    if (hasLoadedRememberedHandle) {
        return Promise.resolve(cachedFileHandle);
    }
    hasLoadedRememberedHandle = true;
    return getPersistenceValue(FILE_HANDLE_KEY)
        .then(handle => {
            if (!isWritableFileHandle(handle)) {
                return null;
            }
            cachedFileHandle = handle;
            return handle;
        })
        .catch(() => null);
};

if (typeof window !== 'undefined') {
    preloadRememberedFileHandle();
}

const ensureWritePermission = handle => {
    if (!isWritableFileHandle(handle)) {
        return Promise.resolve(false);
    }
    if (typeof handle.queryPermission !== 'function' ||
        typeof handle.requestPermission !== 'function') {
        return Promise.resolve(true);
    }

    return Promise.resolve(handle.queryPermission({mode: 'readwrite'}))
        .catch(() => 'prompt')
        .then(permission => {
            if (permission === 'granted') {
                return true;
            }
            if (permission === 'denied') {
                return false;
            }
            return Promise.resolve(handle.requestPermission({mode: 'readwrite'}))
                .then(result => result === 'granted')
                .catch(() => false);
        });
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

    return Promise.resolve(cachedFileHandle)
        .then(handle => {
            if (!handle) {
                return null;
            }
            return ensureWritePermission(handle)
                .then(hasPermission => {
                    if (hasPermission) {
                        return {
                            mode: 'file-handle',
                            handle
                        };
                    }
                    return clearRememberedFileHandle().then(() => null);
                });
        })
        .then(target => {
            if (target) {
                return target;
            }
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

const saveProject = ({filename, blob}) => prepareProjectSaveTarget(filename)
    .then(target => savePreparedProject(target, {filename, blob}));

export {
    prepareProjectSaveTarget,
    savePreparedProject,
    saveProject
};
