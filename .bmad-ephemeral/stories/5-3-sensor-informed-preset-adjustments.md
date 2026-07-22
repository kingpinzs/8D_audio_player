# Story 5.3: Sensor-Informed Preset Adjustments

**Epic:** E5 – Sensor & Adaptive Loop
**Story ID:** 5-3
**Status:** done
**Estimated Effort:** 4-5 hours
**Created:** 2025-11-25

---

## User Story

**As a** user with a connected heart rate sensor and active preset suggestions,
**I want** the app to automatically adjust audio parameters when I accept a suggestion or enable auto-adjust,
**So that** the audio experience adapts to my physiological state without requiring manual intervention.

---

## Business Context

### Problem Statement
Users who accept preset suggestions from Story 5-2's threshold engine currently have a binary choice: accept and switch to a different preset entirely, or dismiss. This story enables more nuanced automation where sensor signals can continuously fine-tune intensity, noise, and binaural parameters while giving users clear visibility and control over when automation is active.

### Value Proposition
- **For Stressed Users:** "When my HR is elevated, the app automatically dials down intensity to help me relax"
- **For Control-Conscious Users:** "I can see when the sensor is driving changes and pause it anytime"
- **For Data-Driven Users:** "All automated adjustments are logged so I can review what the app did"
- **For Product:** Completes the adaptive loop that transforms passive sensor connection into active wellness assistance

### Success Metrics
- Automation-driven preset changes apply in <20ms (matching PRD latency requirement)
- Users who enable auto-adjust keep it enabled for >50% of sensor-connected sessions
- Lock icon toggle used at least once by >30% of users with sensors (indicates awareness of control)
- All automation events captured in sensorEvents[] with 100% logging coverage

---

## Acceptance Criteria

### AC1: Auto-Adjust Preset Application
**Given** user accepts a sensor suggestion OR enables "Auto-adjust" toggle
**When** SensorRuleEngine determines preset change is needed
**Then**:
- Apply preset parameters via existing `applyPreset()` helper
- Parameters affected: intensity, noiseVolume, binauralFreq
- Changes apply with <20ms latency (matching PRD audio control requirement)
- Console log: `[SensorRuleEngine] Auto-applying preset: {presetId}`

**Technical Notes:**
- Reuse `applyPreset()` from PresetProvider (Epic 3)
- Must not create new audio graph nodes; only modify parameters

### AC2: Lock Icon Visibility
**Given** sensor automation is active (sensorLocked = true)
**When** user views Advanced Controls drawer
**Then**:
- Lock icon (🔒) appears next to affected sliders (intensity, noise, binaural)
- Lock icon has tooltip: "Sensor automation active. Click to pause."
- Lock icon has ARIA label: "Sensor automation active, click to take manual control"
- Icon animates briefly (pulse) when automation makes a change

**Integration Point:**
- Epic 3 Story 3-2 already implemented `sensorLocked` state and lock icon placeholder
- This story wires the icon to actual sensor automation state

### AC3: Manual Control Override (Lock Icon Click)
**Given** sensor automation is active
**When** user clicks the lock icon
**Then**:
- Set `sensorLocked = false` in PresetProvider
- Lock icon changes to unlocked (🔓) with tooltip "Automation paused"
- Log event: `{ type: "AUTOMATION_PAUSED", trigger: "lock_icon" }`
- User retains manual control until they re-enable auto-adjust
- Toast shown: "Sensor automation paused. Toggle Auto-adjust to resume."

### AC4: Slider Interaction Override
**Given** sensor automation is active
**When** user manually adjusts any slider (intensity, noise, binaural, etc.)
**Then**:
- Immediately pause sensor automation (sensorLocked = false)
- Log event: `{ type: "AUTOMATION_PAUSED", trigger: "manual_slider", slider: "{sliderName}" }`
- Unlock icon shown (🔓)
- User's manual value takes precedence
- Toast shown: "Manual adjustment detected. Sensor automation paused."

### AC5: Auto-Adjust Settings Toggle
**Given** user opens Settings panel
**When** user views sensor settings section
**Then**:
- "Auto-adjust" toggle visible when sensor is connected
- Toggle default: OFF (user must opt-in)
- Persist to localStorage: `mp3_8d_auto_adjust_enabled`
- When toggled ON: Set `sensorLocked = true`, enable rule engine automation
- When toggled OFF: Set `sensorLocked = false`, rule engine only shows suggestions
- Helper text: "When enabled, app automatically adjusts audio based on heart rate"

### AC6: Session Event Logging
**Given** sensor automation performs an action
**When** any of the following events occur:
- Automation applies preset change
- User pauses automation (lock click or slider)
- User enables/disables auto-adjust toggle
**Then**:
- Push to current session's `sensorEvents[]` array:
```javascript
{
  timestamp: Date.now(),
  type: "AUTOMATION_APPLIED" | "AUTOMATION_PAUSED" | "AUTO_ADJUST_ENABLED" | "AUTO_ADJUST_DISABLED",
  data: {
    hr: number,           // Current HR at time of event
    hrAvg: number,        // Rolling average
    presetApplied: string, // Preset ID if automation applied
    trigger: string,      // "rule_engine" | "lock_icon" | "manual_slider" | "toggle"
    previousValue: any,   // Previous parameter value (for AUTOMATION_APPLIED)
    newValue: any         // New parameter value
  }
}
```
- Integrate with existing `logSensorEvent()` helper from Story 5-2

### AC7: Performance Requirement
**Given** sensor automation is active and rule engine triggers a change
**When** preset parameters are modified
**Then**:
- Change applies in <20ms from rule trigger to audio parameter update
- Use `performance.mark()` and `performance.measure()` to validate
- Log measurement to console in debug mode: `[SensorRuleEngine] Preset applied in {X}ms`

---

## Tasks / Subtasks

### Task 1: Auto-Adjust Toggle UI (AC: 5)
- [x] Add "Auto-adjust" toggle to SensorSettings component
- [x] Position below threshold input in sensor settings section
- [x] Implement toggle state with localStorage persistence (`mp3_8d_auto_adjust_enabled`)
- [x] Load saved preference on app init
- [x] Wire toggle to set `sensorLocked` state in PresetProvider
- [x] Add helper text explaining the feature
- [x] Only show toggle when sensor is connected

### Task 2: SensorRuleEngine Automation Mode (AC: 1, 7)
- [x] Extend SensorRuleEngine to support two modes: "suggest" and "auto-apply"
- [x] Check `autoAdjustEnabled` flag before auto-applying changes
- [x] When auto-apply mode and threshold exceeded: call `applyPreset('calm')` directly
- [x] Add `performance.mark('sensor-preset-start')` before apply
- [x] Add `performance.measure()` after apply to validate <20ms latency
- [x] Log timing to console: `[SensorRuleEngine] Preset applied in {X}ms`
- [x] Respect 5-minute cooldown from Story 5-2

### Task 3: Lock Icon Integration (AC: 2)
- [x] Locate existing lock icon placeholder in Advanced Controls drawer
- [x] Wire icon visibility to `sensorLocked` state from PresetProvider
- [x] Show locked icon (🔒) when `sensorLocked === true`
- [x] Show unlocked icon (🔓) when `sensorLocked === false` and sensor connected
- [x] Hide icon when no sensor connected
- [x] Add tooltip with appropriate text based on state
- [x] Add ARIA label for accessibility
- [x] Add CSS pulse animation when automation makes a change

### Task 4: Lock Icon Click Handler (AC: 3)
- [x] Add onClick handler to lock icon
- [x] When clicked while locked: set `sensorLocked = false`
- [x] Log AUTOMATION_PAUSED event via `logSensorEvent()`
- [x] Show toast notification: "Sensor automation paused..."
- [x] Update icon to unlocked state
- [x] When clicked while unlocked: re-enable if auto-adjust toggle is on

### Task 5: Slider Override Detection (AC: 4)
- [x] Identify all affected sliders in Advanced Controls drawer
- [x] Add `onUserInput` or `onChange` handler to detect manual interaction
- [x] Distinguish between programmatic changes and user changes
- [x] When user manually adjusts slider:
  - [x] Set `sensorLocked = false`
  - [x] Log AUTOMATION_PAUSED event with slider name
  - [x] Show toast: "Manual adjustment detected..."
- [x] Ensure user's value takes precedence over automation

### Task 6: Event Logging Integration (AC: 6)
- [x] Extend `logSensorEvent()` to support new event types:
  - AUTOMATION_APPLIED
  - AUTOMATION_PAUSED
  - AUTO_ADJUST_ENABLED
  - AUTO_ADJUST_DISABLED
- [x] Include all required data fields (hr, hrAvg, preset, trigger, values)
- [x] Log event when auto-adjust toggle changes
- [x] Log event when automation applies preset
- [x] Log event when user pauses automation (either method)
- [x] Verify events appear in session record

### Task 7: Testing & Documentation
- [x] Write unit tests for auto-adjust toggle persistence
- [x] Write unit tests for SensorRuleEngine auto-apply mode
- [x] Write integration test: Enable auto-adjust → threshold exceeded → preset applied automatically
- [x] Write integration test: Slider interaction → automation paused → event logged
- [x] Write integration test: Lock icon click → automation paused → icon changes
- [x] Add test script to package.json if needed
- [x] Document auto-adjust feature in code comments

---

## Dev Notes

### Relevant Architecture Patterns and Constraints

**From Architecture Section 3.6 (Sensor Bridge):**
- `SensorRuleEngine` monitors data stream, triggering recommendations when thresholds exceed user-defined ranges
- Emits `SENSOR_THRESHOLD_EXCEEDED` event consumed by presets + UI to show suggestions
- This story extends the rule engine to directly apply presets when auto-adjust is enabled

**From Tech Spec Workflow (Story 5-3):**
```
1. User accepts suggestion OR enables "Auto-adjust" toggle
2. sensorLocked state set to true in PresetProvider
3. Lock icon appears on Advanced Controls drawer
4. SensorRuleEngine applies preset changes via applyPreset()
5. User can:
   a. Click lock icon → Pause automation (sensorLocked = false)
   b. Manually adjust slider → Auto-pauses automation
   c. Toggle "Auto-adjust" off → Stops sensor-driven changes
6. All overrides logged to sensorEvents[]
```

**Performance Requirements:**
- Preset application latency: <20ms (PRD requirement)
- Rule evaluation: <50ms per tick (from Story 5-2)

### Source Tree Components to Touch

| Component | Purpose | Location |
|-----------|---------|----------|
| SensorSettings | Add Auto-adjust toggle UI | index.html (existing) |
| SensorRuleEngine | Add auto-apply mode | index.html:10267-10323 |
| AdvancedControls | Wire lock icon to sensorLocked state | index.html (existing) |
| PresetProvider | Manage sensorLocked state | index.html (existing) |
| logSensorEvent | Extend with new event types | index.html:10205-10226 |
| Slider components | Add manual interaction detection | index.html (existing) |

### Testing Standards Summary

**From Epic 5 Tech Spec Test Strategy:**
- Unit tests: Auto-adjust toggle persistence, rule engine modes
- Integration tests: Full automation flow from toggle → threshold → preset application
- Manual tests: Lock icon toggle, slider override
- Performance tests: Measure preset application latency

### Project Structure Notes

**Alignment:**
- All implementation in index.html (maintaining single-file architecture per project convention)
- Extends existing SensorRuleEngine from Story 5-2
- Uses existing PresetProvider patterns from Epic 3
- Follows toast patterns established in previous stories

**Integration Points:**
- Uses `applyPreset()` from PresetProvider (Epic 3)
- Uses `logSensorEvent()` from Story 5-2
- Builds on SensorRuleEngine from Story 5-2
- Uses existing `sensorLocked` state in PresetProvider (Epic 3 Story 3-2)

### References

- [Source: .bmad-ephemeral/stories/tech-spec-epic-5.md#AC5.3] - AC5.3.1 through AC5.3.7
- [Source: .bmad-ephemeral/stories/tech-spec-epic-5.md#Workflows] - Story 5-3 sequence diagram
- [Source: docs/architecture.md#Section-3.6] - Sensor Bridge architecture
- [Source: docs/create-epics-and-stories.md#E5] - Epic 5 S5.3 acceptance criteria

### Learnings from Previous Story

**From Story 5-2-heart-rate-subscription-threshold-engine (Status: done)**

- **SensorRuleEngine Created**: Rule engine at [index.html:10267-10323](index.html#L10267-L10323) - extend with auto-apply mode
- **logSensorEvent() Helper**: Event logging at [index.html:10205-10226](index.html#L10205-L10226) - extend with new event types
- **Suggestion Toast Pattern**: Toast at [index.html:6229-6308](index.html#L6229-L6308) - reuse toast patterns
- **HR History Buffer**: 60-second rolling window available for hrAvg calculations
- **Threshold Settings**: Already persisted to localStorage `mp3_8d_hr_threshold`
- **5-Minute Cooldown**: Already implemented in rule engine - respect this for auto-apply
- **Performance Instrumentation**: `performance.mark()` patterns established - follow for preset timing
- **Test Patterns**: 24 tests in [tests/heart-rate-engine.test.js](tests/heart-rate-engine.test.js) - follow structure

**From Story 5-1-capability-detection-consent-ui (Status: done)**

- **SensorProvider Pattern**: Context provider with capability detection
- **useSensorBridge Hook**: Exposes connection/disconnection APIs
- **Toast Notifications**: Toast patterns for sensor messages established

[Source: .bmad-ephemeral/stories/5-2-heart-rate-subscription-threshold-engine.md#Dev-Agent-Record]

---

## Dev Agent Record

### Context Reference

- `.bmad-ephemeral/stories/5-3-sensor-informed-preset-adjustments.context.xml` (generated 2025-11-26)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Console: `[SensorRuleEngine] Auto-applying preset: calm`
- Console: `[SensorRuleEngine] Preset applied in {X}ms`

### Completion Notes List

1. **Auto-Adjust Toggle (AC5)**: Added checkbox toggle to SensorSettings at index.html:6288-6314. Persists to localStorage key `mp3_8d_auto_adjust_enabled`. Wired to sensorLocked state.

2. **SensorRuleEngine Auto-Apply Mode (AC1, AC7)**: Extended rule engine at index.html:10365-10403 with two modes. When `autoAdjustEnabled=true` and threshold exceeded, calls `applyPreset('calm')` directly with performance.mark/measure instrumentation. Respects 5-minute cooldown.

3. **Lock Icon Integration (AC2)**: Enhanced sensor-lock-notice at index.html:5470-5542 to show locked (🔒) when sensorLocked=true, unlocked (🔓) when sensor connected but not locked, hidden when no sensor. Added tooltips and ARIA labels.

4. **Lock Icon Click Handler (AC3)**: Added click handlers that toggle sensorLocked state, log AUTOMATION_PAUSED event, and show toast notifications.

5. **Slider Override Detection (AC4)**: Created `handleSliderChange()` wrapper at index.html:5310-5332 that detects manual interaction. When sensorLocked=true and slider changed, pauses automation, logs event with slider name, shows toast. All 8 sliders/controls updated to use wrapper.

6. **Event Logging (AC6)**: Extended logSensorEvent usage with new event types: AUTOMATION_APPLIED, AUTOMATION_PAUSED, AUTO_ADJUST_ENABLED, AUTO_ADJUST_DISABLED. Events logged in rule engine, lock icon click, slider override, and toggle change.

7. **Tests**: Added 12 new tests to heart-rate-engine.test.js for Story 5-3 covering auto-adjust toggle, auto-apply mode, event logging, and slider override detection. Total: 36 tests, all passing.

### File List

| File | Changes |
|------|---------|
| index.html | Added autoAdjustEnabled state, localStorage persistence, SensorSettings toggle UI, SensorRuleEngine auto-apply mode, enhanced lock icon with click handlers, slider override detection wrapper, CSS for lock icon button |
| tests/heart-rate-engine.test.js | Added 12 new tests for Story 5-3 acceptance criteria |

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-11-25 | Story created from create-story workflow | SM Agent |
| 2025-11-26 | Story context generated | BMAD Story Context Workflow |
| 2025-11-26 | Implementation complete - all 7 tasks done, 36 tests passing | Dev Agent (Claude Opus 4.5) |
