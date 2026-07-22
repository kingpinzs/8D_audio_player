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
     * @returns {Object} Pan position and depth multiplier
     */
    const calculatePanPosition = (pattern, angle, time = 0) => {
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

                const depthAnchors = [1.0, 0.55, 1.0, 1.0];
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
    const calculateChannelGains = (panPosition, isHardPan = false, depthMultiplier = 1.0) => {
        const crossChannelMix = isHardPan ? 0 : 0.15;
        let leftChannelGain, rightChannelGain;

        if (isHardPan) {
            // Hard panning: full separation
            if (panPosition > 0.1) {
                leftChannelGain = Math.max(0, 1 - panPosition * 2);
                rightChannelGain = 1;
            } else if (panPosition < -0.1) {
                leftChannelGain = 1;
                rightChannelGain = Math.max(0, 1 + panPosition * 2);
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
                t2LeftGain = Math.max(0, 1 - track2PanPosition * 2);
                t2RightGain = 1;
            } else if (track2PanPosition < -0.1) {
                t2LeftGain = 1;
                t2RightGain = Math.max(0, 1 + track2PanPosition * 2);
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
     * Calculate complete rotation state for a given time
     * @param {Object} params - Rotation parameters
     * @returns {Object} Complete gain state for all channels
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
            variableSpeed = false
        } = params;

        const effectiveSpeed = variableSpeed
            ? calculateVariableSpeed(time, speed)
            : speed;

        const angle = 2 * Math.PI * effectiveSpeed * time;
        const { panPosition: rawPan, depthMultiplier } = calculatePanPosition(movement, angle, time);
        const panPosition = rawPan * intensity;
        const isHardPan = movement === PATTERNS.QUADRANT;

        const track1Gains = calculateChannelGains(panPosition, isHardPan, depthMultiplier);
        const delayGains = calculateDelayGains(panPosition, spatialDepth, isHardPan);

        let track2Gains = null;
        if (dualTrackEnabled) {
            let track2PanPosition;
            if (dualTrackMode === 'independent') {
                const t2EffectiveSpeed = variableSpeed
                    ? calculateVariableSpeed(time, track2Speed)
                    : track2Speed;
                const t2Angle = 2 * Math.PI * t2EffectiveSpeed * time;
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
            panPosition,
            depthMultiplier,
            angle
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

        // Calculations
        calculateVariableSpeed,
        calculatePanPosition,
        calculateChannelGains,
        calculateDelayGains,
        calculateTrack2Gains,
        calculateRotationState,

        // Utilities
        clamp,
        easeInOut,
        applyGainRamp,
        isHardPanPattern,
        uses3DDepth
    };
});
