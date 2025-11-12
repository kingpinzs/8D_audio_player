# Story 3-1: Quick Mode Presets - Manual Test Plan

**Story:** Quick Mode Presets  
**Date:** 2025-01-XX  
**Tester:** [Your Name]  
**Build:** Story 3-1 implementation complete (Tasks 1-5)

## Test Environment
- Browser: Chrome/Firefox/Safari
- Server: http://localhost:8000/index.html
- Audio: Working speakers/headphones required

## Implementation Summary
- ✅ Added `activePresetId` state (defaults to 'focus')
- ✅ Implemented localStorage persistence (load + save)
- ✅ Created `logPresetChange()` event logging helper
- ✅ Refactored `applyPreset()` with performance tracking
- ✅ Updated `setActiveMode()` to call `applyPreset()`
- ✅ Updated mode chips UI to use `activePresetId` for aria-selected
- ✅ Added useEffect to apply preset parameters on mount

## Test Cases

### TC-1: Initial Load with Default Preset
**Steps:**
1. Clear localStorage: `localStorage.clear()` in console
2. Refresh page
3. Observe console for performance logs
4. Check Focus chip is highlighted (purple accent)

**Expected:**
- Focus preset is selected by default
- Console shows: `[Performance] Preset applied in X ms`
- aria-selected="true" on Focus chip
- Hero card shows "Focus ritual" heading

**Actual:**
- [ ] PASS / [ ] FAIL
- Performance: ___ms
- Notes: 

---

### TC-2: Preset Switching (Manual Clicks)
**Steps:**
1. Click "Calm" chip
2. Observe console logs
3. Click "Energize" chip
4. Observe console logs
5. Click "Focus" chip
6. Observe console logs

**Expected (for each click):**
- Console shows: `[SessionLogger] PRESET_CHANGED` with presetId
- Console shows: `[Performance] Preset applied in X ms` (< 100ms)
- Chip visual highlight updates immediately
- aria-selected moves to new chip
- Hero card heading updates
- Hero message shows "X preset queued"
- No audio glitches if playing

**Actual:**
- [ ] PASS / [ ] FAIL
- Focus→Calm: ___ms
- Calm→Energize: ___ms
- Energize→Focus: ___ms
- Notes:

---

### TC-3: Keyboard Navigation
**Steps:**
1. Tab to mode chips area
2. Use Arrow Right to move to next chip
3. Use Arrow Left to move to previous chip
4. Press Enter to select highlighted chip
5. Use Home key to jump to first chip
6. Use End key to jump to last chip

**Expected:**
- Roving tabindex works (only one chip has tabindex="0")
- Arrow keys move focus between chips
- Enter/Space activates preset
- Home/End jump to first/last
- Visual focus indicator visible
- Screen reader announces chip label

**Actual:**
- [ ] PASS / [ ] FAIL
- Notes:

---

### TC-4: localStorage Persistence
**Steps:**
1. Select "Energize" preset
2. Check console: `localStorage.getItem('activePresetId')`
3. Refresh page
4. Verify "Energize" chip is still selected

**Expected:**
- localStorage shows: `"energize"`
- After refresh, Energize chip has aria-selected="true"
- Console shows: `[Performance] Preset applied in X ms` on mount
- Energize preset parameters are active

**Actual:**
- [ ] PASS / [ ] FAIL
- localStorage value: ___
- Notes:

---

### TC-5: Performance Target (<100ms)
**Steps:**
1. Open Console → Performance tab
2. Click between presets 10 times rapidly
3. Record all `[Performance] Preset applied in X ms` logs
4. Calculate average latency

**Expected:**
- All measurements < 100ms
- Average latency < 50ms
- No visual lag or jank
- No audio dropouts

**Actual:**
- [ ] PASS / [ ] FAIL
- Measurements: 
  1. ___ms
  2. ___ms
  3. ___ms
  4. ___ms
  5. ___ms
  6. ___ms
  7. ___ms
  8. ___ms
  9. ___ms
  10. ___ms
- Average: ___ms
- Notes:

---

### TC-6: Event Logging Structure
**Steps:**
1. Open Console
2. Click "Calm" preset
3. Inspect `[SessionLogger] PRESET_CHANGED` log object

**Expected event structure:**
```json
{
  "event": "PRESET_CHANGED",
  "presetId": "calm",
  "previousPresetId": "focus",
  "timestamp": 1234567890,
  "trackId": null
}
```

**Actual:**
- [ ] PASS / [ ] FAIL
- Event structure matches: [ ] YES / [ ] NO
- Notes:

---

### TC-7: Audio Parameter Application
**Steps:**
1. Select "Focus" preset
2. Open browser DevTools → Elements → inspect speed/intensity elements (if visible)
3. Verify audio parameters match MODE_LIBRARY definition:
   - speed: 12, intensity: 0.7, spatialDepth: 0.6, movement: "circular"
   - binaural: enabled=true, freq=40
   - noise: type="pink", volume=0.15

4. Select "Calm" preset
5. Verify parameters changed to:
   - speed: 8, intensity: 0.5, spatialDepth: 0.4, movement: "pendulum"
   - binaural: enabled=true, freq=4
   - noise: type="brown", volume=0.1

**Expected:**
- All 8 parameters update when preset changes
- React state reflects MODE_LIBRARY values
- Audio graph responds to parameter changes (if playing)

**Actual:**
- [ ] PASS / [ ] FAIL
- Notes:

---

### TC-8: Accessibility Announcements
**Steps:**
1. Enable screen reader (NVDA on Windows, VoiceOver on Mac)
2. Tab to mode chips
3. Press Arrow keys to navigate
4. Press Enter to select a chip

**Expected:**
- Screen reader announces: "X mode selected" (via setA11yAnnouncement)
- aria-live region updates
- aria-selected state changes announced
- Hero message changes announced

**Actual:**
- [ ] PASS / [ ] FAIL
- Announcement heard: [ ] YES / [ ] NO
- Notes:

---

### TC-9: Preset Switching During Playback
**Steps:**
1. Drag/drop an MP3 file
2. Start playback
3. Switch between Focus/Calm/Energize while audio plays
4. Observe for audio dropouts or glitches

**Expected:**
- Preset switches without stopping playback
- No audio dropouts or clicks
- Rotation/binaural/noise adjust smoothly
- Console shows performance logs < 100ms

**Actual:**
- [ ] PASS / [ ] FAIL
- Audio quality: [ ] GOOD / [ ] GLITCHES
- Notes:

---

### TC-10: Edge Cases
**Steps:**
1. Test rapid clicking (click 3 presets in 1 second)
2. Test invalid activePresetId: `localStorage.setItem('activePresetId', 'invalid')`
3. Refresh page
4. Test missing localStorage key (already tested in TC-1)

**Expected:**
- Rapid clicks: All complete without errors
- Invalid preset ID: Falls back to default (Focus)
- No console errors
- UI remains stable

**Actual:**
- [ ] PASS / [ ] FAIL
- Notes:

---

## Summary

**Total Tests:** 10  
**Passed:** ___  
**Failed:** ___  
**Blocked:** ___  

**Performance Metrics:**
- Average preset switch latency: ___ms
- Max latency: ___ms
- Min latency: ___ms
- Meets <100ms target: [ ] YES / [ ] NO

**Critical Issues:**
- 

**Non-Critical Issues:**
- 

**Recommendations:**
- 

**Approval Status:**
- [ ] APPROVED - Ready for code review
- [ ] NEEDS FIXES - Issues found
- [ ] BLOCKED - Cannot test

**Tester Signature:** ___________________  
**Date:** ___________________
