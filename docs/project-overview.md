# Project Overview – mp3_to_8D

## Purpose & Vision
mp3_to_8D delivers an immersive 8D audio player that works entirely in the browser. Users can drag
drop MP3 files, paste streaming URLs, toggle dark mode, and fine-tune spatial parameters (speed,
intensity, binaural beats, ambience noise) to simulate movement around the listener.

## Current State
- Multiple HTML variants exist (`v2` is stable, `v3` has UI upgrades but introduces audio bugs).
- There is no backend; integrations are limited to remote media URLs.
- Documentation + workflow tracking now live under `docs/` for downstream BMM workflows.

## Tech Stack Summary
| Layer | Implementation |
|-------|----------------|
| UI | React 18 (UMD) rendered within each HTML file. |
| Logic | React hooks orchestrating playlist management and audio graph control. |
| Audio | Web Audio API (AudioContext, PannerNode, GainNode, AnalyserNode, OscillatorNode). |
| Persistence | Browser `localStorage` (playlist metadata, theme preference). |
| Tooling | No bundler yet; Babel Standalone compiles JSX at runtime. |

## Repository Structure
- `8d-audio-live-v2.html` – Recommended baseline for production until bugs in v3 are resolved.
- `8d-audio-live-v3.html` – Latest UX with advanced controls (drag/drop, streaming, analyzer).
- `8d-audio-converter-pro.html` – Experimental converter interface.
- `docs/` – Auto-generated documentation bundle (this file, architecture, dev guides, etc.).

## Key Risks
1. **No build pipeline** – Everything is inline, making long-term maintenance difficult.
2. **Remote streaming constraints** – Services like Pandora/Spotify require authenticated APIs.
3. **Regression in v3** – Audio graph divergence introduced bugs; unify logic around v2's stable
   nodes before shipping.

## Recommended Next Steps
1. Run `brainstorm-project` / `research` workflows (already queued via workflow-init) to define the
   user journeys for the unified player + streaming story.
2. Use `document-project` outputs (architecture, component inventory, dev guide) as context when the
   PM kicks off the `prd` workflow.
3. Adopt a bundler (Vite) to modularize React components and shared audio utilities.
