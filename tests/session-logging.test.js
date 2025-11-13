'use strict';

const assert = require('assert');
const fakeIndexedDB = require('fake-indexeddb');
const FDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');

if (typeof global.TextEncoder === 'undefined') {
    global.TextEncoder = require('util').TextEncoder;
}

global.indexedDB = fakeIndexedDB.indexedDB;
global.IDBKeyRange = fakeIndexedDB.IDBKeyRange || FDBKeyRange;

const SessionLogging = require('../session-logging');

const log = (...args) => console.log(...args);

const buildSession = (overrides = {}) => ({
    profileId: overrides.profileId || 'default',
    timestamp: overrides.timestamp || Date.now(),
    trackId: overrides.trackId || `track-${Math.random().toString(36).slice(2)}`,
    trackName: overrides.trackName || 'Test Track',
    presetId: overrides.presetId || 'focus',
    presetLabel: overrides.presetLabel || 'Focus',
    ritualUsed: overrides.ritualUsed ?? true,
    duration: overrides.duration || 0,
    hrAvg: null,
    hrMax: null,
    moodBefore: null,
    moodAfter: null,
    notes: '',
    endedManually: false
});

const resetDb = async () => {
    await SessionLogging.resetDatabase();
    await SessionLogging.initDatabase();
};

const runTest = async (name, fn) => {
    try {
        await fn();
        log(`✅ ${name}`);
        return true;
    } catch (error) {
        console.error(`❌ ${name}`);
        console.error(error);
        return false;
    }
};

const createQuotaIndexedDB = () => {
    class RejectingTransaction {
        constructor() {
            this.onabort = null;
            this.onerror = null;
        }
        objectStore() {
            return new RejectingStore(this);
        }
    }

    class RejectingStore {
        constructor(tx) {
            this.tx = tx;
        }
        add() {
            const request = {};
            const error = new Error('Quota exceeded');
            error.name = 'QuotaExceededError';
            setTimeout(() => {
                request.error = error;
                if (typeof request.onerror === 'function') {
                    request.onerror({ target: { error } });
                }
                if (typeof this.tx.onerror === 'function') {
                    this.tx.onerror({ target: { error } });
                }
            }, 0);
            return request;
        }
    }

    class RejectingDB {
        constructor() {
            this.objectStoreNames = {
                contains: () => true
            };
        }
        transaction() {
            return new RejectingTransaction();
        }
        close() {}
    }

    return {
        open() {
            const request = {};
            setTimeout(() => {
                if (typeof request.onupgradeneeded === 'function') {
                    const event = {
                        target: {
                            result: new RejectingDB(),
                            transaction: {
                                objectStore: () => ({
                                    indexNames: { contains: () => false },
                                    createIndex: () => {}
                                })
                            }
                        }
                    };
                    request.onupgradeneeded(event);
                }
                if (typeof request.onsuccess === 'function') {
                    request.result = new RejectingDB();
                    request.onsuccess({ target: request });
                }
            }, 0);
            return request;
        },
        deleteDatabase() {
            const request = {};
            setTimeout(() => {
                if (typeof request.onsuccess === 'function') {
                    request.onsuccess({ target: request });
                }
            }, 0);
            return request;
        }
    };
};

(async () => {
    log('🧪 Running session logging tests...\n');
    let passed = 0;
    let failed = 0;

    if (await runTest('Database schema initialization', async () => {
        await resetDb();
        const schema = await new Promise((resolve, reject) => {
            const request = indexedDB.open(SessionLogging.DB_NAME);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;
                const hasStore = db.objectStoreNames.contains(SessionLogging.STORE_NAME);
                const tx = db.transaction(SessionLogging.STORE_NAME, 'readonly');
                const store = tx.objectStore(SessionLogging.STORE_NAME);
                const indexes = Array.from(store.indexNames);
                db.close();
                resolve({ hasStore, indexes });
            };
        });

        assert.strictEqual(schema.hasStore, true, 'sessions store missing');
        ['timestamp', 'profileId', 'presetId', 'ritualUsed'].forEach((indexName) => {
            assert(schema.indexes.includes(indexName), `Missing index ${indexName}`);
        });
    })) {
        passed++; 
    } else {
        failed++;
    }

    if (await runTest('Session CRUD operations', async () => {
        await resetDb();
        const sample = buildSession({ trackId: 'track-001' });
        const sessionId = await SessionLogging.addSession(sample);
        const stored = await SessionLogging.getSession(sessionId);
        assert.strictEqual(stored.trackId, 'track-001');

        await SessionLogging.updateSession(sessionId, { duration: 95, endedManually: true });
        const updated = await SessionLogging.getSession(sessionId);
        assert.strictEqual(updated.duration, 95);
        assert.strictEqual(updated.endedManually, true);

        await SessionLogging.deleteSession(sessionId);
        const deleted = await SessionLogging.getSession(sessionId);
        assert.strictEqual(deleted, undefined);
    })) {
        passed++; 
    } else {
        failed++;
    }

    if (await runTest('clearProfile() functionality', async () => {
        await resetDb();
        const defaultSessions = [
            buildSession({ trackId: 'focus-1' }),
            buildSession({ trackId: 'focus-2' }),
            buildSession({ trackId: 'focus-3' })
        ];
        const secondary = buildSession({ trackId: 'calm-1', profileId: 'secondary' });

        for (const session of [...defaultSessions, secondary]) {
            await SessionLogging.addSession(session);
        }

        const removedDefault = await SessionLogging.clearProfile('default');
        assert.strictEqual(removedDefault, defaultSessions.length);

        const remaining = await SessionLogging.getSessionsByDateRange();
        assert.strictEqual(remaining.length, 1);
        assert.strictEqual(remaining[0].profileId, 'secondary');

        const removedAll = await SessionLogging.clearProfile('all');
        assert.strictEqual(removedAll, 1);

        const finalRecords = await SessionLogging.getSessionsByDateRange();
        assert.strictEqual(finalRecords.length, 0);
    })) {
        passed++; 
    } else {
        failed++;
    }

    if (await runTest('Concurrent writes maintain unique IDs', async () => {
        await resetDb();
        const [idOne, idTwo] = await Promise.all([
            SessionLogging.addSession(buildSession({ trackId: 'parallel-1' })),
            SessionLogging.addSession(buildSession({ trackId: 'parallel-2' }))
        ]);
        assert.notStrictEqual(idOne, idTwo, 'Sessions should have unique IDs');

        const sessions = await SessionLogging.getSessionsByDateRange();
        const sortedIds = sessions.map((session) => session.trackId).sort();
        assert.deepStrictEqual(sortedIds, ['parallel-1', 'parallel-2']);
    })) {
        passed++; 
    } else {
        failed++;
    }

    if (await runTest('Error handling - QuotaExceededError propagation', async () => {
        await SessionLogging.resetDatabase();
        const originalIndexedDB = global.indexedDB;
        try {
            global.indexedDB = createQuotaIndexedDB();
            await SessionLogging.resetDatabase();
            await assert.rejects(
                SessionLogging.addSession(buildSession()),
                (error) => error && error.name === 'QuotaExceededError'
            );
        } finally {
            global.indexedDB = fakeIndexedDB.indexedDB;
            await resetDb();
        }
    })) {
        passed++; 
    } else {
        failed++;
    }

    log('\n' + '='.repeat(50));
    log(`📊 Test Results: ${passed} passed, ${failed} failed`);

    if (failed === 0) {
        log('🎉 All session logging tests passed!');
        process.exit(0);
    } else {
        log('❌ Session logging tests failed.');
        process.exit(1);
    }
})();
