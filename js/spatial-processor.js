/**
 * 8D Audio Player - Spatial Processor
 * Core spatial audio calculations for 8D panning effects
 * Extracted from index.html for modularization
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.SpatialProcessor = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const ROTATION_INTERVAL_MS = 100;
    const NORMALIZATION_FACTOR = 0.5;

    // Max interaural time difference in seconds (~0.7ms — head width at speed of sound)
    const MAX_ITD_SEC = 0.0007;
    // Head-shadow lowpass floor: far ear sweeps 20kHz down toward this at full shadow
    const LP_OPEN_HZ = 20000;
    const LP_SHADOW_FLOOR_HZ = 1500;
    // Hard-pan ILD cap: far ear never drops below this fraction of near ear (~20dB)
    const HARD_PAN_FLOOR = 0.1;

    // Default per-preset spatial profile (matches the 'focus' preset's spatial block)
    const DEFAULT_SPATIAL = {
        itdAmount: 0.7,
        headShadow: 0.5,
        backDepth: 0.55,
        hardPanThreshold: 0.1
    };

    /**
     * Remap the 0..1 speed slider to a rotation frequency in Hz.
     * Raw speed was used as Hz directly (orbit in ~1-3s) — too fast for the
     * 8D illusion; convincing orbits take 4-10s. Quadratic keeps the low end fine.
     * @param {number} speed - Slider value 0..1
     * @returns {number} Rotation frequency in Hz (~0.05 to 0.5)
     */
    const speedToHz = (speed) => 0.05 + 0.45 * speed * speed;

    // Movement patterns
    const PATTERNS = {
        CIRCLE: 'circle',
        FIGURE8: 'figure8',
        LEFT_RIGHT: 'leftright',
        FRONT_BACK: 'frontback',
        RANDOM: 'random',
        QUADRANT: 'quadrant',
        DUAL_TRACK: 'dualtrack'
    };

    /**
     * Calculate variable speed for dual track mode
     * Creates cyclical speed variation: fast -> slow -> fast -> normal -> repeat
     * @param {number} time - Current time in seconds
     * @param {number} baseSpeed - Base speed value (0-1)
     * @returns {number} Variable speed (0.5x to 1.5x base speed)
     */
    const calculateVariableSpeed = (time, baseSpeed) => {
        // Primary cycle: ~8 seconds
        const primaryCycle = Math.sin(time * 0.125 * 2 * Math.PI);
        // Secondary modulation: ~20 seconds
        const secondaryCycle = Math.sin(time * 0.05 * 2 * Math.PI);
        const speedMultiplier = 1.0 + 0.3 * primaryCycle + 0.2 * secondaryCycle;
        return baseSpeed * speedMultiplier;
    };

    /**
     * Calculate pan position based on movement pattern
     * @param {string} pattern - Movement pattern name
     * @param {number} angle - Current rotation angle in radians
     * @param {number} time - Current time for random patterns
     * @param {number} backDepth - Volume multiplier at the "behind" position (quadrant)
     * @returns {Object} Pan position and depth multiplier
     */
    const calculatePanPosition = (pattern, angle, time = 0, backDepth = DEFAULT_SPATIAL.backDepth) => {
        let panPosition = 0;
        let depthMultiplier = 1.0;

        switch (pattern) {
            case PATTERNS.CIRCLE:
                panPosition = Math.sin(angle);
                break;

            case PATTERNS.FIGURE8: {
                // True figure-8: Loop on right side, then loop on left side
                const f8Cycle = ((angle / (2 * Math.PI)) % 1 + 1) % 1;
                if (f8Cycle < 0.5) {
                    const rightPhase = f8Cycle * 2;
                    panPosition = Math.sin(rightPhase * Math.PI);
                } else {
                    const leftPhase = (f8Cycle - 0.5) * 2;
                    panPosition = -Math.sin(leftPhase * Math.PI);
                }
                // Depth variation at crossing point
                const f8DepthPhase = Math.abs(Math.sin(f8Cycle * 2 * Math.PI));
                depthMultiplier = 0.7 + 0.3 * f8DepthPhase;
                break;
            }

            case PATTERNS.LEFT_RIGHT:
                panPosition = Math.sin(angle);
                break;

            case PATTERNS.FRONT_BACK:
                panPosition = Math.cos(angle) * 0.5;
                break;

            case PATTERNS.RANDOM:
                if (Math.random() > 0.9) {
                    panPosition = (Math.random() * 2 - 1);
                }
                break;

            case PATTERNS.QUADRANT: {
                // 360-degree circular: Right -> Back(quiet) -> Left -> Front
                const fullCycle = (angle / (2 * Math.PI));
                const cyclePos = fullCycle - Math.floor(fullCycle);
                const segment = Math.floor(cyclePos * 4);
                const segmentPhase = (cyclePos * 4) - segment;

                const panAnchors = [1, 0, -1, 0];
                const panA = panAnchors[segment];
                const panB = panAnchors[(segment + 1) % panAnchors.length];

                const depthAnchors = [1.0, backDepth, 1.0, 1.0];
                const depthA = depthAnchors[segment];
                const depthB = depthAnchors[(segment + 1) % depthAnchors.length];

                const smoothPhase = easeInOut(segmentPhase);
                panPosition = panA + (panB - panA) * smoothPhase;
                depthMultiplier = depthA + (depthB - depthA) * smoothPhase;
                break;
            }

            case PATTERNS.DUAL_TRACK:
                panPosition = Math.sin(angle);
                break;

            default:
                panPosition = Math.sin(angle);
        }

        return { panPosition, depthMultiplier };
    };

    /**
     * Ease-in-out function for smooth transitions
     * @param {number} t - Value between 0 and 1
     * @returns {number} Eased value
     */
    const easeInOut = (t) => {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    };

    /**
     * Calculate channel gains based on pan position
     * @param {number} panPosition - Pan position (-1 to 1)
     * @param {boolean} isHardPan - Use hard panning (no cross-channel)
     * @param {number} depthMultiplier - Depth/volume multiplier
     * @returns {Object} Gain values for all channels
     */
    const calculateChannelGains = (panPosition, isHardPan = false, depthMultiplier = 1.0, hardPanThreshold = DEFAULT_SPATIAL.hardPanThreshold) => {
        const crossChannelMix = isHardPan ? 0 : 0.15;
        let leftChannelGain, rightChannelGain;

        if (isHardPan) {
            // Hard panning: strong separation, but the far ear is floored at
            // HARD_PAN_FLOOR (~-20dB). Total single-ear silence reads as a dead
            // earbud, not as motion — real sources never exceed ~20dB ILD.
            if (panPosition > hardPanThreshold) {
                leftChannelGain = Math.max(HARD_PAN_FLOOR, 1 - panPosition * 2);
                rightChannelGain = 1;
            } else if (panPosition < -hardPanThreshold) {
                leftChannelGain = 1;
                rightChannelGain = Math.max(HARD_PAN_FLOOR, 1 + panPosition * 2);
            } else {
                leftChannelGain = 0.5;
                rightChannelGain = 0.5;
            }
        } else {
            // Soft panning
            leftChannelGain = (1 - panPosition) * 0.5;
            rightChannelGain = (1 + panPosition) * 0.5;
        }

        // Apply normalization and depth
        const targetLeftGain = clamp(leftChannelGain * NORMALIZATION_FACTOR * depthMultiplier);
        const targetRightGain = clamp(rightChannelGain * NORMALIZATION_FACTOR * depthMultiplier);
        const targetLeftToRight = isHardPan ? 0.001 : clamp(rightChannelGain * crossChannelMix * NORMALIZATION_FACTOR);
        const targetRightToLeft = isHardPan ? 0.001 : clamp(leftChannelGain * crossChannelMix * NORMALIZATION_FACTOR);

        return {
            leftToLeft: targetLeftGain,
            rightToRight: targetRightGain,
            leftToRight: targetLeftToRight,
            rightToLeft: targetRightToLeft
        };
    };

    /**
     * Calculate delay gains for spatial depth
     * @param {number} panPosition - Pan position (-1 to 1)
     * @param {number} spatialDepth - Spatial depth (0-1)
     * @param {boolean} isHardPan - Use hard panning
     * @returns {Object} Delay gain values
     */
    const calculateDelayGains = (panPosition, spatialDepth, isHardPan = false) => {
        const delayBase = isHardPan ? 0.02 : 0.05 * spatialDepth;
        const crossDelayBase = isHardPan ? 0 : 0.03 * spatialDepth;
        const absPan = Math.abs(panPosition);

        return {
            delayLeft: clamp(delayBase * absPan, 0.0001),
            delayRight: clamp(delayBase * absPan, 0.0001),
            crossDelayLeft: clamp(crossDelayBase * absPan, 0.0001),
            crossDelayRight: clamp(crossDelayBase * absPan, 0.0001)
        };
    };

    /**
     * Calculate Track 2 gains for dual-track mode
     * @param {number} track2PanPosition - Track 2 pan position (inverted from track 1)
     * @param {boolean} isHardPan - Use hard panning
     * @param {number} depthMultiplier - Depth multiplier
     * @returns {Object} Track 2 gain values
     */
    const calculateTrack2Gains = (track2PanPosition, isHardPan = false, depthMultiplier = 1.0) => {
        const dualTrackGainReduction = 0.5;
        const crossChannelMix = isHardPan ? 0 : 0.15;
        let t2LeftGain, t2RightGain;

        if (isHardPan) {
            if (track2PanPosition > 0.1) {
                t2LeftGain = Math.max(HARD_PAN_FLOOR, 1 - track2PanPosition * 2);
                t2RightGain = 1;
            } else if (track2PanPosition < -0.1) {
                t2LeftGain = 1;
                t2RightGain = Math.max(HARD_PAN_FLOOR, 1 + track2PanPosition * 2);
            } else {
                t2LeftGain = 0.5;
                t2RightGain = 0.5;
            }
        } else {
            t2LeftGain = (1 - track2PanPosition) * 0.5;
            t2RightGain = (1 + track2PanPosition) * 0.5;
        }

        return {
            leftToLeft: clamp(t2LeftGain * NORMALIZATION_FACTOR * dualTrackGainReduction * depthMultiplier),
            rightToRight: clamp(t2RightGain * NORMALIZATION_FACTOR * dualTrackGainReduction * depthMultiplier),
            leftToRight: clamp(crossChannelMix * NORMALIZATION_FACTOR * dualTrackGainReduction),
            rightToLeft: clamp(crossChannelMix * NORMALIZATION_FACTOR * dualTrackGainReduction)
        };
    };

    /**
     * Clamp value to prevent audio automation errors
     * @param {number} val - Value to clamp
     * @param {number} min - Minimum value (default 0.0001)
     * @param {number} max - Maximum value (default 1)
     * @returns {number} Clamped value
     */
    const clamp = (val, min = 0.0001, max = 1) => {
        return Math.max(min, Math.min(max, val));
    };

    /**
     * Apply gain ramp to a GainNode
     * @param {GainNode} gainNode - Web Audio GainNode
     * @param {number} targetValue - Target gain value
     * @param {AudioContext} ctx - Audio context
     * @param {number} rampMs - Ramp duration in milliseconds
     */
    const applyGainRamp = (gainNode, targetValue, ctx, rampMs = 100) => {
        if (!gainNode || !ctx) return;

        const now = ctx.currentTime;
        const rampTime = now + (rampMs / 1000);
        const clamped = clamp(targetValue);

        gainNode.gain.setValueAtTime(clamp(gainNode.gain.value), now);
        gainNode.gain.exponentialRampToValueAtTime(clamped, rampTime);
    };

    /**
     * Ramp a DelayNode's delayTime (linear — exponential can't reach 0, and the
     * slight pitch bend from delay modulation is physically-correct doppler)
     * @param {DelayNode} delayNode - Web Audio DelayNode
     * @param {number} targetSec - Target delay in seconds
     * @param {AudioContext} ctx - Audio context
     * @param {number} rampMs - Ramp duration in milliseconds
     */
    const applyDelayRamp = (delayNode, targetSec, ctx, rampMs = 100) => {
        if (!delayNode || !ctx) return;
        const now = ctx.currentTime;
        delayNode.delayTime.setValueAtTime(delayNode.delayTime.value, now);
        delayNode.delayTime.linearRampToValueAtTime(Math.max(0, targetSec), now + rampMs / 1000);
    };

    /**
     * Ramp a BiquadFilterNode's cutoff frequency (exponential — perceptually even)
     * @param {BiquadFilterNode} filterNode - Web Audio BiquadFilterNode
     * @param {number} targetHz - Target cutoff in Hz
     * @param {AudioContext} ctx - Audio context
     * @param {number} rampMs - Ramp duration in milliseconds
     */
    const applyFilterRamp = (filterNode, targetHz, ctx, rampMs = 100) => {
        if (!filterNode || !ctx) return;
        const now = ctx.currentTime;
        const clamped = Math.max(40, Math.min(LP_OPEN_HZ, targetHz));
        filterNode.frequency.setValueAtTime(Math.max(40, filterNode.frequency.value), now);
        filterNode.frequency.exponentialRampToValueAtTime(clamped, now + rampMs / 1000);
    };

    /**
     * Calculate per-ear ITD (interaural time difference) delays.
     * The FAR ear's sound arrives late: pan > 0 (source right) delays the left ear.
     * @param {number} panPosition - Pan position (-1 to 1)
     * @param {number} itdAmount - Preset multiplier (0 disables, 1 = full 0.7ms)
     * @returns {Object} { left, right } delay times in seconds
     */
    const calculateItd = (panPosition, itdAmount = DEFAULT_SPATIAL.itdAmount) => {
        const magnitude = MAX_ITD_SEC * itdAmount * Math.abs(panPosition);
        return {
            left: panPosition > 0 ? magnitude : 0,
            right: panPosition < 0 ? magnitude : 0
        };
    };

    /**
     * Calculate per-ear head-shadow lowpass cutoffs.
     * The far ear darkens as the source pans away (log sweep toward
     * LP_SHADOW_FLOOR_HZ at full shadow); BOTH ears darken when the source is
     * behind the head (depthMultiplier < 1 in quadrant/figure8 patterns).
     * @param {number} panPosition - Pan position (-1 to 1)
     * @param {number} headShadow - Preset shadow strength (0 disables, 1 = full)
     * @param {number} depthMultiplier - 1 = beside/front, <1 = behind
     * @returns {Object} { left, right } cutoff frequencies in Hz
     */
    const calculateHeadShadow = (panPosition, headShadow = DEFAULT_SPATIAL.headShadow, depthMultiplier = 1.0) => {
        const shadowRatio = LP_SHADOW_FLOOR_HZ / LP_OPEN_HZ;
        const farCutoff = LP_OPEN_HZ * Math.pow(shadowRatio, headShadow * Math.abs(panPosition));
        const backFactor = Math.pow(Math.max(depthMultiplier, 0.3), 1.5);
        return {
            left: Math.max(200, (panPosition > 0 ? farCutoff : LP_OPEN_HZ) * backFactor),
            right: Math.max(200, (panPosition < 0 ? farCutoff : LP_OPEN_HZ) * backFactor)
        };
    };

    /**
     * Calculate complete rotation state for a given time
     * @param {Object} params - Rotation parameters
     * @param {Object} [params.spatial] - Preset spatial profile
     *        { itdAmount, headShadow, backDepth, hardPanThreshold }
     * @returns {Object} Complete gain/ITD/filter state for all channels
     */
    const calculateRotationState = (params) => {
        const {
            time,
            speed,
            movement,
            intensity,
            spatialDepth,
            dualTrackEnabled = false,
            dualTrackMode = 'synced',
            track2Speed = 0.5,
            variableSpeed = false,
            spatial = null
        } = params;

        const sp = { ...DEFAULT_SPATIAL, ...(spatial || {}) };

        // Variable speed is a tempo-drift multiplier applied to the remapped
        // rotation frequency, preserving the tuned drift shape at musical rates.
        const driftMultiplier = variableSpeed ? calculateVariableSpeed(time, 1) : 1;
        const rotationHz = speedToHz(speed) * driftMultiplier;

        const angle = 2 * Math.PI * rotationHz * time;
        const { panPosition: rawPan, depthMultiplier } = calculatePanPosition(movement, angle, time, sp.backDepth);
        const panPosition = rawPan * intensity;
        const isHardPan = movement === PATTERNS.QUADRANT;

        const track1Gains = calculateChannelGains(panPosition, isHardPan, depthMultiplier, sp.hardPanThreshold);
        const delayGains = calculateDelayGains(panPosition, spatialDepth, isHardPan);
        const itd = calculateItd(panPosition, sp.itdAmount);
        const filters = calculateHeadShadow(panPosition, sp.headShadow, depthMultiplier);

        let track2Gains = null;
        if (dualTrackEnabled) {
            let track2PanPosition;
            if (dualTrackMode === 'independent') {
                const t2Hz = speedToHz(track2Speed) * driftMultiplier;
                const t2Angle = 2 * Math.PI * t2Hz * time;
                track2PanPosition = -Math.sin(t2Angle) * intensity;
            } else {
                track2PanPosition = -panPosition;
            }
            track2Gains = calculateTrack2Gains(track2PanPosition, isHardPan, depthMultiplier);
        }

        return {
            track1: track1Gains,
            track2: track2Gains,
            delay: delayGains,
            itd,
            filters,
            // Behind the head the direct path dims — feed the difference to the
            // room instead: 1.0 beside/front, up to ~1.45 fully behind
            reverbSendMultiplier: 1 + (1 - depthMultiplier),
            panPosition,
            depthMultiplier,
            angle,
            rotationHz
        };
    };

    /**
     * Check if a movement pattern uses hard panning
     * @param {string} pattern - Movement pattern
     * @returns {boolean} True if hard panning
     */
    const isHardPanPattern = (pattern) => {
        return pattern === PATTERNS.QUADRANT;
    };

    /**
     * Check if a movement pattern uses 3D depth simulation
     * @param {string} pattern - Movement pattern
     * @returns {boolean} True if uses 3D depth
     */
    const uses3DDepth = (pattern) => {
        return pattern === PATTERNS.QUADRANT || pattern === PATTERNS.FIGURE8;
    };

    return {
        // Constants
        ROTATION_INTERVAL_MS,
        NORMALIZATION_FACTOR,
        PATTERNS,
        MAX_ITD_SEC,
        LP_OPEN_HZ,
        DEFAULT_SPATIAL,

        // Calculations
        speedToHz,
        calculateVariableSpeed,
        calculatePanPosition,
        calculateChannelGains,
        calculateDelayGains,
        calculateTrack2Gains,
        calculateItd,
        calculateHeadShadow,
        calculateRotationState,

        // Utilities
        clamp,
        easeInOut,
        applyGainRamp,
        applyDelayRamp,
        applyFilterRamp,
        isHardPanPattern,
        uses3DDepth
    };
});
