# GitHub Copilot Instructions

## Core Context
- mp3_to_8D is a browser-only 8D ritual player; skim `docs/project-overview.md` for vision and `docs/architecture.md` for runtime topology before large changes.
- `index.html` is the active shell combining v2 audio stability with v3 UI; legacy HTML files (`8d-audio-live-v2.html`, `8d-audio-live-v3.html`, `8d-audio-converter-pro.html`) are frozen references.
- `audio-engine.js` exports `connectGainStaging`, `createBinauralNodes`, `createNoiseNode`; tests in `tests/gain-staging.test.js` assume this surface—extend via new helpers rather than altering signatures.

## Authoring UI Logic
- React 18 UMD, ReactDOM, and Babel Standalone load from CDN; JSX lives in `<script type="text/babel">` blocks inside each HTML file (no bundler/modules).
- Hooks in `index.html` own ritual flow, playlist intake, and audio graph wiring; declare new helpers within the same script scope or attach to `window` when other scripts need them.
- Theme tokens (CSS variables atop each HTML file) drive both light/dark palettes; when adding UI, consume existing variables and honor `body.dark-mode`.
- Accessibility affordances exist (roving tabindex on `mode-chip`, aria-live hero messaging); retain aria roles/labels and keyboard handling when refactoring components.

## Audio Graph Conventions
- Playback routes `<audio>` → gain staging → analyser → destination; `setupAudioGraph()` and `startRotation()` in `index.html` coordinate rotation, binaural, and noise layers.
- Always place new processing between the media source and the object returned by `AudioEngine.connectGainStaging`; when adding effects, call `AudioEngine.createBinauralNodes`/`createNoiseNode` so mocks keep working.
- Continuous updates run with `requestAnimationFrame`; respect `reducedMotion` by throttling loops or skipping visualizers when the flag is true.

## State, Persistence, Telemetry
- Ritual presets live in `MODE_LIBRARY` within `index.html`; reuse/update its structure to keep copy, accent colors, and highlight cards aligned.
- Persist lightweight preferences through `localStorage` keys already in use (`darkMode`, `skipBreathingRitual`, `reducedMotion`); avoid blocking reads outside startup effects.
- `SessionLogger` currently logs to the console; emit structured events through the existing logging helper so the future IndexedDB sink can subscribe without rewrites.

## Developer Workflow
- Serve the repo over HTTP: `python3 -m http.server 8000` or `npx http-server . -p 8000 --cors`, then open `http://localhost:8000/index.html`; Web Audio unlocks fail under `file://`.
- Run regression tests with `node tests/gain-staging.test.js`; they validate gain staging, binaural routing, and noise node contracts.
- After audio/UI edits, follow the manual QA list in `docs/development-guide.md` (drag/drop MP3, streaming URL, dark mode toggle, analyzer canvas).

## Reference Assets
- `docs/` captures shared knowledge (component inventory, PRD, architecture) and is the first stop for behavior questions.
- `.bmad/` hosts the BMM automation module; treat as read-only unless coordinating with workflow tooling.
