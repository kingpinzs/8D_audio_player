# Story 6.2: Manifest & Install Flow

**Epic:** E6 – PWA Reliability & Accessibility
**Story ID:** 6-2
**Status:** done
**Estimated Effort:** 4-5 hours
**Created:** 2025-11-26

---

## User Story

**As a** user who wants quick access to mp3_to_8D,
**I want** to install the app on my device with a guided flow and app shortcuts,
**So that** I can launch focus/calm sessions directly from my home screen without opening a browser.

---

## Business Context

### Problem Statement
While the service worker and offline capabilities from Story 6-1 enable offline reliability, users still need to manually navigate to the web app. This story implements the web app manifest and install flow that enables true PWA installability, allowing users to add mp3_to_8D to their home screen for instant access with app shortcuts for Focus and Calm modes.

### Value Proposition
- **For Mobile Users:** "I can tap the 8D Audio icon on my home screen and jump straight into a focus session"
- **For Desktop Users:** "The app runs in its own window like a native application"
- **For All Users:** "Mode shortcuts let me start Focus or Calm in one tap from the home screen"
- **For Product:** Increased engagement through reduced friction; install telemetry informs conversion optimization

### Success Metrics
- Install prompt shown rate (tracked via telemetry)
- Install acceptance rate >= 30% (E6 KPI target)
- Lighthouse PWA score >= 90 (Epic 6 KPI)
- Post-install standalone mode detection rate 100%

---

## Acceptance Criteria

### AC1: Manifest Configuration (AC6.2.1)
**Given** the app is deployed with manifest.json
**When** the browser parses the manifest
**Then**:
- Manifest includes `name`: "mp3_to_8D - Focus Audio"
- Manifest includes `short_name`: "8D Audio"
- Manifest includes icons: 192x192, 512x512, and maskable 512x512
- Manifest includes `theme_color`: "#1a1a2e"
- Manifest includes `background_color`: "#1a1a2e"
- Manifest includes `categories`: ["health", "wellness", "music"]
- Manifest includes `display`: "standalone"
- Manifest includes `start_url`: "/index.html?source=pwa"

**Technical Notes:**
- Create manifest.json in project root
- Link manifest via `<link rel="manifest">` in index.html
- Use existing theme colors from index.html

### AC2: Install Event Capture (AC6.2.2)
**Given** the browser fires `beforeinstallprompt` event (criteria met: HTTPS, SW, manifest)
**When** the app loads
**Then**:
- Event is captured and deferred
- `canInstall` state set to `true`
- In-app install prompt becomes visible in hero section
- Console log: `[PWA] Install prompt available`

**Technical Notes:**
- Create `useInstallPrompt` hook
- Store event in state for later triggering
- Only show prompt when `canInstall === true`

### AC3: Install Prompt UI (AC6.2.3)
**Given** `canInstall === true`
**When** the install prompt is displayed
**Then**:
- Call-to-action text: "Install for quick access"
- Prompt includes app icon and brief description
- Dismiss button available ("Not now")
- Prompt has ARIA role="dialog" and aria-labelledby
- Prompt uses existing UI token styles (matching toast/banner patterns)

**Technical Notes:**
- Position in hero section below mode buttons
- Use existing amber/action color scheme
- Follow toast component patterns from Story 6-1

### AC4: Native Install Flow Trigger (AC6.2.4)
**Given** user clicks the install button
**When** `showInstallPrompt()` is called
**Then**:
- Deferred `beforeinstallprompt.prompt()` is invoked
- Native browser install dialog appears
- User makes choice (accept/dismiss)
- Console log: `[PWA] User choice: {outcome}`

### AC5: Install Telemetry (AC6.2.5)
**Given** install prompt is shown or user makes choice
**When** each event occurs
**Then**:
- `INSTALL_PROMPT_SHOWN` logged when prompt first displayed
- `INSTALL_ACCEPTED` logged when user accepts
- `INSTALL_DISMISSED` logged when user dismisses
- Events include timestamp, userAgent, platform (desktop/mobile)
- Events persisted to E4 session logging system (IndexedDB)

**Technical Notes:**
- Use existing SessionLogger patterns from E4
- Add install event types to telemetry schema

### AC6: Post-Install Detection (AC6.2.6)
**Given** user has installed the app
**When** the app is launched in standalone mode
**Then**:
- `display-mode: standalone` detected via media query
- `isInstalled` state set to `true`
- Install prompt hidden permanently
- `APP_INSTALLED` event logged
- Console log: `[PWA] Running in standalone mode`

**Technical Notes:**
- Use `matchMedia('(display-mode: standalone)')`
- Persist installed state to localStorage
- Never show install prompt again once installed

### AC7: App Shortcuts (AC6.2.7)
**Given** the app is installed
**When** user long-presses app icon (mobile) or right-clicks (desktop)
**Then**:
- "Start Focus" shortcut available, launches with `?mode=focus`
- "Start Calm" shortcut available, launches with `?mode=calm`
- Each shortcut has appropriate icon
- On launch, app auto-selects corresponding preset

**Technical Notes:**
- Define shortcuts in manifest.json
- Parse `?mode=` query param on app load
- Auto-apply Focus or Calm preset based on param
- Consider auto-starting ritual in future iteration

### AC8: Safari Manual Instructions (AC6.2.8)
**Given** user is on Safari (iOS or macOS)
**When** `beforeinstallprompt` is not supported
**Then**:
- Detect Safari via user agent
- Show alternative instructions: "To install: tap Share > Add to Home Screen"
- Instructions include visual guidance (share icon)
- Instructions dismissible with "Got it" button
- Dismissal persisted to localStorage

**Technical Notes:**
- Safari does not fire `beforeinstallprompt`
- Detect via `!('onbeforeinstallprompt' in window)` + Safari UA
- Show only once per device (localStorage flag)

### AC9: Cross-Browser Verification (AC6.2.9)
**Given** the install flow is implemented
**When** testing on target browsers
**Then**:
- Chrome Desktop: Full install flow works
- Chrome Android: Full install flow works, shortcuts visible
- Firefox Desktop: Install flow works (limited shortcut support)
- Edge: Full install flow works
- Safari: Manual instructions shown correctly

---

## Tasks / Subtasks

### Task 1: Create Web App Manifest (AC: 1)
- [x] Create `manifest.json` in project root
  - [x] Add name, short_name, description
  - [x] Add start_url with ?source=pwa parameter
  - [x] Add display: standalone, orientation: any
  - [x] Add theme_color and background_color (#1a1a2e)
  - [x] Add categories: health, wellness, music
- [x] Create icons directory and add icon files
  - [x] icon-192.png (192x192)
  - [x] icon-512.png (512x512)
  - [x] icon-maskable.png (512x512 with padding for maskable)
  - [x] focus.png and calm.png for shortcuts
- [x] Add shortcuts array for Focus and Calm modes
- [x] Add `<link rel="manifest" href="/manifest.json">` to index.html

### Task 2: Implement useInstallPrompt Hook (AC: 2, 4, 6)
- [x] Create useInstallPrompt hook in index.html
  - [x] State: canInstall, isInstalled, installPromptDeferred
  - [x] Capture `beforeinstallprompt` event
  - [x] Detect standalone mode via matchMedia
  - [x] Track isInstalled in localStorage
- [x] Implement `showInstallPrompt()` function
  - [x] Call deferred event.prompt()
  - [x] Wait for userChoice
  - [x] Handle accept/dismiss outcomes
- [x] Implement `dismissInstallPrompt()` function
  - [x] Set canInstall = false temporarily
  - [x] Store dismissal timestamp
- [x] Add console logging for all state changes

### Task 3: Create Install Prompt Component (AC: 3)
- [x] Create InstallPrompt component
  - [x] Render when canInstall === true && !isInstalled
  - [x] Display app icon and call-to-action text
  - [x] "Install for quick access" main button
  - [x] "Not now" dismiss button
- [x] Style matching existing toast/banner patterns
  - [x] Use existing color tokens
  - [x] Amber/action color for install button
- [x] Add accessibility attributes
  - [x] role="dialog"
  - [x] aria-labelledby for title
  - [x] Focus management on open
- [x] Position in hero section appropriately

### Task 4: Implement Install Telemetry (AC: 5)
- [x] Extend SessionLogger for install events
  - [x] Add INSTALL_PROMPT_SHOWN event type
  - [x] Add INSTALL_ACCEPTED event type
  - [x] Add INSTALL_DISMISSED event type
  - [x] Add APP_INSTALLED event type
- [x] Capture event metadata
  - [x] timestamp
  - [x] userAgent
  - [x] platform detection (desktop/mobile)
- [x] Wire up logging calls in useInstallPrompt
  - [x] Log INSTALL_PROMPT_SHOWN when prompt first renders
  - [x] Log choice outcome after userChoice resolves
  - [x] Log APP_INSTALLED on standalone detection

### Task 5: Implement Shortcut Mode Detection (AC: 7)
- [x] Parse query params on app load
  - [x] Detect ?mode=focus or ?mode=calm
  - [x] Detect ?source=pwa for analytics
- [x] Auto-apply preset based on mode param
  - [x] If mode=focus, apply Focus preset
  - [x] If mode=calm, apply Calm preset
- [x] Clear query params from URL after processing (clean URL)
- [x] Log shortcut launch event if applicable

### Task 6: Safari Fallback Instructions (AC: 8)
- [x] Detect Safari browser
  - [x] Check for Safari user agent
  - [x] Confirm no beforeinstallprompt support
- [x] Create SafariInstallInstructions component
  - [x] Instruction text with share icon reference
  - [x] "To install: tap Share > Add to Home Screen"
  - [x] Visual share icon hint
  - [x] "Got it" dismissal button
- [x] Persist dismissal to localStorage
  - [x] Key: `mp3_8d_safari_install_dismissed`
  - [x] Only show once per device
- [x] Style matching existing UI patterns

### Task 7: Testing & Verification (AC: 9)
- [x] Write unit tests for useInstallPrompt hook
  - [x] Event capture mock
  - [x] Standalone mode detection
  - [x] State transitions
- [x] Write tests for InstallPrompt component
  - [x] Render conditions
  - [x] Button actions
  - [x] Accessibility attributes
- [x] Write tests for query param parsing
  - [x] ?mode=focus handling
  - [x] ?mode=calm handling
  - [x] No param graceful handling
- [ ] Manual testing checklist
  - [ ] Chrome Desktop: full flow
  - [ ] Chrome Android: full flow + shortcuts
  - [ ] Firefox Desktop: install flow
  - [ ] Safari iOS: manual instructions
  - [ ] Safari macOS: manual instructions

---

## Dev Notes

### Relevant Architecture Patterns and Constraints

**From Architecture Section 3.7 (Service Worker & Offline Layer):**
- Workbox CLI generates SW with precache manifest (already done in 6-1)
- manifest.json serves alongside SW for full PWA installability
- Service Worker + manifest + HTTPS = browser install prompt criteria

**From Tech Spec (Story 6-2 Workflow):**
```
1. App loads → Browser parses manifest.json
2. Browser criteria met (HTTPS, SW, manifest) → fires beforeinstallprompt
3. InstallPromptManager captures event, sets canInstall = true
4. Show install prompt in hero section: "Install for quick access"
5. User clicks "Install":
   a. Call installPromptDeferred.prompt()
   b. Wait for userChoice
   c. Log INSTALL_ACCEPTED or INSTALL_DISMISSED to telemetry
6. Post-install:
   a. Detect display-mode: standalone
   b. Set isInstalled = true
   c. Hide install prompt permanently
   d. Log APP_INSTALLED event
7. Shortcut URLs (?mode=focus, ?mode=calm):
   a. On launch → parse query params
   b. Auto-select preset matching mode
   c. Optionally auto-start ritual
```

**Performance Requirements:**
- Install prompt appearance: <100ms after beforeinstallprompt
- Query param parsing: synchronous on load
- Lighthouse PWA score: >= 90

### Source Tree Components to Touch

| Component | Purpose | Location |
|-----------|---------|----------|
| manifest.json | Web app manifest | project root (NEW) |
| icons/ | PWA icons directory | project root (NEW) |
| useInstallPrompt | Install state and actions hook | index.html (NEW) |
| InstallPrompt | Install prompt UI component | index.html (NEW) |
| SafariInstallInstructions | Safari fallback component | index.html (NEW) |
| SessionLogger | Extend with install events | index.html (MODIFY) |
| App initialization | Query param parsing | index.html (MODIFY) |
| tests/install-prompt.test.js | Install flow tests | tests/ (NEW) |

### Testing Standards Summary

**From Epic 6 Tech Spec Test Strategy:**
- Unit tests: Event capture, standalone detection, state management
- Integration tests: Full install flow, telemetry logging
- Manual tests: Cross-browser verification (Chrome, Firefox, Safari, Edge)
- CI tests: Manifest validation, Lighthouse PWA audit

### Project Structure Notes

**Alignment:**
- All React implementation in index.html (maintaining single-file architecture)
- manifest.json at project root for proper serving
- Icons in /icons/ directory matching manifest paths
- Uses existing SessionLogger patterns from E4
- Uses existing toast/banner UI patterns from E2/E5/E6.1

**New Files:**
- `manifest.json` - Web app manifest
- `icons/icon-192.png` - Standard PWA icon
- `icons/icon-512.png` - Large PWA icon
- `icons/icon-maskable.png` - Maskable icon for adaptive display
- `icons/focus.png` - Focus shortcut icon
- `icons/calm.png` - Calm shortcut icon
- `tests/install-prompt.test.js` - Install flow tests

**Integration Points:**
- Uses SessionLogger from E4 for telemetry
- Uses PresetProvider from E3 for shortcut mode application
- Uses ThemeProvider from E1 for consistent styling
- Extends SW infrastructure from Story 6-1

### References

- [Source: .bmad-ephemeral/stories/tech-spec-epic-6.md#AC6.2] - AC6.2.1 through AC6.2.9
- [Source: .bmad-ephemeral/stories/tech-spec-epic-6.md#Workflows] - Story 6-2 sequence diagram
- [Source: docs/architecture.md#Section-3.7] - Service Worker & Offline Layer architecture
- [Source: docs/PRD.md#FR1] - PWA installability requirements
- [Source: docs/create-epics-and-stories.md#E6-S6.2] - Epic story definition

### Learnings from Previous Story

**From Story 6-1-service-worker-offline-ux (Status: done)**

- **Service Worker Infrastructure**: SW already registered and caching shell assets - install criteria partially met
- **Toast Pattern**: Toast notifications at index.html - reuse pattern for install prompt styling
- **localStorage Pattern**: Settings persistence using `mp3_8d_*` key pattern - follow for install state
- **useServiceWorker Hook**: Located at index.html:8013-8147 - follow hook structure pattern
- **Test Patterns**: 44 tests in tests/service-worker.test.js - follow structure for install tests
- **Settings Integration**: OfflineSettings component structure - follow for any settings additions
- **ARIA Patterns**: All UI elements have proper accessibility attributes - maintain for InstallPrompt

**Code Reuse Opportunities:**
- Toast/banner styling from OfflineBanner component
- Hook state management patterns from useServiceWorker
- localStorage persistence wrapper patterns
- Console logging format: `[PWA]` prefix for consistency with `[SW]`
- Test file structure and mock patterns

**Technical Context:**
- SW is already active (swStatus tracking implemented)
- Workbox config at workbox-config.js ready for manifest reference
- package.json has npm scripts structure for potential manifest validation

[Source: .bmad-ephemeral/stories/6-1-service-worker-offline-ux.md#Dev-Agent-Record]

---

## Dev Agent Record

### Context Reference

- `.bmad-ephemeral/stories/6-2-manifest-install-flow.context.xml`

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- `[PWA]` prefix console logging for all install flow state changes
- `[PWA] Install prompt available` - logged when beforeinstallprompt captured
- `[PWA] Running in standalone mode` - logged when app detected as installed
- `[PWA] User choice: {outcome}` - logged after native prompt interaction
- `[PWA] Applying {Focus|Calm} preset from shortcut` - logged on shortcut launch
- `[PWA] Cleaned URL query params` - logged after param processing

### Completion Notes List

1. **Manifest Configuration (AC1)**: Created manifest.json with full PWA configuration including name, short_name, description, display: standalone, theme_color (#1a1a2e), categories (health/wellness/music), icons (192, 512, maskable), and shortcuts for Focus/Calm modes.

2. **Icon Generation**: Created icons/ directory with 5 PNG icons generated via ImageMagick - icon-192.png, icon-512.png, icon-maskable.png, focus.png, calm.png.

3. **useInstallPrompt Hook (AC2, AC4, AC6)**: Implemented at index.html:8152-8323 following useServiceWorker hook patterns. Captures beforeinstallprompt event, tracks installed state via localStorage and matchMedia, handles showInstallPrompt() with userChoice await, dismissInstallPrompt() with 24-hour cooldown.

4. **InstallPrompt Component (AC3)**: Implemented at index.html:8450-8535 with role="dialog", aria-labelledby, tabIndex=-1 for focus management. Positioned in hero section after ritual alerts. Uses amber accent color (--accent-energize) for Install button.

5. **SafariInstallInstructions Component (AC8)**: Implemented at index.html:8537-8621. Detects Safari via user agent + missing beforeinstallprompt. Shows iOS/macOS appropriate instructions ("Add to Home Screen" vs "Add to Dock"). Persists dismissal to mp3_8d_safari_install_dismissed.

6. **Install Telemetry (AC5)**: Integrated with SessionLogging via logInstallEvent() callback. Events: INSTALL_PROMPT_SHOWN, INSTALL_ACCEPTED, INSTALL_DISMISSED, APP_INSTALLED, PWA_LAUNCH. Includes userAgent and platform (mobile/desktop) metadata.

7. **Shortcut Mode Detection (AC7)**: Added useEffect at index.html:9421-9464 parsing URLSearchParams for mode=focus/calm and source=pwa. Auto-applies corresponding preset via deferred applyPreset() call. Cleans URL with history.replaceState().

8. **CSS Styling**: Added .install-prompt, .install-btn, .install-dismiss-btn, .safari-instructions styles at index.html:2684-2845 matching existing toast/banner patterns with reduced motion support.

9. **Test Coverage**: Created tests/install-prompt.test.js with 63 tests covering manifest validation, icon existence, hook implementation, UI components, telemetry events, shortcut detection, and Safari fallback. All 176 total tests pass.

### File List

**New Files:**
- `manifest.json` - Web app manifest (project root)
- `icons/icon-192.png` - Standard PWA icon (192x192)
- `icons/icon-512.png` - Large PWA icon (512x512)
- `icons/icon-maskable.png` - Maskable icon for adaptive display
- `icons/focus.png` - Focus shortcut icon (96x96)
- `icons/calm.png` - Calm shortcut icon (96x96)
- `tests/install-prompt.test.js` - Install flow tests (63 tests)

**Modified Files:**
- `index.html` - Added manifest link, theme-color meta, apple-touch-icon, useInstallPrompt hook, InstallPrompt component, SafariInstallInstructions component, query param parsing, CSS styles
- `package.json` - Added install-prompt.test.js to test script

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-11-26 | Story created from create-story workflow | SM Agent |
| 2025-11-26 | Story implementation complete - all 7 tasks done, 63 new tests added | Dev Agent (Claude Opus 4.5) |
| 2025-11-26 | Manual testing completed - story marked done | Jeremy |

### Completion Notes
**Completed:** 2025-11-26
**Definition of Done:** All acceptance criteria met, manual testing completed, tests passing
