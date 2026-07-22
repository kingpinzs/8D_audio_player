# Epic Technical Specification: Sensor & Adaptive Loop

Date: 2025-11-25
Author: Jeremy
Epic ID: E5
Status: Draft

---

## Overview

Epic 5 introduces optional biometric sensor integration that enables the mp3_to_8D application to adapt audio presets based on real-time physiological signals. This epic builds upon the preset system established in Epic 3 and the session logging infrastructure from Epic 4 to create a privacy-first adaptive loop. Users with Bluetooth heart-rate straps or custom serial-connected boards can opt-in to sensor-driven preset suggestions while maintaining full control over their data and automation preferences.

The adaptive system respects the app's core philosophy of "calm first, controls second" by only presenting suggestions (not forcing changes) and providing clear visual cues when sensor automation is active. All biometric data remains strictly local, never leaving the device.

## Objectives and Scope

### In Scope
- Web Bluetooth API integration for standard Heart Rate Service (0x180D)
- Web Serial API integration for custom Arduino/ESP32 boards
- Browser capability detection with graceful degradation messaging
- Per-device consent management stored in IndexedDB
- Threshold-based rule engine for HR-driven preset suggestions
- Lock/unlock UI for sensor automation control
- Integration with existing `applyPreset()` helper from Epic 3
- Session-level biometric data logging (hrAvg, hrMax, hrDelta) in Epic 4 schema
- Simulator mode for development and testing

### Out of Scope
- Cloud sync of biometric data (deferred to post-MVP backend work)
- MediaPipe/webcam-based cues (documented for future E7+)
- Multiple simultaneous sensor connections (single device at a time)
- Historical biometric analytics dashboard (beyond basic hrAvg display)
- Custom sensor calibration UI (use device defaults)
- Muse EEG or other non-HR sensors (future enhancement)

## System Architecture Alignment

This epic integrates with the architecture defined in `docs/architecture.md` Section 3.6 (Sensor Bridge):

### Component Integration Points
```
┌──────────────┐     ┌──────────────────┐
│  App Shell   │────▶│   SensorProvider │◀─── Web Bluetooth API
│ (React root) │     │   Context Hook   │◀─── Web Serial API
└─────┬────────┘     └─────┬────────────┘
      │                    │
      ▼                    ▼
┌──────────────┐   ┌──────────────────┐
│ Advanced Ctrl│   │ SensorRuleEngine │──▶ Preset Suggestions
│ (Sensor Lock)│   │ (Threshold Logic)│
└──────────────┘   └──────────────────┘
      │                    │
      ▼                    ▼
┌──────────────────────────────────────┐
│         PresetProvider               │
│    (applyPreset + sensorLocked)      │
└──────────────────────────────────────┘
      │
      ▼
┌──────────────────┐
│ SessionLogger    │ (hrAvg, hrMax, sensorEvents[])
│ IndexedDB        │
└──────────────────┘
```

### Architecture Constraints
- No server-side components; all sensor processing runs client-side
- IndexedDB `sensor_consent` store for permission records
- Feature-flagged deployment (`?sensors=true` or localStorage flag)
- Must not break existing audio graph stability from E2

## Detailed Design

### Services and Modules

| Module | Responsibilities | Inputs | Outputs | Owner |
|--------|-----------------|--------|---------|-------|
| `SensorProvider` | Context provider managing sensor state, connection lifecycle, data stream | User actions, Bluetooth/Serial events | `sensorData`, `sensorStatus`, `connectedDevice` | Frontend |
| `useSensorBridge` | Hook exposing connection/disconnection APIs | Device selection | Connection state, error codes | Frontend |
| `SensorRuleEngine` | Evaluates HR against thresholds, emits suggestions | HR data stream, user thresholds | `SENSOR_THRESHOLD_EXCEEDED` events | Frontend |
| `SensorConsentManager` | Manages IndexedDB consent records, device handles | User consent actions | Consent status, device list | Frontend |
| `BluetoothAdapter` | Web Bluetooth GATT connection to HR Service | Device ID | HR characteristic notifications | Frontend |
| `SerialAdapter` | Web Serial connection to custom boards | Port selection, baud rate | Parsed sensor data | Frontend |
| `SensorSimulator` | Development/test harness generating fake data | Simulation parameters | Simulated HR stream | Frontend |

### Data Models and Contracts

#### IndexedDB `sensor_consent` Store Schema
```javascript
{
  id: <auto-increment>,
  deviceId: string,           // Bluetooth device ID or Serial port info
  deviceName: string,         // User-friendly name
  type: "bluetooth" | "serial",
  grantedAt: number,          // Date.now() timestamp
  scopes: string[],           // ["heart_rate"] for BLE, ["custom_data"] for serial
  lastConnectedAt: number | null,
  connectionCount: number,
  revokedAt: number | null    // Set when user "forgets" device
}
```

#### Extended Session Schema (E4 Integration)
```javascript
// Additions to existing session record
{
  ...existingSessionFields,
  hrAvg: number | null,       // Average HR during session (null if no sensor)
  hrMax: number | null,       // Peak HR during session
  hrMin: number | null,       // Lowest HR during session
  hrDelta: number | null,     // hrMax - hrMin
  sensorEvents: [{
    timestamp: number,
    type: "THRESHOLD_EXCEEDED" | "SUGGESTION_SHOWN" | "SUGGESTION_ACCEPTED" | "SUGGESTION_DISMISSED",
    data: object              // Context-specific data
  }]
}
```

#### Sensor State Model
```javascript
const sensorState = {
  status: "idle" | "scanning" | "connecting" | "connected" | "error",
  connectedDevice: {
    id: string,
    name: string,
    type: "bluetooth" | "serial"
  } | null,
  currentHR: number | null,           // Latest reading
  hrHistory: number[],                // Rolling 60-second window
  isSimulated: boolean,
  error: {
    code: string,                     // "BT_NOT_SUPPORTED", "PERMISSION_DENIED", etc.
    message: string
  } | null
}
```

### APIs and Interfaces

#### SensorBridge Hook API
```javascript
const {
  // State
  sensorStatus,           // "idle" | "scanning" | "connecting" | "connected" | "error"
  connectedDevice,        // { id, name, type } | null
  currentHR,              // number | null
  isSimulated,            // boolean
  error,                  // { code, message } | null

  // Actions
  scanForDevices,         // () => Promise<Device[]>
  connectBluetoothSensor, // (deviceId: string) => Promise<void>
  connectSerialSensor,    // (port: SerialPort, baudRate?: number) => Promise<void>
  disconnectSensor,       // () => Promise<void>
  forgetDevice,           // (deviceId: string) => Promise<void>
  simulateSensor,         // (config?: SimConfig) => void
  stopSimulation,         // () => void

  // Consent
  getConsentedDevices,    // () => Promise<ConsentRecord[]>
  hasConsent,             // (deviceId: string) => Promise<boolean>
  grantConsent,           // (device: Device) => Promise<void>
  revokeConsent,          // (deviceId: string) => Promise<void>
} = useSensorBridge();
```

#### Error Codes
| Code | Description | User Message |
|------|-------------|--------------|
| `BT_NOT_SUPPORTED` | Web Bluetooth unavailable | "Bluetooth not supported in this browser. Try Chrome on desktop or Android." |
| `SERIAL_NOT_SUPPORTED` | Web Serial unavailable | "Serial connections not supported. Try Chrome." |
| `PERMISSION_DENIED` | User denied Bluetooth/Serial permission | "Permission needed to connect your sensor. Please allow when prompted." |
| `DEVICE_NOT_FOUND` | Selected device not discoverable | "Couldn't find your device. Make sure it's powered on and nearby." |
| `CONNECTION_FAILED` | GATT connection or Serial open failed | "Connection failed. Try turning your device off and on." |
| `DISCONNECTED` | Device disconnected unexpectedly | "Sensor disconnected. Reconnecting..." |
| `RECONNECT_TIMEOUT` | Reconnect attempts exceeded 3s | "Couldn't reconnect. Please reconnect manually." |

### Workflows and Sequencing

#### Story 5-1: Capability Detection & Consent Flow
```
1. App loads → SensorProvider initializes
2. Check navigator.bluetooth && navigator.serial availability
3. If unsupported: Set sensorCapabilities = { bluetooth: false, serial: false }
4. UI conditionally renders based on capabilities
5. User clicks "Connect Sensor" → Show onboarding modal (privacy copy)
6. User accepts → scanForDevices() called
7. User selects device → grantConsent() + connect()
8. On disconnect: Device remains in consent list for quick reconnect
9. User clicks "Forget Device" → revokeConsent() + clear device data
```

#### Story 5-2: Heart Rate Subscription & Threshold Engine
```
1. BLE device connects → Subscribe to HR Measurement characteristic (0x2A37)
2. Each notification → Parse HR value → Update currentHR state
3. Push HR to rolling 60s history buffer
4. Every 10s: SensorRuleEngine evaluates rules
5. If HR > threshold for 3 consecutive checks (3 min):
   - Emit SENSOR_THRESHOLD_EXCEEDED event
   - Log sensorEvent to current session
   - Show toast: "Heart rate elevated. Switch to Calm preset?"
6. User response logged as SUGGESTION_ACCEPTED or SUGGESTION_DISMISSED
```

#### Story 5-3: Sensor-Informed Preset Adjustments
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

## Non-Functional Requirements

### Performance

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Sensor scan latency | <3s | `performance.mark()` from scan start to device list |
| Connection time | <5s | From user selection to HR data streaming |
| Reconnect time | <3s | From disconnect detection to reconnected state |
| HR update latency | <100ms | From BLE notification to UI update |
| Rule evaluation | <50ms | `performance.measure()` on rule engine tick |
| Memory footprint | <5MB | 60s HR history buffer + consent records |

PRD Reference: "Audio parameter changes apply in <20 ms" - sensor-driven preset changes must match this target.

### Security

- **Bluetooth Permissions:** Browser-native permission prompts; no custom bypass
- **Data Isolation:** All sensor data stays in IndexedDB; no network transmission
- **Consent Audit Trail:** `grantedAt`, `revokedAt` timestamps enable compliance review
- **Input Sanitization:** Serial data parsed with strict format validation
- **No PII Collection:** Device IDs stored, not user identifiers
- **Feature Flag Control:** Sensors disabled by default in production until beta validated

Architecture Reference: Section 3.6 specifies "Consent records stored in IndexedDB `sensor_consent` store; includes `deviceId`, `type`, `grantedAt`, `scopes`. Clearing profile purges these records."

### Reliability/Availability

- **Graceful Degradation:** App fully functional without sensors
- **Reconnect Logic:** 3 automatic reconnect attempts over 3s before showing manual prompt
- **Error Recovery:** Connection failures don't crash app; show actionable toast
- **Offline Behavior:** Sensor data logged locally; available after reconnect
- **Browser Compatibility:**
  - Chrome 79+: Full support (Bluetooth + Serial)
  - Edge 79+: Full support
  - Firefox: No Bluetooth (graceful messaging), Serial works
  - Safari: No Bluetooth/Serial (hidden from UI)

### Observability

| Signal | Type | Purpose |
|--------|------|---------|
| `[SensorBridge] Connected: {deviceId}` | Console log | Debug connection flow |
| `[SensorBridge] HR: {value}` | Console log (debug mode only) | Validate data stream |
| `[SensorRuleEngine] Threshold exceeded: HR={value}, threshold={threshold}` | Console log | Debug rule triggers |
| `sensor_connection_success` | Session metric | Track connection reliability |
| `sensor_suggestion_accepted` | Session metric | Measure suggestion effectiveness |
| Debug panel "Sensor" tab | UI component | Show connection status, current HR, consent list |

## Dependencies and Integrations

### Runtime Dependencies
| Dependency | Version | Purpose |
|------------|---------|---------|
| React 18 UMD | 18.2.0 | State management, hooks |
| Web Bluetooth API | Browser native | BLE HR sensor connectivity |
| Web Serial API | Browser native | Custom board connectivity |
| IndexedDB | Browser native | Consent + session storage |

### Internal Dependencies
| Dependency | Source | Integration Point |
|------------|--------|-------------------|
| `PresetProvider` | Epic 3 | `applyPreset()` for sensor-driven changes |
| `sensorLocked` state | Epic 3 Story 3-2 | Lock icon UI already implemented |
| `SessionLogger` | Epic 4 | `hrAvg`, `sensorEvents[]` fields |
| Toast system | Epic 2 | Sensor connection/suggestion notifications |
| `setA11yAnnouncement` | Epic 1 | Screen reader announcements |

### External Integration Points
- **Polar H10 (reference device):** Standard HR Service 0x180D, Measurement 0x2A37
- **Generic BLE HR monitors:** Any device implementing HR GATT profile
- **Arduino/ESP32 boards:** Serial protocol TBD (simple CSV: `HR,{value}\n`)

## Acceptance Criteria (Authoritative)

### AC5.1: Capability Detection & Consent UI
1. **AC5.1.1:** App detects Web Bluetooth support and conditionally shows "Connect Bluetooth Sensor" button
2. **AC5.1.2:** App detects Web Serial support and conditionally shows "Connect Serial Device" button
3. **AC5.1.3:** Firefox users see "Bluetooth not supported in Firefox" message with Chrome recommendation
4. **AC5.1.4:** Safari users see no sensor options (gracefully hidden)
5. **AC5.1.5:** Onboarding modal explains: data stays local, can forget device anytime
6. **AC5.1.6:** "Forget Device" button clears consent record and stored device handle
7. **AC5.1.7:** Consented devices appear in quick-connect list for one-tap reconnect

### AC5.2: Heart-Rate Subscription & Threshold Engine
1. **AC5.2.1:** Connects to standard Heart Rate Service (0x180D) on BLE devices
2. **AC5.2.2:** HR updates display in real-time (<100ms latency) when connected
3. **AC5.2.3:** Reconnect attempts automatically for up to 3 seconds on disconnect
4. **AC5.2.4:** Rule engine triggers when HR > user threshold for 3 consecutive minutes
5. **AC5.2.5:** Suggestion toast shows: "Heart rate elevated. Switch to Calm preset?"
6. **AC5.2.6:** User can accept (applies preset) or dismiss (logs dismissal)
7. **AC5.2.7:** Threshold configurable via Settings (default: 85 BPM)
8. **AC5.2.8:** Simulated sensor mode available for development (`?simulate_sensor=true`)

### AC5.3: Sensor-Informed Preset Adjustments
1. **AC5.3.1:** Sensor signals can auto-adjust intensity, noise, binaural parameters
2. **AC5.3.2:** Lock icon shows when sensor automation is active
3. **AC5.3.3:** Clicking lock icon pauses automation (user takes manual control)
4. **AC5.3.4:** Manual slider adjustment automatically pauses sensor automation
5. **AC5.3.5:** "Auto-adjust" toggle in Settings enables/disables automation globally
6. **AC5.3.6:** All automation events logged to session `sensorEvents[]` array
7. **AC5.3.7:** Automation changes apply via `applyPreset()` with <20ms latency

## Traceability Mapping

| AC | Spec Section | Component(s)/API(s) | Test Idea |
|----|-------------|---------------------|-----------|
| AC5.1.1 | APIs: useSensorBridge | SensorProvider, BluetoothAdapter | Mock navigator.bluetooth; verify button visibility |
| AC5.1.2 | APIs: useSensorBridge | SensorProvider, SerialAdapter | Mock navigator.serial; verify button visibility |
| AC5.1.3 | Workflows: 5-1 | Capability detection logic | Test in Firefox; verify messaging |
| AC5.1.4 | Workflows: 5-1 | Capability detection logic | Test in Safari; verify hidden |
| AC5.1.5 | Data Models: sensor_consent | SensorConsentManager, Modal UI | Verify modal text content |
| AC5.1.6 | APIs: revokeConsent | SensorConsentManager | forgetDevice(); verify IndexedDB cleared |
| AC5.1.7 | APIs: getConsentedDevices | SensorConsentManager, Quick Connect UI | Add consent; verify list renders |
| AC5.2.1 | Data Models: BluetoothAdapter | BluetoothAdapter | Connect to Polar H10; verify data |
| AC5.2.2 | NFR: Performance | SensorProvider | performance.measure() on HR update |
| AC5.2.3 | NFR: Reliability | BluetoothAdapter | Simulate disconnect; verify auto-reconnect |
| AC5.2.4 | Workflows: 5-2 | SensorRuleEngine | Mock 3 min elevated HR; verify event |
| AC5.2.5 | Workflows: 5-2 | Toast system integration | Verify toast text matches spec |
| AC5.2.6 | Data Models: sensorEvents | SessionLogger | Accept/dismiss; verify logged |
| AC5.2.7 | Data Models: Sensor State | Settings UI, SensorRuleEngine | Change threshold; verify rule uses new value |
| AC5.2.8 | Services: SensorSimulator | SensorSimulator | Enable simulation; verify fake HR stream |
| AC5.3.1 | Workflows: 5-3 | SensorRuleEngine, PresetProvider | Trigger rule; verify preset applied |
| AC5.3.2 | Services: SensorProvider | Advanced Controls drawer | Enable automation; verify lock icon |
| AC5.3.3 | Workflows: 5-3 | Lock icon click handler | Click lock; verify sensorLocked = false |
| AC5.3.4 | Workflows: 5-3 | Slider onChange handlers | Move slider; verify automation paused |
| AC5.3.5 | Data Models: Settings | Settings UI, SensorRuleEngine | Toggle off; verify no automation |
| AC5.3.6 | Data Models: sensorEvents | SessionLogger | Trigger automation; verify event logged |
| AC5.3.7 | NFR: Performance | applyPreset integration | performance.measure() on preset application |

## Risks, Assumptions, Open Questions

### Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **R1:** Web Bluetooth deprecated or restricted | High | Low | Monitor Chrome Platform Status; Serial remains fallback |
| **R2:** Polar H10 connection issues | Medium | Medium | Document troubleshooting; test with multiple devices |
| **R3:** Users ignore suggestions (low acceptance) | Medium | Medium | A/B test suggestion UI copy; track acceptance rate |
| **R4:** IndexedDB quota exceeded | Low | Low | Sensor data is minimal; leverage E4 pruning job |
| **R5:** Serial protocol fragmentation | Medium | High | Define strict protocol; provide Arduino/ESP32 reference code |

### Assumptions

1. **A1:** Chrome remains the primary supported browser for sensor features
2. **A2:** Users own compatible BLE HR monitors (Polar H10, Garmin straps)
3. **A3:** Custom serial boards follow defined protocol (`HR,{value}\n`)
4. **A4:** Epic 3 `sensorLocked` state and lock icon are already implemented (verified in Epic 3 retro)
5. **A5:** Epic 4 session schema already has `hrAvg`, `hrMax` fields (need to verify)

### Open Questions

| Question | Owner | Target Date | Impact if Unresolved |
|----------|-------|-------------|---------------------|
| **Q1:** What minimum sensor list should we certify? | QA | Before Story 5-2 | May miss edge cases |
| **Q2:** Should threshold be per-preset or global? | Product | Story 5-2 | Architecture decision |
| **Q3:** Serial protocol: CSV vs binary? | Hardware | Story 5-1 | Blocks custom board support |
| **Q4:** Do we show HR in main UI or only debug panel? | UX | Story 5-3 | UI complexity |

## Test Strategy Summary

### Unit Tests (Node.js + Jest)
- `SensorRuleEngine.test.js`: Threshold evaluation logic, edge cases (exact threshold, below, above)
- `BluetoothAdapter.test.js`: Mock Web Bluetooth API; connection states, error handling
- `SerialAdapter.test.js`: Mock Web Serial API; data parsing, reconnect logic
- `SensorConsentManager.test.js`: IndexedDB CRUD operations with `fake-indexeddb`

### Integration Tests
- Sensor connection lifecycle (scan → connect → stream → disconnect)
- Consent flow (grant → connect → forget → verify cleared)
- Rule engine → preset application → session logging
- Capability detection across browser mocks

### Manual Tests
| Scenario | Browser | Device | Expected |
|----------|---------|--------|----------|
| BLE connect happy path | Chrome | Polar H10 | HR displays, reconnect works |
| BLE in Firefox | Firefox | Any | "Not supported" message |
| Serial connect | Chrome | Arduino | Data streams, disconnect clean |
| Forget device | Chrome | Any | Device removed, no quick-connect |
| Threshold trigger | Chrome | Simulated | Suggestion appears after 3 min |
| Lock icon toggle | Chrome | Any | Automation pauses/resumes |

### Performance Tests
- Measure HR update latency (target: <100ms)
- Measure preset application latency (target: <20ms)
- Memory profiling over 30-minute session

### Accessibility Tests
- Keyboard navigation for all sensor controls
- Screen reader announces connection state changes
- Focus management in consent modal
- Lock icon has descriptive aria-label

---

**Tech Spec Status:** Complete
**Ready for Story Drafting:** Yes
**Next Step:** Run `create-story` workflow for Story 5-1
