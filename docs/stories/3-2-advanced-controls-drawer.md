# Story 3-2 – Advanced Controls Drawer & Live Binding

**Epic:** E3 – Preset & Mode Orchestration  
**Status:** backlog  
**Owner:** TBD  
**Source:** docs/epic-3-preset-mode-orchestration.context.xml (S3.2)

---

## Summary
Build an expandable advanced controls drawer exposing sliders for all 8 audio parameters (rotation speed, intensity, spatial depth, movement pattern, binaural frequency, noise type/volume). Changes reflect instantly in the audio graph with <100ms perceived latency. Sensor lock UI disables controls when Epic 5 adaptive mode activates.

## User Story
> **As an** audio tinkerer who wants deep control  
> **I want** sliders to adjust every audio parameter in real-time  
> **So that** I can experiment and discover my perfect focus state without fear of losing working configuration

## Acceptance Criteria

### AC1: Advanced Controls Drawer UI
**Given** user is viewing the main interface  
**When** clicking the "Advanced Controls" toggle button  
**Then**:
- Drawer expands below mode chips using `<details>` element
- Drawer contains 8 controls:
  1. **Rotation Speed** slider (0.0 - 1.0, step 0.05) with numeric readout
  2. **Intensity** slider (0.0 - 1.0, step 0.05) with numeric readout
  3. **Spatial Depth** slider (0.0 - 1.0, step 0.05) with numeric readout
  4. **Movement Pattern** dropdown (circle, figure8, random)
  5. **Binaural Beats** checkbox (enable/disable)
  6. **Binaural Frequency** slider (0-40 Hz, step 1) with frequency band label (delta/theta/alpha/beta/gamma)
  7. **Noise Type** dropdown (pink, white, brown)
  8. **Noise Volume** slider (0.0 - 0.5, step 0.01) with percentage readout
- All controls have visible labels and accessible markup
- Keyboard shortcut `Ctrl+E` toggles drawer

**Validation:**
- Manual test: Click toggle, verify drawer expands/collapses
- Accessibility test: All sliders have `aria-label`, value readouts visible
- Manual test: `Ctrl+E` keyboard shortcut works

### AC2: Live Parameter Binding (<100ms Latency)
**Given** advanced controls drawer is open  
**When** user adjusts any slider  
**Then**:
- onChange event fires immediately
- State update occurs within 5ms
- Audio graph update occurs within 20ms (Web Audio API)
- Total perceived latency <100ms to user
- No audio dropouts or crackling during adjustment
- Existing Epic 1/2 useEffect hooks handle audio updates automatically

**Validation:**
- Performance test: Use `performance.mark()` to measure onChange → audio update
- Manual test: Adjust speed slider, observe analyzer canvas updates smoothly
- Regression test: Verify no new audio artifacts introduced

### AC3: Parameter Value Persistence (Not Saved to Storage)
**Given** user adjusts parameters in advanced controls  
**When** navigating between mode chips  
**Then**:
- Adjusted values remain in current preset state (not written to localStorage yet)
- User must explicitly click "Save Preset" (Story 3-3) to persist
- Refreshing page resets to last saved preset (default or custom)

**Validation:**
- Manual test: Adjust speed, switch to Calm, switch back to Focus → verify Focus resets to default
- Manual test: Adjust speed, refresh page → verify reset to default
- Integration test: Only Story 3-3 "Save Preset" writes to localStorage

### AC4: Sensor Lock UI for Adaptive Mode (Epic 5 Integration)
**Given** adaptive mode is enabled (Epic 5 future feature)  
**When** sensor thresholds trigger automated parameter changes  
**Then**:
- All advanced controls sliders disabled (`disabled` attribute)
- Lock icon (🔒) appears with message "Parameters locked by adaptive mode"
- "Unlock" button allows user to override adaptive mode
- Clicking "Unlock" sets `sensorLocked = false` and re-enables controls
- aria-live announcement: "Adaptive mode enabled. Controls locked."

**Validation:**
- Manual test: Mock `setSensorLocked(true)`, verify sliders disabled
- Accessibility test: Screen reader announces lock state
- Manual test: Click "Unlock", verify controls re-enabled

### AC5: Helper Text & Parameter Guidance
**Given** user is adjusting parameters  
**When** hovering over or focusing on a slider  
**Then**:
- Tooltip or inline text provides parameter guidance:
  - Binaural frequency slider shows band label: "8 Hz (Theta - Deep Relaxation)"
  - Movement pattern dropdown shows use case hints: "Figure-8: Best for focus sessions"
- Guidance helps users understand parameter effects without reading docs

**Validation:**
- Manual test: Verify all tooltips/hints appear on hover/focus
- Accessibility test: Tooltips accessible via keyboard focus

---

## Tasks/Subtasks

### Task 3-2-1: Build AdvancedControls Component Structure
**Priority:** HIGH  
**Estimate:** 60 minutes

**Implementation:**
```javascript
const AdvancedControls = ({ 
  // Parameter states
  speed, setSpeed,
  intensity, setIntensity,
  spatialDepth, setSpatialDepth,
  movementPattern, setMovementPattern,
  binauralEnabled, setBinauralEnabled,
  binauralFreq, setBinauralFreq,
  noiseType, setNoiseType,
  noiseVolume, setNoiseVolume,
  // UI state
  isExpanded, setIsExpanded,
  sensorLocked
}) => {
  return (
    <details 
      open={isExpanded} 
      onToggle={(e) => setIsExpanded(e.target.open)}
      className="advanced-controls"
    >
      <summary>
        ⚙️ Advanced Controls
        <kbd>Ctrl+E</kbd>
      </summary>
      
      <div className="controls-grid">
        {/* Rotation Speed Slider */}
        <label className="control-group">
          <span className="control-label">Rotation Speed</span>
          <div className="control-input">
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05" 
              value={speed} 
              onChange={(e) => setSpeed(parseFloat(e.target.value))} 
              disabled={sensorLocked}
              aria-label="Rotation speed"
            />
            <output>{speed.toFixed(2)}</output>
          </div>
          <span className="control-hint">How fast sound orbits your head</span>
        </label>
        
        {/* Intensity Slider */}
        <label className="control-group">
          <span className="control-label">Intensity</span>
          <div className="control-input">
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05" 
              value={intensity} 
              onChange={(e) => setIntensity(parseFloat(e.target.value))} 
              disabled={sensorLocked}
              aria-label="Spatial intensity"
            />
            <output>{intensity.toFixed(2)}</output>
          </div>
          <span className="control-hint">Strength of 8D effect</span>
        </label>
        
        {/* Spatial Depth Slider */}
        <label className="control-group">
          <span className="control-label">Spatial Depth</span>
          <div className="control-input">
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05" 
              value={spatialDepth} 
              onChange={(e) => setSpatialDepth(parseFloat(e.target.value))} 
              disabled={sensorLocked}
              aria-label="Spatial depth"
            />
            <output>{spatialDepth.toFixed(2)}</output>
          </div>
          <span className="control-hint">Front-back movement range</span>
        </label>
        
        {/* Movement Pattern Dropdown */}
        <label className="control-group">
          <span className="control-label">Movement Pattern</span>
          <select 
            value={movementPattern} 
            onChange={(e) => setMovementPattern(e.target.value)}
            disabled={sensorLocked}
            aria-label="Movement pattern"
          >
            <option value="circle">Circle (Steady orbit)</option>
            <option value="figure8">Figure-8 (Best for focus)</option>
            <option value="random">Random (Energizing chaos)</option>
          </select>
        </label>
        
        {/* Binaural Beats Checkbox */}
        <label className="control-group checkbox-group">
          <input 
            type="checkbox" 
            checked={binauralEnabled} 
            onChange={(e) => setBinauralEnabled(e.target.checked)} 
            disabled={sensorLocked}
          />
          <span className="control-label">Binaural Beats</span>
        </label>
        
        {/* Binaural Frequency Slider (conditional) */}
        {binauralEnabled && (
          <label className="control-group">
            <span className="control-label">Binaural Frequency</span>
            <div className="control-input">
              <input 
                type="range" 
                min="0" 
                max="40" 
                step="1" 
                value={binauralFreq} 
                onChange={(e) => setBinauralFreq(parseInt(e.target.value))} 
                disabled={sensorLocked}
                aria-label="Binaural frequency"
              />
              <output>
                {binauralFreq} Hz 
                <span className="freq-band">({getBinauralBand(binauralFreq)})</span>
              </output>
            </div>
            <span className="control-hint">{getBinauralHint(binauralFreq)}</span>
          </label>
        )}
        
        {/* Noise Type Dropdown */}
        <label className="control-group">
          <span className="control-label">Noise Type</span>
          <select 
            value={noiseType} 
            onChange={(e) => setNoiseType(e.target.value)}
            disabled={sensorLocked}
            aria-label="Noise type"
          >
            <option value="pink">Pink (Balanced, natural)</option>
            <option value="white">White (Bright, masking)</option>
            <option value="brown">Brown (Deep, rumbling)</option>
          </select>
        </label>
        
        {/* Noise Volume Slider */}
        <label className="control-group">
          <span className="control-label">Noise Volume</span>
          <div className="control-input">
            <input 
              type="range" 
              min="0" 
              max="0.5" 
              step="0.01" 
              value={noiseVolume} 
              onChange={(e) => setNoiseVolume(parseFloat(e.target.value))} 
              disabled={sensorLocked}
              aria-label="Noise volume"
            />
            <output>{(noiseVolume * 100).toFixed(0)}%</output>
          </div>
          <span className="control-hint">Background noise cushion</span>
        </label>
      </div>
      
      {/* Sensor Lock Notice */}
      {sensorLocked && (
        <div className="sensor-lock-notice" role="status" aria-live="polite">
          <span className="lock-icon">🔒</span>
          <span className="lock-message">Parameters locked by adaptive mode</span>
          <button 
            onClick={() => {
              setSensorLocked(false);
              setA11yAnnouncement('Adaptive mode disabled. Controls unlocked.');
            }}
            className="unlock-btn"
          >
            Unlock Manual Control
          </button>
        </div>
      )}
    </details>
  );
};

// Helper: Get binaural frequency band name
const getBinauralBand = (freq) => {
  if (freq < 4) return 'Delta';
  if (freq < 8) return 'Theta';
  if (freq < 14) return 'Alpha';
  if (freq < 30) return 'Beta';
  return 'Gamma';
};

// Helper: Get binaural frequency hint
const getBinauralHint = (freq) => {
  if (freq < 4) return 'Deep sleep, healing';
  if (freq < 8) return 'Deep relaxation, meditation';
  if (freq < 14) return 'Calm focus, learning';
  if (freq < 30) return 'Active focus, problem-solving';
  return 'Peak alertness, high energy';
};
```

**Testing:**
- [ ] Manual test: All 8 controls render correctly
- [ ] Accessibility test: Tab through controls, verify labels announced
- [ ] Manual test: Expand/collapse drawer works

### Task 3-2-2: Add Keyboard Shortcut (Ctrl+E)
**Priority:** MEDIUM  
**Estimate:** 15 minutes

**Implementation:**
```javascript
useEffect(() => {
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault();
      setIsAdvancedControlsExpanded(prev => !prev);
      setA11yAnnouncement(
        isAdvancedControlsExpanded 
          ? 'Advanced controls collapsed' 
          : 'Advanced controls expanded'
      );
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isAdvancedControlsExpanded]);
```

**Testing:**
- [ ] Manual test: Press Ctrl+E, verify drawer toggles
- [ ] Manual test: Press Cmd+E on Mac, verify works
- [ ] Accessibility test: Screen reader announces state change

### Task 3-2-3: Wire Live Parameter Binding
**Priority:** HIGH  
**Estimate:** 20 minutes

**Note:** No new code needed! Existing Epic 1 useEffects already listen to parameter state changes and update audio graph. Simply passing existing state/setter props to AdvancedControls component enables live binding.

**Implementation:**
```javascript
// In main App component:
<AdvancedControls
  speed={speed}
  setSpeed={setSpeed}
  intensity={intensity}
  setIntensity={setIntensity}
  // ... pass all 8 parameter states + setters
  isExpanded={isAdvancedControlsExpanded}
  setIsExpanded={setIsAdvancedControlsExpanded}
  sensorLocked={sensorLocked}
/>
```

**Testing:**
- [ ] Integration test: Adjust speed slider → verify audio graph speed changes
- [ ] Performance test: Measure onChange → audio update latency (<100ms)
- [ ] Manual test: Adjust all 8 parameters, verify audio reflects changes

### Task 3-2-4: Add sensorLocked State for Epic 5
**Priority:** LOW (future-proofing)  
**Estimate:** 10 minutes

**Implementation:**
```javascript
const [sensorLocked, setSensorLocked] = useState(false);

// E5 will call these functions to control lock state:
const enableSensorMode = () => {
  setSensorLocked(true);
  setA11yAnnouncement('Adaptive mode enabled. Controls locked.');
  showToast('Adaptive mode active', 'info');
};

const disableSensorMode = () => {
  setSensorLocked(false);
  setA11yAnnouncement('Adaptive mode disabled. Controls unlocked.');
  showToast('Manual control restored', 'info');
};

// Expose for E5 integration:
window.audioControlsAPI = {
  enableSensorMode,
  disableSensorMode
};
```

**Testing:**
- [ ] Manual test: Call `window.audioControlsAPI.enableSensorMode()` in console, verify sliders disabled
- [ ] Manual test: Click "Unlock" button, verify sliders re-enabled
- [ ] Accessibility test: Lock icon and message announced to screen readers

### Task 3-2-5: Style Advanced Controls with CSS
**Priority:** MEDIUM  
**Estimate:** 45 minutes

**CSS Implementation:**
```css
/* Advanced Controls Drawer */
.advanced-controls {
  background: var(--surface-1);
  border: 2px solid var(--border-subtle);
  border-radius: 12px;
  padding: 1rem;
  margin-top: 1rem;
}

.advanced-controls summary {
  font-weight: 600;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  list-style: none; /* Hide default arrow */
}

.advanced-controls summary::after {
  content: '▼';
  transition: transform 0.2s;
}

.advanced-controls[open] summary::after {
  transform: rotate(180deg);
}

.advanced-controls kbd {
  font-size: 0.75rem;
  background: var(--surface-2);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  border: 1px solid var(--border-subtle);
}

/* Controls Grid */
.controls-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-label {
  font-weight: 500;
  color: var(--text-1);
}

.control-input {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.control-input input[type="range"] {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  appearance: none;
  background: linear-gradient(to right, var(--accent-focus) 0%, var(--surface-3) 0%);
}

.control-input input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent-focus);
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.control-input input[type="range"]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.control-input output {
  font-variant-numeric: tabular-nums;
  min-width: 3.5rem;
  text-align: right;
  font-weight: 600;
  color: var(--text-2);
}

.freq-band {
  font-size: 0.85rem;
  color: var(--text-3);
  font-weight: 400;
}

.control-hint {
  font-size: 0.85rem;
  color: var(--text-3);
  font-style: italic;
}

/* Sensor Lock Notice */
.sensor-lock-notice {
  background: var(--warning-bg);
  border: 2px solid var(--warning-border);
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.lock-icon {
  font-size: 1.5rem;
}

.lock-message {
  flex: 1;
  font-weight: 500;
  color: var(--warning-text);
}

.unlock-btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  background: var(--surface-1);
  border: 2px solid var(--border);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.unlock-btn:hover {
  background: var(--accent-focus);
  color: white;
  border-color: var(--accent-focus);
}

/* Checkbox Styling */
.checkbox-group {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.checkbox-group input[type="checkbox"] {
  width: 24px;
  height: 24px;
  cursor: pointer;
}

/* Responsive */
@media (max-width: 640px) {
  .controls-grid {
    grid-template-columns: 1fr;
  }
}
```

**Testing:**
- [ ] Manual test: Verify drawer styling matches design system
- [ ] Manual test: Dark mode toggle, verify colors adapt
- [ ] Responsive test: Test on 320px, 768px, 1024px viewports

### Task 3-2-6: Performance Testing & Latency Validation
**Priority:** HIGH  
**Estimate:** 30 minutes

**Measurement Code:**
```javascript
// Add to each slider onChange:
const handleSpeedChange = (e) => {
  performance.mark('param-change-start');
  setSpeed(parseFloat(e.target.value));
  
  // Measure in useEffect after audio update:
  requestAnimationFrame(() => {
    performance.mark('param-change-end');
    const measure = performance.measure(
      'param-latency', 
      'param-change-start', 
      'param-change-end'
    );
    if (measure.duration > 100) {
      console.warn(`Slow parameter update: ${measure.duration.toFixed(2)}ms`);
    }
  });
};
```

**Testing:**
- [ ] Performance test: Measure all 8 parameter latencies (target <100ms)
- [ ] Load test: Adjust sliders rapidly 50 times, check for stuttering
- [ ] Low-end device test: Test on 5-year-old Android phone

---

## Dev Agent Record

### Context Reference
- `docs/epic-3-preset-mode-orchestration.context.xml`

### Implementation Notes
- **Leverage existing useEffects**: Epic 1 already has useEffects watching `speed`, `intensity`, etc. that update the audio graph. No new audio code needed—just pass existing state to new component.
- **React 18 batching**: onChange events are already batched, so multiple rapid slider changes won't cause performance issues.
- **Sensor lock is future-proofing**: Epic 5 will control `sensorLocked` state when adaptive mode activates.

### File List
- `index.html` (AdvancedControls component implementation)
- `docs/stories/3-2-advanced-controls-drawer.md` (this file)

---

## Testing Strategy

### Unit Tests (3 tests)
1. `getBinauralBand()` returns correct band name for frequency ranges
2. `getBinauralHint()` returns helpful description for each band
3. Sensor lock state disables all controls when `sensorLocked = true`

### Integration Tests (4 tests)
1. Speed slider onChange → setSpeed called → audio graph updates
2. Keyboard shortcut Ctrl+E toggles drawer expansion
3. Binaural checkbox disables frequency slider when unchecked
4. Sensor lock notice appears when `sensorLocked = true`

### Manual Tests (8 tests)
1. **Smoke test:** Open drawer, adjust all 8 parameters, verify audio changes
2. **Accessibility:** Tab through all controls with keyboard only
3. **Screen reader:** Verify labels, values, hints announced correctly
4. **Performance:** Measure slider onChange latency (<100ms target)
5. **Responsive:** Test on mobile (320px), tablet (768px), desktop (1024px+)
6. **Dark mode:** Toggle dark mode, verify colors adapt correctly
7. **Sensor lock:** Mock `setSensorLocked(true)`, verify controls disabled
8. **Regression:** Run Epic 1/2 smoke tests, verify no breakage

---

## Definition of Done Checklist

### Code Implementation
- [ ] AdvancedControls component built with all 8 controls
- [ ] Keyboard shortcut Ctrl+E implemented
- [ ] Live parameter binding working (existing useEffects handle audio)
- [ ] Sensor lock UI implemented with unlock button
- [ ] Helper text and frequency band labels added
- [ ] CSS styling complete with responsive grid

### Testing
- [ ] 3 unit tests passing
- [ ] 4 integration tests passing
- [ ] 8 manual tests executed and documented
- [ ] Performance targets validated (<100ms latency)
- [ ] Accessibility tests passing (keyboard, screen reader)
- [ ] Epic 1/2 regression tests still passing

### Documentation
- [ ] Code comments explain component structure
- [ ] Performance measurements documented
- [ ] Accessibility compliance verified (WCAG AA)

### Quality Gates
- [ ] No console errors or warnings
- [ ] No audio dropouts during parameter adjustments
- [ ] Sliders usable on touch devices (48px tap target)
- [ ] Drawer expand/collapse smooth animation
- [ ] Dark mode fully supported

### Handoff
- [ ] Code reviewed by senior developer
- [ ] QA smoke test passed
- [ ] Story marked "review" → "done" in sprint status
- [ ] Ready for Story 3-3 (depends on parameter state)

---

## Success Metrics

**Primary KPI:** <100ms parameter update latency  
**Measurement:** `performance.measure()` on each slider onChange  
**Baseline:** N/A (new feature)  
**Target:** 50-100ms actual, <100ms perceived

**Secondary KPI:** ≥60% of advanced users engage with sliders  
**Measurement:** Epic 4 session logs track advanced control usage  
**Baseline:** 0% (no controls exist)  
**Target (post-Epic 3):** 60%+ of users who save custom presets

---

## Dependencies & Blockers

**Depends On:**
- ✅ Story 3-1 complete (needs `activePresetId` state)
- ✅ Epic 1 complete (needs existing audio parameter useEffects)
- ✅ Epic 2 complete (needs toast system, a11yAnnouncement)

**Blocks:**
- Story 3-3: Custom Preset CRUD (users need sliders to create custom presets)
- Epic 5: Adaptive Sensors (needs sensor lock UI)

**No Current Blockers**

---

## Notes & Considerations

### Architecture Alignment
- Single-file React architecture maintained (component inline in index.html)
- Uses existing audio parameter state hooks (no new state structure)
- CSS variables for theming (dark mode support built-in)
- Telemetry-ready (can log slider interactions for Epic 4)

### Accessibility Wins
- All sliders have visible labels and value readouts
- Keyboard shortcut documented with `<kbd>` element
- Sensor lock announced via aria-live
- Focus indicators visible on all controls

### Performance Considerations
- Existing useEffects already optimized for audio updates
- No new Web Audio nodes created (parameter-only changes)
- React 18 batching prevents excessive re-renders
- RequestAnimationFrame used for smooth latency measurement

### Future Enhancements (Out of Scope)
- Preset comparison mode (side-by-side A/B testing)
- Parameter randomizer ("Surprise me!" button)
- Advanced control presets (save slider layouts)
- Multi-dimensional visualization of parameter space
