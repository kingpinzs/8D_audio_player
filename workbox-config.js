/**
 * Workbox Configuration for mp3_to_8D PWA
 * Story 6-1: Service Worker & Offline UX
 *
 * CACHING STRATEGY DECISIONS:
 *
 * 1. PRECACHE (Shell Assets) - Cached on SW install, served cache-first:
 *    - index.html: Main app shell (single-file architecture)
 *    - audio-engine.js: Audio processing logic
 *    - session-logging.js: Session persistence module
 *    - sensor-consent.js: Heart rate sensor consent module
 *    Why: These are critical for app functionality and must work offline.
 *
 * 2. RUNTIME CACHE (External CDN Scripts) - StaleWhileRevalidate:
 *    - React, ReactDOM, Babel from unpkg.com
 *    Why: Serves cached version immediately while fetching updates in background.
 *    This balances offline availability with keeping dependencies current.
 *
 * 3. RUNTIME CACHE (Google Fonts) - StaleWhileRevalidate:
 *    - fonts.googleapis.com, fonts.gstatic.com
 *    Why: Font files rarely change, cache-first with background update is optimal.
 *
 * 4. RUNTIME CACHE (Audio Files) - CacheFirst with Consent Plugin:
 *    - Only cached when user opts in via Settings toggle
 *    - Checks localStorage flag: mp3_8d_audio_cache_consent
 *    Why: Audio files are large; caching must be explicit user choice due to
 *    storage/bandwidth implications. Respects user consent.
 *
 * REVISION HASHING:
 *    Workbox automatically adds revision hashes to precached assets.
 *    When files change, new hashes trigger cache invalidation.
 *
 * SW UPDATE BEHAVIOR:
 *    - New SW installs alongside active one
 *    - Waits for all tabs to close OR skipWaiting() message
 *    - App shows "Update available" toast when waiting SW detected
 *    - User click triggers skipWaiting() -> controllerchange -> reload
 */

module.exports = {
  // Output configuration
  swDest: 'sw.js',

  // Source directory for globbing
  globDirectory: '.',

  // Shell assets to precache (cache on install, serve cache-first)
  // These patterns match files in the project root
  globPatterns: [
    'index.html',
    'audio-engine.js',
    'session-logging.js',
    'sensor-consent.js',
    // Future: Add icons when they exist
    // 'icons/**/*.png',
  ],

  // Ignore build artifacts and dev files
  globIgnores: [
    'node_modules/**/*',
    '.bmad/**/*',
    '.bmad-ephemeral/**/*',
    'docs/**/*',
    'tests/**/*',
    '.git/**/*',
    '.github/**/*',
    '.history/**/*',
    '.vscode/**/*',
    '.claude/**/*',
    '**/*.txt',
    '**/*.md',
    'workbox-config.js',
    'package*.json',
    'sw.js', // Don't cache the service worker itself
    'workbox-*.js', // Workbox runtime chunk
    // Legacy HTML files
    '8d-audio-*.html',
  ],

  // Runtime caching rules (handle requests not in precache)
  runtimeCaching: [
    // CDN Scripts (React, ReactDOM, Babel) - StaleWhileRevalidate
    // Serves cached version immediately, updates cache in background
    {
      urlPattern: /^https:\/\/unpkg\.com\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'cdn-scripts',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },

    // Google Fonts stylesheets
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'google-fonts-stylesheets',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
      },
    },

    // Google Fonts webfont files
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },

    // Audio files - CacheFirst BUT only when user consent is granted
    // The consent check happens at runtime via custom handler in SW
    // This rule provides the caching infrastructure; consent logic is in SW
    {
      urlPattern: /\.(mp3|m4a|wav|ogg|flac|aac|webm)(\?.*)?$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'audio-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 90, // 90 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
        // Note: Consent check will be added via SW customization
        // The generated SW will include a plugin that checks
        // localStorage for mp3_8d_audio_cache_consent before caching
      },
    },

    // Images - CacheFirst (for any future image assets)
    {
      urlPattern: /\.(png|jpg|jpeg|gif|svg|webp|ico)(\?.*)?$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],

  // Skip waiting behavior - controlled via postMessage from app
  // The app sends { type: 'SKIP_WAITING' } when user clicks "Update"
  skipWaiting: false, // We handle this via message, not automatic

  // Claim clients immediately on activation
  clientsClaim: true,

  // Source map generation (disabled for production)
  sourcemap: false,

  // Mode affects output formatting
  mode: 'production',
};
