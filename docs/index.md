# Project Documentation Index – mp3_to_8D

## Project Overview
- **Type:** Monolith (single web frontend)
- **Primary Language:** JavaScript + JSX
- **Architecture:** Client-side SPA with Web Audio processing pipeline

## Quick Reference
- **Tech Stack:** React 18 (UMD), Babel Standalone, Web Audio API, Canvas 2D
- **Entry Point:** `8d-audio-live-v2.html` (stable) / `8d-audio-live-v3.html` (latest UI)
- **Architecture Pattern:** Audio-first SPA (MediaElement → Web Audio graph → speakers)

## Generated Documentation
- [Project Overview](./project-overview.md)
- [Architecture](./architecture.md)
- [Source Tree Analysis](./source-tree-analysis.md)
- [Component Inventory](./component-inventory.md)
- [Development Guide](./development-guide.md)
- [Deployment Guide](./deployment-guide.md)
- [API Contracts](./api-contracts.md)
- [Data Models](./data-models.md)

## Existing Documentation
_No legacy documentation was found prior to this workflow._

## Getting Started
1. Serve the repository locally using `python3 -m http.server 8000` (Web Audio requires HTTP/S).
2. Open `http://localhost:8000/8d-audio-live-v2.html` for the stable experience or `.../v3` for the
   latest UI.
3. Drag-drop an MP3 or paste a direct streaming URL, then tweak the effect sliders to validate the
   full 8D pipeline.
4. Reference the development & deployment guides above before making structural changes or shipping
   updates.
