/**
 * 8D Audio Player - Application Constants
 * Extracted from index.html for modularization
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.AppConstants = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const MODE_LIBRARY = [
        {
            id: 'focus',
            label: 'Focus',
            short: 'Deep work',
            description: 'Steady orbit + beta beats keep intrusive thoughts at bay.',
            heroCopy: 'Steady pulses to clear the mental slate in two breaths.',
            accent: 'var(--accent-focus)',
            preset: {
                speed: 0.55,
                intensity: 0.85,
                spatialDepth: 0.45,
                movement: 'circle',
                binaural: { enabled: true, freq: 14 },
                noise: { type: 'none', volume: 0 },
                spatial: { itdAmount: 0.7, headShadow: 0.5, directionalDepth: 0.15, crossBleed: 0.05, panCurve: 2.0, backDepth: 0.55, hardPanThreshold: 0.1 },
                dualTrack: { enabled: false, delay: 500, mode: 'synced', variableSpeed: true, track2Speed: 0.5 }
            },
            highlights: ['Beta 14 Hz pulses', 'Low drift orbit', 'Pink noise cushion']
        },
        {
            id: 'calm',
            label: 'Calm',
            short: 'Breathing companion',
            description: 'Longer arcs, theta beats, and softer noise for co-regulation.',
            heroCopy: 'Elongated orbit with theta support for family wind-downs.',
            accent: 'var(--accent-calm)',
            preset: {
                speed: 0.35,
                intensity: 0.6,
                spatialDepth: 0.6,
                movement: 'figure8',
                binaural: { enabled: true, freq: 8 },
                noise: { type: 'white', volume: 0.05 },
                spatial: { itdAmount: 0.5, headShadow: 0.4, directionalDepth: 0.1, crossBleed: 0.1, panCurve: 1.5, backDepth: 0.65, hardPanThreshold: 0.15 },
                dualTrack: { enabled: false, delay: 500, mode: 'synced', variableSpeed: true, track2Speed: 0.5 }
            },
            highlights: ['Theta 8 Hz support', 'Figure-eight drift', 'Gentle white noise']
        },
        {
            id: 'energize',
            label: 'Energize',
            short: 'Quick reset',
            description: 'Fast arcs + brighter stereo swing for playful bursts.',
            heroCopy: 'Hyper-clear panning for a quick dopamine reset.',
            accent: 'var(--accent-energize)',
            preset: {
                speed: 0.95,
                intensity: 0.9,
                spatialDepth: 0.7,
                movement: 'random',
                binaural: { enabled: true, freq: 30 },
                noise: { type: 'pink', volume: 0.12 },
                spatial: { itdAmount: 1.0, headShadow: 0.7, directionalDepth: 0.25, crossBleed: 0, panCurve: 3.0, backDepth: 0.4, hardPanThreshold: 0.05 },
                dualTrack: { enabled: false, delay: 500, mode: 'synced', variableSpeed: true, track2Speed: 0.5 }
            },
            highlights: ['Gamma 30 Hz spark', 'Randomized orbit', 'Louder pink noise']
        },
        {
            id: 'apd-friendly',
            label: 'APD Friendly',
            short: 'Accessible 8D',
            description: 'Optimized for auditory processing differences - relies on volume and tone, not timing.',
            heroCopy: 'Enhanced spatial cues designed for brains that process differently.',
            accent: 'var(--accent-calm)',
            preset: {
                speed: 0.45,
                intensity: 0.8,
                spatialDepth: 0.5,
                movement: 'quadrant',
                binaural: { enabled: false, freq: 0 },
                noise: { type: 'pink', volume: 0.06 },
                spatial: { itdAmount: 0, headShadow: 1.0, directionalDepth: 0.35, crossBleed: 0, panCurve: 4.0, backDepth: 0.35, hardPanThreshold: 0.05 },
                dualTrack: { enabled: false, delay: 500, mode: 'synced', variableSpeed: true, track2Speed: 0.5 }
            },
            highlights: ['No timing cues (ITD off)', 'Max muffling contrast', 'Clear L/R separation']
        }
    ];

    const HERO_BREATH_DURATION = 20;

    const RATING_ICONS = {
        focus: {
            boost: { icon: '\uD83C\uDFAF', label: 'Locked In', desc: 'This locks me in' },
            neutral: { icon: '\u2796', label: 'Meh', desc: 'Play less often' },
            remove: { icon: '\uD83D\uDCAD', label: 'Distracting', desc: 'Mind wanders' }
        },
        calm: {
            boost: { icon: '\uD83C\uDF0A', label: 'Flowing', desc: 'Brings peace' },
            neutral: { icon: '\u2796', label: 'Meh', desc: 'Play less often' },
            remove: { icon: '\uD83C\uDF00', label: 'Turbulent', desc: 'Unsettling' }
        },
        energize: {
            boost: { icon: '\u26A1', label: 'Energizing', desc: 'Fires me up' },
            neutral: { icon: '\u2796', label: 'Meh', desc: 'Play less often' },
            remove: { icon: '\uD83D\uDCA4', label: 'Draining', desc: 'Makes me tired' }
        },
        'apd-friendly': {
            boost: { icon: '\uD83D\uDD2E', label: 'Crystal Clear', desc: 'Easy to follow' },
            neutral: { icon: '\u2796', label: 'Meh', desc: 'Play less often' },
            remove: { icon: '\uD83C\uDF2B\uFE0F', label: 'Muddy', desc: 'Hard to process' }
        }
    };

    const CUSTOM_PRESETS_KEY = 'mpe_8d_custom_presets';
    const PRESET_ORDER_KEY = 'mpe_8d_preset_order';

    const SUPPORTED_MIME_TYPES = [
        'audio/mpeg',      // .mp3
        'audio/wav',       // .wav
        'audio/wave',      // .wav (alternate)
        'audio/ogg',       // .ogg
        'audio/x-wav'      // .wav (legacy)
    ];

    const PARAM_RANGES = {
        speed: { min: 0, max: 1, step: 0.05 },
        intensity: { min: 0, max: 1, step: 0.05 },
        spatialDepth: { min: 0, max: 1, step: 0.05 },
        binauralFreq: { min: 0, max: 40, step: 1 },
        noiseVolume: { min: 0, max: 0.3, step: 0.01 }
    };

    // Helper: Get binaural frequency band name
    const getBinauralBand = (freq) => {
        if (freq < 4) return 'Delta';
        if (freq < 8) return 'Theta';
        if (freq < 14) return 'Alpha';
        if (freq < 30) return 'Beta';
        return 'Gamma';
    };

    // Helper: Get binaural frequency hint
    const getBinauralHint = (freq) => {
        if (freq < 4) return 'Deep sleep, healing';
        if (freq < 8) return 'Deep relaxation, meditation';
        if (freq < 14) return 'Calm focus, learning';
        if (freq < 30) return 'Active focus, problem-solving';
        return 'Peak alertness, high energy';
    };

    return {
        MODE_LIBRARY,
        HERO_BREATH_DURATION,
        RATING_ICONS,
        CUSTOM_PRESETS_KEY,
        PRESET_ORDER_KEY,
        SUPPORTED_MIME_TYPES,
        PARAM_RANGES,
        getBinauralBand,
        getBinauralHint
    };
});
