# Gain Normalization Tests

**Created:** 2025-11-12  
**Purpose:** Prevent audio crackling from gain accumulation and clipping

## Problem Statement

Prior to this test suite, the audio graph could accumulate gains from multiple parallel paths:
- 4 primary panning gains (leftToLeft, leftToRight, rightToLeft, rightToRight)
- 4 delay path gains (with spatial depth modulation)
- Cross-channel bleeding

When these paths summed together, total gain could exceed 1.0, causing clipping and crackling artifacts.

## Solution

Implemented **normalized gain distribution** in `startRotation()`:
- Total energy constrained to ≤ 1.0 before MASTER_HEADROOM applied
- Normalization factor: 0.5 (base gain per channel)
- Cross-channel mix: 0.15 (reduced bleeding)
- Exponential ramps: 16ms transitions prevent zipper noise

## Test Coverage

### 1. `testGainNormalization()`
Validates that panning algorithm never exceeds unity gain:

**Test Cases:**
- **Center position** (panPosition = 0): Both channels equal
- **Full left** (panPosition = -1): Left channel dominant
- **Full right** (panPosition = 1): Right channel dominant

**Assertions:**
- `leftTotal ≤ 1.0` for all pan positions
- `rightTotal ≤ 1.0` for all pan positions
- Worst-case with MASTER_HEADROOM (0.6) still safe

**Sample Output:**
```
✓ Center position: L=0.287, R=0.287
✓ Full left: L=0.575, R=0.001
✓ Full right: L=0.001, R=0.575
✓ Worst-case with MASTER_HEADROOM: 0.345
```

### 2. `testDelayGainAccumulation()`
Verifies delay paths don't push total gain over unity:

**Test Cases:**
- Maximum spatial depth (1.0)
- Delay gain: 0.05 × spatialDepth
- Cross gain: 0.03 × spatialDepth

**Assertions:**
- `mainGain + delayContribution ≤ 1.0`
- Delay contribution is additive, not multiplicative

**Sample Output:**
```
Main gain (max): 0.500
Delay contribution: 0.080
Total worst-case: 0.580
```

### 3. `testExponentialRampSmoothing()`
Ensures smooth gain transitions prevent clicks:

**Test Cases:**
- Update interval: 50ms (rotation loop)
- Ramp time: 16ms (~1 frame at 60fps)
- Clamping: 0.0001 to 1.0 prevents Web Audio errors

**Assertions:**
- `rampTime < updateInterval` (no overlap)
- Clamp function bounds all values correctly

**Sample Output:**
```
Update interval: 50ms
Ramp time: 16ms
Ratio: 32.0%
```

### 4. `testCrossChannelBleeding()`
Validates cross-feed doesn't cause phase issues:

**Test Cases:**
- Cross-channel mix: 15% of opposite channel
- Direct path dominance verification

**Assertions:**
- `maxCrossFeed < maxDirectGain × 0.3` (cross-feed < 30%)
- `directGain + crossFeed ≤ 1.0`

**Sample Output:**
```
Max direct gain: 0.500
Max cross-feed: 0.075
Total: 0.575
```

## Running the Tests

```bash
node tests/gain-staging.test.js
```

Expected output:
```
✅ All gain staging regression tests passed.
```

## Continuous Integration

These tests should run:
1. **Before merging** any audio engine changes
2. **After modifying** `startRotation()` or `setupAudioGraph()`
3. **When adjusting** MASTER_HEADROOM or normalization constants

## Future Enhancements

- [ ] Add worst-case stress test with all effects enabled (binaural + noise + delays)
- [ ] Verify compressor/limiter settings prevent clipping from rare edge cases
- [ ] Test dynamic preset switching doesn't cause transient spikes
- [ ] Monitor actual Web Audio node gain values in browser environment

## Related Files

- `/tests/gain-staging.test.js` - Test implementation
- `/index.html` - `startRotation()` function (lines 2461-2548)
- `/audio-engine.js` - `connectGainStaging()` with MASTER_HEADROOM
- `/docs/epic-2-audio-intake-graph-hardening.context.xml` - Audio graph architecture

## References

- [Web Audio API: Preventing Clipping](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Basic_concepts_behind_Web_Audio_API#audio_graphs)
- [Gain Staging Best Practices](https://webaudio.github.io/web-audio-api/#gain-staging)
