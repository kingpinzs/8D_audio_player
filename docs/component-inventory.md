# Component Inventory – mp3_to_8D

| Component / Section | Location | Purpose | Notes |
|---------------------|----------|---------|-------|
| `App` root | `8d-audio-live-v2.html` / v3 | Houses all hooks, renders layout, registers drag/drop handlers. | Candidate for splitting into smaller components once bundler introduced. |
| Header + Dark Mode Toggle | JSX `<header className="header">` | Switches theme variables and persists preference. | Directly toggles `document.body` class. |
| `Now Playing` card | `.now-playing` section | Displays active track title + status. | Bound to playlist selection and `isPlaying`. |
| Player Controls | `.player-controls` | Play/Pause, Previous, Next buttons plus progress bar + timers. | Buttons manipulate `<audio>` element via refs. |
| Effect Controls Grid | `.controls` container with `.control-group` cards | Adjusts speed, intensity, spatial depth, movement pattern, binaural, noise, visualizer toggles. | Each slider updates Web Audio nodes via `useEffect`. |
| Playlist Manager | `.playlist-section` | Shows draggable list, handles Remove/Clear, sets current track on click. | Persists safe metadata to `localStorage`. |
| Drag-and-Drop Zone | `.upload-zone` | Accepts `FileList` from drop/input and maps to playlist entries. | Warns when running under `file://`. |
| URL Stream Input | `.stream-section` | Accepts direct MP3/YT URLs and appends them to playlist. | YT currently disabled with alert; remote MP3 depends on CORS. |
| Visualizer Canvas | `<canvas ref={canvasRef}>` | Spectrum display driven by `AnalyserNode`. | `showVisualizer` toggle hides it for low-power devices. |
| Settings Panel (v3) | Additional toggles for binaural/noise | Adds advanced audio effect controls beyond v2 baseline. | Source of current audio regression; treat carefully when merging. |
