/**
 * 8D Audio Player - Preset Manager
 * Custom preset storage, loading, and management
 * Extracted from index.html for modularization
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.PresetManager = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const PRESETS_KEY = 'mpe_8d_custom_presets';
    const ORDER_KEY = 'mpe_8d_preset_order';

    /**
     * Load custom presets from localStorage
     * @returns {Object} Custom presets object keyed by ID
     */
    const loadCustomPresets = () => {
        try {
            const saved = localStorage.getItem(PRESETS_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch (err) {
            console.error('[PresetManager] Failed to load custom presets:', err);
            return {};
        }
    };

    /**
     * Save custom presets to localStorage
     * @param {Object} presets - Presets object to save
     * @returns {boolean} Success status
     */
    const saveCustomPresetsToStorage = (presets) => {
        try {
            localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
            return true;
        } catch (err) {
            console.error('[PresetManager] Failed to save presets:', err);
            return false;
        }
    };

    /**
     * Get preset display order
     * @param {Array} defaultModes - Default mode library array
     * @returns {Array} Ordered array of preset IDs
     */
    const getPresetOrder = (defaultModes = []) => {
        try {
            const saved = localStorage.getItem(ORDER_KEY);
            if (saved) return JSON.parse(saved);
        } catch (err) {
            console.error('[PresetManager] Failed to load preset order:', err);
        }

        // Default order: defaults first, then custom by creation date
        const defaults = defaultModes.map(m => m.id);
        const custom = Object.keys(loadCustomPresets()).sort();
        return [...defaults, ...custom];
    };

    /**
     * Save preset display order
     * @param {Array} order - Array of preset IDs in display order
     * @returns {boolean} Success status
     */
    const savePresetOrder = (order) => {
        try {
            localStorage.setItem(ORDER_KEY, JSON.stringify(order));
            return true;
        } catch (err) {
            console.error('[PresetManager] Failed to save preset order:', err);
            return false;
        }
    };

    /**
     * Save a new custom preset
     * @param {Object} presetData - Preset configuration data
     * @returns {string|null} New preset ID or null on failure
     */
    const saveCustomPreset = (presetData) => {
        try {
            const customPresets = loadCustomPresets();
            const id = `custom-preset-${Date.now()}`;

            customPresets[id] = {
                id,
                name: presetData.name,
                description: presetData.description || '',
                createdAt: Date.now(),
                lastUsedAt: Date.now(),
                preset: {
                    speed: presetData.speed,
                    intensity: presetData.intensity,
                    spatialDepth: presetData.spatialDepth,
                    movement: presetData.movement,
                    binaural: {
                        enabled: presetData.binauralEnabled,
                        freq: presetData.binauralFreq
                    },
                    noise: {
                        type: presetData.noiseType,
                        volume: presetData.noiseVolume
                    },
                    spatial: {
                        itdAmount: presetData.itdAmount ?? 0.7,
                        headShadow: presetData.headShadow ?? 0.5,
                        directionalDepth: presetData.directionalDepth ?? 0.15,
                        crossBleed: presetData.crossBleed ?? 0,
                        panCurve: presetData.panCurve ?? 2.0,
                        backDepth: presetData.backDepth ?? 0.55,
                        hardPanThreshold: presetData.hardPanThreshold ?? 0.1
                    },
                    dualTrack: {
                        enabled: presetData.dualTrackEnabled ?? false,
                        delay: presetData.dualTrackDelay ?? 500,
                        mode: presetData.dualTrackMode ?? 'synced',
                        variableSpeed: presetData.dualTrackVariableSpeed ?? true,
                        track2Speed: presetData.track2Speed ?? 0.5
                    }
                },
                color: presetData.color || '#6366f1',
                tags: presetData.tags || []
            };

            if (!saveCustomPresetsToStorage(customPresets)) {
                return null;
            }

            // Add to preset order
            const order = getPresetOrder();
            order.push(id);
            savePresetOrder(order);

            console.log(`[PresetManager] Saved custom preset: ${id} - ${presetData.name}`);
            return id;
        } catch (err) {
            if (err.name === 'QuotaExceededError') {
                console.error('[PresetManager] Storage quota exceeded');
            } else {
                console.error('[PresetManager] Failed to save preset:', err);
            }
            return null;
        }
    };

    /**
     * Update an existing custom preset
     * @param {string} id - Preset ID
     * @param {Object} updates - Properties to update
     * @returns {boolean} Success status
     */
    const updateCustomPreset = (id, updates) => {
        try {
            const customPresets = loadCustomPresets();
            if (customPresets[id]) {
                customPresets[id] = {
                    ...customPresets[id],
                    ...updates,
                    lastUsedAt: Date.now()
                };
                const success = saveCustomPresetsToStorage(customPresets);
                if (success) {
                    console.log(`[PresetManager] Updated custom preset: ${id}`);
                }
                return success;
            }
            console.warn(`[PresetManager] Preset not found: ${id}`);
            return false;
        } catch (err) {
            console.error('[PresetManager] Failed to update preset:', err);
            return false;
        }
    };

    /**
     * Delete a custom preset
     * @param {string} id - Preset ID to delete
     * @returns {Object|null} Deleted preset info or null on failure
     */
    const deleteCustomPreset = (id) => {
        try {
            const customPresets = loadCustomPresets();
            const presetName = customPresets[id]?.name || id;

            delete customPresets[id];
            if (!saveCustomPresetsToStorage(customPresets)) {
                return null;
            }

            // Remove from order
            const order = getPresetOrder().filter(pid => pid !== id);
            savePresetOrder(order);

            console.log(`[PresetManager] Deleted custom preset: ${id}`);
            return { id, name: presetName };
        } catch (err) {
            console.error('[PresetManager] Failed to delete preset:', err);
            return null;
        }
    };

    /**
     * Get all presets (defaults + custom) in display order
     * @param {Array} defaultModes - Default mode library array
     * @returns {Array} Ordered array of all presets
     */
    const getAllPresets = (defaultModes = []) => {
        const defaults = defaultModes.map(mode => ({
            id: mode.id,
            name: mode.label,
            description: mode.description,
            preset: mode.preset,
            color: mode.accent,
            isDefault: true,
            createdAt: 0,
            lastUsedAt: 0
        }));

        const custom = Object.values(loadCustomPresets()).map(p => ({
            ...p,
            isDefault: false
        }));

        // Apply user-defined order
        const order = getPresetOrder(defaultModes);
        const allPresets = [...defaults, ...custom];
        const ordered = order
            .map(id => allPresets.find(p => p.id === id))
            .filter(Boolean);

        // Add any new presets not in order (defensive)
        const orderedIds = new Set(ordered.map(p => p.id));
        const missing = allPresets.filter(p => !orderedIds.has(p.id));

        return [...ordered, ...missing];
    };

    /**
     * Get a preset by ID
     * @param {string} id - Preset ID
     * @param {Array} defaultModes - Default mode library array
     * @returns {Object|null} Preset object or null if not found
     */
    const getPresetById = (id, defaultModes = []) => {
        // Check defaults first
        const defaultMode = defaultModes.find(m => m.id === id);
        if (defaultMode) {
            return {
                id: defaultMode.id,
                name: defaultMode.label,
                description: defaultMode.description,
                preset: defaultMode.preset,
                color: defaultMode.accent,
                isDefault: true
            };
        }

        // Check custom presets
        const customPresets = loadCustomPresets();
        if (customPresets[id]) {
            return {
                ...customPresets[id],
                isDefault: false
            };
        }

        return null;
    };

    /**
     * Mark a preset as used (updates lastUsedAt)
     * @param {string} id - Preset ID
     */
    const markPresetUsed = (id) => {
        const customPresets = loadCustomPresets();
        if (customPresets[id]) {
            customPresets[id].lastUsedAt = Date.now();
            saveCustomPresetsToStorage(customPresets);
        }
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
     * Export a preset as JSON
     * @param {string} id - Preset ID
     * @param {Array} defaultModes - Default mode library array
     * @returns {string|null} JSON string or null if not found
     */
    const exportPreset = (id, defaultModes = []) => {
        const preset = getPresetById(id, defaultModes);
        if (!preset) return null;

        return JSON.stringify({
            name: preset.name,
            description: preset.description,
            preset: preset.preset,
            color: preset.color,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        }, null, 2);
    };

    /**
     * Import a preset from JSON
     * @param {string} json - JSON string
     * @returns {string|null} New preset ID or null on failure
     */
    const importPreset = (json) => {
        try {
            const data = JSON.parse(json);
            if (!data.name || !data.preset) {
                console.error('[PresetManager] Invalid preset JSON');
                return null;
            }

            return saveCustomPreset({
                name: data.name + ' (imported)',
                description: data.description || '',
                ...data.preset,
                binauralEnabled: data.preset.binaural?.enabled,
                binauralFreq: data.preset.binaural?.freq,
                noiseType: data.preset.noise?.type,
                noiseVolume: data.preset.noise?.volume,
                itdAmount: data.preset.spatial?.itdAmount,
                headShadow: data.preset.spatial?.headShadow,
                directionalDepth: data.preset.spatial?.directionalDepth,
                crossBleed: data.preset.spatial?.crossBleed,
                panCurve: data.preset.spatial?.panCurve,
                backDepth: data.preset.spatial?.backDepth,
                hardPanThreshold: data.preset.spatial?.hardPanThreshold,
                dualTrackEnabled: data.preset.dualTrack?.enabled,
                dualTrackDelay: data.preset.dualTrack?.delay,
                dualTrackMode: data.preset.dualTrack?.mode,
                dualTrackVariableSpeed: data.preset.dualTrack?.variableSpeed,
                track2Speed: data.preset.dualTrack?.track2Speed,
                color: data.color,
                tags: data.tags || []
            });
        } catch (err) {
            console.error('[PresetManager] Failed to import preset:', err);
            return null;
        }
    };

    return {
        // Storage
        loadCustomPresets,
        saveCustomPreset,
        updateCustomPreset,
        deleteCustomPreset,

        // Queries
        getAllPresets,
        getPresetById,
        getPresetOrder,
        savePresetOrder,

        // Usage tracking
        markPresetUsed,
        formatLastUsed,

        // Import/Export
        exportPreset,
        importPreset,

        // Constants
        PRESETS_KEY,
        ORDER_KEY
    };
});
