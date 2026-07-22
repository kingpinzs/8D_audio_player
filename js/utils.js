/**
 * 8D Audio Player - Utility Functions
 * Extracted from index.html for modularization
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.Utils = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * Format seconds into MM:SS display
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time string
     */
    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    /**
     * Validate URL format
     * @param {string} str - URL string to validate
     * @returns {boolean} True if valid HTTP/HTTPS URL
     */
    const isValidUrl = (str) => {
        try {
            const url = new URL(str);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            return false;
        }
    };

    /**
     * Detect unsupported streaming services
     * @param {string} url - URL to check
     * @returns {Object} Service detection result
     */
    const detectUnsupportedService = (url) => {
        const urlLower = url.toLowerCase();
        if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
            return { service: 'YouTube', supported: false };
        }
        if (urlLower.includes('spotify.com')) {
            return { service: 'Spotify', supported: false };
        }
        return { supported: true };
    };

    /**
     * Validate stream URL accessibility (async)
     * @param {string} url - URL to validate
     * @returns {Promise<Object>} Validation result
     */
    const validateStreamUrl = async (url) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
            const response = await fetch(url, {
                method: 'HEAD',
                mode: 'cors',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                return { valid: true, url };
            } else {
                return {
                    valid: false,
                    reason: 'unreachable',
                    status: response.status
                };
            }
        } catch (err) {
            clearTimeout(timeoutId);

            if (err.name === 'AbortError') {
                return { valid: false, reason: 'timeout' };
            }

            // CORS or network error
            return { valid: false, reason: 'cors', error: err };
        }
    };

    /**
     * Estimate total playlist duration
     * @param {Array} playlist - Array of tracks
     * @param {number} avgMinutes - Average track duration estimate
     * @returns {number} Estimated total minutes
     */
    const getTotalDuration = (playlist, avgMinutes = 3.5) => {
        return playlist.length * avgMinutes;
    };

    /**
     * Get binaural frequency description
     * @param {number} freq - Frequency in Hz
     * @returns {string} Description of frequency band
     */
    const getBinauralDescription = (freq) => {
        if (freq <= 4) return 'Delta (Sleep)';
        if (freq <= 8) return 'Theta (Meditation)';
        if (freq <= 14) return 'Alpha (Relaxation)';
        if (freq <= 30) return 'Beta (Focus)';
        return 'Gamma (Peak Focus)';
    };

    /**
     * Format "last used" timestamp for display
     * @param {number} timestamp - Unix timestamp
     * @returns {string} Human-readable time ago
     */
    const formatLastUsed = (timestamp) => {
        if (!timestamp || timestamp === 0) return 'Never used';

        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return 'Just now';
        if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
        if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
        if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;

        const date = new Date(timestamp);
        return date.toLocaleDateString();
    };

    /**
     * Debounce function calls
     * @param {Function} fn - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    const debounce = (fn, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn(...args), delay);
        };
    };

    /**
     * Throttle function calls
     * @param {Function} fn - Function to throttle
     * @param {number} limit - Minimum time between calls
     * @returns {Function} Throttled function
     */
    const throttle = (fn, limit) => {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                fn(...args);
                inThrottle = true;
                setTimeout(() => { inThrottle = false; }, limit);
            }
        };
    };

    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    const clamp = (value, min, max) => {
        return Math.min(Math.max(value, min), max);
    };

    /**
     * Generate a unique ID
     * @param {string} prefix - Optional prefix
     * @returns {string} Unique identifier
     */
    const generateId = (prefix = 'id') => {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

    /**
     * Deep clone an object
     * @param {Object} obj - Object to clone
     * @returns {Object} Cloned object
     */
    const deepClone = (obj) => {
        return JSON.parse(JSON.stringify(obj));
    };

    return {
        formatTime,
        isValidUrl,
        detectUnsupportedService,
        validateStreamUrl,
        getTotalDuration,
        getBinauralDescription,
        formatLastUsed,
        debounce,
        throttle,
        clamp,
        generateId,
        deepClone
    };
});
