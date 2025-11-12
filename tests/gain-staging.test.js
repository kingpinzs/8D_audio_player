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

function run() {
    testGainChainConnections();
    testBinauralRouting();
    testNoiseRouting();
    console.log('Gain staging regression tests passed.');
}

if (require.main === module) {
    run();
}

