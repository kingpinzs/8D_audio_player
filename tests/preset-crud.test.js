// tests/preset-crud.test.js
// Custom Preset CRUD tests for Story 3-3
// Exercises the REAL PresetManager module (js/preset-manager.js) — not a copy.

const assert = require('assert');

// Mock localStorage (module reads the global)
class MockLocalStorage {
    constructor() {
        this.store = {};
    }

    getItem(key) {
        return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
    }

    setItem(key, value) {
        this.store[key] = value.toString();
    }

    removeItem(key) {
        delete this.store[key];
    }

    clear() {
        this.store = {};
    }
}

global.localStorage = new MockLocalStorage();
const PresetManager = require('../js/preset-manager.js');

// Mock MODE_LIBRARY (default presets) — module takes it as a parameter
const MODE_LIBRARY = [
    { id: 'focus', label: 'Focus', description: 'focus mode', accent: '#111', preset: { speed: 0.4 } },
    { id: 'calm', label: 'Calm', description: 'calm mode', accent: '#222', preset: { speed: 0.2 } },
    { id: 'energize', label: 'Energize', description: 'energize mode', accent: '#333', preset: { speed: 0.8 } }
];

// Flat presetData shape the module expects (the app's save form produces this)
const makePresetData = (name, overrides = {}) => ({
    name,
    description: 'test preset',
    speed: 0.5,
    intensity: 0.6,
    spatialDepth: 0.7,
    movement: 'circle',
    binauralEnabled: true,
    binauralFreq: 12,
    noiseType: 'pink',
    noiseVolume: 0.1,
    ...overrides
});

const freshStorage = () => {
    global.localStorage = new MockLocalStorage();
};

let testsPassed = 0;
let testsFailed = 0;
const test = (name, fn) => {
    try {
        freshStorage();
        fn();
        console.log(`✅ ${name}`);
        testsPassed++;
    } catch (err) {
        console.error(`❌ ${name} FAILED:`, err.message);
        testsFailed++;
    }
};

test('Test 1: saveCustomPreset() creates valid preset in localStorage', () => {
    const id = PresetManager.saveCustomPreset(makePresetData('My Preset'));
    assert.ok(id, 'should return new preset id');
    assert.ok(id.startsWith('custom-preset-'), 'id uses custom-preset- prefix');

    const saved = PresetManager.loadCustomPresets();
    assert.ok(saved[id], 'preset persisted under its id');
    assert.strictEqual(saved[id].name, 'My Preset');
    assert.strictEqual(saved[id].preset.speed, 0.5, 'flat speed lands in nested preset');
    assert.strictEqual(saved[id].preset.binaural.enabled, true, 'binaural flags nested');
    assert.strictEqual(saved[id].preset.noise.type, 'pink', 'noise config nested');
});

test('Test 2: storage layer accepts empty/long names (UI validates)', () => {
    const emptyId = PresetManager.saveCustomPreset(makePresetData(''));
    assert.ok(emptyId, 'empty name accepted at storage layer');
    const longId = PresetManager.saveCustomPreset(makePresetData('A'.repeat(51)));
    assert.ok(longId, 'long name accepted at storage layer');
});

test('Test 3: QuotaExceededError returns null and invokes onError', () => {
    const quotaStorage = new MockLocalStorage();
    quotaStorage.setItem = () => {
        const err = new Error('quota');
        err.name = 'QuotaExceededError';
        throw err;
    };
    global.localStorage = quotaStorage;

    let seenError = null;
    const id = PresetManager.saveCustomPreset(makePresetData('Too Big'), (err) => { seenError = err; });
    assert.strictEqual(id, null, 'save fails with null');
    assert.ok(seenError, 'onError callback invoked');
    assert.strictEqual(seenError.name, 'QuotaExceededError');
});

test('Test 4: updateCustomPreset() edits existing preset', () => {
    const id = PresetManager.saveCustomPreset(makePresetData('Before'));
    const ok = PresetManager.updateCustomPreset(id, { name: 'After' });
    assert.strictEqual(ok, true);
    assert.strictEqual(PresetManager.loadCustomPresets()[id].name, 'After');
    assert.strictEqual(PresetManager.updateCustomPreset('missing-id', { name: 'x' }), false, 'unknown id returns false');
});

test('Test 5: deleteCustomPreset() removes preset and returns its info', () => {
    const id = PresetManager.saveCustomPreset(makePresetData('Doomed'));
    const result = PresetManager.deleteCustomPreset(id);
    assert.deepStrictEqual(result, { id, name: 'Doomed' });
    assert.strictEqual(PresetManager.loadCustomPresets()[id], undefined, 'preset gone from storage');
    assert.ok(!PresetManager.getPresetOrder(MODE_LIBRARY).includes(id), 'id removed from order');
});

test('Test 6: getAllPresets() merges defaults and custom in order', () => {
    const id = PresetManager.saveCustomPreset(makePresetData('Custom One'));
    const all = PresetManager.getAllPresets(MODE_LIBRARY);
    assert.strictEqual(all.length, MODE_LIBRARY.length + 1);
    assert.strictEqual(all[0].id, 'focus', 'defaults come first by default order');
    assert.ok(all.find(p => p.id === id && p.isDefault === false), 'custom preset present, flagged non-default');
    assert.ok(all.slice(0, 3).every(p => p.isDefault), 'first three are defaults');
});

test('Test 7: savePresetOrder()/getPresetOrder() persist user ordering', () => {
    const id = PresetManager.saveCustomPreset(makePresetData('Reordered'));
    const newOrder = [id, 'calm', 'focus', 'energize'];
    PresetManager.savePresetOrder(newOrder);
    assert.deepStrictEqual(PresetManager.getPresetOrder(MODE_LIBRARY), newOrder);
    const all = PresetManager.getAllPresets(MODE_LIBRARY);
    assert.strictEqual(all[0].id, id, 'custom order puts custom preset first');
});

test('Test 8: getPresetById() finds defaults and custom presets', () => {
    const focus = PresetManager.getPresetById('focus', MODE_LIBRARY);
    assert.strictEqual(focus.name, 'Focus');
    assert.strictEqual(focus.isDefault, true);

    const id = PresetManager.saveCustomPreset(makePresetData('Findable'));
    const custom = PresetManager.getPresetById(id, MODE_LIBRARY);
    assert.strictEqual(custom.name, 'Findable');
    assert.strictEqual(custom.isDefault, false);

    assert.strictEqual(PresetManager.getPresetById('nope', MODE_LIBRARY), null);
});

test('Test 9: markPresetUsed() bumps lastUsedAt; formatLastUsed() renders', () => {
    const id = PresetManager.saveCustomPreset(makePresetData('Used'));
    const before = PresetManager.loadCustomPresets()[id].lastUsedAt;
    PresetManager.markPresetUsed(id);
    const after = PresetManager.loadCustomPresets()[id].lastUsedAt;
    assert.ok(after >= before, 'lastUsedAt not decreased');
    assert.strictEqual(PresetManager.formatLastUsed(0), 'Never used');
    assert.strictEqual(PresetManager.formatLastUsed(Date.now()), 'Just now');
});

test('Test 10: exportPreset()/importPreset() round-trip', () => {
    const id = PresetManager.saveCustomPreset(makePresetData('Exported'));
    const json = PresetManager.exportPreset(id, MODE_LIBRARY);
    assert.ok(json, 'export produces JSON');
    const parsed = JSON.parse(json);
    assert.strictEqual(parsed.name, 'Exported');
    assert.strictEqual(parsed.preset.speed, 0.5);

    const importedId = PresetManager.importPreset(json);
    assert.ok(importedId, 'import returns new id');
    const imported = PresetManager.loadCustomPresets()[importedId];
    assert.strictEqual(imported.name, 'Exported (imported)');
    assert.strictEqual(imported.preset.speed, 0.5, 'nested values survive round-trip');

    assert.strictEqual(PresetManager.importPreset('not json'), null, 'invalid JSON returns null');
    assert.strictEqual(PresetManager.importPreset('{"nope":true}'), null, 'missing fields returns null');
});

console.log(`\n📊 Test Results: ${testsPassed} passed, ${testsFailed} failed`);
if (testsFailed > 0) {
    process.exit(1);
}
console.log('🎉 All custom preset CRUD tests passed!');
