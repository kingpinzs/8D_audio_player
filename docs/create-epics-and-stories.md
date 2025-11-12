# Epics & Stories – mp3_to_8D

**Generated:** 2025-11-12  
**Sources:** `docs/PRD.md`, `docs/architecture.md`, `docs/component-inventory.md`, `docs/bmm-brainstorming-session-2025-11-11.md`, `docs/bmm-research-technical-2025-11-11.md`

This backlog translates PRD v2.0 into delivery-ready increments. Epics target the six product pillars (unified ritual player, stable audio graph, presets, journaling, sensors, reliability). Stories follow INVEST principles, include measurable acceptance, and assume the current HTML + React UMD stack until the bundler migration kicks in.

---

## Epic Overview

| ID | Epic | Outcome & KPI | Primary Owners | Key Dependencies |
|----|------|---------------|----------------|------------------|
| E1 | Unified Ritual Player | One calm, responsive UI that launches rituals in ≤2 taps and keeps accessibility score ≥95. | UX + Frontend | UX concepts, accessibility tokens |
| E2 | Audio Intake & Graph Hardening | Drag/drop + streaming pipeline with <200 ms control latency and no v3 regressions. | Frontend | E1 shell, data models |
| E3 | Preset & Mode Orchestration | Focus/Calm/Energize plus custom stacks auto-restore with 80% preset reuse rate. | Frontend | E1 hero, E2 playback events |
| E4 | Session Logging & Insights | IndexedDB journaling + dashboard covering ≥5 sessions offline. | Frontend + Data | E2 events, E3 preset metadata |
| E5 | Sensor & Adaptive Loop | Optional BLE/Serial inputs drive preset suggestions with ≥30% acceptance. | Frontend + Hardware | E3 presets, E4 logging |
| E6 | PWA Reliability & Accessibility | Installable offline shell scoring ≥90 Lighthouse PWA + ≥95 Accessibility. | Frontend + QA | Outputs of E1–E5 |

---

## Epic Details & Stories

### E1 – Unified Ritual Player
- **Problem Statement:** Multiple HTML variants confuse users and delay focus sessions; we need a single entry point with ritual hero, mode tabs, and sensory-safe styling.
- **Scope:** Merge v2 stability + v3 layout, implement Start Focus/Calm/Energize rituals, expose personalization toggles, and satisfy WCAG 2.1 AA.
- **KPIs:** P50 "load → audio" time <25 s, ≥90% keyboard coverage, ritual completion rate >70%.
- **Dependencies:** Layout guidance in `docs/ux-concepts.html`, accessibility targets in PRD.

#### Stories
1. **S1.1 – Consolidated Shell & Navigation**  
   *As a* neurodivergent user *I want* one responsive page with Focus/Calm/Energize tabs and Now Playing card *so that* I never guess which build to open.
   - Acceptance: Single HTML entry renders identical layout on desktop/mobile; tab switches update hero state without reload; tap targets ≥48 px and tab order follows logical reading order.
   - DoD: Chrome + Firefox mobile manual smoke, axe accessibility ≥95.

2. **S1.2 – Breathing Ritual & Auto-Start**  
   *As a* user *I want* a 4-2-4 breathing animation before audio *so that* I ease into focus without fiddling with controls.
   - Acceptance: Tapping Start Focus triggers 20 s animation followed by automatic playback; skip action persists preference; reduced-motion users see static countdown.
   - DoD: Media-query tests plus localStorage flag verified.

3. **S1.3 – Personalization & Accessibility Toggles**  
   *As a* caregiver *I need* high-contrast, dark mode, reduced-motion toggles within reach *so that* the UI stays sensory-safe.
   - Acceptance: Toggles visible within hero section, persist per profile, and announce state to assistive tech; high-contrast theme passes WCAG AA; keyboard shortcuts documented.
   - DoD: Pa11y report attached; QA sign-off on desktop + phone.

---

### E2 – Audio Intake & Graph Hardening
- **Problem Statement:** v3 regressions eroded trust. Playback, drag/drop, and streaming must reuse the proven v2 audio graph while exposing richer UI from v3.
- **Scope:** Refactor drag/drop zone, URL intake, Web Audio graph, analyzer, and error surfaces; maintain <200 ms control latency.
- **KPIs:** 0 open audio bugs at release; ≥95% success on valid MP3/WAV intake; analyzer uptime 100% during playback.
- **Dependencies:** Shell from E1, data models for playlist entries.

#### Stories
1. **S2.1 – Drag/Drop & File Picker Refactor**  
   - Acceptance: Drop zone handles multiple files, shows progress, rejects unsupported MIME with toast; local tracks playable offline for session; helper tests cover metadata parsing.
   - DoD: Manual smoke vs. v2 baseline + Jest helper tests.

2. **S2.2 – Streaming URL Validation & Messaging**  
   - Acceptance: URL input validates HEAD/GET; CORS or licensing blocks show actionable guidance (e.g., "Pandora needs proxy"); fallback retains other playlist items.
   - DoD: Test matrix includes valid MP3, blocked stream, unreachable URL.

3. **S2.3 – Audio Graph Regression Harness**  
   - Acceptance: Graph uses MediaElementSource → Gain → dual Panners → Analyser, plus binaural/noise hooks; control changes apply <20 ms; analyzer renders 60 fps; automated smoke compares v2 vs unified build outputs.
   - DoD: Scripted comparison log stored under `/tests/audio-regression.md` or similar.

---

### E3 – Preset & Mode Orchestration
- **Problem Statement:** Users want two-tap modes plus deep control. Presets must auto-restore per profile and remain editable without breaking the audio graph.
- **Scope:** Focus/Calm/Energize quick presets, custom preset CRUD, advanced sliders, preset carousel with "magic" tags.
- **KPIs:** ≥80% sessions reuse or save a preset; editing a preset reflects in <100 ms; preset defaults sync with playlist entries.
- **Dependencies:** E2 playback events, E1 hero layout for mode buttons.

#### Stories
1. **S3.1 – Quick Mode Presets**  
   - Acceptance: Focus/Calm/Energize define default depth, intensity, binaural, noise mix; selecting mode updates audio immediately and logs preset id; defaults editable via settings.
   - DoD: Manual verification + unit tests for preset config map.

2. **S3.2 – Advanced Controls Drawer & Live Binding**  
   - Acceptance: Drawer/sliders expose rotation speed, pattern, binaural freq, noise type; adjustments reflect instantly and show sensor lock icon when applicable; values persist per preset.
   - DoD: React hook tests confirm state sync.

3. **S3.3 – Custom Preset CRUD & Auto-Restore**  
   - Acceptance: Users can save, rename, reorder presets; each playlist item stores last preset id and auto-applies on replay; deleting preset falls back gracefully.
   - DoD: IndexedDB/localStorage migration script documented.

---

### E4 – Session Logging & Insights
- **Problem Statement:** Families need proof that sessions help, without cloud sync. Logging must stay offline but surface trends.
- **Scope:** IndexedDB schema, session lifecycle hooks, emoji check-in, insights dashboard, export stubs.
- **KPIs:** After five sessions dashboard renders time-to-focus + felt-better stats; log operations succeed offline; export JSON works without backend.
- **Dependencies:** E2 events, E3 preset metadata.

#### Stories
1. **S4.1 – Session Schema & Lifecycle Hooks**  
   - Acceptance: Schema stores profileId, trackId, presetId, timestamps, ritualUsed, hrAvg, moodEmoji, notes; hooks fire on Start, Pause, End; clearing profile purges data.
   - DoD: IndexedDB migration doc + integration test covering start/end flows.

2. **S4.2 – Emoji Check-In & Notes Prompt**  
   - Acceptance: Prompt appears at session end or manual stop; works offline; emoji buttons have ARIA labels + keyboard shortcuts; optional note field stored with session.
   - DoD: Accessibility QA + screenshot evidence.

3. **S4.3 – Insights Dashboard & Export**  
   - Acceptance: Dashboard shows rolling 7-day time-to-focus, felt-better %, preset effectiveness; offline-safe charting (lightweight lib or custom); export JSON/CSV stub for therapist handoff.
   - DoD: Manual tests with seeded data set.

---

### E5 – Sensor & Adaptive Loop
- **Problem Statement:** Users with BLE straps or custom boards want adaptive presets without sacrificing privacy.
- **Scope:** Capability detection, BLE + Web Serial adapters, HR threshold rules, UI cues showing sensor-driven adjustments.
- **KPIs:** Sensor connection success ≥85% on supported browsers; ≥30% of suggestions accepted; consent logs maintained per device.
- **Dependencies:** E3 presets (to adjust), E4 logging (to capture biometrics).

#### Stories
1. **S5.1 – Capability Detection & Consent UI**  
   - Acceptance: Detects Web Bluetooth/Serial support, hides unsupported sensors; onboarding copy explains privacy; "Forget device" clears stored handles.
   - DoD: Works on Chrome (supports BLE) and Firefox (no BLE) with graceful messaging.

2. **S5.2 – Heart-Rate Subscription & Threshold Engine**  
   - Acceptance: Connects to standard Heart Rate Service; handles reconnect <3 s; rule engine triggers Calm suggestion when HR > user-defined threshold for 3 min; event logged in session record.
   - DoD: Simulated data harness for CI.

3. **S5.3 – Sensor-Informed Preset Adjustments**  
   - Acceptance: Sensor signals can auto-adjust intensity/noise/binaural parameters while a lock icon indicates automation; users can pause automation or lock preset; overrides recorded.
   - DoD: UX copy reviewed; manual test with mock sensor.

---

### E6 – PWA Reliability & Accessibility
- **Problem Statement:** The unified page must install, run offline, and uphold accessibility budgets to earn long-term trust.
- **Scope:** Service worker + Workbox config, manifest polish, offline-safe messaging, automated accessibility/performance checks, debug panel.
- **KPIs:** Lighthouse PWA ≥90, Accessibility ≥95; offline reload succeeds after first visit; debug panel surfaces audio/sensor status.
- **Dependencies:** Final assets from E1–E5.

#### Stories
1. **S6.1 – Service Worker & Offline UX**  
   - Acceptance: Service worker precaches shell/assets, optionally caches audio with consent; offline banner explains limitations; automated test simulates offline playback of local tracks.
   - DoD: Workbox config documented; CI step verifies SW build.

2. **S6.2 – Manifest & Install Flow**  
   - Acceptance: Manifest lists icons, categories (health/wellness), orientation, shortcuts; in-app prompt teaches Add-to-Home-Screen; telemetry captures install attempts/success.
   - DoD: Verified on Chrome desktop + Android + Firefox.

3. **S6.3 – Accessibility & Observability Suite**  
   - Acceptance: Pa11y/axe run per CI; reduced-motion/high-contrast toggles sync with OS preferences; optional debug panel reports audio graph status, sensor connectivity, logging health with copyable codes.
   - DoD: QA sign-off + recorded walkthrough.

---

## Backlog Governance & Next Steps
- **Prioritization:** Execute E1–E3 sequentially for MVP; start E4 telemetry in parallel once playback events stabilize; E5 remains feature-flagged until sensor beta; E6 spans entire release.
- **Workflow Handoff:** Feed this backlog into `workflow create-design` for detailed UI flows, then `workflow create-architecture` before implementation starts. Update `docs/bmm-workflow-status.yaml` once epics are approved.
