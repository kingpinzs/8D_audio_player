/**
 * 8D Audio Player - Ritual Engine
 * Breathing ritual / focus ritual animation and timing
 * Extracted from index.html for modularization
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.RitualEngine = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const DEFAULT_DURATION = 20; // seconds
    const SKIP_PREF_KEY = 'skipBreathingRitual';

    // Breathing phases
    const PHASES = {
        INHALE: 'inhale',
        HOLD_IN: 'hold-in',
        EXHALE: 'exhale',
        HOLD_OUT: 'hold-out'
    };

    // Phase messages
    const PHASE_MESSAGES = {
        [PHASES.INHALE]: 'Breathe in...',
        [PHASES.HOLD_IN]: 'Hold...',
        [PHASES.EXHALE]: 'Breathe out...',
        [PHASES.HOLD_OUT]: 'Hold...'
    };

    /**
     * Get skip ritual preference from localStorage
     * @returns {boolean} True if ritual should be skipped
     */
    const getSkipPreference = () => {
        try {
            return localStorage.getItem(SKIP_PREF_KEY) === 'true';
        } catch (e) {
            return false;
        }
    };

    /**
     * Set skip ritual preference in localStorage
     * @param {boolean} skip - Whether to skip ritual
     */
    const setSkipPreference = (skip) => {
        try {
            if (skip) {
                localStorage.setItem(SKIP_PREF_KEY, 'true');
            } else {
                localStorage.removeItem(SKIP_PREF_KEY);
            }
        } catch (e) {
            console.warn('Failed to persist skip preference', e);
        }
    };

    /**
     * Calculate the breathing phase for a given step
     * 4-2-4 breathing pattern: 2s inhale, 1s hold, 2s exhale, 1s hold (6s cycle)
     * @param {number} step - Current step (1-indexed)
     * @returns {Object} Phase info with phase and message
     */
    const getBreathingPhase = (step) => {
        const cyclePosition = step % 6;

        if (cyclePosition === 0 || cyclePosition === 1) {
            return { phase: PHASES.INHALE, message: PHASE_MESSAGES[PHASES.INHALE] };
        } else if (cyclePosition === 2) {
            return { phase: PHASES.HOLD_IN, message: PHASE_MESSAGES[PHASES.HOLD_IN] };
        } else if (cyclePosition === 3 || cyclePosition === 4) {
            return { phase: PHASES.EXHALE, message: PHASE_MESSAGES[PHASES.EXHALE] };
        } else {
            return { phase: PHASES.HOLD_OUT, message: PHASE_MESSAGES[PHASES.HOLD_OUT] };
        }
    };

    /**
     * Create a ritual controller
     * @returns {Object} Ritual controller with start, skip, stop methods
     */
    const createRitualController = () => {
        let countdownInterval = null;
        let phaseInterval = null;
        let completionTimeout = null;
        let phaseStep = 0;
        let isRunning = false;

        return {
            /**
             * Start the breathing ritual
             * @param {Object} config - Configuration
             * @param {number} config.duration - Total duration in seconds
             * @param {Object} callbacks - Callback functions
             * @param {Function} callbacks.onCountdown - Called every second with remaining time
             * @param {Function} callbacks.onPhaseChange - Called when breathing phase changes
             * @param {Function} callbacks.onComplete - Called when ritual completes
             * @param {Function} callbacks.onStart - Called when ritual starts
             */
            start(config = {}, callbacks = {}) {
                this.stop();

                const duration = config.duration || DEFAULT_DURATION;
                let countdown = duration;
                phaseStep = 0;
                isRunning = true;

                if (callbacks.onStart) {
                    callbacks.onStart({ duration });
                }

                // Initial phase
                const initialPhase = getBreathingPhase(phaseStep);
                if (callbacks.onPhaseChange) {
                    callbacks.onPhaseChange(initialPhase);
                }

                // Countdown timer (1s intervals)
                countdownInterval = setInterval(() => {
                    countdown--;

                    if (callbacks.onCountdown) {
                        callbacks.onCountdown(countdown);
                    }

                    if (countdown <= 0) {
                        clearInterval(countdownInterval);
                        countdownInterval = null;
                    }
                }, 1000);

                // Breathing phase timer (1s intervals)
                phaseInterval = setInterval(() => {
                    phaseStep++;
                    const phaseInfo = getBreathingPhase(phaseStep);

                    if (callbacks.onPhaseChange) {
                        callbacks.onPhaseChange(phaseInfo);
                    }
                }, 1000);

                // Completion timeout
                completionTimeout = setTimeout(() => {
                    this.stop();
                    isRunning = false;

                    if (callbacks.onComplete) {
                        callbacks.onComplete({ ritualUsed: true });
                    }
                }, duration * 1000);
            },

            /**
             * Skip the ritual (user initiated)
             * @param {Function} onComplete - Called after skip
             */
            skip(onComplete) {
                this.stop();
                isRunning = false;

                if (onComplete) {
                    onComplete({ ritualUsed: false, reason: 'user-skip' });
                }
            },

            /**
             * Stop the ritual (clear all timers)
             */
            stop() {
                if (countdownInterval) {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                }
                if (phaseInterval) {
                    clearInterval(phaseInterval);
                    phaseInterval = null;
                }
                if (completionTimeout) {
                    clearTimeout(completionTimeout);
                    completionTimeout = null;
                }
                phaseStep = 0;
            },

            /**
             * Check if ritual is currently running
             * @returns {boolean} True if running
             */
            isRunning() {
                return isRunning;
            },

            /**
             * Get current phase step
             * @returns {number} Current step
             */
            getStep() {
                return phaseStep;
            }
        };
    };

    /**
     * Log ritual telemetry event
     * @param {string} type - Event type
     * @param {Object} data - Event data
     */
    const logRitualEvent = (type, data = {}) => {
        try {
            const event = {
                type,
                timestamp: Date.now(),
                ...data
            };
            console.log('[RitualEngine]', event);
            return event;
        } catch (e) {
            console.warn('Failed to log ritual event', e);
            return null;
        }
    };

    /**
     * Log ritual start
     * @param {Object} data - Ritual data (modeId, modeLabel, duration)
     */
    const logStart = (data) => {
        return logRitualEvent('RITUAL_STARTED', data);
    };

    /**
     * Log ritual completion
     * @param {Object} data - Ritual data (modeId, modeLabel, presetApplied, duration)
     */
    const logComplete = (data) => {
        return logRitualEvent('FOCUS_RITUAL_COMPLETED', data);
    };

    /**
     * Log ritual skip
     * @param {Object} data - Skip data (modeId, reason)
     */
    const logSkip = (data) => {
        return logRitualEvent('RITUAL_SKIPPED', data);
    };

    return {
        // Constants
        DEFAULT_DURATION,
        SKIP_PREF_KEY,
        PHASES,
        PHASE_MESSAGES,

        // Preferences
        getSkipPreference,
        setSkipPreference,

        // Phase calculation
        getBreathingPhase,

        // Controller
        createRitualController,

        // Telemetry
        logRitualEvent,
        logStart,
        logComplete,
        logSkip
    };
});
