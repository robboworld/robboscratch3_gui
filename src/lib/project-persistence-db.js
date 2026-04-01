const DB_NAME = 'rs3-project-persistence';
const STORE_NAME = 'keyValue';
const DB_VERSION = 1;

let openDbPromise = null;

const isIndexedDbAvailable = () => typeof indexedDB !== 'undefined';

const openPersistenceDb = () => {
    if (!isIndexedDbAvailable()) {
        return Promise.resolve(null);
    }
    if (openDbPromise) {
        return openDbPromise;
    }
    openDbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Failed to open persistence database.'));
        request.onblocked = () => reject(new Error('Persistence database open was blocked.'));
    }).catch(error => {
        openDbPromise = null;
        return Promise.reject(error);
    });

    return openDbPromise;
};

const runStoreRequest = (mode, requestFactory) => openPersistenceDb()
    .then(db => {
        if (!db) {
            return null;
        }
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, mode);
            const store = transaction.objectStore(STORE_NAME);
            let request;

            try {
                request = requestFactory(store);
            } catch (error) {
                reject(error);
                return;
            }

            transaction.oncomplete = () => {
                if (request && typeof request.result !== 'undefined') {
                    resolve(request.result);
                    return;
                }
                resolve();
            };
            transaction.onerror = () => reject(transaction.error || (request && request.error) ||
                new Error('Persistence transaction failed.'));
            transaction.onabort = () => reject(transaction.error || (request && request.error) ||
                new Error('Persistence transaction was aborted.'));
        });
    });

const getPersistenceValue = key => runStoreRequest('readonly', store => store.get(key));

const setPersistenceValue = (key, value) => runStoreRequest('readwrite', store => store.put(value, key));

const deletePersistenceValue = key => runStoreRequest('readwrite', store => store.delete(key));

export {
    deletePersistenceValue,
    getPersistenceValue,
    isIndexedDbAvailable,
    setPersistenceValue
};
