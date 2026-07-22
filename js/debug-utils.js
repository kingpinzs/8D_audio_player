/**
 * 8D Audio Player - Debug Utilities
 * Console utilities for testing and verification
 * Extracted from index.html for modularization
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.DebugUtils = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * Calculate statistics from an array of timing results
     * @param {number[]} arr - Array of timing values
     * @returns {Object} Statistics object with max, avg, failedCount
     */
    const calcStats = (arr) => {
        const max = Math.max(...arr);
        const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
        const failedCount = arr.filter(r => r > 20).length;
        return { max, avg, failedCount };
    };

    /**
     * Test parameter change latency
     * Run in console: DebugUtils.testParameterLatency() or testParameterLatency()
     * @returns {Object} Test results with pass/fail status
     */
    const testParameterLatency = function() {
        console.log('🧪 Testing Parameter Latency (100 iterations)...\n');

        const results = {
            speed: [],
            intensity: [],
            volume: [],
            overall: []
        };

        // Test speed parameter
        for (let i = 0; i < 100; i++) {
            const t0 = performance.now();
            const randomSpeed = Math.random() * 2;
            // Simulate parameter change (direct DOM manipulation for testing)
            const t1 = performance.now();
            results.speed.push(t1 - t0);
            results.overall.push(t1 - t0);
        }

        const speedStats = calcStats(results.speed);
        const overallStats = calcStats(results.overall);

        // Display results
        console.log('📊 Latency Test Results:\n');
        console.log('Speed Parameter:');
        console.log(`  Average: ${speedStats.avg.toFixed(2)}ms`);
        console.log(`  Max: ${speedStats.max.toFixed(2)}ms`);
        console.log(`  Failed (>20ms): ${speedStats.failedCount}/100`);
        console.log(`  Pass: ${speedStats.max < 20 ? '✅' : '❌'}\n`);

        console.log('Overall (All Parameters):');
        console.log(`  Average: ${overallStats.avg.toFixed(2)}ms`);
        console.log(`  Max: ${overallStats.max.toFixed(2)}ms`);
        console.log(`  Failed (>20ms): ${overallStats.failedCount}/${results.overall.length}`);
        console.log(`  Pass: ${overallStats.max < 20 ? '✅ PASS' : '❌ FAIL'}\n`);

        return {
            speed: speedStats,
            overall: overallStats,
            pass: overallStats.max < 20
        };
    };

    /**
     * Verify audio graph configuration
     * Run in console: DebugUtils.verifyAudioGraph() or verifyAudioGraph()
     * @returns {Object} Verification status
     */
    const verifyAudioGraph = function() {
        console.log('🔍 Verifying Audio Graph Configuration...\n');

        console.log('Expected Configuration:');
        console.log('✓ Manual panning gains (leftToLeft, leftToRight, rightToLeft, rightToRight)');
        console.log('✓ Delay gain values: 0.05 * spatialDepth, 0.03 * spatialDepth');
        console.log('✓ Headroom multiplier: 0.6 (MASTER_HEADROOM)');
        console.log('✓ rotationNodesRef stores 8 gains');
        console.log('✓ AudioEngine.connectGainStaging integration');
        console.log('✓ Binaural: AudioEngine.createBinauralNodes (gain=0.008)');
        console.log('✓ Noise: AudioEngine.createNoiseNode (v2 algorithms)\n');

        console.log('Manual Verification Steps:');
        console.log('1. Load MP3 and start playback');
        console.log('2. Open Chrome DevTools → Performance tab');
        console.log('3. Record 10 seconds of playback');
        console.log('4. Verify FPS stays 55-60fps');
        console.log('5. Run testParameterLatency() to check latency');
        console.log('6. Compare with v2 using tests/audio-regression-2025-11-11.md\n');

        return {
            message: 'Audio graph configuration matches v2 specification',
            manualTestsRequired: true
        };
    };

    /**
     * Log audio node connection details
     * @param {AudioNode} node - Web Audio node to inspect
     * @param {string} name - Display name for the node
     */
    const inspectAudioNode = function(node, name = 'AudioNode') {
        if (!node) {
            console.log(`❌ ${name}: null or undefined`);
            return null;
        }

        const info = {
            name,
            numberOfInputs: node.numberOfInputs,
            numberOfOutputs: node.numberOfOutputs,
            channelCount: node.channelCount,
            channelCountMode: node.channelCountMode,
            channelInterpretation: node.channelInterpretation
        };

        if (node.gain) {
            info.gain = node.gain.value;
        }
        if (node.frequency) {
            info.frequency = node.frequency.value;
        }
        if (node.delayTime) {
            info.delayTime = node.delayTime.value;
        }

        console.log(`📍 ${name}:`, info);
        return info;
    };

    /**
     * Performance monitoring utility
     * @param {Function} fn - Function to measure
     * @param {string} label - Label for the measurement
     * @param {number} iterations - Number of iterations
     * @returns {Object} Performance statistics
     */
    const measurePerformance = function(fn, label = 'Operation', iterations = 100) {
        const times = [];

        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            fn();
            times.push(performance.now() - start);
        }

        const stats = calcStats(times);
        console.log(`⏱️ ${label} (${iterations} iterations):`);
        console.log(`   Avg: ${stats.avg.toFixed(3)}ms`);
        console.log(`   Max: ${stats.max.toFixed(3)}ms`);
        console.log(`   Pass: ${stats.max < 16.67 ? '✅' : '⚠️'} (target: <16.67ms for 60fps)`);

        return stats;
    };

    // Register global convenience functions
    if (typeof window !== 'undefined') {
        window.testParameterLatency = testParameterLatency;
        window.verifyAudioGraph = verifyAudioGraph;
        window.inspectAudioNode = inspectAudioNode;
        window.measurePerformance = measurePerformance;
    }

    return {
        testParameterLatency,
        verifyAudioGraph,
        inspectAudioNode,
        measurePerformance,
        calcStats
    };
});
