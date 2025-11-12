# Development Guide – mp3_to_8D

## Prerequisites
- Node.js 18+ (optional – only needed if you want to run a static server via `npx`)
- Python 3 (provides the quickest `http.server` command)
- Modern Chromium or Firefox build with Web Audio + SharedArrayBuffer enabled

## Local Setup
1. Clone or unzip the repository.
2. Serve the folder over HTTP (Web Audio + local file playback fails under `file://`). Any of the
   following commands works from the project root:
   ```bash
   # Python
   python3 -m http.server 8000

   # or Node/http-server
   npx http-server . -p 8000 --cors
   ```
3. Visit `http://localhost:8000/8d-audio-live-v2.html` for the stable build or `.../8d-audio-live-v3.html`
   when testing the latest UI/controls.

## Editing Workflow
- Each HTML file embeds React, ReactDOM, and Babel via CDN `<script>` tags. JSX is compiled in the
  browser, so refreshes reflect code edits immediately.
- When merging v2 and v3, start from `8d-audio-live-v2.html` (stable audio graph) and gradually port
  UI sections from v3 (`now-playing`, `player-controls`, effect sliders).
- Keep shared helpers (`setupAudioGraph`, `startAudioRotation`, `setupBinauralBeats`, etc.) together to
  prevent diverging behavior across variants.

## Running / Testing
Because there are no automated tests yet, rely on manual verification:
1. Drag-drop a local MP3 and confirm playback + orbiting effect.
2. Paste a direct MP3 URL and verify streaming works (check console for CORS issues).
3. Toggle dark mode, binaural, noise types, and ensure the analyzer canvas renders.
4. Compare v2 vs v3 to isolate current audio regressions.

## Troubleshooting
- **No audio** – Ensure the page was served over HTTP(S). Browsers will block Web Audio unlock events
  on `file://` URLs.
- **Playlist not saved** – Only non-local tracks persist after reload (blob URLs are intentionally
  stripped). This is expected.
- **YouTube input** – The UI displays an alert because a backend is required. Use direct MP3 links.

## Recommended Next Steps
- Introduce a bundler (Vite) and split React components into modules.
- Add automated smoke tests with Playwright to exercise drag-drop and streaming flows.
