/**
 * 8D Audio Player - Mode Themes
 * Each preset mode commits to its own visual world: a CSS token block
 * (body class) plus a visualizer palette passed into the canvas draw call.
 * Discipline: themes swap skin only — layout and controls never move.
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.AppThemes = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const THEMES = {
        // Focus -> "Console-lite": dark slate precision, amber signal color
        focus: {
            className: 'theme-focus',
            label: 'Console',
            viz: { accent: '#e8a33d', hueBase: 30, hueRange: 25, saturation: 78, lightness: 58 }
        },
        // Calm -> "Still Air": light mist, sea accent, whisper contrast
        calm: {
            className: 'theme-calm',
            label: 'Still Air',
            viz: { accent: '#5e8c87', hueBase: 155, hueRange: 35, saturation: 30, lightness: 52 }
        },
        // Energize -> "Orbit": deep void, cyan source glow
        energize: {
            className: 'theme-energize',
            label: 'Orbit',
            viz: { accent: '#74dce6', hueBase: 175, hueRange: 70, saturation: 75, lightness: 62 }
        },
        // APD Friendly -> "Ledger": white ground, ink and cobalt, maximum clarity
        'apd-friendly': {
            className: 'theme-apd',
            label: 'Ledger',
            viz: { accent: '#2244cc', hueBase: 228, hueRange: 0, saturation: 72, lightness: 46 }
        }
    };

    const ALL_CLASSES = Object.keys(THEMES).map((key) => THEMES[key].className);

    /**
     * Resolve the theme for a preset id.
     * Custom presets (custom-preset-*) have no committed world and return null,
     * which leaves the base :root token set untouched.
     * @param {string} presetId - Active preset id
     * @returns {Object|null} Theme definition or null
     */
    const getTheme = (presetId) => THEMES[presetId] || null;

    /**
     * Apply a theme's body class (removing all others).
     * @param {string} presetId - Active preset id
     * @returns {Object|null} The applied theme (or null when base look)
     */
    const applyTheme = (presetId) => {
        const theme = getTheme(presetId);
        ALL_CLASSES.forEach((cls) => document.body.classList.remove(cls));
        if (theme) {
            document.body.classList.add(theme.className);
        }
        return theme;
    };

    return {
        THEMES,
        ALL_CLASSES,
        getTheme,
        applyTheme
    };
});
