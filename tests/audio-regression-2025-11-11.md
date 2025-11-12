# Audio Regression Test – v2 vs Unified Build

**Date:** 2025-11-11  
**Tester:** [Your Name]  
**v2 Reference:** 8d-audio-live-v2.html  
**Unified Build:** index.html  
**Story:** 2-3-audio-graph-regression-harness

---

## Test Environment

- **Browser:** Chrome [Version]
- **OS:** [Operating System]
- **Test MP3:** [Filename, duration, bitrate]
- **Audio Device:** [Headphones/Speakers model]

---

## Volume Consistency Test

**Setup:** Load same MP3 in v2 (left tab) and unified (right tab) at volume=0.7

| Timestamp | v2 Perceived Loudness | Unified Perceived Loudness | Match? | Notes |
|-----------|----------------------|---------------------------|--------|-------|
| 0:00      |                      |                           |        |       |
| 2:30      |                      |                           |        |       |
| 5:00      |                      |                           |        |       |
| 7:30      |                      |                           |        |       |

**Result:** [ ] PASS [ ] FAIL  
**Notes:**

---

## Rotation Smoothness Test

**Setup:** Set speed=1.0, listen for panning cycle time and smoothness

| Metric | v2 | Unified | Match? | Notes |
|--------|-----|---------|--------|-------|
| Cycle duration (seconds) | | | | |
| Smoothness (no clicks) | | | | |
| Spatial width (subjective) | | | | |
| Depth perception | | | | |

**Result:** [ ] PASS [ ] FAIL  
**Notes:**

---

## Analyzer Pattern Test

**Setup:** Compare waveform visualizations side-by-side

| Time | v2 Waveform | Unified Waveform | Match? | Screenshot/Notes |
|------|-------------|------------------|--------|------------------|
| 0:00 | | | | |
| 2:30 | | | | |
| 5:00 | | | | |

**Result:** [ ] PASS [ ] FAIL  
**Notes:**

---

## 10-Minute Stress Test

**Setup:** Continuous playback, monitor for artifacts

### Test Run 1: [MP3 Filename]
| Time | Dropouts | Clicks/Pops | Clipping | CPU % | Memory MB | Notes |
|------|----------|-------------|----------|-------|-----------|-------|
| 0-2min | | | | | | |
| 2-4min | | | | | | |
| 4-6min | | | | | | |
| 6-8min | | | | | | |
| 8-10min | | | | | | |

**Result:** [ ] PASS (zero artifacts) [ ] FAIL  
**Notes:**

### Test Run 2: [MP3 Filename]
| Time | Dropouts | Clicks/Pops | Clipping | CPU % | Memory MB | Notes |
|------|----------|-------------|----------|-------|-----------|-------|
| 0-2min | | | | | | |
| 2-4min | | | | | | |
| 4-6min | | | | | | |
| 6-8min | | | | | | |
| 8-10min | | | | | | |

**Result:** [ ] PASS (zero artifacts) [ ] FAIL  
**Notes:**

### Test Run 3: [MP3 Filename]
| Time | Dropouts | Clicks/Pops | Clipping | CPU % | Memory MB | Notes |
|------|----------|-------------|----------|-------|-----------|-------|
| 0-2min | | | | | | |
| 2-4min | | | | | | |
| 4-6min | | | | | | |
| 6-8min | | | | | | |
| 8-10min | | | | | | |

**Result:** [ ] PASS (zero artifacts) [ ] FAIL  
**Notes:**

---

## Rotation Speed Variation Test

**Setup:** Test different rotation speeds for artifacts

| Speed | Cycle Smooth? | Artifacts? | v2 Match? | Notes |
|-------|---------------|------------|-----------|-------|
| 0.5 | | | | |
| 1.0 | | | | |
| 2.0 | | | | |

**Result:** [ ] PASS [ ] FAIL  
**Notes:**

---

## Binaural Integration Test

**Setup:** Test binaural beats enable/disable and frequency changes

| Test | Expected Behavior | Actual Behavior | Pass? | Notes |
|------|-------------------|-----------------|-------|-------|
| Enable binaural (7Hz) | Subtle beating at 7Hz | | | |
| Change freq 7Hz → 14Hz | Smooth transition | | | |
| Disable binaural | Clean removal, no click | | | |
| Volume consistency | Binaural doesn't overpower music | | | |

**Result:** [ ] PASS [ ] FAIL  
**Notes:**

---

## Noise Layer Integration Test

**Setup:** Test noise generation and volume control

| Test | Expected Behavior | Actual Behavior | Pass? | Notes |
|------|-------------------|-----------------|-------|-------|
| White noise enable | Crisp white noise | | | |
| Pink noise enable | Warm pink noise | | | |
| Noise volume 0.0 → 0.5 | Smooth increase, no clipping | | | |
| Noise type switch (white → pink) | Clean transition | | | |
| Noise doesn't overpower music | Music remains primary | | | |

**Result:** [ ] PASS [ ] FAIL  
**Notes:**

---

## Overall Assessment

### Audio Graph Topology Verification
- [ ] setupAudioGraph matches v2 node order exactly
- [ ] Manual panning gains (leftToLeft, leftToRight, rightToLeft, rightToRight) present
- [ ] Delay gains use v2 values (0.05, 0.03)
- [ ] Headroom multiplier 0.6 applied
- [ ] rotationNodesRef stores all 8 gains

### Quality Checks
- [ ] No perceptible differences in playback quality between v2 and unified
- [ ] Zero audio artifacts during extended playback (dropouts, clicks, clipping)
- [ ] Volume levels match between v2 and unified
- [ ] Rotation smoothness matches v2
- [ ] Spatial effect intensity matches v2

### Integration Checks
- [ ] Binaural beats integrate smoothly
- [ ] Noise layer integrates smoothly
- [ ] Parameter changes are smooth (no clicks)
- [ ] Analyzer continues rendering during playback

**Overall Result:** [ ] PASS - READY FOR PRODUCTION [ ] FAIL - NEEDS FIXES

---

## Recommendation

**Summary:**

**Issues Found:**

**Action Items:**

**Approval:**
- [ ] Tester approves: Audio graph matches v2 parity
- [ ] Code reviewer approves: Implementation matches specification
- [ ] Story marked DONE in sprint status

---

## Code Review Verification

### setupAudioGraph Function Review
- [ ] Node creation order matches v2 lines 634-850
- [ ] All v2 comments preserved or improved
- [ ] Delay time values: 0.05, 0.05, 0.03, 0.03
- [ ] Delay gain values: 0.05 * spatialDepth, 0.05 * spatialDepth, 0.03 * spatialDepth, 0.03 * spatialDepth
- [ ] rotationNodesRef includes all 8 gains

### AudioEngine Integration Review
- [ ] connectGainStaging called with correct parameters
- [ ] MASTER_HEADROOM = 0.6 verified in audio-engine.js
- [ ] createBinauralNodes called correctly (gain defaults to 0.008)
- [ ] createNoiseNode called correctly (pink noise uses v2 filter)

### startRotation Function Review
- [ ] Uses linearRampToValueAtTime for smooth transitions
- [ ] Safety factor = 0.35 matches v2
- [ ] Ramp time = 0.05 seconds matches v2
- [ ] Movement patterns (circle, figure8, etc.) work correctly

---

## Test Execution Log

**Test Started:** [Timestamp]  
**Test Completed:** [Timestamp]  
**Duration:** [Duration]

**Test Steps Executed:**
1. [ ] Served repo locally (http://localhost:8000)
2. [ ] Opened v2 in left tab
3. [ ] Opened unified in right tab
4. [ ] Loaded same test MP3 in both tabs
5. [ ] Ran volume consistency test
6. [ ] Ran rotation smoothness test
7. [ ] Ran analyzer pattern test
8. [ ] Ran 10-minute stress test (3 MP3s)
9. [ ] Ran rotation speed variation test
10. [ ] Ran binaural integration test
11. [ ] Ran noise layer integration test
12. [ ] Documented findings
13. [ ] Made recommendation

**Attachments:**
- Screenshots: [List or attach]
- CPU/Memory logs: [Attach if applicable]
- Console output: [Attach if errors occurred]
