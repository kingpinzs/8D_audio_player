# Epic Technical Specification: PWA Reliability & Accessibility

Date: 2025-11-26
Author: Jeremy
Epic ID: 6
Status: Draft

---

## Overview

Epic 6 finalizes the mp3_to_8D PWA by implementing the service worker infrastructure, manifest configuration, and accessibility observability suite required to achieve production-grade installability and offline reliability. Building on the completed E1-E5 foundation (unified player shell, hardened audio graph, preset engine, session logging, and sensor adapters), this epic transforms the application from a functional web app into a fully installable PWA that meets Lighthouse PWA score >=90 and Accessibility score >=95.

The three stories (S6.1 Service Worker & Offline UX, S6.2 Manifest & Install Flow, S6.3 Accessibility & Observability Suite) deliver the trust layer that allows neurodivergent users to rely on mp3_to_8D for focus sessions without network dependency or accessibility barriers.

## Objectives and Scope

**In Scope:**
- Workbox-powered service worker with precaching strategy for shell assets
- Optional user-consented audio file caching for offline replay
- Offline fallback UI with clear messaging about limitations
- Web app manifest with icons, shortcuts, categories, and orientation
- In-app install prompt guiding Add-to-Home-Screen flow
- Install attempt/success telemetry integration with E4 session logging
- Pa11y/axe accessibility CI integration
- OS preference sync for reduced-motion and high-contrast
- Debug panel exposing audio graph status, sensor connectivity, and logging health
- Automated Lighthouse PWA/Accessibility checks in CI pipeline

**Out of Scope:**
- Backend sync or cloud storage (deferred to future)
- Push notifications (no backend to trigger them)
- Background sync for session data (requires backend)
- Service worker update strategies beyond basic "update available" toast

## System Architecture Alignment

This epic extends the architecture defined in `docs/architecture.md` Section 3.7 (Service Worker & Offline Layer):

- **Service Worker:** Workbox CLI generates the SW with `precacheManifest` for shell assets (HTML, CSS, JS, icons) and runtime caching for fonts/images
- **Audio Caching:** Uses Workbox `registerRoute` with custom handler checking consent flag from `IndexedDB.settings`
- **Offline Fallback:** Inline template surfaces when navigation fails; playlist/presets remain accessible from IndexedDB
- **Integration Points:**
  - `ThemeProvider` (E1) for high-contrast/reduced-motion OS sync
  - `SessionLogger` (E4) for install telemetry events
  - `SensorBridge` (E5) for debug panel connectivity status
  - `AudioGraphProvider` (E2) for debug panel graph status

## Detailed Design

### Services and Modules

| Module | Responsibilities | Inputs | Outputs | Owner |
|--------|-----------------|--------|---------|-------|
| `ServiceWorkerManager` | Registers SW, handles updates, manages cache strategy | App lifecycle events | SW registration status, update available flag | Frontend |
| `WorkboxConfig` | Defines precache manifest and runtime caching rules | Build assets list | SW script with caching logic | DevOps/Frontend |
| `OfflineFallback` | Renders offline-safe UI when network unavailable | Network status | Offline banner, limited mode UI | Frontend |
| `AudioCacheConsent` | Manages user consent for audio file caching | User consent actions | Cache permission status | Frontend |
| `ManifestProvider` | Serves web app manifest with icons, shortcuts, theme | Build config | manifest.json | Frontend |
| `InstallPromptManager` | Captures `beforeinstallprompt`, shows custom install UI | Browser install event | Install prompt modal, telemetry | Frontend |
| `AccessibilityObserver` | Syncs OS preferences (reduced-motion, high-contrast) | Media query changes | Theme token updates | Frontend |
| `DebugPanel` | Exposes internal state for troubleshooting | All providers | Debug UI overlay | Frontend |
| `A11yTestRunner` | Pa11y/axe integration for CI accessibility checks | Page URL | Accessibility report | QA/CI |

### Data Models and Contracts

#### Service Worker Cache Strategy
```javascript
// workbox-config.js
{
  precacheManifest: [
    { url: '/index.html', revision: '{{build_hash}}' },
    { url: '/styles.css', revision: '{{build_hash}}' },
    { url: '/app.js', revision: '{{build_hash}}' },
    { url: '/icons/*.png', revision: '{{build_hash}}' },
    // Fonts and critical images
  ],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com/,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'google-fonts-stylesheets' }
    },
    {
      urlPattern: /\.(?:mp3|wav|ogg)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'audio-cache',
        plugins: [
          { cacheWillUpdate: async ({ request }) => audioCacheConsentGranted() }
        ],
        expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 }
      }
    }
  ]
}
```

#### Install Telemetry Schema (E4 Integration)
```javascript
// Extension to SessionLogger for install tracking
{
  eventType: "INSTALL_PROMPT_SHOWN" | "INSTALL_ACCEPTED" | "INSTALL_DISMISSED" | "APP_INSTALLED",
  timestamp: number,
  userAgent: string,       // For browser analytics
  platform: string,        // "desktop" | "mobile"
  installOutcome: string | null  // Final state if tracked
}
```

#### Web App Manifest
```json
{
  "name": "mp3_to_8D - Focus Audio",
  "short_name": "8D Audio",
  "description": "Spatial audio for focus and calm",
  "start_url": "/index.html?source=pwa",
  "display": "standalone",
  "orientation": "any",
  "theme_color": "#1a1a2e",
  "background_color": "#1a1a2e",
  "categories": ["health", "wellness", "music"],
  "icons": [
    { "src": "./icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "shortcuts": [
    { "name": "Start Focus", "url": "/index.html?mode=focus", "icon": "/icons/focus.png" },
    { "name": "Start Calm", "url": "/index.html?mode=calm", "icon": "/icons/calm.png" }
  ]
}
```

#### Accessibility Settings Schema (localStorage)
```javascript
{
  reducedMotion: boolean,      // Synced with prefers-reduced-motion
  highContrast: boolean,       // Synced with prefers-contrast
  darkMode: boolean,           // Synced with prefers-color-scheme
  largeText: boolean,          // User preference, not OS-synced
  userOverride: {              // When user explicitly sets vs OS default
    reducedMotion: boolean | null,
    highContrast: boolean | null,
    darkMode: boolean | null
  }
}
```

### APIs and Interfaces

#### ServiceWorkerManager Hook API
```javascript
const {
  // State
  swStatus,              // "unsupported" | "installing" | "waiting" | "active" | "error"
  updateAvailable,       // boolean
  isOffline,             // boolean
  cacheStatus,           // { shell: boolean, audio: boolean, audioCount: number }

  // Actions
  registerServiceWorker, // () => Promise<void>
  checkForUpdates,       // () => Promise<boolean>
  applyUpdate,           // () => Promise<void> - triggers page reload
  clearAudioCache,       // () => Promise<void>

  // Audio caching
  audioCacheConsent,     // boolean
  setAudioCacheConsent,  // (consent: boolean) => void
} = useServiceWorker();
```

#### InstallPromptManager Hook API
```javascript
const {
  // State
  canInstall,            // boolean - beforeinstallprompt captured
  isInstalled,           // boolean - display-mode: standalone detected
  installPromptDeferred, // BeforeInstallPromptEvent | null

  // Actions
  showInstallPrompt,     // () => Promise<"accepted" | "dismissed">
  dismissInstallPrompt,  // () => void

  // Telemetry
  logInstallEvent,       // (eventType: string) => void
} = useInstallPrompt();
```

#### AccessibilityObserver Hook API
```javascript
const {
  // State (reactive to OS changes)
  prefersReducedMotion,  // boolean
  prefersHighContrast,   // boolean
  prefersDarkMode,       // boolean

  // User overrides
  userSettings,          // { reducedMotion, highContrast, darkMode, largeText }

  // Actions
  setUserPreference,     // (key: string, value: boolean) => void
  resetToOSDefaults,     // () => void

  // Computed
  effectiveSettings,     // Merged OS + user overrides
} = useAccessibilityObserver();
```

#### DebugPanel API
```javascript
const {
  // Toggles
  isDebugPanelOpen,      // boolean
  toggleDebugPanel,      // () => void

  // Data getters (read from providers)
  getAudioGraphStatus,   // () => { nodes: [], isPlaying: boolean, latency: number }
  getSensorStatus,       // () => { connected: boolean, device: string, currentHR: number }
  getSessionStatus,      // () => { activeSession: boolean, logCount: number, errors: [] }
  getServiceWorkerStatus,// () => { status: string, cacheSize: string, updateAvailable: boolean }

  // Export
  copyDiagnostics,       // () => void - copies JSON to clipboard
} = useDebugPanel();
```

#### Error Codes
| Code | Description | User Message |
|------|-------------|--------------|
| `SW_NOT_SUPPORTED` | Service Worker API unavailable | "Offline mode not available in this browser." |
| `SW_REGISTER_FAILED` | SW registration threw error | "Could not enable offline mode. Try refreshing." |
| `SW_UPDATE_FAILED` | Update check or apply failed | "Update failed. Please refresh the page." |
| `CACHE_QUOTA_EXCEEDED` | Storage quota reached | "Storage full. Clear some cached audio to continue." |
| `MANIFEST_MISSING` | manifest.json not found | "Install not available - app configuration issue." |
| `INSTALL_DISMISSED` | User dismissed install prompt | (No message - silent tracking) |

### Workflows and Sequencing

#### Story 6-1: Service Worker Registration & Offline Flow
```
1. App loads → Check navigator.serviceWorker support
2. If supported:
   a. Register /sw.js with Workbox-generated script
   b. SW installs → precaches shell assets
   c. SW activates → runtime caching enabled
3. If offline detected (navigator.onLine === false):
   a. Show offline banner: "You're offline. Cached content available."
   b. Disable streaming URL input
   c. Enable cached audio playback
4. SW update cycle:
   a. On page load → SW checks for updates
   b. If update found → swStatus = "waiting", show toast: "Update available"
   c. User clicks "Update" → applyUpdate() → skipWaiting() → reload
5. Audio caching (optional):
   a. User enables "Cache audio for offline" toggle
   b. Workbox handler includes audio files in cache
   c. Cached tracks show offline icon in playlist
```

#### Story 6-2: Manifest & Install Flow
```
1. App loads → Browser parses manifest.json
2. Browser criteria met (HTTPS, SW, manifest) → fires beforeinstallprompt
3. InstallPromptManager captures event, sets canInstall = true
4. Show install prompt in hero section: "Install for quick access"
5. User clicks "Install":
   a. Call installPromptDeferred.prompt()
   b. Wait for userChoice
   c. Log INSTALL_ACCEPTED or INSTALL_DISMISSED to telemetry
6. Post-install:
   a. Detect display-mode: standalone
   b. Set isInstalled = true
   c. Hide install prompt permanently
   d. Log APP_INSTALLED event
7. Shortcut URLs (?mode=focus, ?mode=calm):
   a. On launch → parse query params
   b. Auto-select preset matching mode
   c. Optionally auto-start ritual
```

#### Story 6-3: Accessibility & Observability Flow
```
1. App loads → AccessibilityObserver initializes
2. Query media preferences:
   - matchMedia('(prefers-reduced-motion: reduce)')
   - matchMedia('(prefers-contrast: more)')
   - matchMedia('(prefers-color-scheme: dark)')
3. Apply to ThemeProvider tokens
4. Listen for changes → update tokens reactively
5. User overrides:
   a. User toggles high-contrast in Settings
   b. Store userOverride.highContrast = true
   c. effectiveSettings prefers user value over OS
6. Debug Panel (enabled via ?debug=true):
   a. Render floating panel with tabs
   b. Audio tab: graph nodes, latency, analyzer status
   c. Sensor tab: connection, HR, consent list
   d. Session tab: active session, log count, errors
   e. PWA tab: SW status, cache size, update state
   f. "Copy Diagnostics" button exports JSON
7. CI Accessibility:
   a. Pa11y/axe runs against localhost build
   b. Fails CI if issues > 0 at level "error"
   c. Warnings logged but don't block
```

## Non-Functional Requirements

### Performance

| Metric | Target | Source | Measurement Method |
|--------|--------|--------|-------------------|
| Initial load time | <2.5s on 4G | PRD NFR | Lighthouse Performance score, Web Vitals LCP |
| Service Worker install | <3s | Architecture 3.7 | `performance.mark()` from register to active |
| Cache-first audio playback | <500ms | E2 baseline | Time from play click to audio start (cached) |
| Offline page load | <1s | PWA best practice | Lighthouse offline audit |
| Update check latency | <2s | UX requirement | Time from load to "update available" toast |
| Lighthouse PWA score | >=90 | PRD/Epic KPI | Lighthouse CI in pipeline |

**PRD Reference:** "Initial load <2.5 s on 4G/low-end laptop" and "Lighthouse PWA score >= 90"

### Security

- **HTTPS Required:** Service worker registration requires secure context; enforced by browser
- **CSP Headers:** Content Security Policy restricts inline scripts (Babel already required, minimize eval exposure)
- **Cache Integrity:** Precached assets use revision hashes to prevent stale/tampered content
- **No Credential Storage:** SW does not cache authenticated requests; no sensitive data in cache
- **Audio Consent:** User must explicitly opt-in to audio caching; no automatic media storage
- **Debug Panel Protection:** Debug panel only accessible via `?debug=true` query param; no sensitive data exposed

**Architecture Reference:** Section 5 specifies "Serve over HTTPS; restrict eval usage; sanitize URLs before playback"

### Reliability/Availability

- **Graceful Degradation:** App fully functional without SW; features progressively enhance when available
- **Offline Resilience:** Precached shell loads offline; IndexedDB presets/playlist accessible
- **SW Update Recovery:** Failed updates don't break existing cache; fallback to current version
- **Network Detection:** `navigator.onLine` + `online`/`offline` events trigger UI state changes
- **Cache Quota Management:** Monitor storage usage; warn user before quota exceeded
- **Browser Compatibility:**
  - Chrome 79+: Full PWA support
  - Edge 79+: Full PWA support
  - Firefox 44+: SW support, limited install prompt
  - Safari 11.1+: SW support, no beforeinstallprompt (manual A2HS instructions)

**PRD Reference:** "Service worker caches shell/assets; audio fetched once remains playable offline when licensing permits"

### Observability

| Signal | Type | Purpose |
|--------|------|---------|
| `[SW] Registered: {scope}` | Console log | Confirm SW activation |
| `[SW] Cache populated: {count} assets` | Console log | Verify precache success |
| `[SW] Update available` | Console log + toast | Alert user to new version |
| `[SW] Offline mode active` | Console log + banner | Confirm offline detection |
| `sw_registration_success` | Telemetry event | Track SW adoption rate |
| `install_prompt_shown` | Telemetry event | Track install funnel |
| `install_accepted` / `install_dismissed` | Telemetry event | Track install conversion |
| Debug panel "PWA" tab | UI component | Show SW status, cache size, update state |
| Lighthouse CI report | CI artifact | Track PWA/A11y scores over time |

**Architecture Reference:** Section 5 specifies "Console logging + optional debug panel (when enabled) summarizing audio graph status, sensor connectivity, and session logging health"

## Dependencies and Integrations

### Runtime Dependencies

| Dependency | Version | Purpose | Notes |
|------------|---------|---------|-------|
| React 18 UMD | 18.2.0 | UI framework, hooks | Already in use from E1 |
| Workbox | 7.x (latest) | Service worker generation, caching strategies | **NEW** - CLI tool for build |
| Service Worker API | Browser native | Offline caching, background tasks | Chrome 79+, Firefox 44+, Safari 11.1+ |
| Cache API | Browser native | Programmatic cache management | Used by Workbox internally |
| IndexedDB | Browser native | Persistent storage for settings | Already in use from E3/E4 |
| localStorage | Browser native | Quick flags (a11y settings) | Already in use from E1 |
| Web App Manifest | Browser standard | PWA installability | JSON file served at /manifest.json |

### Dev Dependencies (package.json additions)

| Dependency | Version | Purpose |
|------------|---------|---------|
| `workbox-cli` | ^7.0.0 | Generate service worker with precache manifest |
| `workbox-window` | ^7.0.0 | Client-side SW registration and update handling |
| `pa11y` | ^7.0.0 | Accessibility testing CLI |
| `axe-core` | ^4.8.0 | Accessibility testing engine |
| `lighthouse` | ^11.0.0 | PWA/Performance auditing |

### Internal Dependencies (from prior epics)

| Dependency | Source Epic | Integration Point |
|------------|-------------|-------------------|
| `ThemeProvider` | E1 | Receives OS preference updates from AccessibilityObserver |
| `AudioGraphProvider` | E2 | Provides status for debug panel Audio tab |
| `PresetProvider` | E3 | Presets persist in IndexedDB, accessible offline |
| `SessionLogger` | E4 | Logs install telemetry events |
| `SensorBridge` | E5 | Provides status for debug panel Sensor tab |
| Toast system | E2 | Displays offline/update notifications |
| `setA11yAnnouncement` | E1 | Screen reader announcements for SW state changes |

### External Integration Points

| Integration | Type | Notes |
|-------------|------|-------|
| GitHub Pages | Hosting | Static files with HTTPS (required for SW) |
| Google Fonts | CDN | Runtime cached via StaleWhileRevalidate |
| Browser DevTools | Debug | Application tab shows SW status, cache contents |
| Lighthouse CI | Testing | GitHub Action or local CLI for PWA audits |

### Build Pipeline Integration

```
Build Process:
1. Compile/bundle app assets (existing)
2. Run workbox-cli generateSW → produces /sw.js
3. Copy manifest.json to output
4. Run pa11y against localhost preview
5. Run lighthouse --preset=pwa against localhost
6. Deploy to GitHub Pages
```

## Acceptance Criteria (Authoritative)

### AC6.1: Service Worker & Offline UX

1. **AC6.1.1:** Service worker precaches shell assets (HTML, CSS, JS, icons) on first visit
2. **AC6.1.2:** Offline reload succeeds after first visit, loading cached shell
3. **AC6.1.3:** Offline banner displays when `navigator.onLine === false`
4. **AC6.1.4:** Streaming URL input disabled when offline; local/cached tracks remain playable
5. **AC6.1.5:** "Update available" toast appears when new SW version detected
6. **AC6.1.6:** Clicking "Update" applies new SW and reloads page
7. **AC6.1.7:** Optional audio caching requires explicit user consent toggle
8. **AC6.1.8:** Cached tracks display offline indicator icon in playlist
9. **AC6.1.9:** Workbox config documented in repository

### AC6.2: Manifest & Install Flow

1. **AC6.2.1:** manifest.json includes name, icons (192, 512, maskable), theme color, categories
2. **AC6.2.2:** `beforeinstallprompt` event captured; in-app install prompt shown when `canInstall === true`
3. **AC6.2.3:** Install prompt includes clear call-to-action: "Install for quick access"
4. **AC6.2.4:** Accepting install triggers native browser install flow
5. **AC6.2.5:** Install outcome (accepted/dismissed) logged to E4 telemetry
6. **AC6.2.6:** Post-install: `display-mode: standalone` detected; install prompt hidden permanently
7. **AC6.2.7:** Manifest shortcuts launch app with `?mode=focus` or `?mode=calm` query params
8. **AC6.2.8:** Safari users see manual A2HS instructions (no `beforeinstallprompt` support)
9. **AC6.2.9:** Verified on Chrome desktop, Chrome Android, Firefox desktop

### AC6.3: Accessibility & Observability Suite

1. **AC6.3.1:** Pa11y/axe runs in CI; build fails if accessibility errors > 0
2. **AC6.3.2:** Lighthouse Accessibility score >= 95 in CI report
3. **AC6.3.3:** Lighthouse PWA score >= 90 in CI report
4. **AC6.3.4:** `prefers-reduced-motion` OS setting syncs to ThemeProvider on load
5. **AC6.3.5:** `prefers-contrast` (high-contrast) OS setting syncs to ThemeProvider on load
6. **AC6.3.6:** `prefers-color-scheme` (dark mode) OS setting syncs to ThemeProvider on load
7. **AC6.3.7:** User can override OS preferences via Settings toggles; overrides persist
8. **AC6.3.8:** Debug panel accessible via `?debug=true` query parameter
9. **AC6.3.9:** Debug panel shows tabs: Audio, Sensor, Session, PWA
10. **AC6.3.10:** "Copy Diagnostics" button exports JSON to clipboard with structured error codes

## Traceability Mapping

| AC | Spec Section | Component(s)/API(s) | Test Idea |
|----|-------------|---------------------|-----------|
| AC6.1.1 | Data Models: Cache Strategy | WorkboxConfig, SW precache | Verify precacheManifest includes shell assets |
| AC6.1.2 | Workflows: 6-1 | ServiceWorkerManager | Disconnect network; reload; verify app loads |
| AC6.1.3 | APIs: useServiceWorker | OfflineFallback, isOffline state | Set navigator.onLine = false; verify banner |
| AC6.1.4 | Workflows: 6-1 | OfflineFallback, URL input | Offline + type URL; verify input disabled |
| AC6.1.5 | APIs: useServiceWorker | ServiceWorkerManager, Toast | Mock SW update; verify toast shown |
| AC6.1.6 | APIs: applyUpdate() | ServiceWorkerManager | Click update; verify skipWaiting + reload |
| AC6.1.7 | APIs: setAudioCacheConsent | AudioCacheConsent | Verify toggle exists; verify consent required |
| AC6.1.8 | Workflows: 6-1 | Playlist component | Cache audio; verify offline icon renders |
| AC6.1.9 | Dependencies | workbox-config.js | File exists; generates valid SW |
| AC6.2.1 | Data Models: Manifest | manifest.json | Parse and verify all required fields |
| AC6.2.2 | APIs: useInstallPrompt | InstallPromptManager | Mock beforeinstallprompt; verify canInstall |
| AC6.2.3 | Workflows: 6-2 | Hero section UI | Verify CTA text matches spec |
| AC6.2.4 | APIs: showInstallPrompt() | InstallPromptManager | Call prompt(); verify native flow triggered |
| AC6.2.5 | Data Models: Telemetry | SessionLogger, logInstallEvent | Accept/dismiss; verify event logged |
| AC6.2.6 | APIs: isInstalled | InstallPromptManager | Mock standalone mode; verify prompt hidden |
| AC6.2.7 | Data Models: Manifest | Manifest shortcuts, PresetProvider | Launch with ?mode=focus; verify preset selected |
| AC6.2.8 | NFR: Reliability | Safari detection logic | Test in Safari; verify instructions shown |
| AC6.2.9 | NFR: Reliability | Cross-browser testing | Manual smoke on listed browsers |
| AC6.3.1 | Dependencies | A11yTestRunner, pa11y | Run CI; verify failure on a11y error |
| AC6.3.2 | NFR: Performance | Lighthouse CI | Run audit; verify score >= 95 |
| AC6.3.3 | NFR: Performance | Lighthouse CI | Run audit; verify score >= 90 |
| AC6.3.4 | APIs: useAccessibilityObserver | AccessibilityObserver, ThemeProvider | Set OS reduced-motion; verify token sync |
| AC6.3.5 | APIs: useAccessibilityObserver | AccessibilityObserver, ThemeProvider | Set OS high-contrast; verify token sync |
| AC6.3.6 | APIs: useAccessibilityObserver | AccessibilityObserver, ThemeProvider | Set OS dark mode; verify token sync |
| AC6.3.7 | Data Models: A11y Settings | Settings UI, localStorage | Override preference; reload; verify persists |
| AC6.3.8 | APIs: useDebugPanel | DebugPanel | Navigate with ?debug=true; verify panel |
| AC6.3.9 | Services: DebugPanel | DebugPanel tabs | Verify all 4 tabs render with content |
| AC6.3.10 | APIs: copyDiagnostics() | DebugPanel | Click copy; verify clipboard contains JSON |

## Risks, Assumptions, Open Questions

### Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **R1:** Service worker cache staleness | Medium | Medium | Versioned precache manifest; "Update available" toast; allow manual refresh |
| **R2:** Safari PWA limitations | Medium | High | Detect Safari; show manual A2HS instructions; document known limitations |
| **R3:** Storage quota exceeded | Medium | Low | Monitor usage; warn before limit; provide "Clear cache" action |
| **R4:** Workbox version conflicts | Low | Low | Pin Workbox version; test SW generation in CI |
| **R5:** Lighthouse score regression | Medium | Medium | Track scores over time in CI; alert on drops > 5 points |
| **R6:** Debug panel exposes sensitive info | Low | Low | Only accessible via query param; no PII in diagnostics |

### Assumptions

1. **A1:** GitHub Pages continues serving over HTTPS (required for SW registration)
2. **A2:** Target browsers (Chrome 79+, Edge 79+, Firefox 44+, Safari 11.1+) maintain current SW/PWA APIs
3. **A3:** E1-E5 providers (`ThemeProvider`, `SessionLogger`, `SensorBridge`, `AudioGraphProvider`) are stable and expose required state
4. **A4:** Workbox 7.x maintains backwards compatibility with current caching strategies
5. **A5:** Pa11y/axe rule sets remain stable; no major breaking changes expected
6. **A6:** Users have sufficient device storage for shell assets (~2MB) plus optional audio cache

### Open Questions

| Question | Owner | Target Date | Impact if Unresolved |
|----------|-------|-------------|---------------------|
| **Q1:** Should debug panel ship in production or remain behind feature flag? | Product | Before S6.3 | UX decision affects build config |
| **Q2:** Maximum audio cache size limit (50 files currently)? | Product | S6.1 | May need user-configurable limit |
| **Q3:** Custom icon set needed or use placeholder icons for MVP? | Design | Before S6.2 | Blocks manifest finalization |
| **Q4:** Should Lighthouse CI run on every PR or only main merges? | DevOps | S6.3 | Affects CI duration and cost |

## Test Strategy Summary

### Unit Tests (Node.js + Jest)

- `ServiceWorkerManager.test.js`: Registration lifecycle, update detection, offline state
- `InstallPromptManager.test.js`: beforeinstallprompt capture, prompt flow, telemetry
- `AccessibilityObserver.test.js`: Media query sync, user override persistence
- `DebugPanel.test.js`: State aggregation, copyDiagnostics output format

### Integration Tests

- SW registration → precache → offline reload cycle
- Install flow → telemetry → standalone detection
- OS preference change → ThemeProvider token update
- Debug panel → provider state aggregation

### Manual Tests

| Scenario | Browser | Expected |
|----------|---------|----------|
| First visit → SW install | Chrome | Console shows "Registered", assets cached |
| Offline reload | Chrome | App loads from cache, offline banner shown |
| Update available flow | Chrome | Toast appears, click updates and reloads |
| Install prompt | Chrome Desktop | In-app prompt shown, native flow triggered |
| Install prompt | Chrome Android | In-app prompt shown, A2HS completes |
| Install prompt | Firefox | In-app prompt shown (limited support) |
| Install prompt | Safari | Manual A2HS instructions shown |
| Shortcut launch | Chrome | ?mode=focus auto-selects Focus preset |
| OS dark mode toggle | Any | App theme updates reactively |
| Debug panel | Any | ?debug=true shows panel with 4 tabs |

### CI/CD Tests

| Test | Tool | Threshold | Failure Action |
|------|------|-----------|----------------|
| Accessibility audit | Pa11y + axe-core | 0 errors | Block merge |
| Lighthouse PWA | lighthouse-ci | Score >= 90 | Block merge |
| Lighthouse Accessibility | lighthouse-ci | Score >= 95 | Block merge |
| SW generation | workbox-cli | Valid SW output | Block deploy |
| Manifest validation | JSON schema | All required fields | Block deploy |

### Performance Tests

- Measure SW install time (target: <3s)
- Measure offline page load (target: <1s)
- Measure cache-first audio playback (target: <500ms)
- Track Lighthouse scores over time (dashboard)

---

**Tech Spec Status:** Complete
**Ready for Story Drafting:** Yes
**Next Step:** Run `create-story` workflow for Story 6-1
