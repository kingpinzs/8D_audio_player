'use strict';

(function (global) {
    const DB_NAME = 'mp3_8d_sessions';
    const DB_VERSION = 1;
    const STORE_NAME = 'sessions';
    const INDEX_DEFINITIONS = [
        { name: 'timestamp', keyPath: 'timestamp' },
        { name: 'profileId', keyPath: 'profileId' },
        { name: 'presetId', keyPath: 'presetId' },
        { name: 'ritualUsed', keyPath: 'ritualUsed' }
    ];

    let openPromise = null;

    const getIndexedDB = () => {
        const api =
            global.indexedDB ||
            global.mozIndexedDB ||
            global.webkitIndexedDB ||
            global.msIndexedDB;
        if (!api) {
            throw new Error('IndexedDB not supported in this environment.');
        }
        return api;
    };

    const ensureIndexes = (store) => {
        INDEX_DEFINITIONS.forEach(({ name, keyPath }) => {
            if (!store.indexNames.contains(name)) {
                store.createIndex(name, keyPath, { unique: false });
            }
        });
    };

    const openDatabase = () => {
        if (openPromise) {
            return openPromise;
        }

        const indexedDB = getIndexedDB();
        openPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error || new Error('Failed to open session database'));

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                let store;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                } else if (event.target.transaction) {
                    store = event.target.transaction.objectStore(STORE_NAME);
                }
                if (store) {
                    ensureIndexes(store);
                }
            };

            request.onblocked = () => {
                console.warn('[SessionLogging] Database upgrade blocked by another tab.');
            };

            request.onsuccess = () => {
                const db = request.result;
                db.onversionchange = () => {
                    db.close();
                    openPromise = null;
                };
                resolve(db);
            };
        });

        return openPromise;
    };

    const runStoreRequest = async (mode, executor) => {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, mode);
            const store = tx.objectStore(STORE_NAME);

            tx.onabort = () => reject(tx.error || new Error('Session store transaction aborted'));
            tx.onerror = () => reject(tx.error || new Error('Session store transaction failed'));

            try {
                executor(store, resolve, reject);
            } catch (err) {
                reject(err);
            }
        });
    };

    const initDatabase = () => openDatabase().then((db) => db);

    const addSession = async (session) => {
        return runStoreRequest('readwrite', (store, resolve, reject) => {
            const request = store.add(session);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    };

    const getSession = async (id) => {
        return runStoreRequest('readonly', (store, resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    };

    const updateSession = async (id, updates) => {
        return runStoreRequest('readwrite', (store, resolve, reject) => {
            const getRequest = store.get(id);
            getRequest.onerror = () => reject(getRequest.error);
            getRequest.onsuccess = () => {
                const existing = getRequest.result;
                if (!existing) {
                    reject(new Error('Session not found'));
                    return;
                }
                const updated = { ...existing, ...updates };
                const putRequest = store.put(updated);
                putRequest.onsuccess = () => resolve(updated);
                putRequest.onerror = () => reject(putRequest.error);
            };
        });
    };

    const deleteSession = async (id) => {
        return runStoreRequest('readwrite', (store, resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    };

    const clearProfile = async (profileId) => {
        return runStoreRequest('readwrite', (store, resolve, reject) => {
            if (profileId === 'all') {
                const countRequest = store.count();
                countRequest.onerror = () => reject(countRequest.error);
                countRequest.onsuccess = () => {
                    const deletedCount = countRequest.result || 0;
                    const clearRequest = store.clear();
                    clearRequest.onsuccess = () => resolve(deletedCount);
                    clearRequest.onerror = () => reject(clearRequest.error);
                };
                return;
            }

            const index = store.index('profileId');
            const request = index.openCursor(IDBKeyRange.only(profileId));
            let deleted = 0;

            request.onerror = () => reject(request.error);
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (!cursor) {
                    resolve(deleted);
                    return;
                }
                cursor.delete();
                deleted++;
                cursor.continue();
            };
        });
    };

    const getSessionsByDateRange = async (start, end) => {
        return runStoreRequest('readonly', (store, resolve, reject) => {
            const index = store.index('timestamp');
            let range = null;
            if (typeof start === 'number' && typeof end === 'number') {
                range = IDBKeyRange.bound(start, end);
            } else if (typeof start === 'number') {
                range = IDBKeyRange.lowerBound(start);
            } else if (typeof end === 'number') {
                range = IDBKeyRange.upperBound(end);
            }
            const request = range ? index.getAll(range) : index.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    };

    const clearSessionsOlderThanDays = async (days, profileId = 'default') => {
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        return runStoreRequest('readwrite', (store, resolve, reject) => {
            const index = store.index('timestamp');
            const request = index.openCursor(IDBKeyRange.upperBound(cutoff));
            let deleted = 0;

            request.onerror = () => reject(request.error);
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (!cursor) {
                    resolve(deleted);
                    return;
                }
                if (profileId === 'all' || cursor.value.profileId === profileId) {
                    cursor.delete();
                    deleted++;
                }
                cursor.continue();
            };
        });
    };

    const estimateStorageUsage = async () => {
        return runStoreRequest('readonly', (store, resolve, reject) => {
            const request = store.getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const records = request.result || [];
                const encoder = typeof global.TextEncoder !== 'undefined' ? new TextEncoder() : null;
                let approxBytes = 0;
                records.forEach((record) => {
                    const json = JSON.stringify(record);
                    if (encoder) {
                        approxBytes += encoder.encode(json).length;
                    } else {
                        approxBytes += json.length;
                    }
                });
                resolve({ count: records.length, approxBytes });
            };
        });
    };

    const resetDatabase = async () => {
        if (openPromise) {
            const db = await openPromise;
            db.close();
            openPromise = null;
        }
        const indexedDB = getIndexedDB();
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(DB_NAME);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                openPromise = null;
                resolve(true);
            };
        });
    };

    const api = {
        DB_NAME,
        DB_VERSION,
        STORE_NAME,
        initDatabase,
        addSession,
        getSession,
        updateSession,
        deleteSession,
        clearProfile,
        getSessionsByDateRange,
        clearSessionsOlderThanDays,
        estimateStorageUsage,
        resetDatabase
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    global.SessionLogging = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
