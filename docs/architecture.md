# Architecture – mp3_to_8D

**Generated:** 2025-11-12  
**Sources:** `docs/PRD.md`, `docs/create-design.md`, `docs/create-epics-and-stories.md`, `docs/component-inventory.md`, `docs/data-models.md`, `docs/bmm-research-technical-2025-11-11.md`

mp3_to_8D is a browser-native, installable PWA that delivers 8D audio rituals entirely client-side. The architecture merges the stable audio graph from `8d-audio-live-v2.html` with the richer UI/preset stack introduced in v3, while preparing for telemetry, sensor inputs, and offline installability. This document defines the runtime topology, module responsibilities, data contracts, and non-functional enforcement plan so implementation can proceed without ambiguity.

---

## 1. System Overview
- **Deployment model:** Single HTML entry point served over HTTPS (GitHub Pages or equivalent CDN). No backend today; future sync can bolt on APIs without disrupting current flow.
- **Runtime stack:** React 18 (UMD) + ReactDOM + Babel Standalone for JSX, Web Audio API for signal processing, Canvas 2D for visualizer, IndexedDB for telemetry/presets, `localStorage` for lightweight flags, Workbox-generated service worker for offline caching, optional Web Bluetooth/Web Serial adapters for sensors.
- **High-level flow:**
  1. User loads `/index.html`; React bootstraps `AppShell` inside `<div id="root">`.
  2. `AppShell` initializes `AudioGraphProvider`, `PresetEngine`, `SessionLogger`, and `SensorBridge` hooks.
  3. UI components (RitualHero, Playlist, AdvancedControls, InsightsPanel) consume hook state and dispatch actions via context/event bus.
  4. Playback uses `<audio>` element + Web Audio nodes; telemetry/logging writes to IndexedDB; service worker caches shell/assets for offline reuse.

---

## 2. Logical Architecture
```
┌──────────────┐     ┌──────────────────┐
│  App Shell   │────▶│   Hook Contexts   │◀────────────┐
│ (React root) │     │ (Audio, Preset,   │             │
└─────┬────────┘     │  Session, Sensor) │             │
      │              └─────┬─────────────┘             │
      │                    │                           │
      ▼                    ▼                           │
┌──────────────┐   ┌──────────────────┐                │
│ Ritual Hero  │   │ Playlist & Intake│                │
└──────────────┘   └──────────────────┘                │
      │                    │                           │
      ▼                    ▼                           │
┌──────────────┐   ┌──────────────────┐                │
│ Advanced Ctrl│   │ Insights & Sensors│                │
└──────────────┘   └──────────────────┘                │
      │                    │                           │
      ▼                    ▼                           │
┌──────────────────────────────────────────────────────┐
│              Audio Graph Subsystem                   │
│  (AudioContext, Gain, Panners, Oscillators, Noise)   │
└──────────────────────────────────────────────────────┘
      │
      ▼
┌──────────────────┐
│ Telemetry Store  │ (IndexedDB)
└──────────────────┘
```

Hook contexts expose declarative APIs (`play()`, `setPreset(id)`, `logSession(event)`, `connectSensor()`) so UI components remain presentation-focused.

---

## 3. Key Subsystems
### 3.1 App Shell & Routing
- Single-page React app; no client-side routing initially (sections shown via conditional renders). Future expansion can mount simple state-driven routes (e.g., `?view=insights`).
- Global providers wrap the tree: `AudioGraphProvider`, `PresetProvider`, `SessionProvider`, `SensorProvider`, `ThemeProvider`.
- Event bus (simple pub/sub) coordinates cross-cutting events (e.g., `RITUAL_STARTED`, `PLAYBACK_ERROR`, `SENSOR_THRESHOLD`), enabling telemetry and UI toast sync without deep prop drilling.

### 3.2 Audio Graph Subsystem
- **Core nodes:** `AudioContext` → `MediaElementSource` (from `<audio>`) → `GainNode` (master volume) → dual `StereoPannerNode`s representing orbit path → `AnalyserNode` → `Destination`.
- **Enhancers:**
  - `BinauralEngine` spawns two `OscillatorNode`s separated by `binauralFreq`, mixed via dedicated `GainNode` before master.
  - `NoiseEngine` generates buffer nodes for white/pink noise, amplitude-controlled by `noiseVolume`.
  - `MovementScheduler` runs `requestAnimationFrame` loop (preferred over `setInterval`) updating panner positions based on `movementPattern`, `speed`, and sensor overrides.
- **State sync:** `useAudioGraph` hook exposes `loadTrack(track)`, `play()`, `pause()`, `setParameter(parameter, value)`. Parameter updates apply via `AudioParam` automation for smooth transitions (<20 ms requirement from PRD).
- **Visualizer:** `AnalyserNode` feeds `VisualizerCanvas` component via `requestAnimationFrame` data pulls; respects reduced-motion flag by throttling to 10 fps or disabling entirely.

### 3.3 Preset & Mode Engine
- Preset definitions stored in IndexedDB store `presets` with schema `{id, mode, params, tags, lastUsedAt, sensorOverrides}`.
- `PresetProvider` loads defaults (Focus/Calm/Energize) on first run; migrating from legacy `localStorage` entries handled via versioned migration routine.
- `usePresetEngine` returns APIs to `applyPreset(id)`, `savePreset(payload)`, `deletePreset(id)`, `lockPreset(id)`; hooking into audio graph to push parameter sets.
- Mode chips map to `preset.mode`; hero uses `activePresetId` to display context (“Start Focus with Calm Reset”).

### 3.4 Playlist & Intake
- `PlaylistProvider` (could be part of AudioGraph provider) handles drag/drop, file parsing, URL validation, and safe persistence to IndexedDB `playlist` store.
- Local files: keep `File` object in memory for current session; persisted record stores metadata only (name, type, size, lastPlayedAt, presetId).
- Remote URLs: sanitized input stored as `originalUrl`; streaming attempts run HEAD/GET request with timeout; errors bubbled up using structured codes.
- Playlist entries include `presetId` to auto-restore effect stack per track.

### 3.5 Session Logging & Insights
- `SessionLogger` listens for `PLAYBACK_STARTED`, `FOCUS_RITUAL_COMPLETED`, `SESSION_ENDED`, `EMOJI_SUBMITTED` events.
- IndexedDB `sessions` store schema: `{id, profileId, presetId, trackId, startTs, endTs, timeToFocusMs, emoji, notes, hrAvg, hrDelta, sensorEvents[]}`.
- Derived stats (time-to-focus trend, felt-better %) computed via lightweight selectors when Insights panel renders; results cached in memory to avoid repeated scans.
- Export stub serializes filtered sessions to JSON (download link). CSV transformation done client-side when requested.

### 3.6 Sensor Bridge
- Feature-flagged module exposing `connectBluetoothSensor()`, `connectSerialSensor()`, `disconnectSensor(id)`, `simulateSensor()` for dev/test mode.
- Uses Web Bluetooth GATT for Heart Rate Service (0x180D) and Web Serial for custom boards (configurable baud rate).
- `SensorRuleEngine` monitors data stream, triggering recommendations when thresholds exceed user-defined ranges (e.g., HR > 85 bpm for 3 min). Emits `SENSOR_THRESHOLD_EXCEEDED` event consumed by presets + UI to show suggestions.
- Consent records stored in IndexedDB `sensor_consent` store; includes `deviceId`, `type`, `grantedAt`, `scopes`. Clearing profile purges these records.

### 3.7 Service Worker & Offline Layer
- Workbox CLI generates service worker with `precacheManifest` for shell assets (HTML, CSS, JS, icons) and runtime caching for fonts/images.
- Audio files only cached when user opts in (due to size/licensing). Use Workbox `registerRoute` with custom handler that checks consent flag.
- Offline fallback page (inline template) surfaces when user navigates without cached assets; playlist/presets still loaded from IndexedDB.

---

## 4. Data Persistence & Synchronization
| Store | Technology | Purpose | Notes |
|-------|------------|---------|-------|
| `localStorage` | Key-value | Quick flags (theme, reduced-motion override, ritual skip preference) | Synchronous reads on startup only. |
| `IndexedDB.presets` | IndexedDB | Default/custom preset definitions | Versioned migrations; includes `mode` index. |
| `IndexedDB.playlist` | IndexedDB | Track metadata (no blobs) | `originalUrl` kept for future proxy integration. |
| `IndexedDB.sessions` | IndexedDB | Session telemetry & emoji feedback | Bound to profileId; cap at 500 entries per profile with pruning job. |
| `IndexedDB.sensor_consent` | IndexedDB | Stores granted device info + scopes | Cleared when user revokes consent. |
| `IndexedDB.settings` (optional) | IndexedDB | Profile data, thresholds, streaks | Prepares for multi-profile support. |

**Sync model:** Entirely local. Export/import flows (JSON) planned for sharing across devices until backend exists. Schema definitions documented in `docs/data-models.md`; architecture extends them with sensors/telemetry fields.

---

## 5. Non-Functional Requirements Mapping
| NFR | Enforcement Strategy |
|-----|----------------------|
| **Performance** (<2.5 s load, <20 ms parameter latency) | Preload critical scripts, lazy-load non-essential components (Insights, Sensors). Use `requestAnimationFrame` for panner updates; apply `AudioParam.setTargetAtTime` for smooth automation. Measure via Web Vitals + internal logging. |
| **Offline reliability** | Service worker precache + IndexedDB persistence; offline banner informs users when streaming disabled. Automated Playwright test simulates offline drag/drop playback. |
| **Accessibility (≥95)** | Shared token system controlling contrast, font sizes; Pa11y/axe in CI; roving tabindex for mode chips; ARIA labels for ritual states and emoji inputs. |
| **Privacy & consent** | SensorBridge enforces explicit opt-in, stores consent records, offers “Forget device”; telemetry never leaves device; export requires manual action. |
| **Security** | Serve over HTTPS; restrict eval usage (Babel already required, but lock down CSP as feasible); sanitize URLs before playback; guard against XSS in notes via escaping. |
| **Maintainability** | Hook-based modular design; each subsystem isolated; event bus centralizes cross-cutting logic; ADR-001 captured in research doc guides future choices. |

---

## 6. Risks & Mitigations
| Risk | Description | Mitigation |
|------|-------------|-----------|
| Audio regressions during merge | Integrating v2/v3 graphs may reintroduce dropouts | Maintain automated audio regression harness (E2 story S2.3); keep v2 graph as reference implementation. |
| Sensor API fragmentation | BLE/Web Serial support varies by browser | Capability detection + graceful UI states; provide simulator data; document supported devices. |
| IndexedDB growth/ corruption | Local logs could exceed limits or become inconsistent | Implement pruning job (max 500 sessions/profile) and backup/export flow; wrap IDB calls with retry + error toasts. |
| Service worker cache staleness | Users stuck on outdated assets | Versioned precache manifest; show “Update available” toast when SW finds new assets; allow manual refresh. |
| Unhandled streaming errors | Third-party URLs fail due to CORS/licensing | Structured error codes + user messaging; optionally integrate proxy service later; provide sample audio for testing. |

---

## 7. Future Evolution
- **Bundler migration:** Introduce Vite + Preact/React bundle once component count or performance demands it. Maintain same module boundaries to minimize rewrite.
- **Profile sync:** When backend introduced, reuse IndexedDB schema as client cache; add sync adapters without touching UI.
- **MediaPipe integration:** Optional module that emits pseudo-sensor events from webcam cues; reuses SensorBridge interfaces.
- **Cloud telemetry:** Potential encrypted sync to share session logs with therapists; architecture already isolates logging so destination swap is straightforward.

---

## 8. Implementation Plan & Ownership
| Workstream | Leads | Dependencies |
|------------|-------|--------------|
| Audio Graph consolidation | Frontend + Audio engineer | Legacy v2 script reference |
| Preset/Session storage | Frontend + Data | IndexedDB schema + migration tooling |
| Sensor adapters | Frontend + Hardware | Browser capability detection, BLE devices |
| Service worker & install | Frontend + DevOps | Workbox config, icon set |
| Accessibility & testing | Frontend + QA | Pa11y/axe, Playwright harness |

Sequence aligns with epics E1–E6: finish UI shell (E1), harden audio (E2), build presets (E3), telemetry (E4), sensors (E5), PWA polish (E6).

---

## 9. Open Questions
1. Do we need a lightweight state machine for rituals vs playback, or will hook-based flags suffice? (Impacts future refactors.)
2. Should IndexedDB use `idb-keyval` or similar helper library to reduce boilerplate? (Trade-off vs pure web APIs.)
3. What minimum sensor list should we certify (Polar H10, Muse S, custom Arduino)? Determine QA devices before E5.  
4. How will multi-profile UX map to storage? One database per profile, or shared stores with profileId index?  
5. Does the debug panel ship in production or remain hidden behind feature flag `?debug=true`?  
6. Are there compliance considerations (HIPAA/FERPA) once therapist exports exist? If yes, need encryption strategy.  
7. When bundler migration occurs, should we adopt TypeScript to better model audio/sensor types?

Track answers through `solutioning-gate-check` and future ADRs (e.g., ADR-002 for bundler decision, ADR-003 for sensor implementations).
