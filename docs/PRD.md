# mp3_to_8D – Product Requirements Document

**Author:** Jeremy  
**Date:** 2025-11-12  
**Version:** 2.0

---

## Executive Summary
mp3_to_8D is a browser-native, installable PWA that unifies multiple experimental 8D audio prototypes into a single, production-ready experience. It helps neurodivergent people (ADHD, autism, seasonal affective challenges) slip into the right focus or calm state by pairing drag-and-drop media playback with adaptive spatial audio, ritual onboarding, and privacy-first journaling. The new build must merge the stability of `8d-audio-live-v2.html` with the modern UI of `v3`, fix current audio regressions, and lay the groundwork for biometric adaptation without introducing a backend.

### Product Magic – "The Companion That Knows What Sound You Need"
The app remembers what helped last time, senses how you are doing right now, and serves the ideal "focus stack" with two taps. Rituals, presets, and adaptive overlays create a moment of delight that makes users feel supported rather than overwhelmed.

---

## Product Context & Classification
- **Project type:** Web / PWA front-end (monolithic repo, React 18 UMD + Web Audio API)
- **Domain:** Wellness & learning support (non-clinical, privacy-sensitive)
- **Planning track:** BMad Method (full PRD + architecture → handoff to create-epics-and-stories)
- **Deployment:** Static hosting (GitHub Pages or similar CDN) with Workbox-generated service worker
- **Key constraint:** No server-side components; all integrations must run within the browser sandbox

## Target Users & Pain Points
1. **Solo neurodivergent professionals** – need a frictionless way to reach focus/flow without tweaking dozens of controls each time.
2. **Parents/Caregivers** – need quick modes for kids, trustable safety, and simple summaries to share with therapists or teachers.
3. **Audio tinkerers** – want deep control over binaural beats, noise textures, and movement patterns without breaking the base audio graph.

Pain points today: inconsistent UI across versions, audio bugs in v3 that break trust, no single launchpad, and zero visibility into whether a session "worked."

## Current State & Key Insights
- `docs/index.md` and architecture notes confirm there is no backend; everything is inline HTML with React + Babel at runtime.
- v2 has the most stable audio graph; v3 adds advanced controls but introduced playback bugs and inconsistent presets.
- Brainstorming + research workflows highlight demand for rituals, biometric-aware presets, autofilled journaling, and accessibility guardrails for ADHD/autism sensory profiles.
- Streaming support is limited to direct MP3 URLs; Pandora/Spotify will require either authenticated APIs or curated proxy streams in the future.

## Vision & Differentiators
1. **State-first onboarding** – Start with "How do you want to feel?" not "Which track?"
2. **Adaptive overlays** – Sensor inputs (optional) adjust presets in real time while keeping data local.
3. **Auto journaling** – Sessions log themselves, surfacing insights without demanding user effort.
4. **Accessibility-first UI** – Large tap targets, reduced-motion/high-contrast toggles, and calm visuals designed for neurodivergent comfort.

## Success Criteria
- **Time-to-focus:** ≥70% of focus sessions show reduced heart rate (or user-marked calm) within 5 minutes.
- **Activation:** 80% of users can start playback within 2 taps/10 seconds from launch.
- **Retention proxy:** ≥5 sessions per week per profile, with ≥60% marked "felt better" in emoji check-ins.
- **Stability:** 0 known audio dropouts/regressions compared to v2 baseline during regression testing.
- **Installability:** Lighthouse PWA score ≥ 90 on Chrome + Firefox; offline replay works for cached assets.

### Guardrails
- Preserve offline-first behavior; never require sign-in for core flows.
- Avoid sensor creep—no biometric collection without explicit opt-in per device.
- Streaming integrations must fail gracefully and keep users in local/offline mode when APIs block access.

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

### Beta / Growth (Next)
- Web Bluetooth + Web Serial adapters for heart-rate straps or custom boards with fallback messaging per browser.
- Opt-in webcam cues (MediaPipe) to detect overstimulation on desktop.
- Family profiles + caregiver governance (parent-curated presets, kid-safe defaults).
- Insights dashboard summarizing time-to-focus, felt-better rate, and recommended tweaks per profile.
- Curated streaming channels or proxy integration that respect licensing.

### Deferred / Out of Scope (for now)
- Cloud sync or therapist portals (requires backend + compliance work).
- Marketplace/community preset sharing.
- Paid content licensing or deep integrations with Spotify/Pandora/YouTube until contracts exist.

## Assumptions & Dependencies
- Modern Chromium/Firefox browsers; Safari supported but without Web Bluetooth until Apple exposes APIs.
- Users provide their own audio files, direct MP3 URLs, or BLE devices; the app does not procure hardware.
- GitHub Pages (or similar) will continue hosting static assets with HTTPS to satisfy Web Audio unlock requirements.
- Future bundler migration (Vite/Preact) will occur post-MVP; initial release still ships as HTML + CDN scripts.

---

## Experience Principles & Primary Journeys
- **Calm first, controls second:** Show large Start buttons and rituals before exposing advanced sliders.
- **Two-tap commitment:** Every session should be launchable via Start → confirm mode.
- **Trust through feedback:** Visualize orbit, show sensor deltas, and confirm when adjustments occur.
- **Privacy in plain language:** Always explain why data is being collected and how to opt out.

### Journey 1 – Quick Focus Launch (mobile)
1. User opens PWA → sees Focus/Calm/Energize cards.
2. Tap "Start Focus" → breathing halo animation begins (with reduced-motion fallback).
3. Audio starts automatically with last-used preset; user optionally drags files or selects playlist entry.
4. End-of-session emoji prompt records sentiment; dashboard confirms logging success.

### Journey 2 – Advanced Audio Tinkering (desktop)
1. Tinkerer toggles Advanced Controls drawer/sliders to tweak movement pattern, binaural freq, noise types.
2. Adjustments render instantly (<20 ms) while analyzer shows effect; user saves as new preset.
3. Preset appears in carousel with description and magic tag (e.g., "Deep Orbit").

### Journey 3 – Parent/Caregiver Review
1. Parent opens Insights tab → sees child profiles plus weekly time-to-focus trends.
2. Tapping a session reveals track, preset, HR deltas (if available), and emoji feedback.
3. Parent exports a PDF/markdown summary (local generation) or shares within household via QR.

---

## Functional Requirements
### FR1 – Unified Player Shell
- Single HTML entry point served as installable PWA with manifest + Workbox service worker.
- Acceptance: Visiting `/index.html` on desktop or mobile loads the same React app; Add-to-Home-Screen surfaces on Chrome + Firefox; offline reload works after first visit.

### FR2 – Audio Graph & Spatial Engine
- Reuse v2 audio nodes (MediaElementSource → Gain → Panner → analyser) with hooks for binaural beats and ambient noise.
- Acceptance: Switching presets never drops audio; movement patterns update smoothly with <20 ms latency; analyzer continues rendering at 60fps.

### FR3 – Media Intake & Playlist Management
- Drag/drop, file picker, and URL input feed into unified playlist with validation/errors for unsupported sources.
- Acceptance: Dropping 5 MP3s queues them instantly; invalid URLs show actionable errors; playlist order persists via localStorage/IndexedDB.

### FR4 – Focus Ritual & Mode Launch
- Guided breathing animation (with skip option) precedes playback; advanced controls hidden until ritual completes unless user opts into "Expert" mode.
- Acceptance: Start Focus triggers a 20-second animation, auto-starts audio, and logs ritual completion; reduced-motion mode replaces animation with static countdown.

### FR5 – Preset & Advanced Control Management
- Provide Focus/Calm/Energize quick presets plus ability to create, name, and reorder custom stacks.
- Acceptance: Editing sliders immediately affects audio and saves state; newly created preset appears in carousel and can be set as default per profile.

### FR6 – Session Logging & Insights Scaffold
- IndexedDB stores session start/end, preset, track id, emoji feedback, optional sensor data, and flagged recommendations.
- Acceptance: After five sessions, dashboard renders charts without network calls; deleting a profile purges its data locally.

### FR7 – Sensor Adapters (Feature-flagged)
- Abstract Web Bluetooth and Web Serial connections with clear permissions and per-device storage.
- Acceptance: Connecting a Polar H10 (example strap) streams heart-rate at 1 Hz; when HR exceeds threshold, the app suggests a calmer preset and logs the suggestion.

### FR8 – Accessibility & Personalization Controls
- Dark mode, high-contrast, reduced-motion, and large-text toggles persist per profile and adjust UI tokens globally.
- Acceptance: Lighthouse accessibility ≥95; keyboard users can access every control; toggles remain within one tap from hero section.

### FR9 – Streaming & Error Handling
- Provide curated radio/stream placeholders and explanatory messaging for services that require authentication.
- Acceptance: When a Pandora URL is pasted, user sees "Requires authenticated proxy" guidance plus suggestions (use direct MP3/curated station) without breaking playback of other tracks.

---

## Non-Functional Requirements
### Performance & Responsiveness
- Initial load <2.5 s on 4G/low-end laptop.
- Audio parameter changes apply in <20 ms; UI interactions under 100 ms for perceived instant response.

### Reliability & Offline Behavior
- Service worker caches shell/assets; audio fetched once remains playable offline when licensing permits.
- Playlist + presets survive refreshes and browser restarts.

### Privacy & Security
- No biometric data leaves the device without explicit consent; provide "forget device" and "clear insights" controls.
- Clearly explain data usage before enabling sensors or journaling.

### Accessibility & Inclusion
- WCAG 2.1 AA compliance, large tap targets (≥48 px), keyboard shortcuts, captions for rituals, and ability to mute motion/visualizers.

### Compatibility & Integration
- Chrome/Edge/Firefox desktop + Android fully supported; Safari offers core playback but hides unsupported features.
- Modular architecture so future Vite/Preact migration simply swaps renderer while keeping requirements stable.

### Observability & Supportability
- Console logging + optional debug panel (when enabled) summarizing audio graph status, sensor connectivity, and session logging health.
- Structured error codes for import failures or sensor issues to accelerate support.

---

## Data, Telemetry & Research Hooks
- **Session schema:** profileId, trackId, presetId, start/end timestamps, ritualUsed, hrAvg/hrDelta, moodEmoji, recommendedPreset, notes.
- **Storage:** IndexedDB for sessions + presets, localStorage for quick UI flags; export/import via JSON for support scenarios.
- **Insights:** Rolling 7-day summaries, time-to-focus deltas, streak tracking, recommended rituals per persona.
- **Research backlog:** Curate evidence for binaural beats, brown noise, solfeggio frequencies; reference credible studies inside help drawer.

---

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Streaming rights or CORS blocks | Users cannot play Pandora/Spotify streams | Focus on user-provided files + curated royalty-free feeds; document proxy requirements clearly |
| Sensor API fragmentation | Features vary by browser, hurting trust | Detect support up front, gate adapters behind feature flags, offer simulator data for testing |
| Audio regressions while merging v2/v3 | Breaks core value proposition | Write automated smoke checklist (manual + Playwright) comparing v2 vs new build before release |
| Data privacy concerns | Users refuse to opt into journaling | Keep everything local, provide transparency UI, and make journaling optional |

---

## Release Plan & Next Steps
1. **Milestone 1 – Unified Player (Weeks 1-2):** Merge UI, fix audio bugs, ship ritual + presets, implement telemetry schema (without sensors). Regression-test vs v2.
2. **Milestone 2 – Insights & Accessibility (Weeks 3-4):** Build dashboard, emoji journaling, accessibility toggles, and export/import.
3. **Milestone 3 – Sensor Adapters Beta (Weeks 5-6):** Implement Web Bluetooth/Serial wrappers, HR-driven suggestions, and UX for permissions.

**Workflow handoff:**
- Run `workflow create-epics-and-stories` to break FR/NFR items into buildable slices.
- Parallel recommendation: `workflow create-design` for UX flows and component layout, then `workflow create-architecture` if deeper refactors emerge.

## Open Questions
- Which streaming providers are must-have for launch, and are proxy agreements feasible short term?
- What wearable devices do target families already own (Fitbit, Apple Watch, Muse, custom Arduino)?
- Do we need HIPAA/FERPA considerations for therapist sharing, or is it purely consumer wellness for now?
- What minimum analytics (if any) should sync to the builder’s own cloud to debug production issues?

---

## Product Magic Summary
mp3_to_8D becomes a calm companion that remembers what soundscape helps each person, launches supportive rituals in two taps, and adapts gently using the signals it senses—all while keeping families in full control of their data.
