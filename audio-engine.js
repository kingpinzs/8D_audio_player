(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.AudioEngine = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    const MASTER_HEADROOM = 0.6;

    const identity = () => {};

    function ensureContext(context) {
        if (!context) {
            throw new Error('AudioContext is required.');
        }
    }

    function ensureNode(node, name) {
        if (!node) {
            throw new Error(`${name} is required.`);
        }
    }

    function connectGainStaging(context, sourceNode, options = {}) {
        ensureContext(context);
        ensureNode(sourceNode, 'sourceNode');

        const headroom = typeof options.headroom === 'number' ? options.headroom : MASTER_HEADROOM;
        const fftSize = options.fftSize || 2048;
        const volume = typeof options.volume === 'number' ? options.volume : 0.7;
        const destination = options.destination || context.destination;

        const mainGain = context.createGain();
        mainGain.gain.value = volume * headroom;

        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -24;
        compressor.knee.value = 20;
        compressor.ratio.value = 20;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;

        const limiter = context.createDynamicsCompressor();
        limiter.threshold.value = -6;
        limiter.knee.value = 0;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.001;
        limiter.release.value = 0.1;

        const analyser = context.createAnalyser();
        analyser.fftSize = fftSize;

        sourceNode.connect(mainGain);
        mainGain.connect(compressor);
        compressor.connect(limiter);
        limiter.connect(analyser);
        analyser.connect(destination);

        return {
            sourceNode,
            mainGain,
            compressor,
            limiter,
            analyser,
            headroom,
            setVolume(nextVolume) {
                const safeVolume = typeof nextVolume === 'number' ? nextVolume : volume;
                mainGain.gain.value = safeVolume * headroom;
            },
            disconnect() {
                try {
                    sourceNode.disconnect();
                } catch (error) {
                    identity(error);
                }
                try {
                    mainGain.disconnect();
                } catch (error) {
                    identity(error);
                }
                try {
                    compressor.disconnect();
                } catch (error) {
                    identity(error);
                }
                try {
                    limiter.disconnect();
                } catch (error) {
                    identity(error);
                }
                try {
                    analyser.disconnect();
                } catch (error) {
                    identity(error);
                }
            }
        };
    }

    function createBinauralNodes(context, destination, frequency, options = {}) {
        ensureContext(context);
        ensureNode(destination, 'destination');

        const baseFreq = typeof options.baseFreq === 'number' ? options.baseFreq : 200;
        const gainValue = typeof options.gain === 'number' ? options.gain : 0.008;

        const leftOsc = context.createOscillator();
        const rightOsc = context.createOscillator();
        const merger = context.createChannelMerger(2);
        const gain = context.createGain();

        leftOsc.frequency.value = baseFreq;
        rightOsc.frequency.value = baseFreq + (frequency || 0);
        gain.gain.value = gainValue;

        leftOsc.connect(merger, 0, 0);
        rightOsc.connect(merger, 0, 1);
        merger.connect(gain);
        gain.connect(destination);

        leftOsc.start();
        rightOsc.start();

        return {
            leftOsc,
            rightOsc,
            merger,
            gain,
            stop() {
                try {
                    leftOsc.stop();
                } catch (error) {
                    identity(error);
                }
                try {
                    rightOsc.stop();
                } catch (error) {
                    identity(error);
                }
                leftOsc.disconnect();
                rightOsc.disconnect();
                merger.disconnect();
                gain.disconnect();
            }
        };
    }

    function fillPinkNoise(output) {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < output.length; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            output[i] *= 0.11;
            b6 = white * 0.115926;
        }
    }

    function fillWhiteNoise(output) {
        for (let i = 0; i < output.length; i++) {
            output[i] = Math.random() * 2 - 1;
        }
    }

    function createNoiseNode(context, destination, type = 'white', volume = 0.05) {
        ensureContext(context);
        ensureNode(destination, 'destination');

        if (type === 'none') {
            throw new Error('Noise type "none" is not valid for node creation.');
        }

        const bufferSize = 2 * context.sampleRate;
        const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
        const output = buffer.getChannelData(0);

        if (type === 'pink') {
            fillPinkNoise(output);
        } else {
            fillWhiteNoise(output);
        }

        const noiseSource = context.createBufferSource();
        noiseSource.buffer = buffer;
        noiseSource.loop = true;

        const gain = context.createGain();
        gain.gain.value = volume;

        noiseSource.connect(gain);
        gain.connect(destination);
        noiseSource.start();

        return {
            source: noiseSource,
            gain,
            buffer,
            stop() {
                try {
                    noiseSource.stop();
                } catch (error) {
                    identity(error);
                }
                noiseSource.disconnect();
                gain.disconnect();
            }
        };
    }

    return {
        MASTER_HEADROOM,
        connectGainStaging,
        createBinauralNodes,
        createNoiseNode
    };
});
