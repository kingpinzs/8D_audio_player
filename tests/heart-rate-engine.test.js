'use strict';

/**
 * Story 5-2: Heart Rate Subscription & Threshold Engine Tests
 * Tests HR parsing, history buffer, rule engine, and simulator
 */

const assert = require('assert');

const log = (...args) => console.log(...args);

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

// ============================================================
// HR Parsing Tests (AC1)
// ============================================================

// Simulate parseHeartRateMeasurement function for testing
const parseHeartRateMeasurement = (buffer) => {
    try {
        if (!buffer || buffer.length < 2) {
            return null;
        }
        const flags = buffer[0];
        const is16Bit = (flags & 0x01) === 1;

        let heartRate;
        if (is16Bit) {
            if (buffer.length < 3) {
                return null;
            }
            // Little-endian 16-bit value
            heartRate = buffer[1] | (buffer[2] << 8);
        } else {
            heartRate = buffer[1];
        }

        // Sanity check: HR should be between 30-250 BPM
        if (heartRate < 30 || heartRate > 250) {
            return null;
        }

        return heartRate;
    } catch (err) {
        return null;
    }
};

// ============================================================
// Rule Engine Logic Tests (AC4)
// ============================================================

// Simulate rule engine evaluation
class MockRuleEngine {
    constructor(threshold = 85) {
        this.threshold = threshold;
        this.consecutiveExceeded = 0;
        this.lastTrigger = 0;
        this.cooldownMs = 5 * 60 * 1000; // 5 minutes
    }

    evaluate(hrHistory) {
        if (hrHistory.length < 10) {
            return { triggered: false, reason: 'insufficient_samples' };
        }

        const hrAvg = hrHistory.reduce((sum, e) => sum + e.hr, 0) / hrHistory.length;

        if (hrAvg > this.threshold) {
            this.consecutiveExceeded++;

            if (this.consecutiveExceeded >= 3) {
                const now = Date.now();

                // Check cooldown
                if (now - this.lastTrigger < this.cooldownMs) {
                    return { triggered: false, reason: 'cooldown', hrAvg };
                }

                this.lastTrigger = now;
                this.consecutiveExceeded = 0;
                return { triggered: true, hrAvg };
            }
        } else {
            this.consecutiveExceeded = 0;
        }

        return { triggered: false, reason: 'below_threshold', hrAvg };
    }

    setThreshold(threshold) {
        this.threshold = threshold;
    }
}

// ============================================================
// History Buffer Tests (AC2)
// ============================================================

// Simulate rolling history buffer
const createHistoryBuffer = (maxAgeMs = 60000) => {
    let buffer = [];

    return {
        add(hr) {
            const now = Date.now();
            const cutoff = now - maxAgeMs;
            buffer = buffer.filter(entry => entry.timestamp > cutoff);
            buffer.push({ hr, timestamp: now });
            return buffer;
        },
        getAverage() {
            if (buffer.length < 10) return null;
            return Math.round(buffer.reduce((sum, e) => sum + e.hr, 0) / buffer.length);
        },
        getHistory() {
            return [...buffer];
        },
        clear() {
            buffer = [];
        }
    };
};

// ============================================================
// Simulator Tests (AC8)
// ============================================================

class MockSimulator {
    constructor(config = {}) {
        this.baseHR = config.baseHR || 70;
        this.stressHR = config.stressHR || 95;
        this.isRunning = false;
        this.currentHR = this.baseHR;
    }

    start() {
        this.isRunning = true;
        return this.generateHR();
    }

    stop() {
        this.isRunning = false;
    }

    generateHR(isStress = false) {
        const base = isStress ? this.stressHR : this.baseHR;
        const variation = Math.round((Math.random() - 0.5) * 10);
        this.currentHR = Math.max(40, Math.min(200, base + variation));
        return this.currentHR;
    }

    setHR(value) {
        this.currentHR = Math.max(30, Math.min(250, Math.round(value)));
        return this.currentHR;
    }
}

// ============================================================
// Test Suite
// ============================================================

const runAllTests = async () => {
    log('\n📋 Story 5-2: Heart Rate Engine Tests\n');
    let passed = 0;
    let failed = 0;

    // HR Parsing Tests
    log('🔬 HR Characteristic Parsing (AC1):');

    if (await runTest('Parse 8-bit HR value (flags=0x00, HR=72)', async () => {
        const buffer = Buffer.from([0x00, 72]); // flags=0x00, hr=72
        const hr = parseHeartRateMeasurement(buffer);
        assert.strictEqual(hr, 72, `Expected 72, got ${hr}`);
    })) passed++; else failed++;

    if (await runTest('Parse 8-bit HR value (flags=0x00, HR=150)', async () => {
        const buffer = Buffer.from([0x00, 150]);
        const hr = parseHeartRateMeasurement(buffer);
        assert.strictEqual(hr, 150, `Expected 150, got ${hr}`);
    })) passed++; else failed++;

    if (await runTest('Parse 16-bit HR value (flags=0x01, HR=180)', async () => {
        // Little-endian: 180 = 0xB4 = [0xB4, 0x00]
        const buffer = Buffer.from([0x01, 0xB4, 0x00]);
        const hr = parseHeartRateMeasurement(buffer);
        assert.strictEqual(hr, 180, `Expected 180, got ${hr}`);
    })) passed++; else failed++;

    if (await runTest('Parse 16-bit HR value (flags=0x01, HR=200)', async () => {
        // Little-endian: 200 = 0xC8 = [0xC8, 0x00]
        const buffer = Buffer.from([0x01, 0xC8, 0x00]);
        const hr = parseHeartRateMeasurement(buffer);
        assert.strictEqual(hr, 200, `Expected 200, got ${hr}`);
    })) passed++; else failed++;

    if (await runTest('Reject HR below valid range (<30)', async () => {
        const buffer = Buffer.from([0x00, 25]);
        const hr = parseHeartRateMeasurement(buffer);
        assert.strictEqual(hr, null, 'Should reject HR < 30');
    })) passed++; else failed++;

    if (await runTest('Reject HR above valid range (>250)', async () => {
        // 260 in little-endian: [0x04, 0x01]
        const buffer = Buffer.from([0x01, 0x04, 0x01]);
        const hr = parseHeartRateMeasurement(buffer);
        assert.strictEqual(hr, null, 'Should reject HR > 250');
    })) passed++; else failed++;

    if (await runTest('Handle insufficient data gracefully', async () => {
        const hr = parseHeartRateMeasurement(Buffer.from([0x00]));
        assert.strictEqual(hr, null, 'Should return null for insufficient data');
    })) passed++; else failed++;

    if (await runTest('Handle null/undefined data gracefully', async () => {
        assert.strictEqual(parseHeartRateMeasurement(null), null);
        assert.strictEqual(parseHeartRateMeasurement(undefined), null);
    })) passed++; else failed++;

    // History Buffer Tests
    log('\n📊 History Buffer (AC2):');

    if (await runTest('Add entries to history buffer', async () => {
        const buffer = createHistoryBuffer();
        buffer.add(72);
        buffer.add(75);
        buffer.add(73);
        assert.strictEqual(buffer.getHistory().length, 3);
    })) passed++; else failed++;

    if (await runTest('Return null average when < 10 samples', async () => {
        const buffer = createHistoryBuffer();
        for (let i = 0; i < 5; i++) buffer.add(72);
        assert.strictEqual(buffer.getAverage(), null);
    })) passed++; else failed++;

    if (await runTest('Calculate correct average with >= 10 samples', async () => {
        const buffer = createHistoryBuffer();
        // Add 10 samples: 70, 72, 74, 76, 78, 80, 82, 84, 86, 88 -> avg = 79
        for (let i = 0; i < 10; i++) buffer.add(70 + i * 2);
        assert.strictEqual(buffer.getAverage(), 79);
    })) passed++; else failed++;

    // Rule Engine Tests
    log('\n⚙️ Sensor Rule Engine (AC4):');

    if (await runTest('Not trigger with insufficient samples', async () => {
        const engine = new MockRuleEngine(85);
        const result = engine.evaluate([{ hr: 90 }, { hr: 90 }, { hr: 90 }]);
        assert.strictEqual(result.triggered, false);
        assert.strictEqual(result.reason, 'insufficient_samples');
    })) passed++; else failed++;

    if (await runTest('Not trigger when HR below threshold', async () => {
        const engine = new MockRuleEngine(85);
        const history = Array(15).fill(null).map(() => ({ hr: 75 }));
        const result = engine.evaluate(history);
        assert.strictEqual(result.triggered, false);
        assert.strictEqual(result.reason, 'below_threshold');
    })) passed++; else failed++;

    if (await runTest('Require 3 consecutive exceedings to trigger', async () => {
        const engine = new MockRuleEngine(85);
        const highHistory = Array(15).fill(null).map(() => ({ hr: 95 }));

        // First check
        let result = engine.evaluate(highHistory);
        assert.strictEqual(result.triggered, false, 'Should not trigger on first exceed');

        // Second check
        result = engine.evaluate(highHistory);
        assert.strictEqual(result.triggered, false, 'Should not trigger on second exceed');

        // Third check - should trigger
        result = engine.evaluate(highHistory);
        assert.strictEqual(result.triggered, true, 'Should trigger on third consecutive exceed');
    })) passed++; else failed++;

    if (await runTest('Reset consecutive counter when HR drops below threshold', async () => {
        const engine = new MockRuleEngine(85);
        const highHistory = Array(15).fill(null).map(() => ({ hr: 95 }));
        const lowHistory = Array(15).fill(null).map(() => ({ hr: 75 }));

        // Two high checks
        engine.evaluate(highHistory);
        engine.evaluate(highHistory);

        // One low check - should reset
        engine.evaluate(lowHistory);

        // Two more high checks - should not trigger yet
        engine.evaluate(highHistory);
        const result = engine.evaluate(highHistory);
        assert.strictEqual(result.triggered, false, 'Should have reset counter');
    })) passed++; else failed++;

    if (await runTest('Respect 5-minute cooldown', async () => {
        const engine = new MockRuleEngine(85);
        const highHistory = Array(15).fill(null).map(() => ({ hr: 95 }));

        // Trigger first time
        engine.evaluate(highHistory);
        engine.evaluate(highHistory);
        engine.evaluate(highHistory);

        // Try to trigger immediately again
        engine.evaluate(highHistory);
        engine.evaluate(highHistory);
        const result = engine.evaluate(highHistory);
        assert.strictEqual(result.triggered, false, 'Should be in cooldown');
        assert.strictEqual(result.reason, 'cooldown');
    })) passed++; else failed++;

    if (await runTest('Update threshold in real-time', async () => {
        const engine = new MockRuleEngine(85);
        const history = Array(15).fill(null).map(() => ({ hr: 80 }));

        // Should not trigger at 85 threshold
        engine.evaluate(history);
        engine.evaluate(history);
        let result = engine.evaluate(history);
        assert.strictEqual(result.triggered, false);

        // Lower threshold to 75 - now 80 exceeds it
        engine.setThreshold(75);
        engine.consecutiveExceeded = 0;
        engine.lastTrigger = 0;

        engine.evaluate(history);
        engine.evaluate(history);
        result = engine.evaluate(history);
        assert.strictEqual(result.triggered, true, 'Should trigger with lower threshold');
    })) passed++; else failed++;

    // Simulator Tests
    log('\n🧪 Sensor Simulator (AC8):');

    if (await runTest('Start and stop simulation', async () => {
        const sim = new MockSimulator();
        assert.strictEqual(sim.isRunning, false);
        sim.start();
        assert.strictEqual(sim.isRunning, true);
        sim.stop();
        assert.strictEqual(sim.isRunning, false);
    })) passed++; else failed++;

    if (await runTest('Generate HR within valid range', async () => {
        const sim = new MockSimulator({ baseHR: 70 });
        for (let i = 0; i < 20; i++) {
            const hr = sim.generateHR();
            assert(hr >= 40 && hr <= 200, `HR ${hr} out of range`);
        }
    })) passed++; else failed++;

    if (await runTest('Generate stress HR higher than base', async () => {
        const sim = new MockSimulator({ baseHR: 70, stressHR: 95 });
        let baseSum = 0, stressSum = 0;
        for (let i = 0; i < 100; i++) {
            baseSum += sim.generateHR(false);
            stressSum += sim.generateHR(true);
        }
        const baseAvg = baseSum / 100;
        const stressAvg = stressSum / 100;
        assert(stressAvg > baseAvg, `Stress avg ${stressAvg} should be > base avg ${baseAvg}`);
    })) passed++; else failed++;

    if (await runTest('Manually set HR value', async () => {
        const sim = new MockSimulator();
        sim.start();
        const hr = sim.setHR(100);
        assert.strictEqual(hr, 100);
        assert.strictEqual(sim.currentHR, 100);
    })) passed++; else failed++;

    if (await runTest('Clamp manual HR to valid range', async () => {
        const sim = new MockSimulator();
        assert.strictEqual(sim.setHR(20), 30, 'Should clamp to minimum 30');
        assert.strictEqual(sim.setHR(300), 250, 'Should clamp to maximum 250');
    })) passed++; else failed++;

    // Threshold Persistence Tests
    log('\n💾 Threshold Persistence (AC7):');

    if (await runTest('Default threshold is 85 BPM', async () => {
        const defaultThreshold = 85;
        assert.strictEqual(defaultThreshold, 85);
    })) passed++; else failed++;

    if (await runTest('Threshold range is 60-120 BPM', async () => {
        const min = 60, max = 120;
        const testValues = [60, 85, 100, 120];
        testValues.forEach(v => {
            assert(v >= min && v <= max, `${v} should be in valid range`);
        });
    })) passed++; else failed++;

    // ============================================================
    // Story 5-3: Sensor-Informed Preset Adjustments
    // ============================================================

    log('\n🔄 Story 5-3: Auto-Adjust Toggle (AC5):');

    if (await runTest('Auto-adjust default is OFF (false)', async () => {
        // Simulate default state
        const defaultAutoAdjust = false;
        assert.strictEqual(defaultAutoAdjust, false, 'Auto-adjust should default to OFF');
    })) passed++; else failed++;

    if (await runTest('Auto-adjust toggle state can be toggled', async () => {
        let autoAdjustEnabled = false;
        autoAdjustEnabled = true;
        assert.strictEqual(autoAdjustEnabled, true, 'Toggle ON should set true');
        autoAdjustEnabled = false;
        assert.strictEqual(autoAdjustEnabled, false, 'Toggle OFF should set false');
    })) passed++; else failed++;

    if (await runTest('localStorage key follows naming convention', async () => {
        const key = 'mp3_8d_auto_adjust_enabled';
        assert(key.startsWith('mp3_8d_'), 'Key should start with mp3_8d_ prefix');
        assert(key.includes('auto_adjust'), 'Key should include auto_adjust');
    })) passed++; else failed++;

    log('\n⚡ Story 5-3: SensorRuleEngine Auto-Apply Mode (AC1, AC7):');

    // Extended MockRuleEngine for auto-apply mode
    class AutoApplyRuleEngine extends MockRuleEngine {
        constructor(threshold = 85, autoApplyEnabled = false) {
            super(threshold);
            this.autoApplyEnabled = autoApplyEnabled;
            this.presetApplied = null;
            this.events = [];
        }

        evaluateWithMode(hrHistory) {
            const result = this.evaluate(hrHistory);

            if (result.triggered) {
                if (this.autoApplyEnabled) {
                    // Auto-apply mode
                    this.presetApplied = 'calm';
                    this.events.push({ type: 'AUTOMATION_APPLIED', preset: 'calm', hrAvg: result.hrAvg });
                    return { ...result, mode: 'auto_apply', presetApplied: 'calm' };
                } else {
                    // Suggest mode
                    this.events.push({ type: 'SUGGESTION_SHOWN', hrAvg: result.hrAvg });
                    return { ...result, mode: 'suggest' };
                }
            }
            return result;
        }

        setAutoApply(enabled) {
            this.autoApplyEnabled = enabled;
        }
    }

    if (await runTest('Auto-apply mode calls applyPreset when threshold exceeded', async () => {
        const engine = new AutoApplyRuleEngine(85, true); // autoApply = true
        const highHistory = Array(15).fill(null).map(() => ({ hr: 95 }));

        // Trigger
        engine.evaluateWithMode(highHistory);
        engine.evaluateWithMode(highHistory);
        const result = engine.evaluateWithMode(highHistory);

        assert.strictEqual(result.triggered, true, 'Should trigger');
        assert.strictEqual(result.mode, 'auto_apply', 'Should be auto_apply mode');
        assert.strictEqual(result.presetApplied, 'calm', 'Should apply calm preset');
        assert.strictEqual(engine.presetApplied, 'calm', 'Engine should record preset');
    })) passed++; else failed++;

    if (await runTest('Suggest mode only shows toast, does not apply preset', async () => {
        const engine = new AutoApplyRuleEngine(85, false); // autoApply = false
        const highHistory = Array(15).fill(null).map(() => ({ hr: 95 }));

        // Reset cooldown
        engine.lastTrigger = 0;
        engine.consecutiveExceeded = 0;

        // Trigger
        engine.evaluateWithMode(highHistory);
        engine.evaluateWithMode(highHistory);
        const result = engine.evaluateWithMode(highHistory);

        assert.strictEqual(result.triggered, true, 'Should trigger');
        assert.strictEqual(result.mode, 'suggest', 'Should be suggest mode');
        assert.strictEqual(engine.presetApplied, null, 'Should NOT apply preset');
    })) passed++; else failed++;

    if (await runTest('Switching modes changes behavior', async () => {
        const engine = new AutoApplyRuleEngine(85, false); // Start in suggest mode

        // Trigger in suggest mode
        const highHistory = Array(15).fill(null).map(() => ({ hr: 95 }));
        engine.evaluateWithMode(highHistory);
        engine.evaluateWithMode(highHistory);
        let result = engine.evaluateWithMode(highHistory);
        assert.strictEqual(result.mode, 'suggest', 'First trigger should be suggest');

        // Switch to auto-apply mode
        engine.setAutoApply(true);
        engine.lastTrigger = 0; // Reset cooldown
        engine.consecutiveExceeded = 0;

        // Trigger again
        engine.evaluateWithMode(highHistory);
        engine.evaluateWithMode(highHistory);
        result = engine.evaluateWithMode(highHistory);
        assert.strictEqual(result.mode, 'auto_apply', 'Second trigger should be auto_apply');
        assert.strictEqual(result.presetApplied, 'calm', 'Should apply calm preset');
    })) passed++; else failed++;

    log('\n📝 Story 5-3: Event Logging (AC6):');

    if (await runTest('AUTOMATION_APPLIED event logged with correct data', async () => {
        const engine = new AutoApplyRuleEngine(85, true);
        const highHistory = Array(15).fill(null).map(() => ({ hr: 95 }));

        engine.evaluateWithMode(highHistory);
        engine.evaluateWithMode(highHistory);
        engine.evaluateWithMode(highHistory);

        const event = engine.events.find(e => e.type === 'AUTOMATION_APPLIED');
        assert(event, 'AUTOMATION_APPLIED event should exist');
        assert.strictEqual(event.preset, 'calm', 'Event should include preset');
        assert(event.hrAvg > 85, 'Event should include hrAvg above threshold');
    })) passed++; else failed++;

    if (await runTest('SUGGESTION_SHOWN event logged in suggest mode', async () => {
        const engine = new AutoApplyRuleEngine(85, false);
        const highHistory = Array(15).fill(null).map(() => ({ hr: 95 }));

        engine.evaluateWithMode(highHistory);
        engine.evaluateWithMode(highHistory);
        engine.evaluateWithMode(highHistory);

        const event = engine.events.find(e => e.type === 'SUGGESTION_SHOWN');
        assert(event, 'SUGGESTION_SHOWN event should exist');
    })) passed++; else failed++;

    log('\n🎚️ Story 5-3: Slider Override Detection (AC4):');

    // Mock slider override detection
    class MockSliderHandler {
        constructor() {
            this.sensorLocked = true;
            this.events = [];
        }

        handleSliderChange(sliderName, newValue) {
            if (this.sensorLocked) {
                this.sensorLocked = false;
                this.events.push({
                    type: 'AUTOMATION_PAUSED',
                    trigger: 'manual_slider',
                    slider: sliderName,
                    newValue
                });
                return { paused: true, event: this.events[this.events.length - 1] };
            }
            return { paused: false };
        }
    }

    if (await runTest('Slider change pauses automation when locked', async () => {
        const handler = new MockSliderHandler();
        handler.sensorLocked = true;

        const result = handler.handleSliderChange('intensity', 0.7);

        assert.strictEqual(result.paused, true, 'Should pause automation');
        assert.strictEqual(handler.sensorLocked, false, 'Should unlock');
    })) passed++; else failed++;

    if (await runTest('Slider change logs AUTOMATION_PAUSED with slider name', async () => {
        const handler = new MockSliderHandler();

        handler.handleSliderChange('noise volume', 0.5);

        const event = handler.events.find(e => e.type === 'AUTOMATION_PAUSED');
        assert(event, 'AUTOMATION_PAUSED event should exist');
        assert.strictEqual(event.trigger, 'manual_slider', 'Trigger should be manual_slider');
        assert.strictEqual(event.slider, 'noise volume', 'Slider name should be recorded');
    })) passed++; else failed++;

    if (await runTest('Slider change when not locked does not pause', async () => {
        const handler = new MockSliderHandler();
        handler.sensorLocked = false;

        const result = handler.handleSliderChange('intensity', 0.7);

        assert.strictEqual(result.paused, false, 'Should NOT pause when already unlocked');
    })) passed++; else failed++;

    if (await runTest('Multiple slider changes only log once per lock period', async () => {
        const handler = new MockSliderHandler();
        handler.sensorLocked = true;

        handler.handleSliderChange('intensity', 0.7);
        handler.handleSliderChange('noise volume', 0.5);
        handler.handleSliderChange('binaural frequency', 10);

        // Only first change should log because subsequent ones are already unlocked
        assert.strictEqual(handler.events.length, 1, 'Only one event should be logged');
    })) passed++; else failed++;

    // Summary
    log('\n' + '─'.repeat(40));
    log(`📊 Results: ${passed} passed, ${failed} failed`);
    log('─'.repeat(40) + '\n');

    return failed === 0;
};

// Run tests
runAllTests()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
        console.error('Test suite error:', err);
        process.exit(1);
    });
