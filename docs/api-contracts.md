# API Contracts – mp3_to_8D Frontend

## Overview
This repository is a pure browser application. It does **not** host its own HTTP API; instead it
relies on user-provided media sources (local files or remote MP3/stream URLs) and browser APIs.
Because of that, there are no internal REST/GraphQL endpoints to document, but the player still
interacts with a few predictable integration points outlined below.

## External Media Sources
| Integration | Purpose | Contract Details | Notes |
|-------------|---------|-----------------|-------|
| Direct MP3/stream URL | Primary way to stream remote audio. Users paste any publicly reachable URL. | Must return audio data with appropriate `Content-Type` (e.g., `audio/mpeg`) and allow cross-origin requests. | Many commercial services (Pandora, Spotify, etc.) block anonymous CORS; expect the request to fail unless proxied. |
| YouTube URL | Convenience entry in the UI. | Currently blocked because playback requires a backend to transform the stream into a direct media URL. | The UI alerts the user to use direct MP3 links until a backend service is built. |

## Browser / Platform APIs
| API | Usage |
|-----|-------|
| `HTMLAudioElement` | Backing media element that loads blob URLs (for local files) or remote URLs before routing audio into the Web Audio graph. |
| `Web Audio API` | All 8D/ spatial processing. `AudioContext`, `PannerNode`, `GainNode`, `ChannelSplitter`, `AnalyserNode`, and custom oscillators for binaural beats. |
| `localStorage` | Persists playlist metadata that can survive reloads (excluding blob references) plus dark-mode preference. |

## Error Handling + Constraints
- Local files must be served over HTTP(S). Opening the HTML file via `file://` blocks most browser APIs.
- YouTube links surface a blocking alert; spec a backend if automatic conversion is required.
- Remote URLs need CORS headers; when missing, playback will fail silently. Provide a proxy if these sources are mandatory.

## Future Backend Touchpoints
If/when a backend is introduced, it should expose:
1. **Stream normalizer** – Accept a track URL, perform rights-compliant retrieval, and respond with a CORS-friendly stream.
2. **Preset playlist API** – Return structured playlist definitions so the UI can preload curated sets without bundling them into the HTML.
