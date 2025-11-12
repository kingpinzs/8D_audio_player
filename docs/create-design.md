# Design Specification – mp3_to_8D

**Generated:** 2025-11-12  
**Sources:** `docs/PRD.md`, `docs/create-epics-and-stories.md`, `docs/architecture.md`, `docs/component-inventory.md`, `docs/bmm-brainstorming-session-2025-11-11.md`, `docs/bmm-research-technical-2025-11-11.md`

This document turns PRD v2.0 and the new epic backlog into concrete experience guidance for the unified mp3_to_8D player (single HTML/PWA entry point that merges v2 audio stability with v3 UI advancements). It covers goals, layouts, flows, motion, accessibility, telemetry, and open questions ahead of implementation.

---

## 1. Experience Pillars & Guardrails
- **Ritual-first single surface** – There is one installable page where Focus/Calm/Energize rituals are the hero CTA; no more v2/v3 fork (`docs/PRD.md:57-70`).
- **Two-tap calm** – Users reach audio in ≤2 taps/10 seconds, with breathing ritual easing them in and reduced-motion fallbacks available (`docs/PRD.md:43-54`, `docs/create-epics-and-stories.md:25-46`).
- **Adaptive empathy** – Presets remember what worked, suggest tweaks when sensors notice stress, and always explain why (`docs/PRD.md:87-144`).
- **Offline trust** – Drag/drop, presets, rituals, and insights must work offline; online-only features degrade gracefully (`docs/PRD.md:150-170`).
- **Proof of progress** – Emojis + insights dashboard make time-to-focus trends visible after five sessions without sharing data externally (`docs/PRD.md:150-210`).

These guardrails shape copy, IA, QA checklists, and future iterations.

---

## 2. Personas & Priority Journeys
| Persona | Scenario | Must-Haves |
|---------|----------|------------|
| **Builder (neurodivergent engineer)** | Late-night coding on desktop; wants Focus ritual + fine control over movement/binaural settings. | Ritual hero always visible, quick preset tweak, sensor opt-in panel, debug info. |
| **Parent + Child** | Tablet regulation session where calm must start instantly and feel safe. | Two-tap Calm mode, chunky tap targets, high-contrast toggle within reach, emoji journaling prompt. |
| **Coach/Therapist** | Reviewing local insights with family, optionally exporting data. | Session timeline, time-to-focus trend cards, export stub, privacy assurances. |

Journey coverage: Start Ritual, Add Audio, Customize Preset, Review Insights, Attach Sensor, Install PWA.

---

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

## 4. Key Interaction Flows
### 4.1 Start Focus/Calm Ritual
1. Default mode chip selected on load (Focus). User can switch chips (keyboard arrow/space).  
2. Press `Start Focus`: 4-2-4 breathing animation (ring pulses + textual cadence) begins; hero copy reads “Breathe In…”.  
3. After 20 s (or when skipped), selected preset auto-applies; if playlist empty, show Add Audio modal instead of silence.  
4. Session timer + visualizer start; hero state changes to “In Focus Stack”.  
5. Reduced-motion preference stored locally swaps animation for gradient fade + textual countdown.

### 4.2 Add Audio (Local + Remote)
1. Tap `Add Audio`. Choose `Files` (drag/drop + picker) or `Stream` tab.  
2. Local: highlight drop zone; show file chips with MIME + duration; unsupported files get inline error referencing Development Guide.  
3. Remote: paste URL → async HEAD/GET check; success adds entry with source badge; failure lists reason (CORS, auth, offline).  
4. Playlist entries display preset badge + last-played timestamp; reorder handles accessible via keyboard (aria-grabbed states).  
5. Offline disables Stream tab with tooltip “Re-enable when online”.

### 4.3 Customize & Save Preset
1. Open Advanced Controls; adjusting sliders updates audio instantly (<20 ms). Drawer shows “Unsaved changes” pill.  
2. `Save Preset` button opens modal (name, emoji tag, default mode, optional note).  
3. Preset appears in carousel and is set as default for active mode; hero copy updates (e.g., “Calm Reset ready”).  
4. Playlist items store preset id; returning session auto-applies and announces via toast.

### 4.4 Session Close & Journaling
1. When Stop pressed or track ends, summary sheet slides up.  
2. Emoji buttons (😁 🙂 😐 🙁) capture felt-better state; optional note text field.  
3. Submission writes to IndexedDB, updates insights cards in-place, and shows success toast.  
4. Provide `Export JSON` stub and `Share later` reminder to align with data privacy commitments.

### 4.5 Sensor Onboarding & Recommendations
1. Sensor card displays “Add Heart-Rate Sensor.” Tapping launches capability check.  
2. Supported browsers show BLE device picker; unsupported show message + docs link.  
3. Once connected, HR chip sits under hero; threshold rules (HR > value for 3 min) trigger Calm suggestion toast and highlight relevant preset card.  
4. Users can Lock preset to prevent auto adjustments; sensor panel explains what changed and logs event in insights.  
5. “Forget device” removes permissions + local handles per privacy guardrail.

### 4.6 Install & Offline UX
1. Install CTA surfaces when browser supports PWA; clicking opens instructions (desktop + mobile).  
2. After install, hero mentions “Installed” status; service worker ensures offline reload.  
3. When offline, show banner near playlist with quick tips (local playback OK, streaming disabled).

---

## 5. Visual, Motion & Audio Feedback System
- **Color Tokens:** Base gradient `#5B5FFF → #65FFD2` (Focus), Calm variant `#3AAFBF → #F2E6A7`, Energize `#FF5FB7 → #FFA24C`. Neutral backgrounds `#0F1435` for drawers.  
- **Typography:** Inter (32/24/20/16/14 scale). Numbers (HR, timers) use tabular Lato or Inter Tight for readability.  
- **Breathing Ring:** 4-step keyframe (expand, hold, contract, hold); respects reduced-motion by switching to opacity pulse.  
- **Visualizer:** Retro bar visual using analyser data; disabled in reduced-motion or low-power mode.  
- **Toasts:** Right-side stack near playlist; color-coded success/info/warn; auto-dismiss after 4 s with manual close.  
- **Sensor Indicators:** Chip states (Disconnected gray, Connecting amber animated dots, Connected teal, Suggestion magenta).  
- **Sound Design:** Soft chime when ritual completes (muted if reduced-motion). h/t PRD emphasis on calm delight.

---

## 6. Architecture & State Hooks (Design → Dev Contracts)
- **Hooks:** `useAudioGraph`, `usePresetEngine`, `useSessionLogger`, `useSensorBridge`. Each returns state + commands so UI remains declarative (`docs/architecture.md:5-52`).
- **Data Contracts:**
  - `Preset`: `{id, mode, name, sliders, sensorOverrides, lastUsedAt}`.
  - `Session`: `{id, profileId, presetId, trackId, startTs, endTs, timeToFocusMs, emoji, hrAvg, hrDelta, notes}`.  
  - `SensorConsent`: `{type, deviceName, grantedAt, lastUsed}`.
- **Event Bus:** Lightweight dispatcher (`events.ts`) emits `PLAYBACK_STARTED`, `RITUAL_SKIPPED`, `SENSOR_TRIGGERED`, etc., so telemetry stays decoupled and Playwright smoke can listen.
- **Error Surfaces:** Provide structured error codes (e.g., `STREAM_CORS_BLOCKED`, `BLE_UNSUPPORTED`) reused by debug panel.

---

## 7. Accessibility & Inclusive Design
- Tap targets ≥48 px; roving focus for mode chips; Enter/Space activates; arrow keys cycle modes (per E1 story requirements).  
- Screen reader labels for Start button include current mode and preset (“Start Focus with Calm Reset”). Ritual timer announces remaining seconds every 5 s unless reduced verbosity enabled.  
- High-contrast theme flips gradients to solid backgrounds with 7:1 ratios; icons gain outlines to maintain affordance.  
- Reduced-motion toggle synced with OS preference and manual switch; disables orbit/visualizer animations, shortens breathing cycle, and silences chime.  
- Emoji feedback includes text labels & shortcuts (1–4 keys).  
- Sensor states described in plain language (“Heart-rate sensor disconnected; reconnect?”) to avoid icon-only cues.  
- Color usage double encoded with text & icons for color-blind safety.

---

## 8. Telemetry, Feedback & Empty States
- **Empty hero:** “Add a track or paste a stream to get started” with Add Audio CTA; Start button triggers same.  
- **Playlist empty:** Dashed drop zone + sample links to free MP3 library; offline note clarifies streaming requirements.  
- **Insights empty:** Skeleton cards showing how metrics will look after 5 sessions; CTA “Log a session to unlock insights.”  
- **Sensor empty:** Illustration with text “Optional heart-rate or serial devices can adapt presets—connect when ready.”  
- **Feedback hooks:** “Report audio glitch” link captures console log + config (stored locally) to share manually.  
- **Telemetry visuals:** Time-to-focus chart uses bar/line hybrid; felt-better % uses donut; preset effectiveness uses chips showing counts.  
- **Error loops:** When a stream fails, highlight entry with red border + retry icon; failures auto-dismiss after fix.

---

## 9. Implementation Considerations & Open Questions
1. **Profile management:** Need UX for multiple profiles (parent/child) without backend—likely avatars stored locally with export/import.  
2. **Preset sharing:** Should presets be exportable as JSON? Design includes share icon placeholder but requires scope confirmation.  
3. **Audio rights:** Streaming tab currently accepts direct MP3 URLs; add tooltip clarifying Pandora/Spotify limitations until proxy deals exist.  
4. **Sensor UX for kids:** Explore alternative visualization (calm mascot vs HR number) for child profiles.  
5. **Offline storage limits:** IndexedDB cap set to ~500 sessions—design retention management UI (auto-archive + manual purge).  
6. **Bundler migration:** Once Vite/Preact introduced, ensure design tokens/components survive module split; include note in dev handoff.  
7. **Debug mode:** Determine whether debug panel is visible to end users or behind shortcut (e.g., `Shift+D`).

Track these questions through `solutioning-gate-check` and early implementation spikes.
