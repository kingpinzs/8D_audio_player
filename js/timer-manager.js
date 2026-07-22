/**
 * 8D Audio Player - Timer Manager
 * Sleep timer and Pomodoro timer utilities
 * Extracted from index.html for modularization
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.TimerManager = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * Format seconds to MM:SS or HH:MM:SS
     * @param {number} totalSeconds - Total seconds
     * @returns {string} Formatted time string
     */
    const formatTimerDisplay = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    /**
     * Create a sleep timer controller
     * @returns {Object} Sleep timer controller
     */
    const createSleepTimer = () => {
        let intervalId = null;
        let currentSeconds = 0;
        let isActive = false;

        return {
            /**
             * Start the sleep timer
             * @param {number} duration - Duration in seconds
             * @param {Object} callbacks - Callback functions
             * @param {Function} callbacks.onTick - Called every second with remaining seconds
             * @param {Function} callbacks.onFadeStart - Called when fade out starts
             * @param {Function} callbacks.onComplete - Called when timer completes
             * @param {Function} callbacks.onStart - Called when timer starts
             */
            start(duration, callbacks = {}) {
                this.stop();

                currentSeconds = duration;
                isActive = true;

                if (callbacks.onStart) {
                    callbacks.onStart(duration);
                }

                intervalId = setInterval(() => {
                    currentSeconds--;

                    if (callbacks.onTick) {
                        callbacks.onTick(currentSeconds);
                    }

                    if (currentSeconds <= 0) {
                        this.stop();
                        isActive = false;

                        if (callbacks.onFadeStart) {
                            callbacks.onFadeStart();
                        }

                        // Fade out logic handled by callback
                        if (callbacks.onComplete) {
                            callbacks.onComplete();
                        }
                    }
                }, 1000);
            },

            /**
             * Stop the sleep timer
             */
            stop() {
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
                currentSeconds = 0;
                isActive = false;
            },

            /**
             * Get current state
             */
            getState() {
                return {
                    isActive,
                    secondsRemaining: currentSeconds,
                    formatted: formatTimerDisplay(currentSeconds)
                };
            },

            /**
             * Check if timer is active
             */
            isRunning() {
                return isActive;
            }
        };
    };

    /**
     * Create a Pomodoro timer controller
     * @returns {Object} Pomodoro timer controller
     */
    const createPomodoroTimer = () => {
        let intervalId = null;
        let currentSeconds = 0;
        let phase = 'work'; // 'work' or 'break'
        let cycles = 0;
        let isActive = false;
        let workDuration = 25 * 60;
        let breakDuration = 5 * 60;

        return {
            /**
             * Start the Pomodoro timer
             * @param {Object} config - Timer configuration
             * @param {number} config.workMinutes - Work phase duration in minutes
             * @param {number} config.breakMinutes - Break phase duration in minutes
             * @param {Object} callbacks - Callback functions
             * @param {Function} callbacks.onTick - Called every second
             * @param {Function} callbacks.onWorkEnd - Called when work phase ends
             * @param {Function} callbacks.onBreakEnd - Called when break phase ends
             * @param {Function} callbacks.onPhaseChange - Called when phase changes
             * @param {Function} callbacks.onStart - Called when timer starts
             */
            start(config = {}, callbacks = {}) {
                this.stop();

                workDuration = (config.workMinutes || 25) * 60;
                breakDuration = (config.breakMinutes || 5) * 60;
                phase = 'work';
                cycles = 0;
                currentSeconds = workDuration;
                isActive = true;

                if (callbacks.onStart) {
                    callbacks.onStart({ phase, seconds: currentSeconds });
                }

                intervalId = setInterval(() => {
                    currentSeconds--;

                    if (callbacks.onTick) {
                        callbacks.onTick({
                            phase,
                            seconds: currentSeconds,
                            cycles,
                            formatted: formatTimerDisplay(currentSeconds)
                        });
                    }

                    if (currentSeconds <= 0) {
                        if (phase === 'work') {
                            // Work phase ended
                            cycles++;
                            phase = 'break';
                            currentSeconds = breakDuration;

                            if (callbacks.onWorkEnd) {
                                callbacks.onWorkEnd({ cycles });
                            }
                            if (callbacks.onPhaseChange) {
                                callbacks.onPhaseChange({ phase: 'break', cycles });
                            }
                        } else {
                            // Break phase ended
                            phase = 'work';
                            currentSeconds = workDuration;

                            if (callbacks.onBreakEnd) {
                                callbacks.onBreakEnd({ cycles });
                            }
                            if (callbacks.onPhaseChange) {
                                callbacks.onPhaseChange({ phase: 'work', cycles });
                            }
                        }
                    }
                }, 1000);
            },

            /**
             * Stop the Pomodoro timer
             */
            stop() {
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
                currentSeconds = 0;
                phase = 'work';
                isActive = false;
            },

            /**
             * Get current state
             */
            getState() {
                return {
                    isActive,
                    phase,
                    cycles,
                    secondsRemaining: currentSeconds,
                    formatted: formatTimerDisplay(currentSeconds),
                    workDuration,
                    breakDuration
                };
            },

            /**
             * Check if timer is active
             */
            isRunning() {
                return isActive;
            },

            /**
             * Get current phase
             */
            getPhase() {
                return phase;
            },

            /**
             * Get completed cycles count
             */
            getCycles() {
                return cycles;
            }
        };
    };

    /**
     * Audio fade out utility
     * @param {GainNode} gainNode - Web Audio GainNode
     * @param {number} duration - Fade duration in milliseconds
     * @param {Function} onComplete - Called when fade completes
     * @returns {Function} Cancel function
     */
    const fadeOutAudio = (gainNode, duration = 5000, onComplete) => {
        if (!gainNode) {
            if (onComplete) onComplete();
            return () => {};
        }

        const steps = Math.floor(duration / 200);
        // Guard: gain at/below the 0.05 floor would make the factor Infinity/NaN
        const startGain = Math.max(gainNode.gain.value, 0.06);
        const factor = Math.pow(0.05 / startGain, 1 / steps);
        let step = 0;

        const intervalId = setInterval(() => {
            if (step >= steps || gainNode.gain.value <= 0.05) {
                clearInterval(intervalId);
                gainNode.gain.value = 0;
                if (onComplete) onComplete();
                return;
            }
            gainNode.gain.value *= factor;
            step++;
        }, 200);

        // Return cancel function
        return () => {
            clearInterval(intervalId);
        };
    };

    return {
        formatTimerDisplay,
        createSleepTimer,
        createPomodoroTimer,
        fadeOutAudio
    };
});
