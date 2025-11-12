# Deployment Guide – mp3_to_8D

The project is a static Single Page Application, so deployment is straightforward once the unified
HTML build is finalized. The main considerations are CORS for remote streams and HTTPS for browser
APIs.

## Build Artifacts
- `8d-audio-live-v2.html` – current production baseline.
- `8d-audio-live-v3.html` – experimental UI (buggy audio). Merge into a single `8d-audio-live.html`
  before deployment.
- Static assets: none. All dependencies are loaded from CDNs.

## Hosting Options
| Platform | Steps |
|----------|-------|
| Netlify / Vercel | Drag the repository folder or connect the Git repo. Configure the project as a static site with the publish directory set to `/`. Disable build step or run `cp 8d-audio-live-v2.html index.html`. |
| GitHub Pages | Push the repository and enable Pages for the root. Remember to update absolute paths to be relative so CDN scripts load. |
| Custom Nginx/S3 | Upload HTML files to a bucket or server and map them to `/`. Ensure correct MIME type (`text/html`). |

## Serving Advice
1. Force HTTPS so browsers allow the Web Audio autoplay unlock after user interaction.
2. Enable CORS if you plan to proxy remote audio (e.g., `/proxy?url=https://...`). Without it, many
   commercial services reject the request.
3. Configure a lightweight backend only if you need:
   - YouTube playback (needs stream conversion + API compliance)
   - Playlist metadata persistence
   - Authentication for premium features

## Environment Configuration
There are no `.env` files today. If you add a proxy or backend integration, consider exposing:
- `VITE_PROXY_URL` (or similar) for stream normalization
- `VITE_PRESET_FEED` for curated playlist JSON

## Release Checklist
1. Merge the working UI + audio fixes into a single HTML build.
2. Update `index.html` to redirect or embed the production player.
3. Manually test on desktop Chrome + Safari.
4. Upload to chosen host and verify remote streaming plus drag/drop still pass.
