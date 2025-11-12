# Epic Tech Context – E1 Unified Ritual Player

**Generated:** 2025-11-11 22:02:22Z
**Sources:** docs/PRD.md, docs/create-epics-and-stories.md, docs/create-design.md, docs/architecture.md

## 1. Epic Overview

- **Epic:** E1 – Unified Ritual Player Experience
- **Outcome:** Single responsive page that launches Focus/Calm/Energize rituals in ≤2 taps and maintains ≥95 accessibility score.
- **KPIs:** P50 load-to-audio <25 s, ≥90% keyboard coverage, ritual completion rate >70%.

## 2. PRD Alignment

## Product Magic – "The Companion That Knows What Sound You Need"
The app remembers what helped last time, senses how you are doing right now, and serves the ideal "focus stack" with two taps. Rituals, presets, and adaptive overlays create a moment of delight that makes users feel supported rather than overwhelmed.

---
## Scope
### MVP (Commit Now)
1. **Single unified HTML/PWA entry point** combining v2 stability + v3 UI.
2. **Robust audio pipeline** with rotation, binaural, noise overlays, and analyzer visualization functioning identically across desktop/mobile.
3. **Drag/drop + URL intake** with detailed error messaging for unsupported streams.
4. **Preset management** – Focus/Calm/Energize quick modes + advanced sliders + ability to save custom stacks.
5. **Focus ritual** – 4-2-4 breathing animation that launches automatically before playback.
6. **Telemetry scaffolding** – IndexedDB schema for session logs (track, preset, duration, emoji, optional HR data).
7. **Accessibility + personalization toggles** (dark mode, reduced motion, high contrast) surfaced near hero controls.
## Experience Principles & Primary Journeys
- **Calm first, controls second:** Show large Start buttons and rituals before exposing advanced sliders.
- **Two-tap commitment:** Every session should be launchable via Start → confirm mode.
- **Trust through feedback:** Visualize orbit, show sensor deltas, and confirm when adjustments occur.
- **Privacy in plain language:** Always explain why data is being collected and how to opt out.

## 3. Design & Interaction Hooks

## 3. Information Architecture & Layout System
1. **Persistent Header (top)** – Brand, Install CTA, theme toggles (dark/high-contrast), profile selector, quick link to debug panel.
2. **Mode Tabs + Ritual Hero (top center)** – Focus/Calm/Energize chips (roving tab index) sit above Start buttons and breathing ring. Skip + reduced-motion toggles nest here to avoid hunting.
3. **Preset Carousel & Advanced Drawer** – Recommended cards (per mode) plus last-used preset; “Advanced Controls” opens desktop side drawer / mobile bottom sheet with sliders, binaural toggles, and lock indicators when sensors control parameters.
4. **Playback Cluster** – Now Playing card, transport controls, progress bar, visualizer canvas, plus Drag/Drop + URL tabs for intake. Playlist sits directly beneath with reorder handles.
5. **Insights + Sensors Column** – Time-to-focus card, felt-better percentage sparkline, streak chip, sensor status tile (connect/disconnect, HR value, recommendations). On small screens these collapse into accordion modules after playlist.

**Responsive grid**
- ≥1280px: three columns (Ritual/Preset | Playback | Insights/Sensors).
- 768–1279px: two columns (Ritual/Preset stacked over Playback; Insights collapses beneath).
- ≤767px: single column with sticky mode tabs & Start button occupying first viewport; insights accessible via “Progress” accordion.

---

## 4.

### 4.1 Start Focus/Calm Ritual
1. Default mode chip selected on load (Focus). User can switch chips (keyboard arrow/space).  
2. Press `Start Focus`: 4-2-4 breathing animation (ring pulses + textual cadence) begins; hero copy reads “Breathe In…”.  
3. After 20 s (or when skipped), selected preset auto-applies; if playlist empty, show Add Audio modal instead of silence.  
4. Session timer + visualizer start; hero state changes to “In Focus Stack”.  
5. Reduced-motion preference stored locally swaps animation for gradient fade + textual countdown.

### 4.2

## 4. Architecture Touchpoints

### 3.1 App Shell & Routing
- Single-page React app; no client-side routing initially (sections shown via conditional renders). Future expansion can mount simple state-driven routes (e.g., `?view=insights`).
- Global providers wrap the tree: `AudioGraphProvider`, `PresetProvider`, `SessionProvider`, `SensorProvider`, `ThemeProvider`.
- Event bus (simple pub/sub) coordinates cross-cutting events (e.g., `RITUAL_STARTED`, `PLAYBACK_ERROR`, `SENSOR_THRESHOLD`), enabling telemetry and UI toast sync without deep prop drilling.

### 3.2

### 3.2 Audio Graph Subsystem
- **Core nodes:** `AudioContext` → `MediaElementSource` (from `<audio>`) → `GainNode` (master volume) → dual `StereoPannerNode`s representing orbit path → `AnalyserNode` → `Destination`.
- **Enhancers:**
  - `BinauralEngine` spawns two `OscillatorNode`s separated by `binauralFreq`, mixed via dedicated `GainNode` before master.
  - `NoiseEngine` generates buffer nodes for white/pink noise, amplitude-controlled by `noiseVolume`.
  - `MovementScheduler` runs `requestAnimationFrame` loop (preferred over `setInterval`) updating panner positions based on `movementPattern`, `speed`, and sensor overrides.
- **State sync:** `useAudioGraph` hook exposes `loadTrack(track)`, `play()`, `pause()`, `setParameter(parameter, value)`. Parameter updates apply via `AudioParam` automation for smooth transitions (<20 ms requirement from PRD).
- **Visualizer:** `AnalyserNode` feeds `VisualizerCanvas` component via `requestAnimationFrame` data pulls; respects reduced-motion flag by throttling to 10 fps or disabling entirely.

### 3.3

## 5. Stories & Acceptance Criteria

### S1.1 – Consolidated Shell & Navigation
*As a* neurodivergent user *I want* one responsive page with Focus/Calm/Energize tabs and Now Playing card *so that* I never guess which build to open.
   - Acceptance: Single HTML entry renders identical layout on desktop/mobile; tab switches update hero state without reload; tap targets ≥48 px and tab order follows logical reading order.
   - DoD: Chrome + Firefox mobile manual smoke, axe accessibility ≥95.

### S1.2 – Breathing Ritual & Auto-Start
*As a* user *I want* a 4-2-4 breathing animation before audio *so that* I ease into focus without fiddling with controls.
   - Acceptance: Tapping Start Focus triggers 20 s animation followed by automatic playback; skip action persists preference; reduced-motion users see static countdown.
   - DoD: Media-query tests plus localStorage flag verified.

### S1.3 – Personalization & Accessibility Toggles
*As a* caregiver *I need* high-contrast, dark mode, reduced-motion toggles within reach *so that* the UI stays sensory-safe.
   - Acceptance: Toggles visible within hero section, persist per profile, and announce state to assistive tech; high-contrast theme passes WCAG AA; keyboard shortcuts documented.
   - DoD: Pa11y report attached; QA sign-off on desktop + phone.

---

## 6. Open Questions
- Confirm MVP scope for telemetry vs ritual shell.
- Decide on streaming support matrix UI.
- Lock accessibility testing tooling (Pa11y/axe commands).
