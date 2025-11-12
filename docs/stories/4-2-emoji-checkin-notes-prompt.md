# Story 4-2: Emoji Check-In & Notes Prompt

**Epic:** E4 – Session Logging & Insights  
**Story ID:** 4-2  
**Status:** drafted  
**Estimated Effort:** 2-3 hours  
**Created:** 2025-11-12

---

## User Story

**As a** user completing a focus session  
**I want** a quick emoji-based mood check-in with optional notes  
**So that** I can track how sessions make me feel without interrupting my flow or writing lengthy reflections.

---

## Business Context

### Problem Statement
Session data without mood/outcome tracking has limited value. Users cannot identify which rituals genuinely help vs just fill time. Manual journaling is too high-friction for neurodivergent users who are already depleted post-session. Numeric scales (1-10) require cognitive effort that defeats the purpose of a calming ritual.

### Value Proposition
- **For Users:** See patterns in what actually helps ("Calm preset → felt better 80% of time")
- **For Caregivers:** Objective mood data to share with therapists ("15 sessions, 12 felt better")
- **For Product:** Enable "felt better" % metric in insights dashboard (Story 4-3)

### Success Metrics
- ≥60% of sessions include mood rating
- <10 seconds average time to complete check-in
- ≥95% accessibility score for modal
- 0 check-in abandonment due to UI friction

---

## Acceptance Criteria

### AC1: Check-In Modal Trigger
**Given** a session ends (track finishes OR user manually stops)  
**When** `endSession()` completes  
**Then**:
- Modal overlay appears centered on screen
- Modal has heading: "How do you feel now?"
- Modal contains emoji grid (5 buttons)
- Modal contains optional notes textarea
- Modal contains "Submit" and "Skip" buttons
- Body scroll is disabled while modal open

**Timing:**
- Modal appears within 200ms of session end
- Auto-dismisses after 60 seconds if no interaction (saves null for mood)

### AC2: Emoji Grid Interaction
**Given** the check-in modal is open  
**When** user views the emoji grid  
**Then**:
- 5 emojis displayed horizontally (mobile: vertical stack on <600px)
- Each emoji button is ≥80px tap target (WCAG 2.1 AA)
- Emojis with clear semantic labels:
  - 😰 "Anxious or stressed"
  - 😐 "Neutral or unchanged"
  - 😊 "Calm and relaxed"
  - 😌 "Focused and clear"
  - 🎉 "Energized and joyful"
- Hover state: scale(1.1) with selectedMode.accent border
- Selected state: bold border, aria-pressed="true"

**Behavior:**
- Click emoji → that emoji gets selected (visually highlighted)
- Click different emoji → previous deselects, new one selects
- No emoji required (can submit without mood rating)

### AC3: Optional Notes Field
**Given** user has selected an emoji  
**When** notes textarea appears  
**Then**:
- Placeholder text: "Optional notes (e.g., what helped?)"
- Max length: 500 characters
- Character counter: "450 / 500" updates as user types
- Multiline support (3 rows visible)
- Respects reduced motion (no slide-in animation)

**Behavior:**
- Textarea appears regardless of emoji selection
- Can submit notes without emoji selection
- Empty notes stored as empty string (not null)

### AC4: Submit & Skip Actions
**Given** the check-in modal is open  
**When** user interacts with action buttons  
**Then**:

**Submit button:**
- Calls `updateSession(activeSessionId, { moodAfter: selectedEmoji, notes: notesText })`
- Shows toast: "Session saved" (success)
- Closes modal within 100ms
- Re-enables body scroll
- Logs to console: `[SessionLogger] Check-in completed: {emoji} + {noteLength} chars`

**Skip button:**
- Does NOT update session (moodAfter remains null)
- Closes modal immediately
- Shows toast: "Check-in skipped" (info)
- Logs to console: `[SessionLogger] Check-in skipped`

**Escape key:**
- Same behavior as Skip button
- Works from any focused element within modal

### AC5: Accessibility Requirements
**Given** the check-in modal is displayed  
**When** assistive technology interacts with it  
**Then**:

**Modal Structure:**
- `role="dialog"` on modal container
- `aria-labelledby` pointing to heading ID
- `aria-describedby` pointing to instruction text
- `aria-modal="true"` to indicate modal context

**Emoji Buttons:**
- Each has `aria-label`: "Rate mood as [label]"
- Selected emoji has `aria-pressed="true"`
- Keyboard focus visible (2px outline)
- Tab order: emoji grid → notes → submit → skip

**Focus Management:**
- Focus trap within modal (Tab/Shift+Tab cycles)
- Initial focus on first emoji button
- After submit/skip, focus returns to previous element (play/pause button)

**Screen Reader Announcements:**
- Modal open: "Check-in modal opened. How do you feel now?"
- Emoji selected: "Mood rated as [label]"
- Submit success: "Session saved with mood rating"

### AC6: Reduced Motion Support
**Given** user has `prefers-reduced-motion: reduce` set  
**When** modal appears or emojis interact  
**Then**:
- No fade-in animation (instant display)
- No emoji scale animation on hover
- No slide-in for notes textarea
- Immediate modal close (no fade-out)

---

## Technical Approach

### Implementation Files
- **index.html** (React component additions):
  - `CheckInModal` component (~150 lines)
  - Modal state management (~30 lines)
  - Integration with `endSession()` (~20 lines)

### Component Structure
```javascript
const CheckInModal = ({ 
    isOpen, 
    onSubmit, 
    onSkip, 
    sessionId,
    reducedMotion 
}) => {
    const [selectedEmoji, setSelectedEmoji] = React.useState(null);
    const [notes, setNotes] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const modalRef = React.useRef(null);
    const firstEmojiRef = React.useRef(null);
    
    const emojis = [
        { code: '😰', label: 'Anxious or stressed', value: 'anxious' },
        { code: '😐', label: 'Neutral or unchanged', value: 'neutral' },
        { code: '😊', label: 'Calm and relaxed', value: 'calm' },
        { code: '😌', label: 'Focused and clear', value: 'focused' },
        { code: '🎉', label: 'Energized and joyful', value: 'energized' }
    ];
    
    // Focus management
    React.useEffect(() => {
        if (isOpen && firstEmojiRef.current) {
            firstEmojiRef.current.focus();
        }
    }, [isOpen]);
    
    // Auto-dismiss after 60 seconds
    React.useEffect(() => {
        if (!isOpen) return;
        
        const timeout = setTimeout(() => {
            onSkip();
        }, 60000);
        
        return () => clearTimeout(timeout);
    }, [isOpen, onSkip]);
    
    // Focus trap
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onSkip();
        }
        
        // Tab trap logic (cycle through modal elements only)
        if (e.key === 'Tab') {
            const focusableElements = modalRef.current.querySelectorAll(
                'button, textarea, [tabindex="0"]'
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    };
    
    const handleSubmit = async () => {
        setIsSubmitting(true);
        
        try {
            await onSubmit({
                moodAfter: selectedEmoji?.code || null,
                notes: notes.trim()
            });
            
            console.log('[SessionLogger] Check-in completed:', 
                selectedEmoji?.value || 'no mood', 
                `${notes.length} chars`
            );
        } catch (err) {
            console.error('[SessionLogger] Check-in submit error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (!isOpen) return null;
    
    return (
        <div 
            className={`checkin-overlay ${reducedMotion ? 'no-motion' : ''}`}
            onClick={(e) => e.target === e.currentTarget && onSkip()}
        >
            <div 
                ref={modalRef}
                className="checkin-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="checkin-heading"
                aria-describedby="checkin-description"
                onKeyDown={handleKeyDown}
            >
                <h2 id="checkin-heading">How do you feel now?</h2>
                <p id="checkin-description" className="checkin-subtitle">
                    Rate your mood after this session (optional)
                </p>
                
                <div className="emoji-grid" role="radiogroup" aria-label="Mood rating">
                    {emojis.map((emoji, index) => (
                        <button
                            key={emoji.value}
                            ref={index === 0 ? firstEmojiRef : null}
                            type="button"
                            className={`emoji-button ${selectedEmoji?.value === emoji.value ? 'selected' : ''}`}
                            onClick={() => setSelectedEmoji(emoji)}
                            aria-label={`Rate mood as ${emoji.label}`}
                            aria-pressed={selectedEmoji?.value === emoji.value}
                            title={emoji.label}
                        >
                            <span className="emoji-icon" aria-hidden="true">{emoji.code}</span>
                            <span className="emoji-label">{emoji.label}</span>
                        </button>
                    ))}
                </div>
                
                <div className="notes-section">
                    <label htmlFor="session-notes">
                        Optional notes
                        <span className="note-hint"> (e.g., what helped?)</span>
                    </label>
                    <textarea
                        id="session-notes"
                        className="notes-textarea"
                        placeholder="What made this session effective or challenging?"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                        maxLength={500}
                        rows={3}
                        aria-describedby="char-count"
                    />
                    <div id="char-count" className="char-count" aria-live="polite">
                        {notes.length} / 500 characters
                    </div>
                </div>
                
                <div className="modal-actions">
                    <button
                        type="button"
                        className="primary-btn"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Saving...' : 'Submit'}
                    </button>
                    <button
                        type="button"
                        className="ghost-btn"
                        onClick={onSkip}
                        disabled={isSubmitting}
                    >
                        Skip
                    </button>
                </div>
                
                <button
                    type="button"
                    className="close-button"
                    onClick={onSkip}
                    aria-label="Close check-in modal"
                >
                    ✕
                </button>
            </div>
        </div>
    );
};
```

### Modal State Management
```javascript
// In App component
const [showCheckInModal, setShowCheckInModal] = React.useState(false);
const [checkInSessionId, setCheckInSessionId] = React.useState(null);
const previousFocusRef = React.useRef(null);

// Modified endSession to trigger check-in
const endSession = async (manual = false) => {
    if (!activeSessionIdRef.current) return;
    
    const sessionId = activeSessionIdRef.current;
    const endTime = Date.now();
    const session = await getSession(sessionId);
    
    if (session) {
        const duration = (endTime - session.timestamp) / 1000;
        await updateSession(sessionId, { 
            duration, 
            endedManually: manual 
        });
        console.log('[SessionLogger] Session ended:', sessionId, `duration: ${duration}s`);
        
        // Trigger check-in modal
        previousFocusRef.current = document.activeElement;
        setCheckInSessionId(sessionId);
        setShowCheckInModal(true);
    }
    
    setActiveSessionId(null);
    activeSessionIdRef.current = null;
};

const handleCheckInSubmit = async (data) => {
    if (!checkInSessionId) return;
    
    try {
        await updateSession(checkInSessionId, {
            moodAfter: data.moodAfter,
            notes: data.notes
        });
        
        setShowCheckInModal(false);
        setCheckInSessionId(null);
        showToast('Session saved', 'success');
        
        // Restore focus
        if (previousFocusRef.current) {
            previousFocusRef.current.focus();
        }
    } catch (err) {
        console.error('[SessionLogger] Failed to save check-in:', err);
        showToast('Failed to save check-in', 'error');
    }
};

const handleCheckInSkip = () => {
    setShowCheckInModal(false);
    setCheckInSessionId(null);
    showToast('Check-in skipped', 'info');
    console.log('[SessionLogger] Check-in skipped');
    
    // Restore focus
    if (previousFocusRef.current) {
        previousFocusRef.current.focus();
    }
};

// Disable body scroll when modal open
React.useEffect(() => {
    if (showCheckInModal) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}, [showCheckInModal]);
```

### CSS Styling
```css
/* Modal overlay */
.checkin-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.2s ease-out;
}

.checkin-overlay.no-motion {
    animation: none;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

/* Modal container */
.checkin-modal {
    background: var(--bg-primary);
    border-radius: 16px;
    padding: 32px;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.checkin-modal h2 {
    margin: 0 0 8px 0;
    font-size: 24px;
    color: var(--text-primary);
}

.checkin-subtitle {
    margin: 0 0 24px 0;
    color: var(--text-secondary);
    font-size: 14px;
}

/* Emoji grid */
.emoji-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
    margin-bottom: 24px;
}

@media (max-width: 600px) {
    .emoji-grid {
        grid-template-columns: 1fr;
    }
}

.emoji-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px;
    background: var(--bg-secondary);
    border: 2px solid transparent;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 80px;
}

.emoji-button:hover:not(.no-motion) {
    transform: scale(1.1);
    border-color: var(--chip-accent, var(--accent-primary));
}

.emoji-button:focus {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
}

.emoji-button.selected {
    border-color: var(--chip-accent, var(--accent-primary);
    border-width: 3px;
    background: var(--bg-tertiary);
}

.emoji-icon {
    font-size: 36px;
    line-height: 1;
}

.emoji-label {
    font-size: 12px;
    text-align: center;
    color: var(--text-secondary);
}

/* Notes section */
.notes-section {
    margin-bottom: 24px;
}

.notes-section label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: var(--text-primary);
}

.note-hint {
    color: var(--text-secondary);
    font-weight: normal;
}

.notes-textarea {
    width: 100%;
    padding: 12px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-family: inherit;
    font-size: 14px;
    resize: vertical;
}

.notes-textarea:focus {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
}

.char-count {
    margin-top: 4px;
    font-size: 12px;
    color: var(--text-secondary);
    text-align: right;
}

/* Modal actions */
.modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
}

.close-button {
    position: absolute;
    top: 16px;
    right: 16px;
    background: transparent;
    border: none;
    font-size: 24px;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px 8px;
    line-height: 1;
}

.close-button:hover {
    color: var(--text-primary);
}

.close-button:focus {
    outline: 2px solid var(--accent-primary);
    border-radius: 4px;
}
```

---

## Dependencies

### Functional Dependencies
- **Story 4-1 (Session Schema):** Requires `updateSession()` helper and `activeSessionId`
- **Story 3-3 (Custom Presets):** Reuses toast notification system

### Technical Dependencies
- IndexedDB `updateSession()` from Story 4-1
- `showToast()` helper from Story 3-3
- `reducedMotion` state from Story 1-3
- React hooks (useState, useRef, useEffect)

### Data Dependencies
- `activeSessionIdRef` (ref) - session to update
- `sessionId` (number) - from endSession() callback

---

## Testing Strategy

### Manual Tests (Browser)
1. **Modal trigger:**
   - Play track → let finish → verify modal appears
   - Play track → stop manually → verify modal appears
   - Verify modal centers on screen
   - Verify body scroll disabled

2. **Emoji selection:**
   - Click each emoji → verify visual selection
   - Click different emoji → verify previous deselects
   - Hover emoji (mouse) → verify scale animation
   - Verify 80px minimum tap target size

3. **Notes field:**
   - Type 500 characters → verify counter updates
   - Type 501st character → verify blocked
   - Submit with emoji only → verify notes = ""
   - Submit with notes only → verify moodAfter = null

4. **Submit/Skip:**
   - Select emoji + notes → submit → verify saved in IndexedDB
   - Click skip → verify modal closes, no data saved
   - Press Escape → verify same as skip
   - Wait 60 seconds → verify auto-skip

5. **Accessibility:**
   - Tab through modal → verify focus trap works
   - Tab on last element → verify cycles to first
   - Shift+Tab on first → verify cycles to last
   - Submit → verify focus returns to play button
   - Screen reader → verify emoji labels announced

6. **Reduced motion:**
   - Enable prefers-reduced-motion
   - Open modal → verify no fade-in
   - Hover emoji → verify no scale
   - Close modal → verify instant (no fade-out)

### Accessibility Audit
- Run axe DevTools → verify 0 violations
- Run Pa11y CLI → verify score ≥95
- Test with NVDA/JAWS screen reader
- Test keyboard-only navigation (no mouse)

### Performance Tests
- Measure modal open time → target <200ms
- Measure updateSession() call → target <30ms (from Story 4-1)
- Test with 100 existing sessions → verify no slowdown

---

## Definition of Done

- [ ] `CheckInModal` component implemented with all AC
- [ ] Modal state management integrated with `endSession()`
- [ ] Emoji grid with 5 buttons (80px tap targets)
- [ ] Optional notes textarea (500 char limit with counter)
- [ ] Submit/Skip actions update/skip session data
- [ ] Escape key closes modal
- [ ] Focus trap working (Tab cycles within modal)
- [ ] Focus restored after close
- [ ] Body scroll disabled when modal open
- [ ] Auto-dismiss after 60 seconds
- [ ] Reduced motion support (no animations)
- [ ] CSS styling complete (responsive, dark mode)
- [ ] Toast notifications for submit/skip
- [ ] Console logging for debugging
- [ ] Accessibility audit passes (≥95 score)
- [ ] Manual tests completed on Chrome/Firefox/Safari
- [ ] Mobile testing (iOS Safari, Android Chrome)
- [ ] Code review approval
- [ ] No syntax errors, no console warnings

---

## Out of Scope (Future Enhancements)

- **Mood before capture** → Requires prompting at session start (deferred)
- **Retrospective mood entry** → Dashboard feature in Story 4-3
- **Custom emoji selection** → Fixed set for MVP
- **Multi-language emojis** → i18n in Epic 6
- **Mood trends chart** → Story 4-3 (Insights Dashboard)
- **Mood-based preset recommendations** → Epic 5 (Adaptive Loop)

---

## Notes & Considerations

### UX Design Decisions
- **5 emojis chosen:** Covers negative → positive spectrum without overwhelming
- **Optional rating:** Reduces pressure, increases completion rate
- **60s auto-dismiss:** Balances reminder vs annoyance
- **Skip button prominent:** Clear exit path prevents frustration

### Accessibility Priorities
- **Focus trap:** Prevents tabbing out to page behind modal
- **Screen reader labels:** Each emoji clearly named (not just "emoji button")
- **Keyboard shortcuts:** Escape key = universal close pattern
- **Reduced motion:** Respects user preference automatically

### Browser Compatibility
- **Emoji rendering:** Test across browsers (consistent in Chrome, Firefox, Safari)
- **Text fallback:** Emoji labels ensure meaning clear even if icon fails
- **IndexedDB support:** Already verified in Story 4-1

### Privacy Considerations
- All data stored locally (no network transmission)
- User can skip check-in (not mandatory)
- Profile clearing (Story 4-1) removes all mood data
- No PII collected (mood + notes only)

---

## Dev Agent Record

### Implementation Notes
(To be filled during development)

### Challenges & Solutions
(To be documented during code review)

### Accessibility Test Results
(To be measured during Pa11y audit)

---

**Story Created:** 2025-11-12  
**Ready for Development:** Pending story-context workflow  
**Dependencies Verified:** Story 4-1 must complete first (updateSession helper required)
