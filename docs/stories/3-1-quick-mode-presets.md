# Story 3-1 – Quick Mode Presets

**Epic:** E3 – Preset & Mode Orchestration  
**Status:** backlog  
**Owner:** TBD  
**Source:** docs/epic-3-preset-mode-orchestration.context.xml (S3.1)

---

## Summary
Enable one-tap activation of Focus/Calm/Energize preset modes. When a user taps a mode chip, all 8 audio parameters (speed, intensity, spatialDepth, movement, binaural frequency, noise type/volume) update immediately, applying the predefined preset configuration to the audio graph within 100ms perceived latency.

## User Story
> **As a** neurodivergent professional needing quick focus support  
> **I want** to start my proven "Focus" audio setup in ≤2 taps  
> **So that** I can avoid cognitive overhead of reconfiguring 8 parameters every session

## Acceptance Criteria

### AC1: Preset Application Updates Audio Graph
**Given** the app is loaded with MODE_LIBRARY presets (Focus, Calm, Energize)  
**When** user clicks the "Calm" mode chip  
**Then**:
- All 8 audio parameters update to Calm preset values:
  - `speed: 0.35`, `intensity: 0.75`, `spatialDepth: 0.35`
  - `movement: 'figure8'`
  - `binaural.enabled: true`, `binaural.freq: 8`
  - `noise.type: 'pink'`, `noise.volume: 0.12`
- Audio graph reflects changes within 100ms perceived latency
- No audio dropouts or crackling during transition

**Validation:**
- Manual test: Switch between all 3 presets 10 times, verify smooth transitions
- Performance test: Measure `applyPreset()` latency with `performance.mark()`
- Regression test: Verify existing Epic 1/2 audio tests still pass

### AC2: Visual Preset Highlighting
**Given** user has selected a preset  
**When** viewing the mode selector  
**Then**:
- Active mode chip has `aria-selected="true"` and `aria-current="true"`
- Active chip styled with accent color (`var(--accent-focus)`, etc.)
- Screen reader announces "Focus mode selected" when activated
- Keyboard navigation (Tab + Arrow keys) highlights focus correctly

**Validation:**
- Accessibility test: Navigate with keyboard only, verify focus indicators visible
- Screen reader test: Verify NVDA/VoiceOver announces mode changes
- Manual test: Verify visual highlight matches selected mode

### AC3: Preset Change Event Logging
**Given** user changes presets  
**When** switching from Focus to Calm  
**Then**:
- Console logs structured event:
  ```javascript
  {
    event: 'PRESET_CHANGED',
    presetId: 'calm',
    previousPresetId: 'focus',
    timestamp: 1699999999999,
    trackId: 'track-123' // null if no track playing
  }
  ```
- Event structure ready for Epic 4 IndexedDB integration
- No PII or sensitive data logged

**Validation:**
- Unit test: Verify `logPresetChange()` emits correct event structure
- Manual test: Check console logs during preset switching
- Future: E4 story will subscribe to these events for analytics

### AC4: Editable Default Presets (Settings Panel)
**Given** user wants to customize the "Focus" default preset  
**When** accessing Settings → "Customize Default Modes" section  
**Then**:
- UI shows all 3 default presets with edit buttons
- Clicking "Edit Focus" opens parameter sliders
- Changing values (e.g., binaural freq 14 Hz → 12 Hz) updates localStorage
- Refreshing page loads customized Focus preset (12 Hz)
- Reset button restores factory defaults

**Validation:**
- Integration test: Edit default, refresh, verify persistence
- Manual test: Customize all 3 defaults, verify applied on next load
- Edge case: localStorage quota exceeded → graceful fallback to factory defaults

### AC5: Performance & Latency Target
**Given** user interacts with preset system  
**When** any preset operation occurs  
**Then**:
- Preset application latency: <100ms perceived (target: 50-80ms actual)
- Mode chip click → `applyPreset()` call: <5ms
- `applyPreset()` → audio graph updates: <20ms (Web Audio API)
- Total UI responsiveness: <100ms to user perception

**Validation:**
- Performance test: Use `performance.measure()` to validate targets
- Low-end device test: Test on 5-year-old Android phone
- Regression: Verify no performance degradation from Epic 1/2 baseline

---

## Tasks/Subtasks

### Task 3-1-1: Extract applyPreset() Helper Function
**Priority:** HIGH  
**Estimate:** 30 minutes

**Implementation:**
```javascript
const applyPreset = (preset, presetId) => {
  // Batch all parameter updates
  setSpeed(preset.speed);
  setIntensity(preset.intensity);
  setSpatialDepth(preset.spatialDepth);
  setMovementPattern(preset.movement);
  setBinauralEnabled(preset.binaural.enabled);
  setBinauralFreq(preset.binaural.freq);
  setNoiseType(preset.noise.type);
  setNoiseVolume(preset.noise.volume);
  
  // Update active preset tracking
  setActivePresetId(presetId);
  
  // Log preset change event
  logPresetChange(presetId);
};
```

**Testing:**
- [ ] Unit test: Verify all 8 setState calls triggered
- [ ] Unit test: Verify activePresetId updates correctly
- [ ] Integration test: Verify audio graph reflects changes

### Task 3-1-2: Add activePresetId State Hook
**Priority:** HIGH  
**Estimate:** 15 minutes

**Implementation:**
```javascript
const [activePresetId, setActivePresetId] = useState('focus');

// Initialize from localStorage if user customized defaults
useEffect(() => {
  const savedActivePreset = localStorage.getItem('activePresetId');
  if (savedActivePreset) {
    setActivePresetId(savedActivePreset);
  }
}, []);

// Persist active preset selection
useEffect(() => {
  localStorage.setItem('activePresetId', activePresetId);
}, [activePresetId]);
```

**Testing:**
- [ ] Unit test: Verify localStorage read/write
- [ ] Manual test: Refresh page, verify last preset remembered

### Task 3-1-3: Wire Mode Chips to applyPreset()
**Priority:** HIGH  
**Estimate:** 20 minutes

**Current code location:** `index.html` lines 2306-2351

**Implementation:**
```javascript
<div className="mode-selector" role="tablist" aria-label="Preset modes">
  {MODE_LIBRARY.map((mode, idx) => (
    <button
      key={mode.id}
      role="tab"
      className={`mode-chip ${activePresetId === mode.id ? 'active' : ''}`}
      aria-selected={activePresetId === mode.id}
      aria-current={activePresetId === mode.id ? 'true' : undefined}
      onClick={() => {
        applyPreset(mode.preset, mode.id);
        setHeroMessage(mode.heroCopy);
        setA11yAnnouncement(`${mode.label} mode selected`);
      }}
      style={{ '--accent-color': mode.accent }}
    >
      <span className="mode-label">{mode.label}</span>
      <span className="mode-short">{mode.short}</span>
    </button>
  ))}
</div>
```

**Testing:**
- [ ] Manual test: Click each mode chip, verify audio changes
- [ ] Accessibility test: Tab + Arrow navigation works
- [ ] Screen reader test: Verify announcements

### Task 3-1-4: Implement logPresetChange() Helper
**Priority:** MEDIUM  
**Estimate:** 15 minutes

**Implementation:**
```javascript
const logPresetChange = (newPresetId) => {
  const event = {
    event: 'PRESET_CHANGED',
    presetId: newPresetId,
    previousPresetId: activePresetId,
    timestamp: Date.now(),
    trackId: currentTrackIndex !== null ? playlist[currentTrackIndex].id : null
  };
  
  console.log('[SessionLogger]', event);
  
  // E4 integration point: 
  // window.dispatchEvent(new CustomEvent('preset-changed', { detail: event }));
};
```

**Testing:**
- [ ] Unit test: Verify event structure
- [ ] Manual test: Check console logs during preset switching

### Task 3-1-5: Build Settings Panel for Editable Defaults
**Priority:** MEDIUM  
**Estimate:** 45 minutes

**Implementation:**
```javascript
const EditDefaultPresetDialog = ({ preset, onSave, onCancel }) => {
  const [editedPreset, setEditedPreset] = useState(preset);
  
  const handleSave = () => {
    const savedDefaults = JSON.parse(localStorage.getItem('default-presets') || '{}');
    savedDefaults[preset.id] = editedPreset;
    localStorage.setItem('default-presets', JSON.stringify(savedDefaults));
    onSave();
    showToast(`${preset.label} preset updated`, 'success');
  };
  
  return (
    <dialog open>
      <h2>Edit {preset.label} Preset</h2>
      <label>
        Rotation Speed
        <input type="range" min="0" max="1" step="0.05" 
               value={editedPreset.speed} 
               onChange={(e) => setEditedPreset({...editedPreset, speed: parseFloat(e.target.value)})} />
        <span>{editedPreset.speed.toFixed(2)}</span>
      </label>
      {/* ... repeat for all 8 parameters ... */}
      
      <div className="dialog-actions">
        <button onClick={handleSave}>Save</button>
        <button onClick={onCancel}>Cancel</button>
        <button onClick={() => onSave(null)}>Reset to Default</button>
      </div>
    </dialog>
  );
};
```

**Testing:**
- [ ] Manual test: Edit Focus preset, refresh, verify persistence
- [ ] Manual test: Reset button restores factory defaults
- [ ] Edge case test: localStorage quota exceeded

### Task 3-1-6: Performance Testing & Optimization
**Priority:** HIGH  
**Estimate:** 30 minutes

**Measurement:**
```javascript
const applyPreset = (preset, presetId) => {
  performance.mark('preset-apply-start');
  
  // ... setState calls ...
  
  performance.mark('preset-apply-end');
  const measure = performance.measure('preset-apply', 'preset-apply-start', 'preset-apply-end');
  console.log(`Preset applied in ${measure.duration.toFixed(2)}ms`);
};
```

**Testing:**
- [ ] Performance test: Measure latency on desktop (target <50ms)
- [ ] Performance test: Measure on mobile (target <100ms)
- [ ] Load test: Switch presets 100 times, check for memory leaks

---

## Dev Agent Record

### Context Reference
- `docs/epic-3-preset-mode-orchestration.context.xml`

### Implementation Notes
- **Leverage existing useEffect hooks**: Epic 1/2 already have useEffects that listen to speed, intensity, etc. state changes and update the audio graph. No new audio code needed.
- **Batch setState calls**: React 18 automatically batches setState in event handlers, so all 8 parameter updates will trigger one re-render.
- **localStorage patterns**: Use try/catch around localStorage access (quota limits), same pattern as Epic 2 skip ritual preference.

### File List
- `index.html` (main implementation)
- `docs/stories/3-1-quick-mode-presets.md` (this file)

---

## Testing Strategy

### Unit Tests (5 tests)
1. `applyPreset()` updates all 8 parameter states correctly
2. `logPresetChange()` emits correct event structure
3. `activePresetId` state persists to localStorage
4. Editable defaults save/load from localStorage correctly
5. Reset button restores factory preset values

### Integration Tests (3 tests)
1. Mode chip click → `applyPreset()` → audio graph updates
2. Keyboard navigation through mode chips works
3. Settings panel edit → refresh → preset loads customized values

### Manual Tests (7 tests)
1. **Smoke test:** Click Focus → Calm → Energize, verify audio changes
2. **Accessibility:** Navigate mode chips with keyboard only
3. **Screen reader:** Verify mode change announcements (NVDA/VoiceOver)
4. **Performance:** Measure preset switch latency (<100ms)
5. **Persistence:** Edit default, refresh, verify loads customized
6. **Edge case:** Fill localStorage to quota, verify graceful fallback
7. **Regression:** Run Epic 1/2 smoke tests, verify no breakage

---

## Definition of Done Checklist

### Code Implementation
- [ ] `applyPreset()` helper function implemented
- [ ] `activePresetId` state hook added with localStorage persistence
- [ ] Mode chips wired to `applyPreset()` with proper aria attributes
- [ ] `logPresetChange()` event logging implemented
- [ ] Settings panel for editable defaults built
- [ ] All code follows Epic 2 patterns (try/finally, refs for cleanup)

### Testing
- [ ] 5 unit tests passing
- [ ] 3 integration tests passing
- [ ] 7 manual tests executed and documented
- [ ] Performance targets validated (<100ms latency)
- [ ] Accessibility tests passing (keyboard nav, screen reader)
- [ ] Epic 1/2 regression tests still passing

### Documentation
- [ ] Code comments explain preset application logic
- [ ] Test results documented in test artifacts folder
- [ ] localStorage schema documented in context file

### Quality Gates
- [ ] No console errors or warnings
- [ ] No audio dropouts during preset switching
- [ ] No memory leaks (test 100 preset switches)
- [ ] WCAG AA compliance (aria-selected, aria-current, focus indicators)
- [ ] Mobile responsive (mode chips usable on 320px viewport)

### Handoff
- [ ] Code reviewed by senior developer
- [ ] QA smoke test passed
- [ ] Story marked "review" → "done" in sprint status
- [ ] Epic 3 progress updated in BMad workflow

---

## Success Metrics

**Primary KPI:** ≥80% of sessions use a preset (vs. manual parameter tweaking)  
**Measurement:** Epic 4 session logs will track `presetId` field  
**Baseline:** 0% (no preset system exists)  
**Target (post-Epic 3):** 80%+

**Secondary KPI:** <100ms preset application latency  
**Measurement:** `performance.measure()` in `applyPreset()`  
**Baseline:** N/A (new feature)  
**Target:** 50-100ms actual, <100ms perceived

---

## Dependencies & Blockers

**Depends On:**
- ✅ Epic 1 complete (hero UI, mode chips exist)
- ✅ Epic 2 complete (toast system, localStorage patterns, audio graph stable)

**Blocks:**
- Story 3-2: Advanced Controls (needs `activePresetId` state)
- Story 3-3: Custom Preset CRUD (needs `applyPreset()` helper)
- Epic 4: Session tracking (needs `logPresetChange()` events)

**No Current Blockers**

---

## Notes & Considerations

### Architecture Alignment
- Follows single-file React architecture (no build step)
- Uses existing localStorage patterns from Epic 2
- Leverages existing audio parameter useEffects from Epic 1
- Telemetry events ready for Epic 4 IndexedDB integration

### Accessibility Wins
- Mode chips already have roving tabindex (Epic 1)
- Adding `aria-selected` and `aria-current` improves screen reader UX
- Visual focus indicators meet WCAG AA (48px tap targets)

### Performance Considerations
- React 18 automatic batching prevents multiple re-renders
- Existing useEffects already optimized for audio graph updates
- No new Web Audio nodes created (just parameter changes)

### Future Enhancements (Out of Scope)
- Preset effectiveness scoring (Epic 4 analytics)
- AI-suggested presets based on context (Epic 5 sensors)
- Community preset sharing gallery (future backend)
