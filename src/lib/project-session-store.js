import {
    deletePersistenceValue,
    getPersistenceValue,
    isIndexedDbAvailable,
    setPersistenceValue
} from './project-persistence-db';

const PERSISTENT = 1;
const SNAPSHOT_FILENAME = 'auto-saved.sb3';
const SNAPSHOT_KEY = 'project-session-snapshot-v1';

const isNotFoundError = error => {
    if (!error) {
        return false;
    }
    if (error.name === 'NotFoundError') {
        return true;
    }
    if (typeof FileError !== 'undefined' && error.code === FileError.NOT_FOUND_ERR) {
        return true;
    }
    return false;
};

const isLegacyStorageAvailable = () => typeof navigator !== 'undefined' &&
    navigator.webkitPersistentStorage &&
    typeof navigator.webkitPersistentStorage.requestQuota === 'function' &&
    typeof window !== 'undefined' &&
    typeof window.webkitRequestFileSystem === 'function';

const toArrayBuffer = value => {
    if (value instanceof ArrayBuffer) {
        return Promise.resolve(value);
    }
    if (ArrayBuffer.isView(value)) {
        return Promise.resolve(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
    }
    if (value && typeof value.arrayBuffer === 'function') {
        return value.arrayBuffer();
    }
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = function () {
            if (typeof this !== 'undefined' &&
                typeof this.result !== 'undefined' &&
                this.result !== null) {
                resolve(this.result);
                return;
            }
            reject(new Error('Failed to convert value to ArrayBuffer.'));
        };
        reader.onerror = () => reject(reader.error || new Error('Failed to read blob as ArrayBuffer.'));
        reader.readAsArrayBuffer(value);
    });
};

const toBlob = value => {
    if (value instanceof Blob) {
        return value;
    }
    if (ArrayBuffer.isView(value)) {
        return new Blob([value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)]);
    }
    if (value instanceof ArrayBuffer) {
        return new Blob([value]);
    }
    return new Blob([value]);
};

const readIndexedDbSnapshot = () => {
    if (!isIndexedDbAvailable()) {
        return Promise.resolve(null);
    }
    return getPersistenceValue(SNAPSHOT_KEY)
        .then(record => {
            if (!record) {
                return null;
            }

            if (record.blob) {
                return toArrayBuffer(record.blob).then(data => ({
                    data,
                    metadata: record.metadata || {},
                    source: 'indexeddb'
                }));
            }

            return toArrayBuffer(record).then(data => ({
                data,
                metadata: {},
                source: 'indexeddb'
            }));
        })
        .catch(() => null);
};

const saveIndexedDbSnapshot = ({blob, metadata}) => {
    if (!isIndexedDbAvailable()) {
        return Promise.reject(new Error('IndexedDB is not available.'));
    }
    return setPersistenceValue(SNAPSHOT_KEY, {
        blob,
        metadata: Object.assign({
            updatedAt: Date.now()
        }, metadata)
    });
};

const removeIndexedDbSnapshot = () => {
    if (!isIndexedDbAvailable()) {
        return Promise.resolve();
    }
    return deletePersistenceValue(SNAPSHOT_KEY)
        .catch(() => {});
};

const withLegacyFileSystem = callback => new Promise((resolve, reject) => {
    if (!isLegacyStorageAvailable()) {
        reject(new Error('Legacy project session storage is not available.'));
        return;
    }

    const onError = error => reject(error);
    navigator.webkitPersistentStorage.requestQuota(500 * 1024 * 1024, grantedBytes => {
        window.webkitRequestFileSystem(PERSISTENT, grantedBytes, fs => {
            Promise.resolve(callback(fs)).then(resolve)
                .catch(reject);
        }, onError);
    }, onError);
});

const readLegacySnapshot = () => withLegacyFileSystem(fs => new Promise((resolve, reject) => {
    fs.root.getFile(SNAPSHOT_FILENAME, {create: false}, fileEntry => {
        fileEntry.file(file => {
            toArrayBuffer(file)
                .then(data => resolve({
                    data,
                    metadata: {},
                    source: 'legacy'
                }))
                .catch(reject);
        }, reject);
    }, error => {
        if (isNotFoundError(error)) {
            resolve(null);
            return;
        }
        reject(error);
    });
})).catch(error => {
    if (isNotFoundError(error)) {
        return null;
    }
    return null;
});

const saveLegacySnapshot = ({blob}) => withLegacyFileSystem(fs => new Promise((resolve, reject) => {
    fs.root.getFile(SNAPSHOT_FILENAME, {create: true}, fileEntry => {
        fileEntry.createWriter(writer => {
            let truncated = false;
            writer.onerror = () => reject(writer.error || new Error('Failed to write snapshot.'));
            writer.onwriteend = () => {
                if (!truncated) {
                    truncated = true;
                    writer.onwriteend = () => resolve();
                    writer.write(blob);
                }
            };
            writer.truncate(0);
        }, reject);
    }, reject);
}));

const removeLegacySnapshot = () => withLegacyFileSystem(fs => new Promise((resolve, reject) => {
    fs.root.getFile(SNAPSHOT_FILENAME, {create: false}, fileEntry => {
        fileEntry.remove(() => resolve(), reject);
    }, error => {
        if (isNotFoundError(error)) {
            resolve();
            return;
        }
        reject(error);
    });
})).catch(() => {});

const validateSnapshot = (snapshot, validateProject) => Promise.resolve(validateProject(snapshot.data))
    .then(projectData => ({
        metadata: snapshot.metadata || {},
        projectData,
        snapshot
    }));

const restoreFromSource = (readSnapshot, removeSnapshot, validateProject) => readSnapshot()
    .then(snapshot => {
        if (!snapshot) {
            return null;
        }
        return validateSnapshot(snapshot, validateProject)
            .catch(() => Promise.resolve(removeSnapshot()).then(() => null));
    });

const migrateLegacySnapshot = restoredSnapshot => {
    if (!restoredSnapshot || restoredSnapshot.snapshot.source !== 'legacy') {
        return Promise.resolve(restoredSnapshot);
    }

    if (!isIndexedDbAvailable()) {
        return Promise.resolve(restoredSnapshot);
    }

    return saveIndexedDbSnapshot({
        blob: toBlob(restoredSnapshot.snapshot.data),
        metadata: restoredSnapshot.metadata
    })
        .then(() => removeLegacySnapshot())
        .catch(() => {})
        .then(() => restoredSnapshot);
};

const restoreValidSnapshot = validateProject => restoreFromSource(
    readIndexedDbSnapshot,
    removeIndexedDbSnapshot,
    validateProject
).then(restored => {
    if (restored) {
        return restored;
    }
    return restoreFromSource(
        readLegacySnapshot,
        removeLegacySnapshot,
        validateProject
    ).then(migrateLegacySnapshot);
});

const saveSnapshot = ({blob, metadata}) => {
    const normalizedBlob = toBlob(blob);
    const payload = {
        blob: normalizedBlob,
        metadata: metadata || {}
    };

    if (isIndexedDbAvailable()) {
        return saveIndexedDbSnapshot(payload)
            .catch(() => saveLegacySnapshot(payload));
    }

    return saveLegacySnapshot(payload);
};

const removeSnapshot = () => Promise.all([
    removeIndexedDbSnapshot(),
    removeLegacySnapshot()
]).then(() => {});

export {
    removeSnapshot,
    restoreValidSnapshot,
    saveSnapshot
};
