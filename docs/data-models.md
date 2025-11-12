# Data Models – mp3_to_8D

Although the application is front-end only, it still maintains structured data in memory and in
`localStorage`. Understanding these models helps future workflows (PRD, architecture) reason about
state transitions.

## PlaylistTrack
| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `id` | number | Generated (`Date.now()`) | Stable key for React lists and track references. |
| `name` | string | Derived from filename or heuristics ("Remote Track", "YouTube Track") | User-facing label shown in the playlist. |
| `source` | `'local' | 'url' | 'youtube'` | Based on how the track was added. | `youtube` currently behaves like a warning state. |
| `file` | `File` (optional) | Drag-and-drop / file input | Only kept for active session playback. Removed before persisting to storage. |
| `url` | string | Provided when streaming remote sources | Direct URL fed into the `<audio>` element. |
| `originalUrl` | string | Copy of the user input | Allows future sanitization / metadata lookups. |

## PlaybackState
| Field | Type | Description |
|-------|------|-------------|
| `currentTrackIndex` | number \| `null` | Index into the playlist array. |
| `isPlaying` | boolean | Reflects whether the `<audio>` element is currently playing. |
| `currentTime` | number | Seconds elapsed. Updated every 100ms for progress display. |
| `duration` | number | Total track length in seconds (0 when unknown). |
| `volume` | number (0–1) | Global gain applied via `GainNode`. |

## SpatialEffectState
| Field | Description |
|-------|-------------|
| `speed` | How fast the imaginary sound source rotates (affects panner automation).
| `intensity` | Mix between dry and spatialized audio.
| `spatialDepth` | Z-axis exaggeration for more dramatic motion.
| `movementPattern` | Currently `circle`, `figure8`, or `random`. Switch statement updates panner coordinates every 50ms.
| `binauralEnabled` / `binauralFreq` | Controls optional binaural oscillator pairing.
| `noiseType` / `noiseVolume` | Enables pink/white noise layers for ambience.

## Persisted Preferences
- `darkMode` – `'true' | 'false'` value toggled via the header button.
- `playlist` – Array of playlist entries sans `file` blobs. Reload logic filters invalid blob URLs.

## Gaps / Future Schema
- No remote persistence yet; consider syncing playlists via a backend if collaboration/sharing is required.
- Streaming presets (e.g., Pandora stations) should be described by a dedicated schema once implemented so drag/drop and streaming share the same contract.
