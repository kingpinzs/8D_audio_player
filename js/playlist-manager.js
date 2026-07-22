/**
 * 8D Audio Player - Playlist Manager
 * Playlist storage, loading, and utility functions
 * Extracted from index.html for modularization
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.PlaylistManager = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const STORAGE_KEY = 'mpe_8d_saved_playlists';
    const DEMO_MANIFEST_PATH = 'tracks/tracks.json';

    /**
     * Get all saved playlists from localStorage
     * @returns {Array} Array of saved playlists
     */
    const getSavedPlaylists = () => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch (err) {
            console.error('[PlaylistManager] Failed to load saved playlists:', err);
            return [];
        }
    };

    /**
     * Save playlists to localStorage
     * @param {Array} playlists - Array of playlists to save
     * @returns {boolean} Success status
     */
    const savePlaylists = (playlists) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
            return true;
        } catch (err) {
            console.error('[PlaylistManager] Failed to save playlists:', err);
            return false;
        }
    };

    /**
     * Create a playlist data object for storage
     * @param {string} name - Playlist name
     * @param {Array} tracks - Array of track objects
     * @returns {Object} Playlist data object
     */
    const createPlaylistData = (name, tracks) => {
        const playlistData = tracks.map(track => ({
            name: track.name,
            source: track.source,
            url: track.url || null,
            isLocal: track.source === 'local'
        }));

        return {
            id: Date.now(),
            name: name.trim(),
            tracks: playlistData,
            trackCount: tracks.length,
            createdAt: new Date().toISOString()
        };
    };

    /**
     * Save current playlist to storage
     * @param {string} name - Playlist name
     * @param {Array} tracks - Current playlist tracks
     * @returns {Object|null} Saved playlist object or null on failure
     */
    const savePlaylist = (name, tracks) => {
        if (!name.trim() || tracks.length === 0) {
            return null;
        }

        const playlists = getSavedPlaylists();
        const newPlaylist = createPlaylistData(name, tracks);
        playlists.push(newPlaylist);

        if (savePlaylists(playlists)) {
            return newPlaylist;
        }
        return null;
    };

    /**
     * Delete a playlist by ID
     * @param {number} playlistId - Playlist ID to delete
     * @returns {boolean} Success status
     */
    const deletePlaylist = (playlistId) => {
        const playlists = getSavedPlaylists();
        const filtered = playlists.filter(p => p.id !== playlistId);
        return savePlaylists(filtered);
    };

    /**
     * Restore tracks from a saved playlist
     * @param {Object} savedPlaylist - Saved playlist object
     * @returns {Object} Restored tracks and metadata
     */
    const restorePlaylist = (savedPlaylist) => {
        const restoredTracks = savedPlaylist.tracks
            .filter(track => !track.isLocal && track.url)
            .map((track, index) => ({
                id: Date.now() + index,
                name: track.name,
                source: track.source,
                url: track.url,
                file: null
            }));

        const localCount = savedPlaylist.tracks.filter(t => t.isLocal).length;

        return {
            tracks: restoredTracks,
            localCount,
            totalCount: savedPlaylist.tracks.length,
            name: savedPlaylist.name
        };
    };

    /**
     * Load demo playlist from tracks manifest
     * @returns {Promise<Object>} Demo playlist data
     */
    const loadDemoManifest = async () => {
        const response = await fetch(DEMO_MANIFEST_PATH);
        if (!response.ok) {
            throw new Error(`Failed to load tracks manifest: ${response.status}`);
        }
        return response.json();
    };

    /**
     * Create track objects from demo manifest
     * @param {Object} manifest - Demo manifest object
     * @returns {Array} Array of track objects
     */
    const createDemoTracks = (manifest) => {
        return manifest.tracks.map((track, index) => ({
            id: Date.now() + index,
            name: track.name,
            source: 'demo',
            url: `tracks/${encodeURIComponent(track.file)}`,
            file: null
        }));
    };

    /**
     * Create a track object from a File
     * @param {File} file - File object
     * @param {string} blobUrl - Blob URL for the file
     * @returns {Object} Track object
     */
    const createTrackFromFile = (file, blobUrl) => {
        return {
            id: Date.now() + Math.random(),
            name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
            source: 'local',
            url: blobUrl,
            file: file
        };
    };

    /**
     * Create a track object from a URL
     * @param {string} url - Stream URL
     * @param {string} name - Optional track name
     * @returns {Object} Track object
     */
    const createTrackFromUrl = (url, name = null) => {
        const trackName = name || url.split('/').pop().replace(/\.[^/.]+$/, '') || 'Stream';
        return {
            id: Date.now(),
            name: trackName,
            source: 'stream',
            url: url,
            file: null
        };
    };

    /**
     * Shuffle an array (Fisher-Yates algorithm)
     * @param {Array} array - Array to shuffle
     * @returns {Array} Shuffled array (new array, original unchanged)
     */
    const shuffleArray = (array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    /**
     * Filter tracks by search query
     * @param {Array} tracks - Array of tracks
     * @param {string} query - Search query
     * @returns {Array} Filtered tracks
     */
    const filterTracks = (tracks, query) => {
        if (!query.trim()) return tracks;
        const lower = query.toLowerCase();
        return tracks.filter(track =>
            track.name.toLowerCase().includes(lower)
        );
    };

    /**
     * Sort tracks by property
     * @param {Array} tracks - Array of tracks
     * @param {string} by - Property to sort by ('name', 'source', 'id')
     * @param {boolean} ascending - Sort direction
     * @returns {Array} Sorted tracks (new array)
     */
    const sortTracks = (tracks, by = 'name', ascending = true) => {
        const sorted = [...tracks].sort((a, b) => {
            const aVal = a[by] || '';
            const bVal = b[by] || '';
            if (typeof aVal === 'string') {
                return aVal.localeCompare(bVal);
            }
            return aVal - bVal;
        });
        return ascending ? sorted : sorted.reverse();
    };

    /**
     * Get track by index with wraparound
     * @param {Array} tracks - Array of tracks
     * @param {number} index - Current index
     * @param {number} offset - Offset from current (1 for next, -1 for previous)
     * @returns {number} New index
     */
    const getTrackIndex = (tracks, index, offset) => {
        if (tracks.length === 0) return -1;
        const newIndex = index + offset;
        if (newIndex < 0) return tracks.length - 1;
        if (newIndex >= tracks.length) return 0;
        return newIndex;
    };

    /**
     * Remove track from playlist
     * @param {Array} tracks - Array of tracks
     * @param {number} indexToRemove - Index to remove
     * @returns {Array} New tracks array
     */
    const removeTrack = (tracks, indexToRemove) => {
        return tracks.filter((_, index) => index !== indexToRemove);
    };

    /**
     * Reorder tracks (move track from one position to another)
     * @param {Array} tracks - Array of tracks
     * @param {number} fromIndex - Source index
     * @param {number} toIndex - Destination index
     * @returns {Array} Reordered tracks array
     */
    const reorderTracks = (tracks, fromIndex, toIndex) => {
        const result = [...tracks];
        const [removed] = result.splice(fromIndex, 1);
        result.splice(toIndex, 0, removed);
        return result;
    };

    return {
        // Storage
        getSavedPlaylists,
        savePlaylists,
        savePlaylist,
        deletePlaylist,
        restorePlaylist,

        // Demo playlist
        loadDemoManifest,
        createDemoTracks,

        // Track creation
        createTrackFromFile,
        createTrackFromUrl,
        createPlaylistData,

        // Operations
        shuffleArray,
        filterTracks,
        sortTracks,
        getTrackIndex,
        removeTrack,
        reorderTracks,

        // Constants
        STORAGE_KEY,
        DEMO_MANIFEST_PATH
    };
});
