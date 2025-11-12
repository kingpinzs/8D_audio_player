# Story Context – 1-1 Consolidated Shell & Navigation

**Story:** 1-1-consolidated-shell-and-navigation  
**Epic:** E1 – Unified Ritual Player Experience  
**Status:** ready-for-dev

---

## Problem / Goal
Users currently juggle multiple HTML variants (v2 stable audio vs v3 latest UI), causing confusion and inconsistent accessibility. The goal is to ship a single responsive page that merges v2’s audio stability with v3’s UI/navigation improvements, enabling Focus/Calm/Energize rituals in ≤2 taps with ≥95 accessibility scores.

## Requirements Trace
- PRD FR1, FR4, FR8 (unified UI, ritual launch, accessibility/personalization).  
- Epic E1 stories S1.1–S1.3 (consolidated shell, ritual animation, accessibility toggles).  
- Design spec `docs/create-design.md` Sections 3 & 4 for IA and flows.  
- Architecture `docs/architecture.md` Section 3.1 for AppShell/Hook structure.

## Constraints & Decisions
- Must preserve v2 audio graph logic; layout changes cannot break existing playlist/playback flows.  
- Responsive grid: ≥1280px three-column, 768–1279px two-column, ≤767px single-column with sticky tabs.  
- Large tap targets (≥48px), roving tabindex for mode chips, keyboard focus order per design spec.  
- Accessibility audit (axe/Pa11y) must score ≥95; dark/high-contrast toggles integrated (hooks from S1.3).  
- Serve via HTTP(S); final entry point will become `/index.html` for production.

## Implementation Notes
- Start from `8d-audio-live-v2.html` as baseline, copy relevant UI sections from v3, and reconcile styling tokens.  
- Break down React components: `Header`, `ModeTabs`, `RitualHero`, `PresetCarousel`, `PlaybackCluster`, `InsightsColumn`.  
- Keep state in hooks/providers defined in architecture doc (`useAudioGraph`, `usePresetEngine`, etc.).  
- Ensure CSS variables cover light/dark/high-contrast themes; integrate reduced-motion media query.

## Test Guidance
- Manual viewport check (Chrome dev tools) at 1366×768, 1024×768, 768×1024, 375×812.  
- Keyboard-only navigation test; verify roving tabindex and skip controls.  
- Accessibility audit via `npx pa11y http://localhost:8000/index.html` or axe plugin.  
- Compare to v2 layout for regression (playlist, controls, drag/drop functionality).  
- Record results in future validation report or story QA notes.

## Unresolved Questions
- Exact placement for Install CTA + debug link (header vs insights column).  
- Whether to surface telemetry/sensor cards immediately or behind feature flags in MVP.
