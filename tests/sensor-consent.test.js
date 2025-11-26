'use strict';

/**
 * Story 5-1: Sensor Consent Unit Tests
 * Tests capability detection and IndexedDB consent CRUD operations
 */

const assert = require('assert');
const fakeIndexedDB = require('fake-indexeddb');
const FDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');

if (typeof global.TextEncoder === 'undefined') {
    global.TextEncoder = require('util').TextEncoder;
}

global.indexedDB = fakeIndexedDB.indexedDB;
global.IDBKeyRange = fakeIndexedDB.IDBKeyRange || FDBKeyRange;

// Load the sensor consent module
const SensorConsent = require('../sensor-consent');

const log = (...args) => console.log(...args);

// Test helper to build consent records
const buildConsent = (overrides = {}) => ({
    deviceId: overrides.deviceId || `device-${Math.random().toString(36).slice(2)}`,
    deviceName: overrides.deviceName || 'Test Device',
    type: overrides.type || 'bluetooth',
    scopes: overrides.scopes || ['heart_rate']
});

// Reset database between tests
const resetDb = async () => {
    const api = global.sensorConsentApi;
    if (api) {
        await api.clearAllConsent();
    }
};

// Test runner
const runTest = async (name, fn) => {
    try {
        await fn();
        log(`  ✅ ${name}`);
        return true;
    } catch (error) {
        console.error(`  ❌ ${name}`);
        console.error(`     ${error.message}`);
        return false;
    }
};

// =============================================================
// CAPABILITY DETECTION TESTS
// =============================================================

// Helper to create mock navigator for testing
const createMockNavigator = (config = {}) => ({
    bluetooth: config.bluetooth ? {
        requestDevice: () => Promise.resolve({})
    } : undefined,
    serial: config.serial ? {
        requestPort: () => Promise.resolve({})
    } : undefined
});

// Capability detection function to test (mirrors index.html implementation)
const detectCapabilities = (nav) => {
    const btSupported = typeof nav !== 'undefined' &&
        typeof nav.bluetooth !== 'undefined' &&
        typeof nav.bluetooth?.requestDevice === 'function';

    const serialSupport = typeof nav !== 'undefined' &&
        typeof nav.serial !== 'undefined' &&
        typeof nav.serial?.requestPort === 'function';

    return { bluetoothSupported: btSupported, serialSupported: serialSupport };
};

const capabilityTests = async () => {
    log('\n📡 Capability Detection Tests');

    let passed = 0;
    let failed = 0;

    // Test: Bluetooth supported when navigator.bluetooth exists
    if (await runTest('detectBluetoothSupported - returns true when API available', async () => {
        const nav = createMockNavigator({ bluetooth: true });
        const { bluetoothSupported } = detectCapabilities(nav);
        assert.strictEqual(bluetoothSupported, true);
    })) passed++; else failed++;

    // Test: Bluetooth unsupported when navigator.bluetooth missing
    if (await runTest('detectBluetoothSupported - returns false when API missing', async () => {
        const nav = createMockNavigator({ bluetooth: false });
        const { bluetoothSupported } = detectCapabilities(nav);
        assert.strictEqual(bluetoothSupported, false);
    })) passed++; else failed++;

    // Test: Serial supported when navigator.serial exists
    if (await runTest('detectSerialSupported - returns true when API available', async () => {
        const nav = createMockNavigator({ serial: true });
        const { serialSupported } = detectCapabilities(nav);
        assert.strictEqual(serialSupported, true);
    })) passed++; else failed++;

    // Test: Serial unsupported when navigator.serial missing
    if (await runTest('detectSerialSupported - returns false when API missing', async () => {
        const nav = createMockNavigator({ serial: false });
        const { serialSupported } = detectCapabilities(nav);
        assert.strictEqual(serialSupported, false);
    })) passed++; else failed++;

    // Test: Firefox simulation (no Bluetooth, Serial works)
    if (await runTest('Firefox simulation - no Bluetooth, Serial works', async () => {
        const nav = createMockNavigator({ bluetooth: false, serial: true });
        const { bluetoothSupported, serialSupported } = detectCapabilities(nav);
        assert.strictEqual(bluetoothSupported, false, 'Bluetooth should be unsupported');
        assert.strictEqual(serialSupported, true, 'Serial should be supported');
    })) passed++; else failed++;

    // Test: Safari simulation (no sensors)
    if (await runTest('Safari simulation - no sensors available', async () => {
        const nav = createMockNavigator({ bluetooth: false, serial: false });
        const { bluetoothSupported, serialSupported } = detectCapabilities(nav);
        assert.strictEqual(bluetoothSupported, false, 'Bluetooth should be unsupported');
        assert.strictEqual(serialSupported, false, 'Serial should be unsupported');
    })) passed++; else failed++;

    // Test: Chrome/Edge full support
    if (await runTest('Chrome/Edge simulation - full sensor support', async () => {
        const nav = createMockNavigator({ bluetooth: true, serial: true });
        const { bluetoothSupported, serialSupported } = detectCapabilities(nav);
        assert.strictEqual(bluetoothSupported, true, 'Bluetooth should be supported');
        assert.strictEqual(serialSupported, true, 'Serial should be supported');
    })) passed++; else failed++;

    log(`\n   Capability Tests: ${passed} passed, ${failed} failed`);
    return failed === 0;
};

// =============================================================
// INDEXEDDB CONSENT CRUD TESTS
// =============================================================

const consentCrudTests = async () => {
    log('\n💾 IndexedDB Consent CRUD Tests');

    const api = global.sensorConsentApi;
    let passed = 0;
    let failed = 0;

    // Test: Initialize database
    if (await runTest('initDatabase - creates database successfully', async () => {
        await resetDb();
        const db = await api.initDatabase();
        assert.ok(db, 'Database should be initialized');
    })) passed++; else failed++;

    // Test: Add consent record (AC6)
    if (await runTest('addConsent - creates new consent record', async () => {
        await resetDb();
        const device = buildConsent({ deviceName: 'Polar H10' });
        const id = await api.addConsent(device);

        assert.ok(id, 'Should return record ID');
        assert.ok(typeof id === 'number', 'ID should be a number');
    })) passed++; else failed++;

    // Test: Get consent by deviceId
    if (await runTest('getConsent - retrieves consent by deviceId', async () => {
        await resetDb();
        const device = buildConsent({ deviceId: 'test-device-123', deviceName: 'Test Sensor' });
        await api.addConsent(device);

        const consent = await api.getConsent('test-device-123');

        assert.ok(consent, 'Should find consent record');
        assert.strictEqual(consent.deviceId, 'test-device-123');
        assert.strictEqual(consent.deviceName, 'Test Sensor');
        assert.strictEqual(consent.type, 'bluetooth');
        assert.ok(Array.isArray(consent.scopes), 'Scopes should be array');
        assert.ok(consent.grantedAt > 0, 'grantedAt should be set');
        assert.strictEqual(consent.connectionCount, 1);
        assert.strictEqual(consent.revokedAt, null);
    })) passed++; else failed++;

    // Test: Get consent returns null for unknown device
    if (await runTest('getConsent - returns null for unknown deviceId', async () => {
        await resetDb();
        const consent = await api.getConsent('nonexistent-device');
        assert.strictEqual(consent, null);
    })) passed++; else failed++;

    // Test: Update consent (AC6 - subsequent connections)
    if (await runTest('recordConnection - updates lastConnectedAt and connectionCount', async () => {
        await resetDb();
        const device = buildConsent({ deviceId: 'connect-test' });
        await api.addConsent(device);

        const before = await api.getConsent('connect-test');
        const beforeCount = before.connectionCount;
        const beforeTime = before.lastConnectedAt;

        // Small delay to ensure timestamp difference
        await new Promise(r => setTimeout(r, 10));

        await api.recordConnection('connect-test');
        const after = await api.getConsent('connect-test');

        assert.strictEqual(after.connectionCount, beforeCount + 1, 'Count should increment');
        assert.ok(after.lastConnectedAt >= beforeTime, 'lastConnectedAt should be updated');
    })) passed++; else failed++;

    // Test: Get consented devices (AC8)
    if (await runTest('getConsentedDevices - returns active devices sorted by lastConnectedAt', async () => {
        await resetDb();

        // Add multiple devices with different timestamps
        await api.addConsent(buildConsent({ deviceId: 'device-1', deviceName: 'Device 1' }));
        await new Promise(r => setTimeout(r, 10));
        await api.addConsent(buildConsent({ deviceId: 'device-2', deviceName: 'Device 2' }));
        await new Promise(r => setTimeout(r, 10));
        await api.addConsent(buildConsent({ deviceId: 'device-3', deviceName: 'Device 3' }));

        const devices = await api.getConsentedDevices();

        assert.strictEqual(devices.length, 3, 'Should return 3 devices');
        // Most recent first
        assert.strictEqual(devices[0].deviceId, 'device-3');
        assert.strictEqual(devices[1].deviceId, 'device-2');
        assert.strictEqual(devices[2].deviceId, 'device-1');
    })) passed++; else failed++;

    // Test: Get consented devices filters out revoked (AC8)
    if (await runTest('getConsentedDevices - excludes revoked devices', async () => {
        await resetDb();

        await api.addConsent(buildConsent({ deviceId: 'active-device' }));
        await api.addConsent(buildConsent({ deviceId: 'revoked-device' }));
        await api.revokeConsent('revoked-device');

        const devices = await api.getConsentedDevices();

        assert.strictEqual(devices.length, 1);
        assert.strictEqual(devices[0].deviceId, 'active-device');
    })) passed++; else failed++;

    // Test: Get consented devices limited to MAX_DEVICES (AC8)
    if (await runTest('getConsentedDevices - limits to 5 devices', async () => {
        await resetDb();

        // Add 7 devices
        for (let i = 0; i < 7; i++) {
            await api.addConsent(buildConsent({ deviceId: `device-${i}` }));
            await new Promise(r => setTimeout(r, 5));
        }

        const devices = await api.getConsentedDevices();

        assert.strictEqual(devices.length, 5, 'Should return max 5 devices');
    })) passed++; else failed++;

    // Test: Revoke consent (AC7 - soft delete)
    if (await runTest('revokeConsent - sets revokedAt timestamp (soft delete)', async () => {
        await resetDb();
        const device = buildConsent({ deviceId: 'to-revoke' });
        await api.addConsent(device);

        const beforeRevoke = await api.getConsent('to-revoke');
        assert.strictEqual(beforeRevoke.revokedAt, null, 'Should not be revoked initially');

        await api.revokeConsent('to-revoke');

        // Can't find via getConsent (filters active only)
        const afterRevoke = await api.getConsent('to-revoke');
        assert.strictEqual(afterRevoke, null, 'Should not find revoked device');
    })) passed++; else failed++;

    // Test: Clear all consent
    if (await runTest('clearAllConsent - removes all records', async () => {
        await resetDb();

        await api.addConsent(buildConsent({ deviceId: 'device-a' }));
        await api.addConsent(buildConsent({ deviceId: 'device-b' }));

        const count = await api.clearAllConsent();
        assert.strictEqual(count, 2, 'Should report 2 cleared');

        const devices = await api.getConsentedDevices();
        assert.strictEqual(devices.length, 0, 'Should have no devices');
    })) passed++; else failed++;

    log(`\n   Consent CRUD Tests: ${passed} passed, ${failed} failed`);
    return failed === 0;
};

// =============================================================
// INTEGRATION TESTS
// =============================================================

const integrationTests = async () => {
    log('\n🔗 Integration Tests');

    const api = global.sensorConsentApi;
    let passed = 0;
    let failed = 0;

    // Test: Full connection flow - connect, consent stored, appears in list
    if (await runTest('Connection flow - consent stored and device appears in list', async () => {
        await resetDb();

        // Simulate successful connection
        const device = {
            deviceId: 'polar-h10-xyz',
            deviceName: 'Polar H10',
            type: 'bluetooth',
            scopes: ['heart_rate']
        };

        await api.addConsent(device);

        // Verify appears in list
        const devices = await api.getConsentedDevices();
        const found = devices.find(d => d.deviceId === 'polar-h10-xyz');

        assert.ok(found, 'Device should appear in list');
        assert.strictEqual(found.deviceName, 'Polar H10');
        assert.strictEqual(found.connectionCount, 1);
    })) passed++; else failed++;

    // Test: Forget flow - device removed from list
    if (await runTest('Forget flow - device removed from list after revoke', async () => {
        await resetDb();

        await api.addConsent(buildConsent({ deviceId: 'to-forget', deviceName: 'Forget Me' }));

        // Verify device is in list
        let devices = await api.getConsentedDevices();
        assert.strictEqual(devices.length, 1);

        // Forget the device
        await api.revokeConsent('to-forget');

        // Verify device removed from list
        devices = await api.getConsentedDevices();
        assert.strictEqual(devices.length, 0, 'Device should be removed');
    })) passed++; else failed++;

    // Test: Reconnection increments count
    if (await runTest('Reconnection flow - connection count increments', async () => {
        await resetDb();

        await api.addConsent(buildConsent({ deviceId: 'reconnect-test' }));

        // Simulate 3 more connections
        await api.recordConnection('reconnect-test');
        await api.recordConnection('reconnect-test');
        await api.recordConnection('reconnect-test');

        const consent = await api.getConsent('reconnect-test');
        assert.strictEqual(consent.connectionCount, 4, 'Should have 4 total connections');
    })) passed++; else failed++;

    // Test: Serial device consent
    if (await runTest('Serial device consent - stored correctly', async () => {
        await resetDb();

        await api.addConsent({
            deviceId: 'serial-1234-5678',
            deviceName: 'Serial Device (USB)',
            type: 'serial',
            scopes: ['heart_rate']
        });

        const consent = await api.getConsent('serial-1234-5678');
        assert.strictEqual(consent.type, 'serial');
        assert.strictEqual(consent.deviceName, 'Serial Device (USB)');
    })) passed++; else failed++;

    log(`\n   Integration Tests: ${passed} passed, ${failed} failed`);
    return failed === 0;
};

// =============================================================
// MAIN TEST RUNNER
// =============================================================

const runAllTests = async () => {
    log('\n===========================================');
    log('Story 5-1: Sensor Consent Tests');
    log('===========================================');

    const results = [];

    results.push(await capabilityTests());
    results.push(await consentCrudTests());
    results.push(await integrationTests());

    const allPassed = results.every(r => r);

    log('\n===========================================');
    if (allPassed) {
        log('✅ All tests passed!');
    } else {
        log('❌ Some tests failed');
        process.exitCode = 1;
    }
    log('===========================================\n');
};

runAllTests();
