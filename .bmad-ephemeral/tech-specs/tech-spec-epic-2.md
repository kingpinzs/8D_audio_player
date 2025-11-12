# Epic Tech Context – E2 Audio Intake & Graph Hardening

**Generated:** 2025-11-11 22:03:11Z
**Sources:** docs/PRD.md, docs/create-epics-and-stories.md, docs/create-design.md, docs/architecture.md

## 1. Epic Overview
- **Epic:** E2 – Audio Intake & Graph Hardening
- **Outcome:** Stable drag/drop + streaming pipeline with <200 ms control latency and no v3 regressions.
- **KPIs:** 0 audio regressions at release, ≥95% success rate for valid MP3/WAV intake, analyzer uptime 100% during playback.

## 2. PRD Alignment
## Product Context & Classification
- **Project type:** Web / PWA front-end (monolithic repo, React 18 UMD + Web Audio API)
- **Domain:** Wellness & learning support (non-clinical, privacy-sensitive)
- **Planning track:** BMad Method (full PRD + architecture → handoff to create-epics-and-stories)
- **Deployment:** Static hosting (GitHub Pages or similar CDN) with Workbox-generated service worker
- **Key constraint:** No server-side components; all integrations must run within the browser sandbox

## 3. Design Hooks
### 4.2 Add Audio (Local + Remote)
1. Tap `Add Audio`. Choose `Files` (drag/drop + picker) or `Stream` tab.  
2. Local: highlight drop zone; show file chips with MIME + duration; unsupported files get inline error referencing Development Guide.  
3. Remote: paste URL → async HEAD/GET check; success adds entry with source badge; failure lists reason (CORS, auth, offline).  
4. Playlist entries display preset badge + last-played timestamp; reorder handles accessible via keyboard (aria-grabbed states).  
5. Offline disables Stream tab with tooltip “Re-enable when online”.

### 4.3

## 4. Architecture Touchpoints
### 3.4 Playlist & Intake
- `PlaylistProvider` (could be part of AudioGraph provider) handles drag/drop, file parsing, URL validation, and safe persistence to IndexedDB `playlist` store.
- Local files: keep `File` object in memory for current session; persisted record stores metadata only (name, type, size, lastPlayedAt, presetId).
- Remote URLs: sanitized input stored as `originalUrl`; streaming attempts run HEAD/GET request with timeout; errors bubbled up using structured codes.
- Playlist entries include `presetId` to auto-restore effect stack per track.

### 3.5

### 3.2 Audio Graph Subsystem
- **Core nodes:** `AudioContext` → `MediaElementSource` (from `<audio>`) → `GainNode` (master volume) → dual `StereoPannerNode`s representing orbit path → `AnalyserNode` → `Destination`.
- **Enhancers:**
  - `BinauralEngine` spawns two `OscillatorNode`s separated by `binauralFreq`, mixed via dedicated `GainNode` before master.
  - `NoiseEngine` generates buffer nodes for white/pink noise, amplitude-controlled by `noiseVolume`.
  - `MovementScheduler` runs `requestAnimationFrame` loop (preferred over `setInterval`) updating panner positions based on `movementPattern`, `speed`, and sensor overrides.
- **State sync:** `useAudioGraph` hook exposes `loadTrack(track)`, `play()`, `pause()`, `setParameter(parameter, value)`. Parameter updates apply via `AudioParam` automation for smooth transitions (<20 ms requirement from PRD).
- **Visualizer:** `AnalyserNode` feeds `VisualizerCanvas` component via `requestAnimationFrame` data pulls; respects reduced-motion flag by throttling to 10 fps or disabling entirely.

### 3.3

## 5. Stories & Acceptance
### S2.1 – Drag/Drop & File Picker Refactor
- Acceptance: Drop zone handles multiple files, shows progress, rejects unsupported MIME with toast; local tracks playable offline for session; helper tests cover metadata parsing.
   - DoD: Manual smoke vs. v2 baseline + Jest helper tests.

### S2.2 – Streaming URL Validation & Messaging
- Acceptance: URL input validates HEAD/GET; CORS or licensing blocks show actionable guidance (e.g., "Pandora needs proxy"); fallback retains other playlist items.
   - DoD: Test matrix includes valid MP3, blocked stream, unreachable URL.

### S2.3 – Audio Graph Regression Harness
- Acceptance: Graph uses MediaElementSource → Gain → dual Panners → Analyser, plus binaural/noise hooks; control changes apply <20 ms; analyzer renders 60 fps; automated smoke compares v2 vs unified build outputs.
   - DoD: Scripted comparison log stored under `/tests/audio-regression.md` or similar.

---

## 6. Open Questions
- Define automated audio regression harness location/owner.
- Document streaming support decision table.
- Clarify analyzer performance measurements in tooling.
