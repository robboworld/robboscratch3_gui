import downloadBlob from './download-blob';
import {
    deletePersistenceValue,
    setPersistenceValue
} from './project-persistence-db';

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

const saveProject = ({filename, blob}) => prepareProjectSaveTarget(filename)
    .then(target => savePreparedProject(target, {filename, blob}));

export {
    prepareProjectSaveTarget,
    savePreparedProject,
    saveProject
};
