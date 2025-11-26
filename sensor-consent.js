'use strict';

/**
 * Story 5-1: Sensor Consent Manager
 * IndexedDB storage for sensor device consent records
 *
 * Schema (sensor_consent store):
 * - id: auto-increment (primary key)
 * - deviceId: string (BLE device ID or Serial port info)
 * - deviceName: string (user-friendly name)
 * - type: "bluetooth" | "serial"
 * - grantedAt: number (timestamp)
 * - scopes: string[] (e.g., ["heart_rate"])
 * - lastConnectedAt: number | null
 * - connectionCount: number
 * - revokedAt: number | null (soft delete timestamp)
 */

(function (global) {
    const DB_NAME = 'mp3_8d_sensors';
    const DB_VERSION = 1;
    const STORE_NAME = 'sensor_consent';
    const MAX_DEVICES = 5; // Max devices to show in quick-connect list (AC8)

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

    const openDatabase = () => {
        if (openPromise) {
            return openPromise;
        }

        const indexedDB = getIndexedDB();
        openPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error || new Error('Failed to open sensor consent database'));

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    // Index on deviceId for quick lookups
                    store.createIndex('deviceId', 'deviceId', { unique: false });
                    // Index on type for filtering by sensor type
                    store.createIndex('type', 'type', { unique: false });
                    // Index on revokedAt for filtering active devices
                    store.createIndex('revokedAt', 'revokedAt', { unique: false });
                    // Index on lastConnectedAt for sorting
                    store.createIndex('lastConnectedAt', 'lastConnectedAt', { unique: false });
                    console.log('[SensorConsent] Created sensor_consent store with indexes');
                }
            };

            request.onblocked = () => {
                console.warn('[SensorConsent] Database upgrade blocked by another tab.');
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

            tx.onabort = () => reject(tx.error || new Error('Sensor consent transaction aborted'));
            tx.onerror = () => reject(tx.error || new Error('Sensor consent transaction failed'));

            try {
                executor(store, resolve, reject);
            } catch (err) {
                reject(err);
            }
        });
    };

    /**
     * Initialize the database (creates store if needed)
     */
    const initDatabase = () => openDatabase().then((db) => db);

    /**
     * Add a new consent record (AC6)
     * @param {Object} device - Device info
     * @param {string} device.deviceId - Unique device identifier
     * @param {string} device.deviceName - User-friendly device name
     * @param {string} device.type - "bluetooth" | "serial"
     * @param {string[]} [device.scopes] - Permission scopes (default: ["heart_rate"])
     * @returns {Promise<number>} The new record ID
     */
    const addConsent = async (device) => {
        const record = {
            deviceId: device.deviceId,
            deviceName: device.deviceName || 'Unknown Device',
            type: device.type,
            grantedAt: Date.now(),
            scopes: device.scopes || ['heart_rate'],
            lastConnectedAt: Date.now(),
            connectionCount: 1,
            revokedAt: null
        };

        return runStoreRequest('readwrite', (store, resolve, reject) => {
            const request = store.add(record);
            request.onsuccess = () => {
                console.log(`[SensorBridge] Consent stored for: ${record.deviceName}`);
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    };

    /**
     * Update an existing consent record (AC6 - subsequent connections)
     * @param {string} deviceId - The device ID to update
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} The updated record
     */
    const updateConsent = async (deviceId, updates) => {
        return runStoreRequest('readwrite', (store, resolve, reject) => {
            const index = store.index('deviceId');
            const getRequest = index.getAll(IDBKeyRange.only(deviceId));

            getRequest.onerror = () => reject(getRequest.error);
            getRequest.onsuccess = () => {
                const records = getRequest.result || [];
                // Find active record (not revoked)
                const existing = records.find(r => r.revokedAt === null);

                if (!existing) {
                    reject(new Error('Consent record not found'));
                    return;
                }

                const updated = { ...existing, ...updates };
                const putRequest = store.put(updated);
                putRequest.onsuccess = () => {
                    console.log(`[SensorConsent] Updated consent for: ${existing.deviceName}`);
                    resolve(updated);
                };
                putRequest.onerror = () => reject(putRequest.error);
            };
        });
    };

    /**
     * Get consent record by device ID
     * @param {string} deviceId - The device ID
     * @returns {Promise<Object|null>} The consent record or null
     */
    const getConsent = async (deviceId) => {
        return runStoreRequest('readonly', (store, resolve, reject) => {
            const index = store.index('deviceId');
            const request = index.getAll(IDBKeyRange.only(deviceId));

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const records = request.result || [];
                // Return active record (not revoked)
                const active = records.find(r => r.revokedAt === null);
                resolve(active || null);
            };
        });
    };

    /**
     * Get all consented devices (AC8 - quick-connect list)
     * Returns devices where revokedAt === null, sorted by lastConnectedAt desc
     * Limited to MAX_DEVICES (5)
     * @returns {Promise<Object[]>} Array of consent records
     */
    const getConsentedDevices = async () => {
        return runStoreRequest('readonly', (store, resolve, reject) => {
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const records = request.result || [];
                // Filter active devices (not revoked)
                const active = records.filter(r => r.revokedAt === null);
                // Sort by lastConnectedAt descending
                active.sort((a, b) => (b.lastConnectedAt || 0) - (a.lastConnectedAt || 0));
                // Limit to max devices
                resolve(active.slice(0, MAX_DEVICES));
            };
        });
    };

    /**
     * Revoke consent for a device (AC7 - forget device, soft delete)
     * Sets revokedAt timestamp instead of hard delete for audit trail
     * @param {string} deviceId - The device ID to revoke
     * @returns {Promise<Object>} The revoked record
     */
    const revokeConsent = async (deviceId) => {
        return runStoreRequest('readwrite', (store, resolve, reject) => {
            const index = store.index('deviceId');
            const getRequest = index.getAll(IDBKeyRange.only(deviceId));

            getRequest.onerror = () => reject(getRequest.error);
            getRequest.onsuccess = () => {
                const records = getRequest.result || [];
                const existing = records.find(r => r.revokedAt === null);

                if (!existing) {
                    reject(new Error('Active consent record not found'));
                    return;
                }

                const revoked = { ...existing, revokedAt: Date.now() };
                const putRequest = store.put(revoked);
                putRequest.onsuccess = () => {
                    console.log(`[SensorBridge] Device forgotten: ${deviceId}`);
                    resolve(revoked);
                };
                putRequest.onerror = () => reject(putRequest.error);
            };
        });
    };

    /**
     * Record a connection (increment count, update timestamp)
     * Called when reconnecting to a previously consented device
     * @param {string} deviceId - The device ID
     * @returns {Promise<Object>} The updated record
     */
    const recordConnection = async (deviceId) => {
        return runStoreRequest('readwrite', (store, resolve, reject) => {
            const index = store.index('deviceId');
            const getRequest = index.getAll(IDBKeyRange.only(deviceId));

            getRequest.onerror = () => reject(getRequest.error);
            getRequest.onsuccess = () => {
                const records = getRequest.result || [];
                const existing = records.find(r => r.revokedAt === null);

                if (!existing) {
                    reject(new Error('Consent record not found'));
                    return;
                }

                const updated = {
                    ...existing,
                    lastConnectedAt: Date.now(),
                    connectionCount: (existing.connectionCount || 0) + 1
                };
                const putRequest = store.put(updated);
                putRequest.onsuccess = () => {
                    console.log(`[SensorConsent] Connection recorded for: ${existing.deviceName} (count: ${updated.connectionCount})`);
                    resolve(updated);
                };
                putRequest.onerror = () => reject(putRequest.error);
            };
        });
    };

    /**
     * Clear all consent records (for testing or profile clear)
     * @returns {Promise<number>} Number of records cleared
     */
    const clearAllConsent = async () => {
        return runStoreRequest('readwrite', (store, resolve, reject) => {
            const countRequest = store.count();
            countRequest.onerror = () => reject(countRequest.error);
            countRequest.onsuccess = () => {
                const count = countRequest.result || 0;
                const clearRequest = store.clear();
                clearRequest.onsuccess = () => {
                    console.log(`[SensorConsent] Cleared ${count} consent records`);
                    resolve(count);
                };
                clearRequest.onerror = () => reject(clearRequest.error);
            };
        });
    };

    /**
     * Auto-prune old devices when adding new one (keep max 5)
     * Soft-deletes oldest devices by lastConnectedAt
     * @returns {Promise<number>} Number of devices pruned
     */
    const pruneOldDevices = async () => {
        const devices = await getConsentedDevices();
        if (devices.length <= MAX_DEVICES) {
            return 0;
        }

        // Get devices beyond the limit
        const toPrune = devices.slice(MAX_DEVICES);
        let pruned = 0;

        for (const device of toPrune) {
            try {
                await revokeConsent(device.deviceId);
                pruned++;
            } catch (err) {
                console.warn(`[SensorConsent] Failed to prune device: ${device.deviceId}`, err);
            }
        }

        console.log(`[SensorConsent] Pruned ${pruned} old devices`);
        return pruned;
    };

    // Expose API globally
    global.sensorConsentApi = {
        initDatabase,
        addConsent,
        updateConsent,
        getConsent,
        getConsentedDevices,
        revokeConsent,
        recordConnection,
        clearAllConsent,
        pruneOldDevices,
        // Constants for reference
        DB_NAME,
        STORE_NAME,
        MAX_DEVICES
    };

    // Helper to get API (matches session-logging pattern)
    global.getSensorConsentApi = () => {
        try {
            getIndexedDB();
            return global.sensorConsentApi;
        } catch {
            return null;
        }
    };

})(typeof window !== 'undefined' ? window : global);
