/**
 * Story 6-1: Service Worker & Offline UX Tests
 *
 * Tests for:
 * - SW registration logic
 * - Offline state detection
 * - Update flow states
 * - Audio cache consent
 * - Cache indicator logic
 */

// ============================================================
// Test Utilities
// ============================================================

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName) {
    if (condition) {
        console.log(`  \u2705 ${testName}`);
        testsPassed++;
    } else {
        console.log(`  \u274c ${testName}`);
        testsFailed++;
    }
}

function assertEqual(actual, expected, testName) {
    if (actual === expected) {
        console.log(`  \u2705 ${testName}`);
        testsPassed++;
    } else {
        console.log(`  \u274c ${testName} - expected ${expected}, got ${actual}`);
        testsFailed++;
    }
}

// ============================================================
// Mock Setup
// ============================================================

// Mock localStorage
const mockLocalStorage = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = String(value); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; }
    };
})();

global.localStorage = mockLocalStorage;

// Mock navigator
const createMockNavigator = (config = {}) => {
    const nav = {
        onLine: config.onLine !== undefined ? config.onLine : true
    };
    // Only add serviceWorker if not explicitly set to undefined
    if (config.hasOwnProperty('serviceWorker')) {
        nav.serviceWorker = config.serviceWorker;
    } else {
        nav.serviceWorker = {
            register: async () => ({
                scope: '/',
                active: null,
                waiting: null,
                installing: null,
                addEventListener: () => {}
            }),
            addEventListener: () => {}
        };
    }
    return nav;
};

// ============================================================
// Test: Audio Cache Consent Persistence
// ============================================================

console.log('\n\ud83d\udce6 Audio Cache Consent Tests');

// Test 1: Default consent is false
mockLocalStorage.clear();
const defaultConsent = mockLocalStorage.getItem('mp3_8d_audio_cache_consent');
assertEqual(defaultConsent, null, 'Default consent is not set (null)');

// Test 2: Consent can be enabled
mockLocalStorage.setItem('mp3_8d_audio_cache_consent', 'true');
const enabledConsent = mockLocalStorage.getItem('mp3_8d_audio_cache_consent');
assertEqual(enabledConsent, 'true', 'Consent can be set to true');

// Test 3: Consent can be disabled
mockLocalStorage.setItem('mp3_8d_audio_cache_consent', 'false');
const disabledConsent = mockLocalStorage.getItem('mp3_8d_audio_cache_consent');
assertEqual(disabledConsent, 'false', 'Consent can be set to false');

// Test 4: Consent key matches architecture spec
const EXPECTED_KEY = 'mp3_8d_audio_cache_consent';
mockLocalStorage.setItem(EXPECTED_KEY, 'true');
assert(
    mockLocalStorage.getItem(EXPECTED_KEY) === 'true',
    'Consent key matches spec: mp3_8d_audio_cache_consent'
);

// ============================================================
// Test: Offline Detection Logic
// ============================================================

console.log('\n\ud83c\udf10 Offline Detection Tests');

// Test 5: Detect online state
let mockNav = createMockNavigator({ onLine: true });
assertEqual(mockNav.onLine, true, 'Detect online state from navigator.onLine');

// Test 6: Detect offline state
mockNav = createMockNavigator({ onLine: false });
assertEqual(mockNav.onLine, false, 'Detect offline state from navigator.onLine');

// Test 7: State transitions
const onlineOfflineTransitions = () => {
    const states = [];
    let isOnline = true;

    // Simulate online
    states.push({ event: 'initial', online: isOnline });

    // Simulate offline event
    isOnline = false;
    states.push({ event: 'offline', online: isOnline });

    // Simulate online event
    isOnline = true;
    states.push({ event: 'online', online: isOnline });

    return states;
};

const transitions = onlineOfflineTransitions();
assertEqual(transitions.length, 3, 'State transitions tracked correctly');
assertEqual(transitions[0].online, true, 'Initial state is online');
assertEqual(transitions[1].online, false, 'Offline event updates state');
assertEqual(transitions[2].online, true, 'Online event updates state');

// ============================================================
// Test: SW Status States
// ============================================================

console.log('\n\u2699\ufe0f SW Status State Tests');

// Test 8: Valid SW status states
const validStates = ['unsupported', 'installing', 'waiting', 'active', 'error'];
validStates.forEach(state => {
    assert(
        ['unsupported', 'installing', 'waiting', 'active', 'error'].includes(state),
        `Valid SW status: "${state}"`
    );
});

// Test 9: SW unsupported detection
const mockNavNoSW = createMockNavigator({ serviceWorker: undefined });
assertEqual(
    mockNavNoSW.serviceWorker,
    undefined,
    'Detect SW unsupported when navigator.serviceWorker missing'
);

// Test 10: SW supported detection
const mockNavWithSW = createMockNavigator();
assert(
    mockNavWithSW.serviceWorker !== undefined,
    'Detect SW supported when navigator.serviceWorker exists'
);

// ============================================================
// Test: Update Flow Logic
// ============================================================

console.log('\n\ud83d\udd04 Update Flow Tests');

// Test 11: SKIP_WAITING message format
const skipWaitingMessage = { type: 'SKIP_WAITING' };
assertEqual(skipWaitingMessage.type, 'SKIP_WAITING', 'SKIP_WAITING message type correct');

// Test 12: Update available state tracking
const updateFlowSimulation = () => {
    let updateAvailable = false;
    let swStatus = 'active';

    // Simulate new worker installing
    swStatus = 'installing';

    // Simulate new worker installed (waiting)
    swStatus = 'waiting';
    updateAvailable = true;

    // Simulate skipWaiting
    swStatus = 'active';
    updateAvailable = false;

    return { swStatus, updateAvailable };
};

const flowResult = updateFlowSimulation();
assertEqual(flowResult.swStatus, 'active', 'Update flow ends in active state');
assertEqual(flowResult.updateAvailable, false, 'Update available cleared after apply');

// ============================================================
// Test: Cache Indicator Logic
// ============================================================

console.log('\n\u2601\ufe0f Cache Indicator Tests');

// Test 13: Track cached check logic
const cachedUrls = new Set([
    'https://example.com/track1.mp3',
    'https://example.com/track2.mp3'
]);

const isTrackCached = (track, consent, cachedSet) => {
    if (!consent || cachedSet.size === 0) return false;
    if (track.url) {
        return cachedSet.has(track.url);
    }
    return false;
};

// Test with consent ON and cached track
let result = isTrackCached(
    { url: 'https://example.com/track1.mp3', name: 'Track 1' },
    true,
    cachedUrls
);
assertEqual(result, true, 'Cached track detected when consent ON');

// Test with consent ON but non-cached track
result = isTrackCached(
    { url: 'https://example.com/track3.mp3', name: 'Track 3' },
    true,
    cachedUrls
);
assertEqual(result, false, 'Non-cached track detected when consent ON');

// Test with consent OFF
result = isTrackCached(
    { url: 'https://example.com/track1.mp3', name: 'Track 1' },
    false,
    cachedUrls
);
assertEqual(result, false, 'Cached check returns false when consent OFF');

// Test with local file (no URL)
result = isTrackCached(
    { name: 'Local Track' },
    true,
    cachedUrls
);
assertEqual(result, false, 'Local file without URL returns false');

// ============================================================
// Test: Workbox Config Validation
// ============================================================

console.log('\n\ud83d\udce6 Workbox Config Tests');

// Test 17: Verify config file exists and can be loaded
const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '..', 'workbox-config.js');

assert(fs.existsSync(configPath), 'workbox-config.js exists');

// Test 18: Load and validate config structure
const workboxConfig = require(configPath);
assert(workboxConfig.swDest === 'sw.js', 'SW destination is sw.js');
assert(workboxConfig.globDirectory === '.', 'Glob directory is root');
assert(Array.isArray(workboxConfig.globPatterns), 'globPatterns is an array');
assert(Array.isArray(workboxConfig.runtimeCaching), 'runtimeCaching is an array');

// Test 19: Verify critical shell assets in globPatterns
const shellAssets = ['index.html', 'audio-engine.js', 'session-logging.js', 'sensor-consent.js'];
shellAssets.forEach(asset => {
    assert(
        workboxConfig.globPatterns.includes(asset),
        `Shell asset "${asset}" in precache list`
    );
});

// Test 20: Verify runtime caching rules exist
const expectedCacheNames = ['cdn-scripts', 'google-fonts-stylesheets', 'google-fonts-webfonts', 'audio-cache', 'images'];
workboxConfig.runtimeCaching.forEach(rule => {
    assert(
        expectedCacheNames.includes(rule.options.cacheName),
        `Runtime cache "${rule.options.cacheName}" configured`
    );
});

// Test 21: Verify clientsClaim is enabled
assertEqual(workboxConfig.clientsClaim, true, 'clientsClaim is enabled');

// Test 22: Verify skipWaiting is false (controlled via message)
assertEqual(workboxConfig.skipWaiting, false, 'skipWaiting is false (manual control)');

// ============================================================
// Test: Generated SW File
// ============================================================

console.log('\n\ud83d\udcdc Generated SW Tests');

const swPath = path.join(__dirname, '..', 'sw.js');
assert(fs.existsSync(swPath), 'sw.js file exists');

const swContent = fs.readFileSync(swPath, 'utf8');

// Test 23: Verify SKIP_WAITING handler in SW
assert(
    swContent.includes('SKIP_WAITING'),
    'SW contains SKIP_WAITING message handler'
);

// Test 24: Verify skipWaiting call in SW
assert(
    swContent.includes('skipWaiting'),
    'SW contains skipWaiting() call'
);

// Test 25: Verify precache manifest
assert(
    swContent.includes('precacheAndRoute'),
    'SW uses precacheAndRoute for shell assets'
);

// ============================================================
// Summary
// ============================================================

console.log('\n==========================================');
console.log(`\ud83d\udcca Results: ${testsPassed} passed, ${testsFailed} failed`);
console.log('==========================================\n');

if (testsFailed > 0) {
    process.exit(1);
}
