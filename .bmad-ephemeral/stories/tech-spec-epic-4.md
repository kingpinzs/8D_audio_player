# Epic Technical Specification: Session Logging & Insights

Date: 2025-11-24
Author: Jeremy
Epic ID: 4
Status: Complete

---

## Overview

Epic 4 establishes the IndexedDB-backed telemetry foundation for mp3_to_8D, enabling automatic session logging with zero user effort while preparing for insights visualization in future stories. This epic implements the schema, lifecycle hooks, and privacy-first consent model that powers data-driven preset recommendations and time-to-focus analytics without requiring backend infrastructure.

The core challenge is capturing meaningful session context (track, preset, duration, ritual completion, mood) while maintaining offline-first reliability and WCAG-compliant UI flows. This epic focuses exclusively on the "write path"—session capture and storage—leaving read-heavy analytics dashboards for subsequent work.

## Objectives and Scope

### In Scope
- **IndexedDB schema definition** for `sessions` object store with auto-incrementing IDs, timestamps, profile binding, and indexed fields for efficient queries
- **Session lifecycle hooks** that automatically capture start/end events during playback, ritual completion, and track changes
- **Profile data clearing** with single-operation deleteProfile() API that purges all session records
- **Emoji check-in UI** (stretch) for post-session mood capture with accessibility-compliant controls
- **Export scaffold** (JSON serialization only) preparing for future CSV/PDF insights generation
- **Error handling and quota management** with graceful degradation when IndexedDB unavailable or quota exceeded
- **Integration with existing Epic 1-3 components** (RitualHero, AudioGraph, PresetEngine) via event bus

### Out of Scope
- **Insights dashboard visualization** (charts, trends, recommendations) → Deferred to Epic 4.3 or post-MVP
- **Cloud sync or backend APIs** → Local-only for MVP; export/import provides manual transfer
- **Sensor data capture** → Epic 5 will extend session schema with HR fields; this epic includes placeholders only
- **Multi-profile UI** → Epic 6 work; this epic supports profileId field but defaultProfile only
- **Advanced analytics** (time-to-focus calculations, streak tracking) → Future enhancement
- **CSV/PDF export implementation** → Story 4-3 handles full export; this epic provides JSON foundation

## System Architecture Alignment

This epic directly implements **Architecture Section 3.5: Session Logging & Insights** and extends the data persistence layer defined in **Architecture Section 4**.

**Key alignments:**
- **Event bus integration:** SessionLogger listens for `PLAYBACK_STARTED`, `FOCUS_RITUAL_COMPLETED`, `SESSION_ENDED`, `EMOJI_SUBMITTED` events already defined in AppShell event system
- **IndexedDB strategy:** Adds `sessions` object store alongside existing `presets` and `playlist` stores; follows same async/await error handling patterns
- **Hook-based API:** Exposes `useSessionLogger` hook consumed by AudioGraph and RitualHero components without prop drilling
- **Privacy model:** Aligns with Architecture Section 5 NFR enforcement—all data remains local, explicit consent required before any future sync
- **Performance constraints:** Meets Architecture Section 5 requirement for <50ms P95 write latency via batched IndexedDB transactions
- **Offline reliability:** Leverages existing service worker (Architecture Section 3.7) to ensure session writes succeed even during network outages

**Component interactions:**
- `AudioGraphProvider` (Epic 2) calls `sessionLogger.startSession()` on playback and `sessionLogger.endSession()` on track completion
- `RitualHero` (Epic 1) passes `ritualUsed: true/false` flag to session records
- `PresetEngine` (Epic 3) provides `activePresetId` and `presetLabel` context for each session
- Future `SensorBridge` (Epic 5) will extend session schema with `hrAvg`, `hrDelta` fields using same write path

## Detailed Design

### Services and Modules

| Module | Responsibilities | Inputs | Outputs | Owner |
|--------|------------------|--------|---------|-------|
| **SessionLogger** | Captures session lifecycle events, writes to IndexedDB, manages active session state | `PLAYBACK_STARTED`, `SESSION_ENDED`, ritual flags, preset context | Session IDs, write confirmations, error events | Frontend |
| **IndexedDB Manager** | Handles database initialization, schema versioning, CRUD operations, quota monitoring | Session payloads, query filters, profile IDs | Session records, query results, quota status | Frontend |
| **useSessionLogger Hook** | Provides React hook interface for session operations; manages refs for active session tracking | React component context, audio/preset state | `startSession()`, `endSession()`, `updateSession()` APIs | Frontend |
| **Profile Manager** | Handles profile-scoped operations (clear, export, query by profileId) | Profile ID, operation type | Confirmation status, record counts | Frontend |
| **Export Service** | Serializes session data to JSON; prepares for future CSV/PDF generators | Session records, date range filters | JSON blob, download trigger | Frontend |
| **Emoji Check-in UI** | Optional post-session mood capture modal with accessibility controls | Session ID, trigger event | Emoji selection, notes text | Frontend/UX |

### Data Models and Contracts

#### IndexedDB Schema: `sessions` Object Store

```javascript
{
  // Database metadata
  dbName: 'mp3_8d_sessions',
  version: 1,
  storeName: 'sessions',

  // Schema definition
  keyPath: 'id',
  autoIncrement: true,

  // Indexes for efficient queries
  indexes: [
    { name: 'timestamp', keyPath: 'timestamp', unique: false },
    { name: 'profileId', keyPath: 'profileId', unique: false },
    { name: 'presetId', keyPath: 'presetId', unique: false },
    { name: 'ritualUsed', keyPath: 'ritualUsed', unique: false }
  ]
}
```

#### Session Record Contract

```typescript
interface SessionRecord {
  // Auto-generated by IndexedDB
  id: number;

  // Core session metadata
  profileId: string;           // Default: "default" (Epic 6 multi-profile support)
  timestamp: number;            // Date.now() at session start

  // Track context
  trackId: string;              // Unique identifier for track (file hash or URL)
  trackName: string;            // Display name for export readability

  // Preset context
  presetId: string;             // Active preset ID at session start
  presetLabel: string;          // Display label (e.g., "Focus", "Custom: Deep Work")

  // Ritual tracking
  ritualUsed: boolean;          // true if breathing ritual completed, false if skipped

  // Session duration
  duration: number;             // Session length in seconds (calculated on end)

  // Sensor placeholders (Epic 5)
  hrAvg: number | null;         // Average heart rate during session (null if no sensor)
  hrMax: number | null;         // Peak heart rate (null if no sensor)

  // Mood tracking (Story 4-2)
  moodBefore: string | null;    // Emoji code (e.g., "😰") captured pre-session
  moodAfter: string | null;     // Emoji code (e.g., "😌") captured post-session
  notes: string;                // Optional user notes (default: empty string)

  // Completion metadata
  endedManually: boolean;       // true if user stopped, false if track ended naturally
}
```

#### API Contracts

**startSession(payload)**
```typescript
interface StartSessionPayload {
  profileId?: string;           // Optional, defaults to "default"
  trackId: string;              // Required
  trackName: string;            // Required
  presetId: string;             // Required
  presetLabel: string;          // Required
  ritualUsed: boolean;          // Required
  moodBefore?: string | null;   // Optional emoji
}

Returns: Promise<number>        // Session ID
```

**endSession(sessionId, manual)**
```typescript
interface EndSessionPayload {
  sessionId: number;            // Required
  manual: boolean;              // true if user stopped playback
  moodAfter?: string | null;    // Optional emoji from check-in
  notes?: string;               // Optional user notes
}

Returns: Promise<void>
```

**clearProfile(profileId)**
```typescript
Parameters: profileId: string | "all"
Returns: Promise<{ cleared: number | "all" }>
```

### APIs and Interfaces

#### IndexedDB Operations (Internal)

**initDatabase()**
- Opens IndexedDB connection with version migration
- Creates `sessions` object store if not exists
- Establishes indexes for timestamp, profileId, presetId, ritualUsed
- Returns: `Promise<IDBDatabase>`
- Error handling: Catches QuotaExceededError, VersionError, handles gracefully

**addSession(session)**
- Adds new session record to store
- Uses auto-incrementing ID
- Returns: `Promise<number>` (session ID)
- Performance target: <50ms P95

**getSession(id)**
- Retrieves single session by ID
- Returns: `Promise<SessionRecord | undefined>`
- Used for update operations

**updateSession(id, updates)**
- Patches existing session with new fields (duration, moodAfter, notes)
- Returns: `Promise<void>`
- Performance target: <30ms P95

**clearProfile(profileId)**
- Deletes all sessions matching profileId
- If profileId === "all", clears entire object store
- Returns: `Promise<{ cleared: number | "all" }>`
- Shows confirmation toast with count

**exportSessions(profileId?, dateRange?)**
- Queries sessions by profileId and/or date range
- Serializes to JSON
- Returns: `Promise<Blob>`
- Future: CSV/PDF generators extend this

#### Hook API (Public Interface)

**useSessionLogger()**
```javascript
const {
  activeSessionId,      // number | null - Current session ID
  startSession,         // (payload: StartSessionPayload) => Promise<number>
  endSession,           // (manual: boolean, mood?: string) => Promise<void>
  updateSession,        // (updates: Partial<SessionRecord>) => Promise<void>
  clearProfile,         // (profileId: string) => Promise<{ cleared: number }>
  exportSessions,       // (filter?: QueryFilter) => Promise<Blob>
  isLogging             // boolean - IndexedDB availability status
} = useSessionLogger();
```

#### Event Bus Integration

**Events emitted:**
- `SESSION_STARTED` - { sessionId, trackId, presetId }
- `SESSION_ENDED` - { sessionId, duration, endedManually }
- `SESSION_ERROR` - { error, operation }

**Events consumed:**
- `PLAYBACK_STARTED` - Triggers startSession()
- `PLAYBACK_ENDED` - Triggers endSession(false)
- `PLAYBACK_STOPPED` - Triggers endSession(true)
- `RITUAL_COMPLETED` - Sets ritualUsed flag
- `EMOJI_SUBMITTED` - Updates moodAfter field

### Workflows and Sequencing

#### Sequence 1: Session Start Flow

```
Actor: User
Actor: AudioGraphProvider
Actor: SessionLogger
Actor: IndexedDB

User → RitualHero: Click "Start Focus"
RitualHero → RitualHero: Run breathing animation (or skip)
RitualHero → AudioGraphProvider: launchRitualPlayback(ritualCompleted: boolean)
AudioGraphProvider → SessionLogger: startSession({
  trackId, trackName, presetId, presetLabel, ritualUsed
})
SessionLogger → IndexedDB: addSession(payload)
IndexedDB → SessionLogger: Return sessionId (e.g., 42)
SessionLogger → SessionLogger: Store activeSessionId in ref
SessionLogger → EventBus: Emit SESSION_STARTED event
SessionLogger → AudioGraphProvider: Return sessionId
AudioGraphProvider → Audio: Begin playback
Audio → User: 8D audio output begins
```

**Error handling:**
- If IndexedDB unavailable: Log to console, emit warning toast, continue playback
- If quota exceeded: Show "Storage full, sessions not logged" message
- If addSession fails: Retry once, then gracefully degrade

#### Sequence 2: Session End Flow

```
Actor: User or Audio
Actor: AudioGraphProvider
Actor: SessionLogger
Actor: IndexedDB

[Option A: Track ends naturally]
Audio → AudioGraphProvider: 'ended' event
AudioGraphProvider → SessionLogger: endSession(manual: false)

[Option B: User stops manually]
User → PlaybackControls: Click Stop
PlaybackControls → AudioGraphProvider: pause()
AudioGraphProvider → SessionLogger: endSession(manual: true)

[Common path]
SessionLogger → SessionLogger: Calculate duration = (endTime - startTime) / 1000
SessionLogger → IndexedDB: updateSession(activeSessionId, {
  duration, endedManually
})
SessionLogger → SessionLogger: Clear activeSessionId ref
SessionLogger → EventBus: Emit SESSION_ENDED event
SessionLogger → EmojiCheckIn: Show modal (if enabled)
EmojiCheckIn → User: Display mood picker
User → EmojiCheckIn: Select emoji + add notes
EmojiCheckIn → SessionLogger: updateSession({ moodAfter, notes })
SessionLogger → IndexedDB: Persist mood data
```

**Performance targets:**
- Session end calculation: <10ms (synchronous)
- IndexedDB update: <30ms P95
- Emoji modal render: <100ms

#### Sequence 3: Profile Clearing Flow

```
Actor: User
Actor: ProfileManager
Actor: IndexedDB

User → InsightsPanel: Click "Clear All Data"
InsightsPanel → ProfileManager: Show confirmation dialog
User → ProfileManager: Confirm deletion
ProfileManager → IndexedDB: Open cursor on profileId index
IndexedDB → ProfileManager: Return matching sessions
ProfileManager → IndexedDB: Delete each session (batch)
IndexedDB → ProfileManager: Return count deleted
ProfileManager → Toast: Show "X sessions deleted"
ProfileManager → InsightsPanel: Refresh empty state
```

**Alternative path:**
- If profileId === "all": Use store.clear() instead of cursor
- If no sessions found: Show "No sessions found" message

#### Sequence 4: Export Flow (Story 4-3)

```
Actor: User
Actor: ExportService
Actor: IndexedDB

User → InsightsPanel: Click "Export Sessions"
InsightsPanel → ExportService: exportSessions(profileId, dateRange)
ExportService → IndexedDB: Query sessions with filters
IndexedDB → ExportService: Return session array
ExportService → ExportService: Serialize to JSON
ExportService → Browser: Trigger download (data: URL)
Browser → User: Save sessions.json file
```

## Non-Functional Requirements

### Performance

**IndexedDB Write Latency:**
- **Target:** <50ms P95 for addSession() operations
- **Target:** <30ms P95 for updateSession() operations
- **Measurement:** Use `performance.mark()` and `performance.measure()` to track actual latency
- **Enforcement:** Log warning to console if operations exceed targets; display toast if >100ms

**Session End Calculation:**
- **Target:** <10ms for duration calculation (synchronous math)
- **Implementation:** Store startTime in ref, calculate (endTime - startTime) / 1000 inline

**Emoji Modal Render:**
- **Target:** <100ms from trigger to visible modal
- **Implementation:** Pre-render modal in hidden state, toggle visibility on demand

**Memory Footprint:**
- **Constraint:** Session logging must not add >5MB memory overhead
- **Strategy:** Use refs for active session tracking instead of state; avoid caching query results

**Storage Footprint:**
- **Estimate:** ~500 bytes per session record
- **Capacity planning:** 500 sessions = ~250KB, 1000 sessions = ~500KB
- **Pruning strategy:** Manual profile clearing only (no auto-pruning in MVP); Story 4-3 may add retention policies

### Security

**Data Locality:**
- **Requirement:** ALL session data must remain on device; no network transmission in MVP
- **Verification:** Code review to ensure no fetch/XHR calls in SessionLogger module
- **Future sync:** When backend introduced (post-MVP), require explicit user opt-in with consent UI

**Input Sanitization:**
- **User notes field:** Sanitize HTML/script tags before storing in IndexedDB
- **Implementation:** Use DOMPurify or React's built-in JSX escaping when rendering notes
- **Emoji validation:** Restrict to known emoji character ranges to prevent injection

**Storage Isolation:**
- **IndexedDB origin:** Bound to HTTPS origin; no cross-origin access possible
- **localStorage separation:** Session data in IndexedDB isolated from preset/settings in localStorage

**Quota Enforcement:**
- **QuotaExceededError handling:** Catch and display user-friendly error: "Storage full, unable to log session"
- **No silent failures:** Always inform user if session logging fails

**Privacy Controls:**
- **Clear profile data:** Provide single-click deletion of all sessions for given profileId
- **Export transparency:** JSON export clearly shows all fields; users can review before sharing
- **No telemetry leakage:** Console.log statements wrapped in DEBUG flag for production

### Reliability/Availability

**Graceful Degradation:**
- **IndexedDB unavailable:** Log warning, disable session tracking, continue playback normally
- **Detection:** Check `window.indexedDB` availability on init; set `isLogging` flag accordingly
- **User feedback:** Show dismissible toast: "Session logging unavailable in this browser"

**Offline Operation:**
- **Requirement:** Session logging must work offline (service worker ensures IndexedDB available)
- **Verification:** Test with DevTools Network → Offline mode; sessions should persist

**Data Corruption Recovery:**
- **VersionError handling:** If schema version mismatch, attempt migration; fallback to re-init
- **Corrupted records:** Wrap JSON.parse in try/catch; skip malformed records during queries
- **Export safeguard:** Validate session records before serialization; omit invalid entries with warning

**Session Continuity:**
- **Browser crash:** Active session lost (acceptable for MVP); future work: persist active session to localStorage
- **Tab close:** Call endSession() in `beforeunload` event (best-effort, not guaranteed)
- **Page refresh:** Active session ends; new playback starts fresh session

**Error Recovery:**
- **Write failures:** Retry once with exponential backoff (50ms delay); log error if second attempt fails
- **Quota exceeded:** Prompt user to clear old sessions or export data
- **IndexedDB lock:** Queue operations with 500ms timeout; show "Database busy" message if timeout exceeded

### Observability

**Console Logging:**
- **Session lifecycle:** Log to console: `[SessionLogger] Session started: {sessionId}`, `[SessionLogger] Session ended: {sessionId}, duration: {duration}s`
- **Error logging:** Log all IndexedDB errors with operation context: `[SessionLogger] Error: {error.name} - {error.message}`
- **Performance logging:** Log write latency when >50ms: `[SessionLogger] Slow write: {latency}ms`

**Performance Monitoring:**
- **Performance marks:** `performance.mark('session-start')`, `performance.mark('session-end')`
- **Measurements:** `performance.measure('session-duration', 'session-start', 'session-end')`
- **Reporting:** Available in Chrome DevTools Performance tab; future: aggregate to telemetry endpoint

**Debug Panel:**
- **Feature flag:** Enable with `?debug=true` query param or localStorage flag
- **Contents:** Show active session ID, last 5 operations, IndexedDB health status, storage quota used
- **Accessibility:** Hidden by default; toggle with keyboard shortcut (Ctrl+Shift+D)

**Error Surface Area:**
- **Structured error codes:**
  - `SESSION_DB_INIT_FAILED` - IndexedDB initialization error
  - `SESSION_QUOTA_EXCEEDED` - Storage quota full
  - `SESSION_WRITE_FAILED` - addSession/updateSession error
  - `SESSION_READ_FAILED` - getSession query error
- **Error reporting:** Emit `SESSION_ERROR` events with error code + context for future analytics integration

**Health Checks:**
- **Startup validation:** On app load, attempt to write/read test record to verify IndexedDB working
- **Quota monitoring:** Check `navigator.storage.estimate()` periodically; warn when <10MB available
- **Session integrity:** Validate required fields (trackId, presetId, timestamp) before writes

## Dependencies and Integrations

### Runtime Dependencies (Browser APIs)

| Dependency | Version/Support | Purpose | Fallback |
|------------|-----------------|---------|----------|
| **IndexedDB** | Native (all browsers) | Session storage, queries, exports | Console logging only; `isLogging: false` |
| **Web Audio API** | Native (all browsers) | Integration with AudioGraphProvider | N/A (required for core app) |
| **localStorage** | Native (all browsers) | Quick flags, feature toggles | Fail silently; use defaults |
| **performance API** | Native (Chrome 25+, FF 6+) | Latency measurement | Skip performance logging |
| **navigator.storage** | Native (Chrome 55+, FF 57+) | Quota monitoring | Skip quota warnings |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **fake-indexeddb** | ^6.2.5 | Mock IndexedDB for Node.js unit tests |

### Internal Integration Points

| Component | Integration Type | Data Flow |
|-----------|------------------|-----------|
| **AudioGraphProvider** (Epic 2) | Event consumer | Calls `startSession()` on playback, `endSession()` on stop |
| **RitualHero** (Epic 1) | Data provider | Passes `ritualUsed` boolean to session payload |
| **PresetEngine** (Epic 3) | Data provider | Provides `activePresetId`, `presetLabel` context |
| **Toast System** (Epic 2) | UI consumer | Displays error messages, success confirmations |
| **Event Bus** (Architecture) | Pub/sub | Emits/consumes lifecycle events |

### Future Integration Points (Placeholders)

| Component | Epic | Integration Notes |
|-----------|------|-------------------|
| **SensorBridge** | Epic 5 | Extends session schema with `hrAvg`, `hrDelta`, `sensorEvents[]` |
| **InsightsPanel** | Epic 4.3 | Reads session data for charts, trends, recommendations |
| **ProfileManager** | Epic 6 | Multi-profile support using `profileId` index |
| **Cloud Sync** | Post-MVP | Export/import format designed for future sync adapter |

### External Integrations

**None for MVP** - All session data remains local. Future considerations:
- **Therapist export:** JSON/CSV download already supported
- **Cloud backup:** Schema designed to support sync without restructuring
- **Analytics endpoint:** `SESSION_*` events ready for future telemetry collection

## Acceptance Criteria (Authoritative)

*Derived from PRD FR6: Session Logging & Insights Scaffold*

### AC1: IndexedDB Schema Initialization
**Given** the application initializes for the first time
**When** the database is created
**Then** it should have:
- Database name: `mp3_8d_sessions`
- Version: 1
- Object store: `sessions` with auto-incrementing `id` keyPath
- Indexes: `timestamp`, `profileId`, `presetId`, `ritualUsed` (all non-unique)

### AC2: Session Start Capture
**Given** a user starts playback (ritual completed or skipped)
**When** `launchRitualPlayback()` executes
**Then**:
- Create new session record with timestamp, trackId, trackName, presetId, presetLabel, ritualUsed
- Store profileId as "default" (MVP single-profile)
- Log to console: `[SessionLogger] Session started: {sessionId}`
- Return session ID for subsequent updates
- IndexedDB write completes in <50ms (P95)

### AC3: Session End Capture
**Given** a session is active
**When** track ends OR user manually stops playback
**Then**:
- Calculate `duration` = (end timestamp - start timestamp) / 1000
- Update session record with duration and `endedManually` flag
- Log to console: `[SessionLogger] Session ended: {sessionId}, duration: {duration}s`
- Clear active session state
- IndexedDB update completes in <30ms (P95)

### AC4: Profile Data Clearing
**Given** a user wants to delete all session data
**When** `clearProfile(profileId)` is called
**Then**:
- Delete all session records where `profileId` matches
- If `profileId === "all"`, clear entire object store
- Log count of deleted records to console
- Show confirmation toast: "X sessions deleted"
- If no records match, show "No sessions found" message

### AC5: Error Handling and Graceful Degradation
**Given** IndexedDB operations may fail (quota, corruption, unavailability)
**When** any database operation executes
**Then**:
- Wrap in try/catch with specific error types
- Log errors to console: `[SessionLogger] Error: {error.name} - {error.message}`
- Show user-friendly toast notification (quota exceeded, database error)
- Gracefully degrade (app continues playback without logging)
- Set `isLogging: false` if IndexedDB unavailable

### AC6: Emoji Check-in (Stretch Goal)
**Given** a session has ended
**When** emoji check-in is enabled
**Then**:
- Display accessible modal with emoji picker (5-7 mood options)
- Accept optional notes field (max 500 chars)
- Update session record with `moodAfter` and `notes`
- Modal dismissible via Escape key or click outside
- Keyboard accessible (Tab navigation, Enter to select)

### AC7: Export Scaffold
**Given** a user requests session export
**When** `exportSessions()` is called
**Then**:
- Query sessions by profileId (optional filter)
- Serialize to JSON format
- Trigger browser download with filename `sessions-{date}.json`
- Include all session fields for transparency

## Traceability Mapping

| AC | PRD Source | Spec Section | Component(s)/API(s) | Test Idea |
|----|------------|--------------|---------------------|-----------|
| **AC1** | FR6 bullet 1 | Data Models: IndexedDB Schema | `initDatabase()` | Unit: Verify object store creation with fake-indexeddb |
| **AC2** | FR6 "session start/end" | Workflows: Sequence 1 | `addSession()`, `startSession()` | Unit: Mock payload → verify record created with all fields |
| **AC3** | FR6 "session start/end" | Workflows: Sequence 2 | `updateSession()`, `endSession()` | Unit: Start session → end → verify duration calculated |
| **AC4** | FR6 "deleting profile purges data" | Workflows: Sequence 3 | `clearProfile()` | Unit: Create 5 sessions → clear → verify count=0 |
| **AC5** | NFR: Reliability | NFR: Reliability/Availability | `initDatabase()`, error handlers | Unit: Simulate QuotaExceededError → verify graceful handling |
| **AC6** | FR6 "emoji feedback" | Data Models: moodAfter | `EmojiCheckIn`, `updateSession()` | Manual: End session → verify modal appears → select emoji |
| **AC7** | FR6 "export" | Workflows: Sequence 4 | `exportSessions()` | Unit: Create sessions → export → verify JSON structure |

### Story-to-AC Mapping

| Story | Primary ACs | Secondary ACs |
|-------|-------------|---------------|
| **4-1: Session Schema & Lifecycle Hooks** | AC1, AC2, AC3, AC5 | - |
| **4-2: Emoji Check-in & Notes Prompt** | AC6 | AC3 (update flow) |
| **4-3: Insights Dashboard & Export** | AC7 | AC4 (clear for export) |

### Component Ownership

| Component | Owning Story | Depends On |
|-----------|--------------|------------|
| `initDatabase()` | 4-1 | - |
| `addSession()` | 4-1 | `initDatabase()` |
| `updateSession()` | 4-1 | `initDatabase()` |
| `clearProfile()` | 4-1 | `initDatabase()` |
| `useSessionLogger` hook | 4-1 | All CRUD helpers |
| `EmojiCheckIn` component | 4-2 | `updateSession()` |
| `exportSessions()` | 4-3 | `initDatabase()` |

## Risks, Assumptions, Open Questions

### Risks

| ID | Risk | Severity | Mitigation |
|----|------|----------|------------|
| **R1** | IndexedDB quota exceeded on mobile devices | HIGH | Implement quota monitoring; show warning when <10MB; provide clear data button |
| **R2** | IndexedDB corruption causes data loss | MEDIUM | Wrap operations in try/catch; implement export-first-then-clear pattern; validate records before write |
| **R3** | Session logging adds latency to playback start | MEDIUM | Fire-and-forget writes; use refs not state; non-blocking async operations |
| **R4** | Browser crash loses active session | LOW | Acceptable for MVP; future: persist active session to localStorage for recovery |
| **R5** | fake-indexeddb doesn't match real browser behavior | LOW | Supplement unit tests with manual browser testing; document any behavioral differences |

### Assumptions

| ID | Assumption | Impact if Wrong |
|----|------------|-----------------|
| **A1** | IndexedDB available in all target browsers (Chrome, Firefox, Safari) | Must implement fallback; feature detection on init |
| **A2** | 500 bytes/session is accurate storage estimate | Capacity planning may need adjustment; monitor actual usage |
| **A3** | Single-profile is sufficient for MVP | Multi-profile required earlier; add profileId index now (done) |
| **A4** | Users will manually clear old sessions when needed | May need auto-pruning feature; export reminder before clear |
| **A5** | Console logging sufficient for MVP observability | May need debug panel earlier if troubleshooting difficult |

### Open Questions

| ID | Question | Owner | Target Resolution |
|----|----------|-------|-------------------|
| **Q1** | Should we use `idb-keyval` library to reduce IndexedDB boilerplate? | Architect | Before Story 4-1 implementation |
| **Q2** | What emoji set should we use for mood tracking? (Unicode vs custom graphics) | UX/PM | Before Story 4-2 |
| **Q3** | Should session logging be opt-in or opt-out by default? | PM | Before Story 4-1 |
| **Q4** | Maximum notes field length? (Currently spec'd at 500 chars) | PM | Before Story 4-2 |
| **Q5** | Should we persist active session to localStorage for crash recovery? | Architect | Post-MVP decision |

## Test Strategy Summary

### Test Levels

| Level | Framework | Scope | Coverage Target |
|-------|-----------|-------|-----------------|
| **Unit Tests** | Node.js + fake-indexeddb | CRUD operations, schema validation, error handling | 90% of SessionLogger module |
| **Integration Tests** | Browser DevTools | Hook integration with AudioGraph, PresetEngine | All event flows |
| **Manual Tests** | Chrome/Firefox/Safari | Full session lifecycle, offline behavior, quota handling | All ACs |

### Unit Test Plan (tests/session-logging.test.js)

| Test ID | Description | AC Coverage |
|---------|-------------|-------------|
| **U1** | Schema initialization creates object store with correct indexes | AC1 |
| **U2** | `addSession()` returns auto-incremented ID and persists all fields | AC2 |
| **U3** | `getSession()` retrieves session by ID | AC2, AC3 |
| **U4** | `updateSession()` patches duration and endedManually fields | AC3 |
| **U5** | `clearProfile()` deletes matching sessions and returns count | AC4 |
| **U6** | `clearProfile("all")` clears entire object store | AC4 |
| **U7** | QuotaExceededError handled gracefully | AC5 |
| **U8** | Corrupted database recovery (VersionError) | AC5 |
| **U9** | Non-existent session ID update returns error | AC3 |
| **U10** | `exportSessions()` returns valid JSON with all session fields | AC7 |

### Integration Test Scenarios

| Test ID | Scenario | Expected Outcome |
|---------|----------|------------------|
| **I1** | Start playback → verify session created in IndexedDB DevTools | Session record visible with correct trackId, presetId |
| **I2** | Stop playback → verify duration calculated correctly | Duration matches actual playback time ±1s |
| **I3** | Skip ritual → verify `ritualUsed: false` | Field correctly reflects ritual status |
| **I4** | Complete ritual → verify `ritualUsed: true` | Field correctly reflects ritual completion |
| **I5** | Create 5 sessions → clear profile → verify all deleted | Count returns 5; IndexedDB empty |

### Manual Test Checklist

| Test ID | Scenario | Browser | Pass Criteria |
|---------|----------|---------|---------------|
| **M1** | Session lifecycle (start → end) | Chrome | Console logs appear; IndexedDB record created |
| **M2** | Offline session logging | Chrome (offline mode) | Session saved; survives reload |
| **M3** | Quota warning | Chrome (fill storage) | Toast appears when <10MB available |
| **M4** | Emoji check-in modal | Chrome | Modal appears; keyboard navigable; saves mood |
| **M5** | JSON export download | Chrome | File downloads; JSON valid; all fields present |
| **M6** | Cross-browser smoke test | Firefox, Safari | Basic session lifecycle works |

### Regression Coverage

- **Epic 1 regression:** Ritual flow still triggers correctly
- **Epic 2 regression:** Audio playback not affected by session logging
- **Epic 3 regression:** Preset changes still logged via `logPresetChange()`

### Performance Testing

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| `addSession()` latency | <50ms P95 | `performance.measure()` in test harness |
| `updateSession()` latency | <30ms P95 | `performance.measure()` in test harness |
| Memory overhead | <5MB | Chrome DevTools Memory panel before/after |

### Definition of Done Checklist

- [ ] All unit tests passing (10 tests)
- [ ] All integration tests verified in Chrome
- [ ] Manual tests completed in Chrome + Firefox
- [ ] Console logging verified (`[SessionLogger]` prefix)
- [ ] Error toasts display correctly
- [ ] No regressions in Epic 1-3 functionality
- [ ] Performance targets met (<50ms writes)
- [ ] Code review approved
