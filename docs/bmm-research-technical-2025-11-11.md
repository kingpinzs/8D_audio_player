# Technical Research – mp3_to_8D
**Date:** 2025-11-11  
**Focus:** Biometric integration + unified-PWA architecture without heavy frameworks

## 1. Executive Summary
You can keep the GitHub Pages deployment by leaning on a browser-native stack: Web Components (or light Preact islands) layered on top of Workbox-generated service workers, IndexedDB for telemetry, and Web Bluetooth/Web Serial for opt-in biometric inputs. MediaPipe’s WASM face-landmarker can sit beside those APIs when webcam cues are needed. Together they satisfy the offline-first PWA constraint, keep latency low, and let you log/stream entirely client-side. The main trade-off is sensor coverage: BLE heart-rate straps work today, but Galaxy/Apple watches still need a companion app or future WebExtensions.

## 2. Requirements & Constraints
### Functional
- Stream local files and remote URLs (MP3/WAV/other common codecs) through the Web Audio graph and manage looping playlists.
- Auto-log each session (preset + physiological readings) for journaling/LLM handoffs.
- Support opt-in biometric inputs (heart-rate monitors, potential webcam posture/micro-expression cues).

### Non-functional
- Installable PWA (Firefox + Chrome), fully offline-capable, minimal latency in the audio graph.
- Privacy-preserving local storage with selective sync only when a service allows (e.g., streaming proxy, Pandora if ever permitted).

### Constraints
- Prefer plain HTML/CSS/JS; small helpers are fine but avoid heavyweight frameworks.
- Ship as a static PWA on GitHub Pages; no dedicated backend unless future streaming-proxy becomes unavoidable.
- Codebase must stay LLM-friendly (clear modules, minimal build steps) and integrate smoothly with VS Code + GitHub.

## 3. Technology Options Considered
| # | Option | Summary |
|---|--------|---------|
| 1 | **Browser-native PWA stack** (Web Components/vanilla JS + Workbox + IndexedDB + Web Bluetooth/Serial) | Keep everything local: service worker handles caching, IndexedDB logs sessions, and Web Bluetooth/Serial connect to BLE HR straps or serial devices without native bridges.[1][2][3][4][6]
| 2 | **Preact + Vite PWA plugin** | Still static but adds component ergonomics, TypeScript-friendly tooling, hot reload, and built-in service worker injection for installability.[5][7][8]
| 3 | **MediaPipe WASM vision layer** | Add webcam-driven cues (face landmarks/blendshapes) entirely client-side to detect stress/engagement; can attach to either Option 1 or 2.[9]

> Note: Options 1 & 2 address UI + storage architecture; Option 3 is an optional sensor layer that can be combined with either.

## 4. Detailed Profiles
### Option 1 – Browser-native PWA stack
- **Sensors:** Web Bluetooth connects to BLE peripherals directly in the browser, enabling GATT heart-rate access with no native code.[1][4]
- **Other devices:** Web Serial covers USB/Bluetooth devices that expose serial profiles (e.g., EEG headbands or custom Arduino sensors).[2]
- **Storage:** IndexedDB stores large structured datasets (session logs, audio presets) locally, supporting offline-first analytics.[3]
- **Offline/installability:** MDN’s PWA guidance + Workbox service-worker tooling make GitHub Pages apps installable and offline.[5][6]
- **DevX:** Plain modules + lit-html or lightweight Web Components keep bundle size minimal and align with “no over-engineering.”
- **Gaps:** Limited direct access to proprietary watch sensors (Galaxy Watch, Apple Watch) because those ecosystems expose data via native bridges/APIs, not raw BLE.

### Option 2 – Preact + Vite PWA plugin
- **Component model:** Preact delivers a React-compatible API in ~3 kB, making complex UI states (advanced sliders vs. simple modes) manageable.[7]
- **Tooling:** Vite + the @vite-pwa/plugin add zero-config manifest generation, service worker injection, and asset pre-caching, keeping installability straightforward.[8]
- **Developer experience:** Hot module reload, TypeScript support, and linting integrate well with VS Code and GitHub Actions.
- **Cost:** Requires a build step (Vite) but still outputs static assets deployable to GitHub Pages. Slightly higher complexity than Option 1 but easier to scale features.

### Option 3 – MediaPipe Face Landmarker (optional vision layer)
- **Capability:** Detects face landmarks and blendshape scores in real time from images or video streams, letting you infer facial expressions and stress indicators on-device.[9]
- **Integration:** Runs via WASM/WebGL with no backend. You can trigger preset adjustments or journaling entries when certain expressions repeat.
- **Trade-offs:** Requires user webcam consent and has CPU/GPU cost on low-power phones. Needs clear privacy messaging.

## 5. Comparative Analysis
| Dimension | Option 1 | Option 2 | Option 3 |
|-----------|----------|----------|----------|
| Meets requirements | ✅ Full local stack for streaming + sensors | ✅ Adds structure for bigger UI | ➖ Sensor add-on only |
| Performance/latency | ✅ Minimal overhead; pure browser APIs | ✅ Slight framework overhead but still light | ⚠️ Webcam inference can tax CPUs |
| Scalability | ✅ Simpler; add modules as needed | ✅ Component architecture scales | ➖ Depends on pairing with 1 or 2 |
| Complexity | ✅ Lowest (no build) | ⚠️ Build tooling + JSX | ⚠️ ML pipeline, privacy prompts |
| Ecosystem/tooling | ➖ Manual module wiring | ✅ Mature ecosystem (Vite plugins, TS) | ⚠️ Smaller niche |
| Cost | ✅ Free, no build infra | ✅ Free but needs CI caching | ✅ Free (open-source) |
| Risk | ⚠️ Limited to BLE devices supported by browsers | ⚠️ Slight vendor risk if Preact ecosystem shrinks | ⚠️ Needs ongoing ML model updates |
| Future-proofing | ✅ Based on evergreen Web APIs | ✅ Active community + Vite roadmap | ⚠️ Model updates from Google |

## 6. Decision Priorities & Trade-offs
**Priorities:** (1) Offline-first simplicity, (2) Sensor coverage without native apps, (3) Maintainable UI for advanced controls.
- **Option 1 vs 2:** Option 1 wins on simplicity/no build; Option 2 wins on maintainability and team velocity. If the UI grows beyond a few modules, Preact + Vite keeps things organized.
- **Sensors:** Neither option solves proprietary watch APIs; bridging those still requires either future WebExtensions or a companion app. Using BLE straps (Polar, Garmin) complies with current browser APIs.
- **Vision layer:** MediaPipe adds a unique telemetry stream but should remain optional to avoid overwhelming hardware or privacy expectations.

## 7. Use-Case Fit
- For today’s GitHub Pages deployment, **Option 1** (browser-native) paired with Workbox + IndexedDB is the lowest friction path.
- If you expect the UI to expand rapidly (shared presets, per-user dashboards), layer **Option 2** early to avoid refactors.
- Add **Option 3** only after core biometric logging (heart-rate) works, so users can opt into webcam analytics gradually.

## 8. Real-World Evidence & References
1. MDN – “The Web Bluetooth API provides the ability to connect and interact with Bluetooth Low Energy peripherals.”[1]
2. MDN – “The Web Serial API provides a way for websites to read from and write to serial devices… connected via serial, USB, or Bluetooth that emulate serial.”[2]
3. MDN – IndexedDB stores significant amounts of structured data (files/blobs) with indexed queries, ideal for session logs.[3]
4. Chrome Docs – Example `navigator.bluetooth.requestDevice()` flow shows how to filter and connect to BLE GATT servers directly from JS.[4]
5. MDN – Installable PWAs feel like platform-specific apps once browsers promote installation.[5]
6. Chrome Workbox docs – Workbox is Google’s service-worker library for building PWAs.[6]
7. Preact homepage – “Fast 3kB alternative to React with the same modern API.”[7]
8. Vite PWA plugin – “Zero-config PWA framework-agnostic for Vite and integrations.”[8]
9. Google AI (MediaPipe) – Face Landmarker detects face landmarks & expressions in real time, outputting 3D points and blendshape scores.[9]

## 9. Recommendations
1. **Adopt Option 1 as the baseline**: implement Workbox CLI to generate the service worker, store session telemetry in IndexedDB, and integrate Web Bluetooth for BLE heart-rate straps. Use Web Serial for experimental devices.
2. **Plan a gradual migration path to Option 2**: wrap complex UI panels in Preact components compiled by Vite; deploy built assets to GitHub Pages (CI pipeline can run `npm run build` then push `/dist`).
3. **Prototype MediaPipe instrumentation separately**: gate behind a feature flag, log results locally, and offer explicit consent screens.
4. **Document limitations**: list supported BLE devices, note that Galaxy/Apple watch data still requires external syncing.

## 10. Architecture Decision Record (ADR)
```
# ADR-001: Local-first PWA architecture for mp3_to_8D

## Status
Proposed (ready for acceptance)

## Context
Need biometric-friendly, offline PWA that runs entirely from GitHub Pages without heavy frameworks.

## Decision Drivers
- Installable/offline without backend
- Easy sensor access via browser APIs
- Maintainable UI for advanced vs. simple modes

## Considered Options
1. Browser-native PWA stack (Workbox + IndexedDB + Web Bluetooth/Serial)
2. Preact + Vite PWA build
3. MediaPipe WASM layer for webcam cues

## Decision
Adopt Option 1 as the default deployment approach, keep Option 2 ready for UI scaling, treat Option 3 as optional add-on.

## Consequences
**Positive**
- Ships immediately on GitHub Pages
- Utilizes privacy-friendly local storage
- Requires no native bridges for BLE sensors

**Negative**
- Limited access to proprietary wearables (Galaxy/Apple watches)
- More manual state management vs. full framework

**Neutral**
- MediaPipe integration left for later iterations

## Implementation Notes
- Use Workbox CLI to precache shell/assets
- Wrap sensor adapters (Web Bluetooth/Serial) in feature-flag modules
- Store session logs + biometric snapshots in IndexedDB

## References
[1]-[9] as listed in Section 8.
```

## Footnotes
[1] MDN Web Bluetooth API meta description – https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API  
[2] MDN Web Serial API meta description – https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API  
[3] MDN IndexedDB API meta description – https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API  
[4] Chrome Developers – “Communicating with Bluetooth devices over JavaScript,” example connecting to GATT server – https://developer.chrome.com/docs/capabilities/bluetooth  
[5] MDN – “Making PWAs installable” meta description – https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable  
[6] Chrome Developers Workbox description – https://developer.chrome.com/docs/workbox/  
[7] Preact homepage meta description – https://preactjs.com/  
[8] Vite PWA plugin guide meta description – https://vite-pwa-org.netlify.app/guide/  
[9] Google AI – MediaPipe Face Landmarker description – https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker
