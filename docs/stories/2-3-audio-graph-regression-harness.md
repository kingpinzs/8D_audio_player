# Story 2.3: Audio Graph Regression Harness

**Epic:** E2 – Audio Intake & Graph Hardening  
**Status:** drafted  
**Owner:** Unassigned  
**Priority:** CRITICAL  
**Complexity:** HIGH  
**Source:** docs/create-epics-and-stories.md (S2.3)

---

## Summary
Preserve the v2 audio graph topology exactly (MediaElementSource → Gain → Rotation → Analyser) with binaural/noise hooks, ensure <20ms parameter latency, maintain 60fps analyzer rendering, and create automated regression test comparing v2 vs unified build.

## Story

As a ritual player user,
I need the audio graph to deliver the same reliable, artifact-free playback as v2,
so that I can trust the unified player for my focus sessions without audio regressions.

## Acceptance Criteria

1. **Audio graph matches v2 topology** – The setupAudioGraph function creates nodes in exact v2 order: source → splitter → rotation gains (leftToLeft, leftToRight, rightToLeft, rightToRight) → merger → main gain (with 0.6 headroom) → compressor → limiter → analyser → destination. Code review confirms 1:1 match with 8d-audio-live-v2.html lines 634-850.

2. **Binaural oscillators integrate correctly** – Binaural beats connect via dedicated gain nodes following v2 pattern (lines 780-850). Frequency adjustments apply smoothly without clicks or pops. Integration uses AudioEngine.createBinauralNodes() helper.

3. **Noise layer uses v2 algorithm** – Pink/white noise buffer generation follows v2 implementation. Noise volume control does not introduce clipping. Integration uses AudioEngine.createNoiseNode() helper.

4. **Parameter changes apply in <20ms** – Speed, intensity, volume, binaural frequency, and noise volume changes complete in <20ms (measured via Performance API). 100-iteration automated test confirms consistent latency.

5. **Analyzer renders at 60fps** – Analyzer canvas updates at 60fps during playback (requestAnimationFrame loop). Chrome DevTools Performance profiler confirms frame rate stays within 55-60fps tolerance over 10-second recording.

6. **Regression log documents v2 parity** – Manual side-by-side comparison of v2 vs unified build produces regression log in tests/audio-regression-2025-11-11.md covering volume consistency, rotation smoothness, analyzer patterns, and 10min stress test results.

7. **Zero audio artifacts** – 10-minute continuous playback produces zero dropouts, clipping, pops, clicks, or distortion. Tested with multiple MP3s at volume=0.7 and various rotation speeds.

## Tasks / Subtasks

- [ ] Align setupAudioGraph to v2 topology (AC #1)
  - [ ] Study v2 reference: 8d-audio-live-v2.html lines 634-850
  - [ ] Document current differences: index.html lines 1140-1250
  - [ ] Refactor node creation order to match v2 exactly
  - [ ] Implement leftToLeftGain, leftToRightGain, rightToLeftGain, rightToRightGain (v2 manual panning)
  - [ ] Add delay nodes with v2 gain values (0.05, 0.03 to prevent clipping)
  - [ ] Apply 0.6 headroom multiplier to master gain
  - [ ] Store rotation nodes in rotationNodesRef for live updates
  - [ ] Visual diff review: Compare final code against v2 line-by-line

- [ ] Integrate binaural oscillators (AC #2)
  - [ ] Review v2 binaural implementation (lines 780-850)
  - [ ] Call AudioEngine.createBinauralNodes() after main gain creation
  - [ ] Wire binaural output to merge before analyser
  - [ ] Test frequency changes (7Hz → 14Hz) for smooth transitions
  - [ ] Verify no phase issues or clicking artifacts
  - [ ] Test binaural enable/disable toggle

- [ ] Integrate noise layer (AC #3)
  - [ ] Review v2 noise generation algorithm
  - [ ] Call AudioEngine.createNoiseNode() for pink/white buffer creation
  - [ ] Wire noise output to merge before analyser
  - [ ] Test noise volume adjustments (0.0 → 0.5) for clipping
  - [ ] Verify noise type switching (none → white → pink)
  - [ ] Confirm noise does not overpower music track

- [ ] Implement parameter latency measurement (AC #4)
  - [ ] Add Performance API timing to all parameter setters
  - [ ] Create automated test: Loop 100 parameter changes
  - [ ] Assert each change completes in <20ms
  - [ ] Log worst-case latency to console
  - [ ] Test with multiple parameters: speed, intensity, volume, binaural freq, noise volume
  - [ ] Document latency measurement pattern for future stories

- [ ] Verify analyzer 60fps rendering (AC #5)
  - [ ] Confirm requestAnimationFrame loop (index.html ~1300)
  - [ ] Open Chrome DevTools → Performance tab
  - [ ] Record 10-second playback session
  - [ ] Analyze frame rate in timeline
  - [ ] Assert FPS stays within 55-60fps tolerance
  - [ ] Profile bottlenecks if FPS drops below threshold
  - [ ] Test with reduced-motion mode (should throttle to 10fps)

- [ ] Create regression test harness (AC #6)
  - [ ] Create tests/audio-regression-2025-11-11.md template
  - [ ] Load same MP3 in v2 (left tab) and unified (right tab)
  - [ ] Volume consistency test: Compare perceived loudness at 0.7 volume
  - [ ] Rotation smoothness test: Verify panning cycle time at speed=1.0
  - [ ] Analyzer pattern test: Compare waveform visualizations side-by-side
  - [ ] 10-minute stress test: Log any dropouts, clicks, or artifacts
  - [ ] Document results with timestamps and observations

- [ ] Conduct 10-minute stress test (AC #7)
  - [ ] Select 3 test MP3s (different genres, bitrates)
  - [ ] Play each for 10 minutes at volume=0.7
  - [ ] Test rotation speeds: 0.5, 1.0, 2.0
  - [ ] Listen for dropouts, clipping, pops, clicks, distortion
  - [ ] Monitor CPU usage and memory consumption
  - [ ] Document any artifacts with timestamp and reproduction steps
  - [ ] Verify zero issues before marking story done

## Dev Notes

### Critical References

**v2 Gold Standard:**
- File: `8d-audio-live-v2.html`
- Lines 634-850: setupAudioGraph function (EXACT topology to preserve)
- Lines 750-770: Compressor/limiter configuration
- Lines 780-850: Binaural beats and noise setup
- Lines 800-850: startRotation with smoothed gain changes

**Current Implementation:**
- File: `index.html`
- Lines 1140-1250: setupAudioGraph (NEEDS ALIGNMENT)
- Lines 1260-1300: startRotation function
- Lines 1300-1350: Analyzer visualization loop

**Helper Library:**
- File: `audio-engine.js`
- Lines 1-100: connectGainStaging (master gain + compressor + limiter + analyser)
- Lines 101-150: createBinauralNodes (binaural oscillator pair)
- Lines 151-222: createNoiseNode (pink/white buffer generation)

### Key Differences to Fix

1. **Manual Panning Nodes (v2 critical)**
   ```javascript
   // v2 uses 4 gain nodes for aggressive 8D effect
   const leftToLeftGain = context.createGain();
   const leftToRightGain = context.createGain();
   const rightToLeftGain = context.createGain();
   const rightToRightGain = context.createGain();
   
   // Current implementation may be using StereoPanner instead
   // MUST switch to manual gain-based panning for v2 parity
   ```

2. **Delay Gains (Prevent Clipping)**
   ```javascript
   // v2 uses drastically reduced delay gains
   delayGainLeft.gain.value = 0.05 * spatialDepth;  // NOT 0.5!
   delayGainRight.gain.value = 0.05 * spatialDepth;
   crossGainLeft.gain.value = 0.03 * spatialDepth;  // NOT 0.3!
   crossGainRight.gain.value = 0.03 * spatialDepth;
   
   // These low values prevent clipping/distortion in v2
   ```

3. **Headroom Multiplier**
   ```javascript
   // v2 applies 0.6 headroom to master gain
   mainGain.gain.value = volume * 0.6;  // NOT just `volume`
   
   // This provides extra safety margin to prevent clipping
   ```

4. **Rotation Node Storage**
   ```javascript
   // v2 stores rotation gains for live updates
   rotationNodesRef.current = {
     leftToLeftGain,
     leftToRightGain,
     rightToLeftGain,
     rightToRightGain,
     delayGainLeft,
     delayGainRight,
     crossGainLeft,
     crossGainRight
   };
   
   // startRotation() uses these refs to update gain values smoothly
   ```

5. **Smooth Gain Transitions (Prevent Clicks)**
   ```javascript
   // v2 uses linearRampToValueAtTime for smooth transitions
   const now = ctx.currentTime;
   const rampTime = now + 0.05; // 50ms ramp
   
   leftToLeftGain.gain.setValueAtTime(leftToLeftGain.gain.value, now);
   leftToLeftGain.gain.linearRampToValueAtTime(targetLeftGain, rampTime);
   
   // NOT: leftToLeftGain.gain.value = targetLeftGain; (causes clicks)
   ```

### Integration with audio-engine.js

The v2 graph uses manual nodes for rotation, but should integrate with audio-engine.js helpers for:

1. **Gain Staging Chain** (after rotation nodes):
   ```javascript
   // After merger → mainGain, use audio-engine.js
   const gainStaging = AudioEngine.connectGainStaging(context, merger, {
     headroom: 0.6,  // v2 headroom
     volume: volume,
     fftSize: 2048
   });
   
   // Returns: { mainGain, compressor, limiter, analyser, setVolume(), disconnect() }
   ```

2. **Binaural Layer** (parallel to music):
   ```javascript
   if (binauralEnabled) {
     const binaural = AudioEngine.createBinauralNodes(context, gainStaging.mainGain, binauralFreq, {
       volume: 0.15  // v2 default binaural mix
     });
     // Binaural nodes auto-connect to destination
   }
   ```

3. **Noise Layer** (parallel to music):
   ```javascript
   if (noiseType !== 'none') {
     const noise = AudioEngine.createNoiseNode(context, noiseType);
     noise.connect(gainStaging.mainGain);
     noise.volume = noiseVolume;  // Controlled separately
   }
   ```

### Performance Measurement Pattern

Add to all parameter setter functions:

```javascript
const updateSpeed = (newSpeed) => {
  const t0 = performance.now();
  
  setSpeed(newSpeed);
  // Audio parameter updates happen here
  
  const t1 = performance.now();
  const latency = t1 - t0;
  
  if (latency > 20) {
    console.warn(`⚠️ Parameter latency exceeded: ${latency.toFixed(2)}ms (threshold: 20ms)`);
  }
  
  // Optional: Log to session telemetry
  // SessionLogger.logEvent('parameter-change', { parameter: 'speed', latency });
};
```

### Automated Latency Test

Create test helper:

```javascript
// tests/parameter-latency.test.js (manual node test, not Jest)
const testParameterLatency = () => {
  const results = [];
  const iterations = 100;
  
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    
    // Simulate parameter change
    setSpeed(Math.random() * 2);
    
    const t1 = performance.now();
    results.push(t1 - t0);
  }
  
  const maxLatency = Math.max(...results);
  const avgLatency = results.reduce((a, b) => a + b) / results.length;
  
  console.log(`Latency Test Results (${iterations} iterations):`);
  console.log(`  Average: ${avgLatency.toFixed(2)}ms`);
  console.log(`  Max: ${maxLatency.toFixed(2)}ms`);
  console.log(`  Pass: ${maxLatency < 20 ? '✅' : '❌'}`);
  
  return maxLatency < 20;
};
```

### Regression Test Template

Create `tests/audio-regression-2025-11-11.md`:

```markdown
# Audio Regression Test – v2 vs Unified Build
**Date:** 2025-11-11  
**Tester:** [Your Name]  
**v2 Reference:** 8d-audio-live-v2.html  
**Unified Build:** index.html

## Test Environment
- Browser: Chrome 120.0.6099.129
- OS: [Your OS]
- Test MP3: [Filename, duration, bitrate]

## Volume Consistency Test
**Setup:** Load same MP3 in v2 (left tab) and unified (right tab) at volume=0.7

| Timestamp | v2 Perceived Loudness | Unified Perceived Loudness | Match? |
|-----------|----------------------|---------------------------|--------|
| 0:00      |                      |                           |        |
| 2:30      |                      |                           |        |
| 5:00      |                      |                           |        |

**Result:** [ ] PASS [ ] FAIL  
**Notes:**

## Rotation Smoothness Test
**Setup:** Set speed=1.0, listen for panning cycle time and smoothness

| Metric | v2 | Unified | Match? |
|--------|-----|---------|--------|
| Cycle duration (seconds) | | | |
| Smoothness (no clicks) | | | |
| Spatial width | | | |

**Result:** [ ] PASS [ ] FAIL  
**Notes:**

## Analyzer Pattern Test
**Setup:** Compare waveform visualizations side-by-side

| Time | v2 Waveform | Unified Waveform | Match? |
|------|-------------|------------------|--------|
| 0:00 | [Screenshot] | [Screenshot] | |
| 2:30 | [Screenshot] | [Screenshot] | |

**Result:** [ ] PASS [ ] FAIL  
**Notes:**

## 10-Minute Stress Test
**Setup:** Continuous playback, monitor for artifacts

| Time | Dropouts | Clicks/Pops | Clipping | CPU % | Notes |
|------|----------|-------------|----------|-------|-------|
| 0-2min | | | | | |
| 2-4min | | | | | |
| 4-6min | | | | | |
| 6-8min | | | | | |
| 8-10min | | | | | |

**Result:** [ ] PASS (zero artifacts) [ ] FAIL  
**Notes:**

## Overall Assessment
[ ] Audio graph matches v2 exactly  
[ ] No perceptible differences in playback quality  
[ ] Zero artifacts during extended playback  
[ ] READY FOR PRODUCTION

**Recommendation:**
```

### Accessibility Considerations

**No Regression:** This story focuses on audio graph internals and should NOT break Epic 1 accessibility features.

**Maintain:**
- [ ] Pa11y score remains at 0 issues
- [ ] Keyboard navigation still works
- [ ] Screen reader announcements intact
- [ ] Focus indicators visible
- [ ] High-contrast mode functional

**Test After Implementation:**
```bash
pa11y http://localhost:8000/index.html --reporter json > tests/pa11y-story-2-3.json
```

Expected: `"issues": []` (0 issues)

### Testing Workflow

1. **Serve repo locally:**
   ```bash
   python3 -m http.server 8000
   # or
   npx http-server . -p 8000 --cors
   ```

2. **Open both builds:**
   - v2: http://localhost:8000/8d-audio-live-v2.html
   - Unified: http://localhost:8000/index.html

3. **Load same MP3 in both tabs**

4. **Run regression checklist** (tests/audio-regression-2025-11-11.md)

5. **Document results** with timestamps and observations

6. **Run automated latency test** in browser console

7. **Run Pa11y audit** to confirm no accessibility regressions

### Definition of Done

- [ ] setupAudioGraph matches v2 topology exactly (code review vs v2 source)
- [ ] Visual diff shows 1:1 match with v2 lines 634-850
- [ ] Binaural integration uses AudioEngine.createBinauralNodes()
- [ ] Noise integration uses AudioEngine.createNoiseNode()
- [ ] Automated latency test: 100 iterations, all <20ms
- [ ] Manual regression checklist completed in tests/audio-regression-2025-11-11.md
- [ ] Volume consistency test: PASS
- [ ] Rotation smoothness test: PASS
- [ ] Analyzer pattern test: PASS
- [ ] 10-minute stress test: Zero artifacts
- [ ] Pa11y audit: 0 issues (no regression from Epic 1)
- [ ] Code review: All v2 patterns preserved
- [ ] Documentation: Regression log committed

---

## Code Review Checklist

Before marking this story as "done", reviewer must verify:

- [ ] **v2 Topology Match:** setupAudioGraph creates nodes in exact v2 order
- [ ] **Manual Panning:** Uses leftToLeftGain/leftToRightGain/rightToLeftGain/rightToRightGain (NOT StereoPanner)
- [ ] **Delay Gains:** Uses v2 values (0.05, 0.03) NOT higher values
- [ ] **Headroom:** Applies 0.6 multiplier to master gain
- [ ] **Node Storage:** rotationNodesRef stores all rotation gains for live updates
- [ ] **Smooth Transitions:** Uses linearRampToValueAtTime for gain changes (NOT direct value assignment)
- [ ] **Binaural Integration:** Calls AudioEngine.createBinauralNodes() correctly
- [ ] **Noise Integration:** Calls AudioEngine.createNoiseNode() correctly
- [ ] **Latency Measurement:** Performance API timing in all parameter setters
- [ ] **Regression Log:** tests/audio-regression-2025-11-11.md exists and documents PASS results
- [ ] **No Audio Artifacts:** 10-minute stress test completed with zero issues
- [ ] **Pa11y Clean:** 0 accessibility issues (maintain Epic 1 standard)
- [ ] **No Breaking Changes:** audio-engine.js interface unchanged (tests still pass)

---

## Completion Notes

**Date Completed:** [YYYY-MM-DD]  
**Implemented By:** [Developer Name]  
**Code Review By:** [Reviewer Name]  
**Regression Test Results:** [Link to tests/audio-regression-2025-11-11.md]

### What Went Well


### Challenges Encountered


### Learnings for Next Story


### Follow-up Items

