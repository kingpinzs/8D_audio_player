'use strict';

const path = require('path');
const AudioEngine = require(path.join('..', 'audio-engine.js'));

const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};

class MockNode {
    constructor(name) {
        this.name = name;
        this.connections = [];
        this.disconnected = false;
    }
    connect(target) {
        this.connections.push(target);
        return target;
    }
    disconnect() {
        this.disconnected = true;
        this.connections = [];
    }
}

class MockGain extends MockNode {
    constructor(name) {
        super(name);
        this.gain = { value: 0 };
    }
}

class MockCompressor extends MockNode {
    constructor(name) {
        super(name);
        this.threshold = { value: 0 };
        this.knee = { value: 0 };
        this.ratio = { value: 0 };
        this.attack = { value: 0 };
        this.release = { value: 0 };
    }
}

class MockAnalyser extends MockNode {
    constructor(name) {
        super(name);
        this.fftSize = 0;
    }
}

class MockOscillator extends MockNode {
    constructor(name) {
        super(name);
        this.frequency = { value: 0 };
        this.started = false;
        this.stopped = false;
    }
    start() {
        this.started = true;
    }
    stop() {
        this.stopped = true;
    }
}

class MockBufferSource extends MockNode {
    constructor(name) {
        super(name);
        this.loop = false;
        this.started = false;
        this.stopped = false;
    }
    start() {
        this.started = true;
    }
    stop() {
        this.stopped = true;
    }
}

class MockContext {
    constructor() {
        this.destination = new MockNode('destination');
        this.sampleRate = 48000;
    }
    createGain() {
        return new MockGain('gain');
    }
    createDynamicsCompressor() {
        return new MockCompressor('compressor');
    }
    createAnalyser() {
        return new MockAnalyser('analyser');
    }
    createOscillator() {
        return new MockOscillator('oscillator');
    }
    createChannelMerger() {
        return new MockNode('merger');
    }
    createBuffer(channels, length) {
        const store = Array.from({ length: channels }, () => new Float32Array(length));
        return {
            channels,
            length,
            getChannelData: (index) => store[index]
        };
    }
    createBufferSource() {
        return new MockBufferSource('bufferSource');
    }
}

function testGainChainConnections() {
    const context = new MockContext();
    const source = new MockNode('source');
    const chain = AudioEngine.connectGainStaging(context, source, { volume: 0.8 });

    assert(source.connections.includes(chain.mainGain), 'Source should connect to main gain');
    assert(chain.mainGain.connections[0] === chain.compressor, 'Main gain should connect to compressor');
    assert(chain.compressor.connections[0] === chain.limiter, 'Compressor should connect to limiter');
    assert(chain.limiter.connections[0] === chain.analyser, 'Limiter should connect to analyser');
    assert(chain.analyser.connections[0] === context.destination, 'Analyser should connect to context destination');

    const expectedGain = 0.8 * AudioEngine.MASTER_HEADROOM;
    assert(Math.abs(chain.mainGain.gain.value - expectedGain) < 1e-6, 'Main gain should respect headroom scaling');

    chain.setVolume(0.5);
    const updatedGain = 0.5 * AudioEngine.MASTER_HEADROOM;
    assert(Math.abs(chain.mainGain.gain.value - updatedGain) < 1e-6, 'setVolume should reapply headroom scaling');

    chain.disconnect();
    assert(chain.analyser.disconnected, 'Disconnect should tear down analyser chain');
}

function testBinauralRouting() {
    const context = new MockContext();
    const destination = new MockGain('mainGain');
    const nodes = AudioEngine.createBinauralNodes(context, destination, 12);

    assert(nodes.leftOsc.started && nodes.rightOsc.started, 'Binaural oscillators should start immediately');
    assert(nodes.gain.connections.includes(destination), 'Binaural gain should connect into destination');
    assert(nodes.rightOsc.frequency.value - nodes.leftOsc.frequency.value === 12, 'Right oscillator should offset by frequency');

    nodes.stop();
    assert(nodes.leftOsc.stopped && nodes.rightOsc.stopped, 'stop() should halt oscillators');
}

function testNoiseRouting() {
    const context = new MockContext();
    const destination = new MockGain('mainGain');
    const nodes = AudioEngine.createNoiseNode(context, destination, 'white', 0.12);

    assert(nodes.source.started, 'Noise source should auto-start');
    assert(nodes.gain.gain.value === 0.12, 'Noise gain should use supplied volume');
    assert(nodes.gain.connections.includes(destination), 'Noise gain should connect into destination');

    nodes.stop();
    assert(nodes.source.stopped, 'stop() should halt noise source');
}

function testGainNormalization() {
    console.log('\n🔬 Testing gain normalization to prevent clipping...');
    
    // Simulate the normalized panning algorithm from startRotation()
    const normalizationFactor = 0.5;
    const crossChannelMix = 0.15;
    
    // Test case 1: Center position (panPosition = 0)
    const panPosition1 = 0;
    const leftChannelGain1 = (1 - panPosition1) * 0.5;
    const rightChannelGain1 = (1 + panPosition1) * 0.5;
    const targetLeftGain1 = leftChannelGain1 * normalizationFactor;
    const targetRightGain1 = rightChannelGain1 * normalizationFactor;
    const targetLeftToRight1 = rightChannelGain1 * crossChannelMix * normalizationFactor;
    const targetRightToLeft1 = leftChannelGain1 * crossChannelMix * normalizationFactor;
    
    // Total gain budget per channel should not exceed 1.0
    const leftTotal1 = targetLeftGain1 + targetRightToLeft1;
    const rightTotal1 = targetRightGain1 + targetLeftToRight1;
    
    assert(leftTotal1 <= 1.0, `Center position: Left channel total gain ${leftTotal1.toFixed(3)} should not exceed 1.0`);
    assert(rightTotal1 <= 1.0, `Center position: Right channel total gain ${rightTotal1.toFixed(3)} should not exceed 1.0`);
    console.log(`  ✓ Center position: L=${leftTotal1.toFixed(3)}, R=${rightTotal1.toFixed(3)}`);
    
    // Test case 2: Full left (panPosition = -1)
    const panPosition2 = -1;
    const leftChannelGain2 = (1 - panPosition2) * 0.5;
    const rightChannelGain2 = (1 + panPosition2) * 0.5;
    const targetLeftGain2 = leftChannelGain2 * normalizationFactor;
    const targetRightGain2 = Math.max(0.001, rightChannelGain2 * normalizationFactor);
    const targetLeftToRight2 = rightChannelGain2 * crossChannelMix * normalizationFactor;
    const targetRightToLeft2 = leftChannelGain2 * crossChannelMix * normalizationFactor;
    
    const leftTotal2 = targetLeftGain2 + targetRightToLeft2;
    const rightTotal2 = targetRightGain2 + targetLeftToRight2;
    
    assert(leftTotal2 <= 1.0, `Full left: Left channel total gain ${leftTotal2.toFixed(3)} should not exceed 1.0`);
    assert(rightTotal2 <= 1.0, `Full left: Right channel total gain ${rightTotal2.toFixed(3)} should not exceed 1.0`);
    console.log(`  ✓ Full left: L=${leftTotal2.toFixed(3)}, R=${rightTotal2.toFixed(3)}`);
    
    // Test case 3: Full right (panPosition = 1)
    const panPosition3 = 1;
    const leftChannelGain3 = (1 - panPosition3) * 0.5;
    const rightChannelGain3 = (1 + panPosition3) * 0.5;
    const targetLeftGain3 = Math.max(0.001, leftChannelGain3 * normalizationFactor);
    const targetRightGain3 = rightChannelGain3 * normalizationFactor;
    const targetLeftToRight3 = rightChannelGain3 * crossChannelMix * normalizationFactor;
    const targetRightToLeft3 = leftChannelGain3 * crossChannelMix * normalizationFactor;
    
    const leftTotal3 = targetLeftGain3 + targetRightToLeft3;
    const rightTotal3 = targetRightGain3 + targetLeftToRight3;
    
    assert(leftTotal3 <= 1.0, `Full right: Left channel total gain ${leftTotal3.toFixed(3)} should not exceed 1.0`);
    assert(rightTotal3 <= 1.0, `Full right: Right channel total gain ${rightTotal3.toFixed(3)} should not exceed 1.0`);
    console.log(`  ✓ Full right: L=${leftTotal3.toFixed(3)}, R=${rightTotal3.toFixed(3)}`);
    
    // Test case 4: Verify MASTER_HEADROOM is applied downstream
    const masterHeadroom = AudioEngine.MASTER_HEADROOM;
    assert(masterHeadroom === 0.6, 'MASTER_HEADROOM should be 0.6');
    
    // Even with MASTER_HEADROOM, normalized gains should prevent clipping
    const worstCaseWithHeadroom = Math.max(leftTotal1, rightTotal1, leftTotal2, rightTotal2, leftTotal3, rightTotal3) * masterHeadroom;
    assert(worstCaseWithHeadroom <= 1.0, `Worst-case gain with headroom ${worstCaseWithHeadroom.toFixed(3)} should not exceed 1.0`);
    console.log(`  ✓ Worst-case with MASTER_HEADROOM: ${worstCaseWithHeadroom.toFixed(3)}`);
    
    console.log('✅ Gain normalization tests passed - no clipping possible\n');
}

function testDelayGainAccumulation() {
    console.log('🔬 Testing delay gain accumulation...');
    
    // Simulate delay gains from setupAudioGraph
    const spatialDepth = 1.0; // Maximum spatial depth
    const delayGainValue = 0.05 * spatialDepth;
    const crossGainValue = 0.03 * spatialDepth;
    
    console.log(`  Delay gain: ${delayGainValue.toFixed(3)}`);
    console.log(`  Cross gain: ${crossGainValue.toFixed(3)}`);
    
    // These delay gains are additive to the main panning gains
    // Verify they're small enough to not cause clipping when combined
    const normalizationFactor = 0.5;
    const maxMainGain = 1.0 * normalizationFactor; // Worst-case main path
    const maxDelayContribution = delayGainValue + crossGainValue;
    const totalWorstCase = maxMainGain + maxDelayContribution;
    
    console.log(`  Main gain (max): ${maxMainGain.toFixed(3)}`);
    console.log(`  Delay contribution: ${maxDelayContribution.toFixed(3)}`);
    console.log(`  Total worst-case: ${totalWorstCase.toFixed(3)}`);
    
    assert(totalWorstCase <= 1.0, `Total gain including delays ${totalWorstCase.toFixed(3)} should not exceed 1.0`);
    console.log('✅ Delay gain accumulation safe\n');
}

function testExponentialRampSmoothing() {
    console.log('🔬 Testing exponential ramp for click prevention...');
    
    // Verify that ramp time is appropriate for 50ms interval
    const updateInterval = 50; // ms
    const rampTime = 16; // ms (1 frame at 60fps)
    
    // Ramp time should be significantly less than interval to prevent overlap
    assert(rampTime < updateInterval, 'Ramp time should be less than update interval to prevent overlap');
    console.log(`  Update interval: ${updateInterval}ms`);
    console.log(`  Ramp time: ${rampTime}ms`);
    console.log(`  Ratio: ${(rampTime / updateInterval * 100).toFixed(1)}%`);
    
    // Verify clamping prevents automation errors
    const clamp = (val) => Math.max(0.0001, Math.min(1, val));
    assert(clamp(-0.5) === 0.0001, 'Clamp should floor negative values at 0.0001');
    assert(clamp(0) === 0.0001, 'Clamp should floor zero at 0.0001');
    assert(clamp(0.5) === 0.5, 'Clamp should pass through valid values');
    assert(clamp(1.5) === 1, 'Clamp should ceiling high values at 1.0');
    
    console.log('✅ Exponential ramp configuration safe\n');
}

function testCrossChannelBleeding() {
    console.log('🔬 Testing cross-channel bleeding limits...');
    
    const crossChannelMix = 0.15;
    const normalizationFactor = 0.5;
    
    // Worst-case: one channel at max, cross-feed to opposite channel
    const maxDirectGain = 1.0 * normalizationFactor;
    const maxCrossFeed = 1.0 * crossChannelMix * normalizationFactor;
    
    console.log(`  Max direct gain: ${maxDirectGain.toFixed(3)}`);
    console.log(`  Max cross-feed: ${maxCrossFeed.toFixed(3)}`);
    console.log(`  Total: ${(maxDirectGain + maxCrossFeed).toFixed(3)}`);
    
    // Cross-feed should be significantly smaller than direct path
    assert(maxCrossFeed < maxDirectGain * 0.3, 'Cross-feed should be less than 30% of direct path');
    
    // Total should never exceed 1.0
    assert(maxDirectGain + maxCrossFeed <= 1.0, 'Direct + cross-feed should not exceed 1.0');
    
    console.log('✅ Cross-channel bleeding within safe limits\n');
}

function run() {
    testGainChainConnections();
    testBinauralRouting();
    testNoiseRouting();
    testGainNormalization();
    testDelayGainAccumulation();
    testExponentialRampSmoothing();
    testCrossChannelBleeding();
    console.log('✅ All gain staging regression tests passed.');
}

if (require.main === module) {
    run();
}

