/**
 * Story 6-2: Manifest & Install Flow Tests
 * Tests for PWA install prompt, manifest validation, and shortcut mode detection
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Test counters
let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  \u2705 ${name}`);
        passed++;
    } catch (err) {
        console.log(`  \u274C ${name}`);
        console.log(`     ${err.message}`);
        failed++;
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
}

function assertIncludes(arr, item, message) {
    if (!arr.includes(item)) {
        throw new Error(message || `Array does not include ${item}`);
    }
}

// Mock localStorage for testing
class MockLocalStorage {
    constructor() {
        this.store = {};
    }
    getItem(key) {
        return this.store[key] || null;
    }
    setItem(key, value) {
        this.store[key] = String(value);
    }
    removeItem(key) {
        delete this.store[key];
    }
    clear() {
        this.store = {};
    }
}

// Mock matchMedia for testing
function createMockMatchMedia(matches = false) {
    return (query) => ({
        matches,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
    });
}

// ===========================================
// Manifest.json Tests (AC1)
// ===========================================
console.log('\n\ud83d\udce6 Manifest Configuration Tests (AC1)');

const manifestPath = path.join(__dirname, '..', 'manifest.json');

test('manifest.json exists', () => {
    assert(fs.existsSync(manifestPath), 'manifest.json file should exist');
});

let manifest;
if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    test('manifest has correct name', () => {
        assertEqual(manifest.name, 'mp3_to_8D - Focus Audio', 'name should match spec');
    });

    test('manifest has correct short_name', () => {
        assertEqual(manifest.short_name, '8D Audio', 'short_name should match spec');
    });

    test('manifest has correct start_url with source param', () => {
        assert(manifest.start_url.includes('source=pwa'), 'start_url should include source=pwa');
    });

    test('manifest has standalone display mode', () => {
        assertEqual(manifest.display, 'standalone', 'display should be standalone');
    });

    test('manifest has correct theme_color', () => {
        assertEqual(manifest.theme_color, '#1a1a2e', 'theme_color should be #1a1a2e');
    });

    test('manifest has correct background_color', () => {
        assertEqual(manifest.background_color, '#1a1a2e', 'background_color should be #1a1a2e');
    });

    test('manifest has health/wellness/music categories', () => {
        assertIncludes(manifest.categories, 'health', 'should include health category');
        assertIncludes(manifest.categories, 'wellness', 'should include wellness category');
        assertIncludes(manifest.categories, 'music', 'should include music category');
    });

    test('manifest has 192x192 icon', () => {
        const icon192 = manifest.icons.find(i => i.sizes === '192x192');
        assert(icon192, 'should have 192x192 icon');
    });

    test('manifest has 512x512 icon', () => {
        const icon512 = manifest.icons.find(i => i.sizes === '512x512' && !i.purpose);
        assert(icon512, 'should have 512x512 icon');
    });

    test('manifest has maskable 512x512 icon', () => {
        const maskable = manifest.icons.find(i => i.purpose === 'maskable');
        assert(maskable, 'should have maskable icon');
    });

    test('manifest has Focus shortcut', () => {
        const focusShortcut = manifest.shortcuts.find(s => s.name === 'Start Focus');
        assert(focusShortcut, 'should have Focus shortcut');
        assert(focusShortcut.url.includes('mode=focus'), 'Focus shortcut URL should include mode=focus');
    });

    test('manifest has Calm shortcut', () => {
        const calmShortcut = manifest.shortcuts.find(s => s.name === 'Start Calm');
        assert(calmShortcut, 'should have Calm shortcut');
        assert(calmShortcut.url.includes('mode=calm'), 'Calm shortcut URL should include mode=calm');
    });
}

// ===========================================
// Icon Files Tests (AC1)
// ===========================================
console.log('\n\ud83c\udfa8 Icon Files Tests (AC1)');

const iconsDir = path.join(__dirname, '..', 'icons');

test('icons directory exists', () => {
    assert(fs.existsSync(iconsDir), 'icons/ directory should exist');
});

test('icon-192.png exists', () => {
    const iconPath = path.join(iconsDir, 'icon-192.png');
    assert(fs.existsSync(iconPath), 'icon-192.png should exist');
});

test('icon-512.png exists', () => {
    const iconPath = path.join(iconsDir, 'icon-512.png');
    assert(fs.existsSync(iconPath), 'icon-512.png should exist');
});

test('icon-maskable.png exists', () => {
    const iconPath = path.join(iconsDir, 'icon-maskable.png');
    assert(fs.existsSync(iconPath), 'icon-maskable.png should exist');
});

test('focus.png shortcut icon exists', () => {
    const iconPath = path.join(iconsDir, 'focus.png');
    assert(fs.existsSync(iconPath), 'focus.png should exist');
});

test('calm.png shortcut icon exists', () => {
    const iconPath = path.join(iconsDir, 'calm.png');
    assert(fs.existsSync(iconPath), 'calm.png should exist');
});

// ===========================================
// Index.html Manifest Link Tests (AC1)
// ===========================================
console.log('\n\ud83d\udd17 Index.html Manifest Link Tests (AC1)');

const indexPath = path.join(__dirname, '..', 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf8');

test('index.html has manifest link', () => {
    assert(indexHtml.includes('rel="manifest"'), 'should have manifest link');
    assert(indexHtml.includes('href="/manifest.json"'), 'manifest href should point to /manifest.json');
});

test('index.html has theme-color meta tag', () => {
    assert(indexHtml.includes('name="theme-color"'), 'should have theme-color meta tag');
    assert(indexHtml.includes('content="#1a1a2e"'), 'theme-color should be #1a1a2e');
});

test('index.html has apple-touch-icon', () => {
    assert(indexHtml.includes('rel="apple-touch-icon"'), 'should have apple-touch-icon');
});

// ===========================================
// useInstallPrompt Hook Tests (AC2, AC4, AC6)
// ===========================================
console.log('\n\ud83e\udde9 useInstallPrompt Hook Implementation Tests (AC2, AC4, AC6)');

test('index.html has useInstallPrompt hook', () => {
    assert(indexHtml.includes('function useInstallPrompt()'), 'should have useInstallPrompt hook');
});

test('useInstallPrompt captures beforeinstallprompt event', () => {
    assert(indexHtml.includes('beforeinstallprompt'), 'should capture beforeinstallprompt event');
});

test('useInstallPrompt detects standalone mode', () => {
    assert(indexHtml.includes('display-mode: standalone'), 'should detect standalone mode');
});

test('useInstallPrompt has canInstall state', () => {
    assert(indexHtml.includes('canInstall'), 'should have canInstall state');
});

test('useInstallPrompt has isInstalled state', () => {
    assert(indexHtml.includes('isInstalled'), 'should have isInstalled state');
});

test('useInstallPrompt has showInstallPrompt function', () => {
    assert(indexHtml.includes('showInstallPrompt'), 'should have showInstallPrompt function');
});

test('useInstallPrompt has dismissInstallPrompt function', () => {
    assert(indexHtml.includes('dismissInstallPrompt'), 'should have dismissInstallPrompt function');
});

test('useInstallPrompt persists installed state to localStorage', () => {
    assert(indexHtml.includes('mp3_8d_is_installed'), 'should persist to mp3_8d_is_installed key');
});

test('useInstallPrompt persists dismissal to localStorage', () => {
    assert(indexHtml.includes('mp3_8d_install_dismissed'), 'should persist dismissal timestamp');
});

// ===========================================
// Install Prompt UI Tests (AC3)
// ===========================================
console.log('\n\ud83d\uddb1\ufe0f Install Prompt UI Tests (AC3)');

test('InstallPrompt component exists', () => {
    assert(indexHtml.includes('function InstallPrompt('), 'should have InstallPrompt component');
});

test('InstallPrompt has role="dialog"', () => {
    assert(indexHtml.includes('role="dialog"'), 'should have role="dialog" for accessibility');
});

test('InstallPrompt has aria-labelledby', () => {
    assert(indexHtml.includes('aria-labelledby="install-heading"'), 'should have aria-labelledby');
});

test('InstallPrompt has "Install for quick access" text', () => {
    assert(indexHtml.includes('Install for quick access'), 'should have correct CTA text');
});

test('InstallPrompt has "Not now" dismiss button', () => {
    assert(indexHtml.includes('Not now'), 'should have "Not now" dismiss button');
});

test('InstallPrompt has app icon display', () => {
    assert(indexHtml.includes('./icons/icon-192.png'), 'should display app icon');
});

// ===========================================
// Install Telemetry Tests (AC5)
// ===========================================
console.log('\n\ud83d\udcca Install Telemetry Tests (AC5)');

test('INSTALL_PROMPT_SHOWN event type exists', () => {
    assert(indexHtml.includes('INSTALL_PROMPT_SHOWN'), 'should have INSTALL_PROMPT_SHOWN event');
});

test('INSTALL_ACCEPTED event type exists', () => {
    assert(indexHtml.includes('INSTALL_ACCEPTED'), 'should have INSTALL_ACCEPTED event');
});

test('INSTALL_DISMISSED event type exists', () => {
    assert(indexHtml.includes('INSTALL_DISMISSED'), 'should have INSTALL_DISMISSED event');
});

test('APP_INSTALLED event type exists', () => {
    assert(indexHtml.includes('APP_INSTALLED'), 'should have APP_INSTALLED event');
});

test('Telemetry includes userAgent', () => {
    assert(indexHtml.includes('userAgent: navigator.userAgent'), 'should include userAgent in telemetry');
});

test('Telemetry includes platform detection', () => {
    assert(indexHtml.includes("platform:") && indexHtml.includes("Mobi|Android"), 'should detect mobile/desktop platform');
});

test('Telemetry stores to SessionLogging', () => {
    assert(indexHtml.includes('SessionLogging.addSession'), 'should store events to SessionLogging');
});

// ===========================================
// Shortcut Mode Detection Tests (AC7)
// ===========================================
console.log('\n\u26a1 Shortcut Mode Detection Tests (AC7)');

test('Query param parsing implemented', () => {
    assert(indexHtml.includes('URLSearchParams'), 'should parse URL search params');
});

test('mode=focus param detected', () => {
    assert(indexHtml.includes("mode === 'focus'"), 'should detect mode=focus param');
});

test('mode=calm param detected', () => {
    assert(indexHtml.includes("mode === 'calm'"), 'should detect mode=calm param');
});

test('source=pwa param detected', () => {
    assert(indexHtml.includes("source === 'pwa'"), 'should detect source=pwa param');
});

test('URL cleaned after param processing', () => {
    assert(indexHtml.includes('history.replaceState'), 'should clean URL after processing');
});

test('PWA_LAUNCH event logged', () => {
    assert(indexHtml.includes('PWA_LAUNCH'), 'should log PWA_LAUNCH event');
});

// ===========================================
// Safari Fallback Instructions Tests (AC8)
// ===========================================
console.log('\n\ud83c\udf0a Safari Fallback Instructions Tests (AC8)');

test('SafariInstallInstructions component exists', () => {
    assert(indexHtml.includes('function SafariInstallInstructions('), 'should have SafariInstallInstructions component');
});

test('Safari detection implemented', () => {
    assert(indexHtml.includes('safari') && indexHtml.includes('userAgent'), 'should detect Safari browser');
});

test('Safari shows Add to Home Screen instructions', () => {
    assert(indexHtml.includes('Add to Home Screen'), 'should show Add to Home Screen instructions');
});

test('Safari dismissal persisted', () => {
    assert(indexHtml.includes('mp3_8d_safari_install_dismissed'), 'should persist Safari dismissal');
});

test('Safari instructions have "Got it" button', () => {
    assert(indexHtml.includes('Got it'), 'should have "Got it" dismissal button');
});

// ===========================================
// CSS Styles Tests (AC3)
// ===========================================
console.log('\n\ud83c\udfa8 CSS Styles Tests (AC3)');

test('Install prompt CSS styles exist', () => {
    assert(indexHtml.includes('.install-prompt {'), 'should have install-prompt styles');
});

test('Install prompt has focus outline', () => {
    assert(indexHtml.includes('.install-prompt:focus'), 'should have focus styles');
});

test('Install button styles exist', () => {
    assert(indexHtml.includes('.install-btn {'), 'should have install-btn styles');
});

test('Safari instructions CSS styles exist', () => {
    assert(indexHtml.includes('.safari-instructions {'), 'should have safari-instructions styles');
});

test('Reduced motion support for install prompt', () => {
    assert(indexHtml.includes('.install-prompt.no-motion'), 'should support reduced motion');
});

// ===========================================
// Integration Tests
// ===========================================
console.log('\n\ud83d\udd17 Integration Tests');

test('InstallPrompt component rendered in App', () => {
    assert(indexHtml.includes('<InstallPrompt'), 'InstallPrompt should be rendered in App');
});

test('SafariInstallInstructions component rendered in App', () => {
    assert(indexHtml.includes('<SafariInstallInstructions'), 'SafariInstallInstructions should be rendered in App');
});

test('useInstallPrompt hook used in App', () => {
    assert(indexHtml.includes('} = useInstallPrompt()'), 'useInstallPrompt should be called in App');
});

// ===========================================
// Summary
// ===========================================
console.log('\n==========================================');
console.log(`\ud83d\udcca Results: ${passed} passed, ${failed} failed`);
console.log('==========================================\n');

if (failed > 0) {
    process.exit(1);
}
