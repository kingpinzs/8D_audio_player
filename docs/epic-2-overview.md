# Epic 2 Technical Context – Audio Intake & Graph Hardening

**Status:** ✅ Ready for story drafting  
**Generated:** 2025-11-11  
**Format:** Comprehensive XML technical context  
**File:** `docs/epic-2-audio-intake-graph-hardening.context.xml`

---

## Epic Overview

**Problem:** v3 regressions in audio playback, drag/drop handling, and streaming URL support broke user trust. The stable v2 audio graph must be preserved while exposing the richer v3 UI.

**Goal:** Eliminate all audio bugs, achieve ≥95% intake success rate, and establish regression testing foundation.

**Scope:**
- Refactor drag/drop zone (multiple files, validation, progress)
- Implement URL validation (HEAD/GET checks, CORS detection, actionable errors)
- Preserve v2 audio graph topology exactly
- Ensure <20ms parameter change latency
- Maintain 60fps analyzer rendering
- Create v2 vs unified regression test harness

---

## Stories (3)

### Story 2-1: Drag/Drop & File Picker Refactor
- **Priority:** HIGH
- **Complexity:** MEDIUM
- **Acceptance Criteria:** 6 (multiple file handling, progress UI, MIME validation, offline playback, metadata parsing, helper tests)
- **Key Challenge:** Keep File objects in memory without blob URL expiry

### Story 2-2: Streaming URL Validation & Messaging
- **Priority:** HIGH  
- **Complexity:** LOW
- **Acceptance Criteria:** 6 (URL format validation, HEAD request, CORS detection, service-specific messaging, graceful failures, test matrix)
- **Key Challenge:** Surface actionable errors without breaking playlist

### Story 2-3: Audio Graph Regression Harness ⚠️ CRITICAL
- **Priority:** CRITICAL
- **Complexity:** HIGH
- **Acceptance Criteria:** 7 (v2 topology match, binaural integration, noise hooks, <20ms latency, 60fps analyzer, regression log, zero artifacts)
- **Key Challenge:** Align setupAudioGraph to v2 gold standard exactly

---

## Implementation Order (Recommended)

1. **Story 2-3 FIRST** (Critical dependency)
   - Establishes stable audio foundation
   - Blocks Stories 2-1 and 2-2 if graph is broken
   - Highest risk, must be validated early

2. **Story 2-1 SECOND** (Core functionality)
   - Drag/drop depends on stable graph
   - High user visibility

3. **Story 2-2 THIRD** (Polish layer)
   - URL validation is error handling refinement
   - Can be iterated after intake mechanics solid

**Parallel Work:** Stories 2-1 and 2-2 can run in parallel IF Story 2-3 is complete. Prefer sequential to avoid merge conflicts in single-file architecture.

---

## KPIs

| KPI | Target | Measurement |
|-----|--------|-------------|
| Audio Bug Count | 0 | Manual QA checklist + regression test log |
| Intake Success Rate | ≥95% | Test matrix with 20 MP3/WAV samples |
| Analyzer Uptime | 100% | During 10min continuous playback test |
| Parameter Latency | <20ms | Chrome DevTools Performance profiler |
| Pa11y Score | ≥95 | Automated accessibility audit |

---

## Dependencies

### From Epic 1
- React state hooks (playlist, isPlaying, volume) – `index.html` lines 720-760
- Existing drag/drop handlers – `index.html` lines 1350-1430
- setupAudioGraph function (needs alignment) – `index.html` lines 1140-1250
- aria-live announcement region – `index.html` lines 1890-1900
- PlaylistTrack schema – `docs/data-models.md` lines 8-22

### Reference Artifacts (Gold Standards)
- **v2 Audio Graph:** `8d-audio-live-v2.html` lines 634-850 (PROVEN topology)
- **Gain Staging Helper:** `audio-engine.js` lines 1-100 (frozen interface)
- **Test Surface:** `tests/gain-staging.test.js`
- **Architecture Spec:** `docs/architecture.md` lines 55-80
- **PRD Requirements:** `docs/PRD.md` lines 120-135 (FR2, FR3)

---

## Code Patterns Provided

The technical context includes 4 detailed code patterns:

1. **Audio Graph Setup** – v2 topology with manual rotation gains, delay nodes, headroom multiplier
2. **File Validation** – MIME type check with user-friendly error announcements
3. **URL Validation** – Async HEAD request with 5s timeout, AbortController, error mapping
4. **Parameter Latency Measurement** – Performance API for <20ms validation

Each pattern includes:
- Description of use case
- Complete code example with comments
- Integration points with existing codebase

---

## Testing Strategy

### Manual Tests (6 scenarios)
1. Drag/Drop Smoke Test (5 MP3s, sequential playback)
2. Invalid File Handling (.txt, .flac toast messages)
3. URL Validation Matrix (6 URL types: valid MP3, CORS-blocked, 404, YouTube, malformed)
4. v2 Audio Regression Comparison (side-by-side playback, 10min stress test)
5. Parameter Latency Validation (Chrome DevTools profiling)
6. Analyzer 60fps Rendering (FPS counter analysis)

### Automated Tests (3 suites)
1. MIME Type Validation (Jest helpers)
2. URL Format Validation (regex tests)
3. Audio Graph Integrity (node connection validation)

### Accessibility Audit
- Tool: Pa11y
- Command: `pa11y http://localhost:8000/index.html --reporter json > tests/pa11y-epic-2.json`
- Threshold: 0 issues (maintain Epic 1 standard)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Audio graph changes break playback | Branch, test v2 comparison before merge |
| CORS validation adds latency | 5s timeout, async, non-blocking UI |
| Corrupt MP3 crashes file parsing | Try-catch around FileReader, user-friendly error |

---

## Code Review Checklist

Before marking any Story 2 as "done":
- [ ] setupAudioGraph matches v2 topology exactly (visual diff vs v2 source)
- [ ] All parameter changes measured <20ms (console logs or test output)
- [ ] File MIME validation uses SUPPORTED_AUDIO_TYPES constant
- [ ] URL validation includes 5s timeout with AbortController
- [ ] Error messages use setA11yAnnouncement for screen reader compatibility
- [ ] No new accessibility issues (pa11y audit clean)
- [ ] Regression test documented in `tests/audio-regression-2025-11-11.md`
- [ ] No breaking changes to audio-engine.js interface

---

## Epic Complete When

- [ ] All 3 stories (2-1, 2-2, 2-3) marked "done" in sprint-status.yaml
- [ ] Audio regression test log shows v2 parity
- [ ] Pa11y score ≥95 (0 issues preferred)
- [ ] Manual QA checklist 100% pass rate
- [ ] 0 known audio bugs
- [ ] ≥95% intake success rate on 20-file test matrix
- [ ] All KPIs met (documented in epic-2-completion.md)

**User-Facing Outcome:** Users can drag/drop multiple MP3s, paste streaming URLs with clear error guidance, and experience zero audio regressions compared to v2. The unified player now has reliable, trustworthy playback as its foundation.

---

## Next Steps

### Option 1: Draft Stories (Recommended)
```bash
workflow create-story 2-3  # Audio Graph Regression (CRITICAL)
workflow create-story 2-1  # Drag/Drop Refactor (HIGH)
workflow create-story 2-2  # URL Validation (HIGH)
```

### Option 2: Start Development Immediately
```bash
workflow story-context 2-3  # Generate detailed context for Story 2-3
workflow develop-story      # Begin implementation
```

### Option 3: Review Status
```bash
workflow workflow-status  # Check overall project health
```

---

## Lessons from Epic 1 (Applied to Epic 2)

**Carry Forward:**
- localStorage pattern: Try-catch wrapped, functional state setters
- Toggle pattern: State update → body class → persistence → announcement
- Accessibility first: aria-live, roving tabindex, ≥48px tap targets
- Code review before story-done prevents rework
- Single-file discipline: All React logic stays in `index.html`

**Apply to Epic 2:**
- Use setA11yAnnouncement for all error messages (drag/drop, URL validation)
- Document design decisions in comments
- Test accessibility after every story (pa11y audit)
- Reference Epic 1 patterns when adding new UI components

---

**Generated by:** BMad Method workflow `epic-tech-context epic-2`  
**XML Context:** 712 lines of comprehensive technical specifications  
**Status:** Ready for story drafting and development
