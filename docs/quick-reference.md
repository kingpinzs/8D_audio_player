# Quick Reference – mp3_to_8D

Use this cheat sheet when working on the project without the Codex agent. It covers the essential commands, workflows, and manual verification steps for the unified 8D audio player.

---

## 1. Local Environment

| Action | Command / Notes |
|--------|-----------------|
| Install dependencies | None – repo ships as static HTML with CDN scripts. |
| Serve locally | `python3 -m http.server 8000` (run from repo root). |
| Open app | Visit `http://localhost:8000/8d-audio-live-v2.html` (stable) or `/8d-audio-live-v3.html` (latest UI). Once unified page exists, use `/index.html`. |
| Stop server | `Ctrl+C` in the terminal running `http.server`. |
| Optional Node server | `npx http-server . -p 8000 --cors` if Python unavailable. |

> Web Audio requires HTTP/S. Never use `file://` or autoplay/unlock events fail.

---

## 2. Manual Test Flow

1. Start server (see above) and load the page in Chrome/Firefox.  
2. Drag/drop a local MP3 and confirm playback + orbit animation.  
3. Paste a direct MP3 URL; verify streaming or note CORS errors in DevTools.  
4. Toggle Focus/Calm/Energize presets; check that binaural/noise controls respond live.  
5. Test dark mode, reduced-motion, and high-contrast toggles (when implemented).  
6. Confirm session logging (emoji prompt) once telemetry stories ship.  
7. If sensors are enabled, pair a BLE strap via browser settings and observe suggestions.

Document issues in `docs/validation-report-<date>.md` or tracking system of choice.

---

## 3. BMad Workflow Commands

All workflows run via the `workflow` CLI provided by the BMAD module. Execute them from the repo root while the appropriate agent chat is active (or directly in terminal if configured):

| Purpose | Command |
|---------|---------|
| Show next required step | `workflow-status` |
| Product Requirements Document | `workflow prd` |
| Epics & Stories | `workflow create-epics-and-stories` |
| UX / Design Spec | `workflow create-design` |
| Architecture Spec | `workflow create-architecture` |
| Solutioning Gate Check | `workflow solutioning-gate-check` |
| Brainstorming session (optional) | `workflow brainstorm-project` |
| Research workflow (optional) | `workflow research` |

> Each workflow writes to `docs/`. Re-run only if you intend to overwrite/append the outputs.

---

## 4. Key Documents

- `docs/PRD.md` – latest requirements and scope.  
- `docs/create-epics-and-stories.md` – backlog (E1–E6) and story acceptance criteria.  
- `docs/create-design.md` – IA, flows, accessibility, open UX questions.  
- `docs/architecture.md` – module layout, data stores, NFR enforcement.  
- `docs/implementation-readiness-report-2025-11-12.md` – gate check summary + conditions for implementation.  
- `docs/bmm-workflow-status.yaml` – tracks which workflows are complete.

Keep these up to date when making changes so the next workflow has accurate context.

---

## 5. Git / Repo Hygiene

| Task | Command |
|------|---------|
| Check status | `git status -sb` |
| View diff | `git diff` (or `git diff <file>`). |
| Stage changes | `git add <file>` |
| Commit | `git commit -m "<message>"` |
| Pull latest | `git pull origin <branch>` |
| Push changes | `git push origin <branch>` |

Always regenerate docs (if applicable) before committing so `docs/` stays authoritative.

---

## 6. Troubleshooting Cheats

| Symptom | Tips |
|---------|------|
| No audio on load | Ensure page served via HTTP, user interaction occurred to unlock audio context, and browser autoplay settings allow sound. |
| Drag/drop fails | Verify file type is MP3/WAV; check console for MIME or CORS errors; ensure server stdout doesn’t show permission errors. |
| Streaming blocked | Many services require auth; use direct MP3 URLs or sample files. Document unsupported sources in PRD appendix. |
| Service worker cache stale | Clear browser storage or use DevTools > Application > Service Workers → “Unregister”, then hard refresh. |
| BLE devices not found | Chrome-only feature today; ensure `chrome://flags/#enable-experimental-web-platform-features` enabled and device in pairing mode. |

---

## 7. Pending Implementation Conditions (from Gate Check)

Before full sprint execution, assign owners for:  
1. **Audio regression harness** comparing unified build vs `8d-audio-live-v2`.  
2. **Sensor QA matrix & consent flows** (list devices, copy, browser support).  
3. **IndexedDB pruning + export tooling** for session logs.

Track these as stories/subtasks so they are visible in planning.

---

## 8. Handy Paths

- Project root: `/home/jeremyking/workspace/mpe_8d`  
- Docs folder: `/home/jeremyking/workspace/mpe_8d/docs`  
- Workflow modules: `./.bmad/bmm/workflows/`  
- Implementation status: `docs/bmm-workflow-status.yaml`

Keep this reference close when working offline—everything needed to run, test, and document the project is here.
