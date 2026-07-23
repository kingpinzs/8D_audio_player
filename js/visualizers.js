/**
 * 8D Audio Player - Visualizers Module
 * Canvas-based audio visualization effects
 * Extracted from index.html for modularization
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.Visualizers = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * Draw bars visualizer
     */
    const drawBars = (ctx, canvas, frequencyData, options) => {
        const { visualGain, bufferLength, palette } = options;
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = ((frequencyData[i] / 255) * canvas.height) * visualGain;
            const hue = palette
                ? palette.hueBase + (i / bufferLength) * palette.hueRange
                : (i / bufferLength) * 360;
            const sat = palette ? palette.saturation : 70;
            const lig = palette ? palette.lightness : 60;
            ctx.fillStyle = `hsl(${hue}, ${sat}%, ${lig}%)`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    };

    /**
     * Draw waveform visualizer
     */
    const drawWaveform = (ctx, canvas, waveformData, options) => {
        const { visualGain, bufferLength, palette } = options;
        const stroke = palette ? palette.accent : '#4ade80';
        ctx.lineWidth = 2;
        ctx.strokeStyle = stroke;
        ctx.beginPath();
        const sliceWidth = canvas.width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const v = waveformData[i] / 128.0;
            const y = (v * canvas.height / 2) * visualGain;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceWidth;
        }
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        ctx.shadowBlur = 15;
        ctx.shadowColor = stroke;
        ctx.stroke();
        ctx.shadowBlur = 0;
    };

    /**
     * Draw circular visualizer
     */
    const drawCircular = (ctx, canvas, frequencyData, options) => {
        const { visualGain, bufferLength, palette } = options;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) * 0.6;
        const bars = 64;
        for (let i = 0; i < bars; i++) {
            const freqIndex = Math.floor(i * bufferLength / bars);
            const amplitude = (frequencyData[freqIndex] / 255) * visualGain;
            const angle = (i / bars) * Math.PI * 2;
            const innerR = radius * 0.3;
            const outerR = radius + (amplitude * radius * 0.8);
            const hue = palette
                ? palette.hueBase + (i / bars) * palette.hueRange
                : (i / bars) * 360;
            const sat = palette ? palette.saturation : 80;
            const lig = palette ? palette.lightness : 60;
            ctx.beginPath();
            ctx.moveTo(centerX + Math.cos(angle) * innerR, centerY + Math.sin(angle) * innerR);
            ctx.lineTo(centerX + Math.cos(angle) * outerR, centerY + Math.sin(angle) * outerR);
            ctx.strokeStyle = `hsl(${hue}, ${sat}%, ${lig}%)`;
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    };

    /**
     * Draw mirrored bars visualizer
     */
    const drawMirrored = (ctx, canvas, frequencyData, options) => {
        const { visualGain, bufferLength } = options;
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;
        const centerY = canvas.height / 2;

        // Draw center line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(canvas.width, centerY);
        ctx.stroke();

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = ((frequencyData[i] / 255) * centerY * 0.9) * visualGain;

            // Top bars - blues -> yellow -> orange -> red (no greens)
            const topGradient = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY);
            topGradient.addColorStop(0, `hsl(0, 90%, 50%)`);     // Red (loudest)
            topGradient.addColorStop(0.12, `hsl(15, 90%, 50%)`);  // Orange-red
            topGradient.addColorStop(0.25, `hsl(35, 95%, 50%)`);  // Orange
            topGradient.addColorStop(0.38, `hsl(50, 90%, 50%)`);  // Yellow
            topGradient.addColorStop(0.5, `hsl(200, 80%, 55%)`);  // Light blue
            topGradient.addColorStop(0.65, `hsl(210, 80%, 50%)`); // Sky blue
            topGradient.addColorStop(0.8, `hsl(220, 75%, 55%)`);  // Blue
            topGradient.addColorStop(0.92, `hsl(230, 70%, 55%)`); // Medium blue
            topGradient.addColorStop(1, `hsl(240, 70%, 60%)`);    // Deep blue (center)
            ctx.fillStyle = topGradient;
            ctx.fillRect(x, centerY - barHeight, barWidth, barHeight);

            // Bottom bars (reflection - same spectrum, faded)
            const bottomGradient = ctx.createLinearGradient(0, centerY, 0, centerY + barHeight);
            bottomGradient.addColorStop(0, `hsla(240, 70%, 60%, 0.8)`);    // Deep blue at center
            bottomGradient.addColorStop(0.08, `hsla(230, 70%, 55%, 0.75)`); // Medium blue
            bottomGradient.addColorStop(0.2, `hsla(220, 75%, 55%, 0.65)`);  // Blue
            bottomGradient.addColorStop(0.35, `hsla(210, 80%, 50%, 0.55)`); // Sky blue
            bottomGradient.addColorStop(0.5, `hsla(200, 80%, 55%, 0.45)`);  // Light blue
            bottomGradient.addColorStop(0.62, `hsla(50, 90%, 50%, 0.4)`);   // Yellow
            bottomGradient.addColorStop(0.75, `hsla(35, 95%, 50%, 0.35)`);  // Orange
            bottomGradient.addColorStop(0.88, `hsla(15, 90%, 50%, 0.3)`);   // Orange-red
            bottomGradient.addColorStop(1, `hsla(0, 90%, 45%, 0.25)`);     // Red (faded)
            ctx.fillStyle = bottomGradient;
            ctx.fillRect(x, centerY, barWidth, barHeight);

            x += barWidth + 1;
        }
    };

    // Per-canvas engine state for the particle system (beat detection history)
    const particleEngineState = new WeakMap();

    /**
     * Draw particles visualizer — cymatics sand: single-pixel grains resting
     * on a "speaker cone" floor. Bass hits kick them airborne, they arc under
     * gravity, bounce, and settle between hits. Silence -> the sand drains
     * away and the canvas goes dark.
     */
    const drawParticles = (ctx, canvas, frequencyData, particles, options) => {
        const { bufferLength, maxParticles, palette, visualGain = 1 } = options;
        const W = canvas.width;
        const H = canvas.height;
        const S = Math.max(W, H) / 600;

        // ---- audio analysis ----
        const band = (from, to) => {
            const end = Math.min(to, bufferLength);
            let sum = 0;
            for (let i = from; i < end; i++) sum += frequencyData[i];
            return end > from ? (sum / (end - from)) / 255 : 0;
        };
        // visualGain acts as a sensitivity trim (0.6x-1.4x), not a raw
        // multiplier — a low intensity slider must not kill the physics
        const trim = 0.6 + Math.min(visualGain, 1) * 0.8;
        const bass = band(0, 8) * trim;
        const mid = band(8, 64) * trim;
        const treble = band(64, 256) * trim;
        const energy = bass * 0.5 + mid * 0.35 + treble * 0.15;

        let st = particleEngineState.get(canvas);
        if (!st) {
            st = { bassAvg: 0.1, beatCooldown: 0, silentFrames: 0 };
            particleEngineState.set(canvas, st);
        }
        st.bassAvg = st.bassAvg * 0.95 + bass * 0.05;
        st.beatCooldown = Math.max(0, st.beatCooldown - 1);
        const isBeat = bass > st.bassAvg * 1.35 + 0.04 && st.beatCooldown === 0;
        if (isBeat) st.beatCooldown = 8;

        const silent = energy < 0.04;
        st.silentFrames = silent ? st.silentFrames + 1 : 0;
        const draining = st.silentFrames > 20; // no music -> sand drains away

        const cap = maxParticles * 25;
        const floorY = H - 1;
        const px = Math.max(1, Math.round(S));
        const hueFor = () => palette
            ? palette.hueBase + Math.random() * Math.max(palette.hueRange, 14)
            : 30 + Math.random() * 30;

        // ---- pour sand while the music plays ----
        if (!draining) {
            const target = Math.min(cap, Math.round(W * 1.1));
            const pour = Math.min(24, target - particles.length);
            for (let i = 0; i < pour; i++) {
                particles.push({
                    x: Math.random() * W,
                    y: floorY - Math.random() * 3 * S,
                    vx: 0,
                    vy: 0,
                    life: 1,
                    hue: hueFor(),
                    rest: true
                });
            }
        }

        // ---- physics: kicks, gravity, bounce, settle ----
        const gravity = 0.16 * S;
        const kickChance = isBeat ? 0.45 + bass * 0.5 : bass * 0.10 + treble * 0.03;
        particles = particles.filter(p => p.life > 0);
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            // foreign particles from the fire mode's shared array
            if (p.decay !== undefined || p.size !== undefined) { p.life = 0; continue; }

            if (draining) p.life -= 0.04; // silence: sand fades out where it lies

            if (p.rest) {
                // grain sitting on the cone: speaker motion kicks it up
                if (!draining && Math.random() < kickChance) {
                    p.rest = false;
                    p.vy = -(1.2 + Math.random() * 2.2 + bass * 9 + (isBeat ? bass * 4 : 0)) * S;
                    p.vx = (Math.random() - 0.5) * (1.2 + mid * 3.5) * S;
                }
            } else {
                p.vy += gravity;
                p.vx *= 0.995;
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0) { p.x = 0; p.vx = -p.vx * 0.5; }
                else if (p.x >= W) { p.x = W - 1; p.vx = -p.vx * 0.5; }
                if (p.y >= floorY) {
                    // landing: bounce with damping, then settle
                    p.y = floorY - Math.random() * 2 * S;
                    if (Math.abs(p.vy) > 0.9 * S) {
                        p.vy = -p.vy * 0.35;
                        p.vx *= 0.7;
                    } else {
                        p.vy = 0;
                        p.vx = 0;
                        p.rest = true;
                    }
                }
            }

            const airborne = !p.rest;
            const alpha = p.life * (airborne ? 1 : 0.75);
            ctx.fillStyle = palette
                ? `hsla(${p.hue}, ${airborne ? 85 : 55}%, ${airborne ? 68 : 52}%, ${alpha})`
                : `hsla(${p.hue}, ${airborne ? 80 : 50}%, ${airborne ? 70 : 55}%, ${alpha})`;
            ctx.fillRect(p.x | 0, p.y | 0, px, px);
        }

        return particles;
    };

    /**
     * Fire palette: heat 0-255 -> black / deep red / orange / yellow / white.
     * Alpha rises with heat so the empty sky above the flames stays transparent.
     */
    const FIRE_PALETTE = (() => {
        const stops = [
            [0,   [10, 6, 4, 0]],
            [40,  [40, 8, 2, 90]],
            [90,  [120, 18, 4, 220]],
            [140, [200, 60, 8, 255]],
            [190, [242, 130, 20, 255]],
            [225, [252, 200, 60, 255]],
            [255, [255, 250, 225, 255]]
        ];
        const pal = new Uint8ClampedArray(256 * 4);
        for (let i = 0; i < 256; i++) {
            let lo = stops[0];
            let hi = stops[stops.length - 1];
            for (let k = 0; k < stops.length - 1; k++) {
                if (i >= stops[k][0] && i <= stops[k + 1][0]) { lo = stops[k]; hi = stops[k + 1]; break; }
            }
            const span = Math.max(1, hi[0] - lo[0]);
            const f = (i - lo[0]) / span;
            for (let c = 0; c < 4; c++) {
                pal[i * 4 + c] = lo[1][c] + (hi[1][c] - lo[1][c]) * f;
            }
        }
        return pal;
    })();

    // Per-canvas heat grid state for the fire simulation
    const fireState = new WeakMap();

    /**
     * Draw fire visualizer — classic fire-propagation simulation (Doom fire):
     * a heat grid seeded at the bottom by the bass, rising with random decay
     * and wind, rendered through a fire palette. Beats flash the seed row;
     * pixel embers ride the updraft.
     */
    const drawFire = (ctx, canvas, frequencyData, particles, options) => {
        const { visualGain = 1, maxParticles, bufferLength = frequencyData.length } = options;
        const W = canvas.width;
        const H = canvas.height;

        // ---- audio ----
        // visualGain acts as a sensitivity trim (0.6x-1.4x), not a raw
        // multiplier — a low intensity slider must not extinguish the fire
        const trim = 0.6 + Math.min(visualGain, 1) * 0.8;
        let bassSum = 0;
        for (let i = 0; i < 8; i++) bassSum += frequencyData[i];
        const bass = Math.pow(bassSum / (8 * 255), 0.8) * trim * 1.4;
        let trebSum = 0;
        for (let i = 64; i < Math.min(160, frequencyData.length); i++) trebSum += frequencyData[i];
        const treble = (trebSum / (96 * 255)) * trim;

        // ---- heat grid (rebuilt when the canvas aspect changes) ----
        // Cells stay ~square whatever the canvas shape, so flames rise as
        // vertical tongues instead of smearing sideways on wide canvases
        const gridW = Math.min(256, Math.max(48, Math.round(W / 3)));
        const gridH = Math.min(160, Math.max(40, Math.round(gridW * (H / Math.max(1, W)))));
        let st = fireState.get(canvas);
        if (!st || st.gridW !== gridW || st.gridH !== gridH) {
            const off = document.createElement('canvas');
            off.width = gridW;
            off.height = gridH;
            const offCtx = off.getContext('2d');
            st = {
                gridW, gridH, off, offCtx,
                heat: new Float32Array(gridW * gridH),
                env: new Float32Array(gridW),
                img: offCtx.createImageData(gridW, gridH),
                bassAvg: 0.1,
                beatCooldown: 0
            };
            fireState.set(canvas, st);
        }
        st.bassAvg = st.bassAvg * 0.95 + bass * 0.05;
        st.beatCooldown = Math.max(0, st.beatCooldown - 1);
        const isBeat = bass > st.bassAvg * 1.3 + 0.04 && st.beatCooldown === 0;
        if (isBeat) st.beatCooldown = 7;

        const heat = st.heat;
        const gw = st.gridW;
        const gh = st.gridH;
        const t = Date.now() * 0.001;

        // ---- seed the base like a bars-visualizer made of fire: the spectrum
        //      is grouped into discrete bands, one flame per band, and the
        //      flame TOPS trace the spectrum shape. Levels are scaled so peaks
        //      reach ~3/4 height — never a clipped wall of flame.
        //      Silence -> zero seed -> the fire goes out. ----
        const env = st.env;
        const bands = 32;
        const bins = Math.max(bands, Math.min(96, bufferLength));
        const binsPerBand = bins / bands;
        for (let x = 0; x < gw; x++) {
            const bandIdx = Math.floor((x / gw) * bands);
            const fi = Math.floor(bandIdx * binsPerBand);
            const raw = ((frequencyData[fi] + (frequencyData[fi + 1] || 0)) / 510) * trim;
            // mild shaping only — keep the contrast between bands readable
            const level = Math.pow(raw, 0.8);
            // fast attack, quick release — the tops dance with the beat
            env[x] = Math.max(level, env[x] * 0.85);
            const flicker = 0.85 + 0.10 * Math.sin(x * 0.5 + t * 11) + Math.random() * 0.10;
            let hVal = env[x] * 230 * flicker;
            if (isBeat) hVal += bass * 25;
            heat[(gh - 1) * gw + x] = hVal > 255 ? 255 : hVal;
            heat[(gh - 2) * gw + x] = hVal > 255 ? 248 : hVal * 0.97;
        }

        // ---- propagate upward: each cell pulls from below with random decay
        //      and lateral jitter; slow wind leans the flames ----
        const wind = Math.sin(t * 0.6) * 0.9 + Math.sin(t * 1.7) * 0.3;
        // Decay normalized by grid height and tuned so a full-scale band
        // peaks at ~3/4 of the canvas — headroom keeps the tops readable
        const decayBase = (600 - Math.min(bass, 1) * 80) / gh;
        for (let y = 0; y < gh - 2; y++) {
            const rowOff = y * gw;
            const srcRow = (y + 1) * gw;
            for (let x = 0; x < gw; x++) {
                // mostly straight up so each band's flame stays a readable column
                let srcX = Math.random() < 0.55 ? x : x + ((Math.random() * 3) | 0) - 1;
                if (Math.random() < Math.abs(wind) * 0.15) srcX += wind > 0 ? 1 : -1;
                if (srcX < 0) srcX = 0; else if (srcX >= gw) srcX = gw - 1;
                const src = heat[srcRow + srcX];
                const d = Math.random() * decayBase;
                heat[rowOff + x] = src > d ? src - d : 0;
            }
        }

        // ---- render: heat -> palette -> ImageData -> stretched to canvas ----
        const data = st.img.data;
        const cells = gw * gh;
        for (let i = 0; i < cells; i++) {
            const hVal = heat[i] > 255 ? 255 : heat[i] | 0;
            const p4 = hVal * 4;
            const i4 = i * 4;
            data[i4] = FIRE_PALETTE[p4];
            data[i4 + 1] = FIRE_PALETTE[p4 + 1];
            data[i4 + 2] = FIRE_PALETTE[p4 + 2];
            data[i4 + 3] = FIRE_PALETTE[p4 + 3];
        }
        st.offCtx.putImageData(st.img, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(st.off, 0, 0, W, H);

        // ---- pixel embers riding the updraft ----
        const S = Math.max(W, H) / 600;
        const px = Math.max(1, Math.round(S));
        const cap = maxParticles;
        const emberRate = (isBeat ? 6 : 0) + (bass > 0.3 ? 2 : 0) + (treble > 0.2 ? 1 : 0);
        for (let i = 0; i < emberRate && particles.length < cap; i++) {
            particles.push({
                x: Math.random() * W,
                y: H - Math.random() * H * 0.25,
                vx: (Math.random() - 0.5) * 1.2 * S,
                vy: (-1.6 - Math.random() * 2.6 - bass * 2.5) * S,
                life: 1,
                decay: 0.010 + Math.random() * 0.016,
                size: px,
                hue: 22 + Math.random() * 26,
                phase: Math.random() * Math.PI * 2
            });
        }
        ctx.globalCompositeOperation = 'lighter';
        particles = particles.filter(p => p.life > 0);
        particles.forEach(p => {
            if (!(p.size > 0) || !(p.decay > 0)) { p.life = 0; return; }
            p.phase += 0.2;
            p.x += p.vx + Math.sin(p.phase) * 0.6 * S + wind * 0.4 * S;
            p.y += p.vy;
            p.vy *= 0.985;
            p.life -= p.decay;
            if (p.life <= 0) return;
            const flicker = 0.6 + Math.sin(p.phase * 2) * 0.4;
            ctx.fillStyle = `hsla(${p.hue}, 100%, ${58 + flicker * 25}%, ${p.life * flicker})`;
            ctx.fillRect(p.x | 0, p.y | 0, p.size, p.size);
        });
        ctx.globalCompositeOperation = 'source-over';

        return particles;
    };

    /**
     * Draw the Breathe visualizer — a soft orb that follows the app's 4-2-4
     * breathing rhythm (2s in, 1s hold, 2s out, 1s hold) with a music-reactive
     * halo. Deliberately quiet: amplitude response is capped so the scene never
     * demands attention.
     */
    const drawBreathe = (ctx, canvas, frequencyData, options) => {
        const { bufferLength } = options;
        const t = (Date.now() * 0.001) % 6; // 6s cycle

        // 4-2-4 phase -> orb scale 0.85..1.15 with ease-in-out
        const ease = (p) => p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        let scale, phaseLabel;
        if (t < 2) { scale = 0.85 + 0.3 * ease(t / 2); phaseLabel = 'breathe in'; }
        else if (t < 3) { scale = 1.15; phaseLabel = 'hold'; }
        else if (t < 5) { scale = 1.15 - 0.3 * ease((t - 3) / 2); phaseLabel = 'breathe out'; }
        else { scale = 0.85; phaseLabel = 'hold'; }

        // Gentle music energy (RMS), heavily damped
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += frequencyData[i];
        const energy = Math.min((sum / (bufferLength * 255)) * 0.6, 0.3);

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const base = Math.min(cx, cy) * 0.42;
        const r = base * scale;

        // Calm ground
        const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bg.addColorStop(0, '#151B22');
        bg.addColorStop(1, '#1B2530');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Music halo — a whisper, not a meter
        const halo = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * (1.5 + energy));
        halo.addColorStop(0, `rgba(148, 190, 182, ${0.10 + energy * 0.25})`);
        halo.addColorStop(1, 'rgba(148, 190, 182, 0)');
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // The orb
        const orb = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.1, cx, cy, r);
        orb.addColorStop(0, '#E9F1EE');
        orb.addColorStop(0.65, '#BFD3CE');
        orb.addColorStop(1, '#93AFA9');
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = orb;
        ctx.fill();

        // Phase word, whisper-level
        ctx.font = '500 13px "Avenir Next", Avenir, Seravek, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(200, 216, 212, 0.55)';
        ctx.fillText(phaseLabel, cx, cy + r + 30);
    };

    /**
     * Draw the Orbit visualizer — a top-down head with the sound source
     * circling it, driven by the REAL spatial state from the rotation loop
     * (options.spatialState: { angle, panPosition, depthMultiplier, rotationHz }).
     * Falls back to a slow idle orbit when nothing is playing.
     */
    const drawOrbit = (ctx, canvas, frequencyData, options) => {
        const { bufferLength, spatialState } = options;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const R = Math.min(cx, cy) * 0.62;

        // Void ground with a faint center vignette
        ctx.fillStyle = '#0B0D16';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const vig = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.9);
        vig.addColorStop(0, 'rgba(38, 43, 69, 0.35)');
        vig.addColorStop(1, 'rgba(38, 43, 69, 0)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Music-reactive radial ticks hugging the ring (quiet circular analyser)
        const ticks = 72;
        for (let i = 0; i < ticks; i++) {
            const fi = Math.floor(i * bufferLength / ticks);
            const amp = (frequencyData[fi] / 255);
            const a = (i / ticks) * Math.PI * 2;
            const inner = R * 1.06;
            const outer = inner + amp * R * 0.22;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
            ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
            ctx.strokeStyle = `rgba(116, 220, 230, ${0.10 + amp * 0.25})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Orbit ring + inner dashed guide
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(70, 78, 120, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([3, 7]);
        ctx.beginPath();
        ctx.arc(cx, cy, R * 0.72, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(45, 51, 84, 0.6)';
        ctx.stroke();
        ctx.setLineDash([]);

        // Head silhouette (top-down: skull + ears + nose notch pointing up)
        const hw = R * 0.30;
        ctx.fillStyle = '#1B2036';
        ctx.beginPath();
        ctx.ellipse(cx, cy, hw, hw * 1.18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath(); // ears
        ctx.ellipse(cx - hw * 1.08, cy, hw * 0.16, hw * 0.34, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + hw * 1.08, cy, hw * 0.16, hw * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath(); // nose notch = "you face up"
        ctx.moveTo(cx - hw * 0.16, cy - hw * 1.12);
        ctx.lineTo(cx, cy - hw * 1.34);
        ctx.lineTo(cx + hw * 0.16, cy - hw * 1.12);
        ctx.fillStyle = '#232948';
        ctx.fill();

        // Source position: live engine state, or a slow idle orbit.
        // Convention shared with the audio engine: angle 0 = front (top of
        // screen), PI/2 = right, PI = back, 3PI/2 = left.
        const idleAngle = (Date.now() * 0.001 * (Math.PI * 2)) / 16; // 16s idle rev
        const angle = spatialState ? spatialState.angle : idleAngle;
        const depth = spatialState ? spatialState.depthMultiplier : 1;
        let sx, sy;
        if (spatialState && spatialState.movement === 'frontback' && !spatialState.isPlaced) {
            // Front/back pattern: the sound travels the front-back axis, centered
            sx = cx;
            sy = cy - Math.cos(angle) * R * 0.85;
        } else if (spatialState && spatialState.movement === 'random' && !spatialState.isPlaced) {
            // Random pattern: the sound teleports and holds — show it where it
            // actually IS (from pan), on the front arc, not a fake orbit
            const px = Math.max(-1, Math.min(1, spatialState.panPosition));
            sx = cx + px * R;
            sy = cy - Math.sqrt(Math.max(0, 1 - px * px)) * R;
        } else {
            sx = cx + Math.sin(angle) * R;
            sy = cy - Math.cos(angle) * R * (0.9 + depth * 0.1);
        }

        // Bass makes the source pulse
        let bassSum = 0;
        for (let i = 0; i < 8; i++) bassSum += frequencyData[i];
        const bass = bassSum / (8 * 255);
        const dotR = (5 + bass * 6) * (0.7 + depth * 0.3);

        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, dotR * 4);
        glow.addColorStop(0, `rgba(116, 220, 230, ${0.5 * depth + 0.2})`);
        glow.addColorStop(1, 'rgba(116, 220, 230, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(sx, sy, dotR * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx, sy, dotR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 245, 250, ${0.55 + depth * 0.45})`;
        ctx.fill();
    };

    // ==================== Extended scene visualizers ====================
    // Shared toolkit: per-canvas-per-scene state, band analysis, beat
    // detection, and silence tracking (silence -> every scene goes dark).

    const sceneStateMap = new WeakMap();
    const getSceneState = (canvas, key, init) => {
        let all = sceneStateMap.get(canvas);
        if (!all) { all = {}; sceneStateMap.set(canvas, all); }
        if (!all[key]) all[key] = init();
        return all[key];
    };

    const audioBands = (frequencyData, bufferLength, visualGain) => {
        const trim = 0.6 + Math.min(visualGain, 1) * 0.8;
        const band = (from, to) => {
            const end = Math.min(to, bufferLength);
            let sum = 0;
            for (let i = from; i < end; i++) sum += frequencyData[i];
            return end > from ? ((sum / (end - from)) / 255) * trim : 0;
        };
        const bass = band(0, 8);
        const mid = band(8, 64);
        const treble = band(64, 256);
        return { bass, mid, treble, trim, energy: bass * 0.5 + mid * 0.35 + treble * 0.15 };
    };

    const detectSceneBeat = (st, bass) => {
        st.bassAvg = (st.bassAvg === undefined ? 0.1 : st.bassAvg) * 0.95 + bass * 0.05;
        st.beatCooldown = Math.max(0, (st.beatCooldown || 0) - 1);
        if (bass > st.bassAvg * 1.35 + 0.04 && st.beatCooldown === 0) {
            st.beatCooldown = 8;
            return true;
        }
        return false;
    };

    const trackSilence = (st, energy) => {
        st.silentFrames = energy < 0.04 ? (st.silentFrames || 0) + 1 : 0;
        return st.silentFrames > 25;
    };

    const sceneHue = (palette, fallback) => palette
        ? palette.hueBase + Math.random() * Math.max(palette.hueRange, 14)
        : fallback + Math.random() * 30;

    /**
     * Pond — top-down water around the head; the spatial engine's source
     * position drips ripples as it orbits, beats drop heavy stones.
     */
    const drawPond = (ctx, canvas, frequencyData, options) => {
        const { bufferLength, visualGain = 1, palette, spatialState } = options;
        const W = canvas.width, H = canvas.height, S = Math.max(W, H) / 600;
        const a = audioBands(frequencyData, bufferLength, visualGain);
        const st = getSceneState(canvas, 'pond', () => ({ ripples: [], frame: 0 }));
        const beat = detectSceneBeat(st, a.bass);
        const draining = trackSilence(st, a.energy);
        const cx = W / 2, cy = H / 2, R = Math.min(cx, cy) * 0.6;
        const baseHue = palette ? palette.hueBase : 195;

        // head silhouette
        const hw = R * 0.28;
        ctx.fillStyle = 'rgba(20, 26, 44, 0.9)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, hw, hw * 1.18, 0, 0, Math.PI * 2);
        ctx.fill();

        const angle = spatialState ? spatialState.angle : (Date.now() * 0.001 * Math.PI * 2) / 16;
        const sx = cx + Math.sin(angle) * R;
        const sy = cy - Math.cos(angle) * R;
        st.frame++;

        if (!draining) {
            if (st.frame % 6 === 0) {
                st.ripples.push({ x: sx, y: sy, r: 2 * S, vr: (0.7 + a.energy * 1.6) * S, alpha: 0.35 + a.mid * 0.4, lw: 1, hue: baseHue });
            }
            if (beat) {
                st.ripples.push({ x: sx, y: sy, r: 3 * S, vr: (1.5 + a.bass * 2.2) * S, alpha: 0.9, lw: 2, hue: baseHue + 15 });
            }
        }

        st.ripples = st.ripples.filter(r => r.alpha > 0.02);
        for (const r of st.ripples) {
            r.r += r.vr;
            r.alpha *= 0.964;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${r.hue}, ${palette ? palette.saturation : 60}%, 62%, ${r.alpha})`;
            ctx.lineWidth = r.lw * S;
            ctx.stroke();
        }

        if (!draining) {
            ctx.fillStyle = `hsla(${baseHue}, 70%, 75%, 0.9)`;
            ctx.beginPath();
            ctx.arc(sx, sy, (3 + a.bass * 4) * S, 0, Math.PI * 2);
            ctx.fill();
        }
    };

    /**
     * Lissajous scope — left channel vs right channel as an X/Y figure.
     * The 8D rotation visibly tilts and spins the figure.
     */
    const drawLissajous = (ctx, canvas, waveformData, options) => {
        const { stereoLeft, stereoRight, palette } = options;
        const L = stereoLeft || waveformData;
        const R2 = stereoRight || waveformData;
        const W = canvas.width, H = canvas.height;
        const cx = W / 2, cy = H / 2;
        const scale = Math.min(cx, cy) * 0.85;

        let dev = 0;
        for (let i = 0; i < L.length; i += 8) dev += Math.abs(L[i] - 128);
        dev /= (L.length / 8) * 128;
        if (dev < 0.01) return; // silence -> the fade clear empties the canvas

        const stroke = palette ? palette.accent : '#4ade80';
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const n = Math.min(L.length, R2.length);
        for (let i = 0; i < n; i += 2) {
            const x = cx + ((L[i] - 128) / 128) * scale;
            const y = cy - ((R2[i] - 128) / 128) * scale;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
    };

    /**
     * Fireworks — beats launch pixel rockets that burst into spark showers.
     */
    const drawFireworks = (ctx, canvas, frequencyData, options) => {
        const { bufferLength, visualGain = 1, palette } = options;
        const W = canvas.width, H = canvas.height, S = Math.max(W, H) / 600;
        const a = audioBands(frequencyData, bufferLength, visualGain);
        const st = getSceneState(canvas, 'fireworks', () => ({ rockets: [], sparks: [] }));
        const beat = detectSceneBeat(st, a.bass);
        const draining = trackSilence(st, a.energy);
        const px = Math.max(1, Math.round(S));

        if (beat && !draining) {
            const n = 1 + (a.bass > 0.5 ? 1 : 0);
            for (let i = 0; i < n; i++) {
                st.rockets.push({
                    x: W * (0.15 + Math.random() * 0.7),
                    y: H,
                    vx: (Math.random() - 0.5) * 1.2 * S,
                    vy: -(4.5 + Math.random() * 2 + a.bass * 3) * S,
                    hue: sceneHue(palette, 10 + Math.random() * 340),
                    size: Math.round(40 + a.bass * 140)
                });
            }
        }

        ctx.globalCompositeOperation = 'lighter';
        st.rockets = st.rockets.filter(r => r.vy < -0.8 * S && r.y > 0);
        for (const r of st.rockets) {
            r.x += r.vx;
            r.y += r.vy;
            r.vy += 0.06 * S;
            ctx.fillStyle = `hsla(${r.hue}, 60%, 85%, 0.9)`;
            ctx.fillRect(r.x | 0, r.y | 0, px, px);
            if (r.vy >= -0.9 * S) {
                for (let i = 0; i < r.size; i++) {
                    const ang = Math.random() * Math.PI * 2;
                    const sp = Math.random() * Math.random() * 5 * S;
                    st.sparks.push({
                        x: r.x, y: r.y,
                        vx: Math.cos(ang) * sp,
                        vy: Math.sin(ang) * sp,
                        life: 1,
                        decay: 0.012 + Math.random() * 0.02,
                        hue: r.hue + (Math.random() - 0.5) * 30
                    });
                }
            }
        }

        st.sparks = st.sparks.filter(p => p.life > 0);
        for (const p of st.sparks) {
            p.vy += 0.035 * S;
            p.vx *= 0.985;
            p.vy *= 0.985;
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            if (p.life <= 0) continue;
            const alpha = p.life * p.life * (Math.random() < 0.85 ? 1 : 0.3);
            ctx.fillStyle = `hsla(${p.hue}, 90%, ${55 + p.life * 25}%, ${alpha})`;
            ctx.fillRect(p.x | 0, p.y | 0, px, px);
        }
        ctx.globalCompositeOperation = 'source-over';
    };

    /**
     * Storm — beats strike branching lightning; bass rumbles the cloud glow.
     */
    const drawLightning = (ctx, canvas, frequencyData, options) => {
        const { bufferLength, visualGain = 1, palette } = options;
        const W = canvas.width, H = canvas.height, S = Math.max(W, H) / 600;
        const a = audioBands(frequencyData, bufferLength, visualGain);
        const st = getSceneState(canvas, 'storm', () => ({ bolts: [] }));
        const beat = detectSceneBeat(st, a.bass);
        const draining = trackSilence(st, a.energy);

        // cloud glow follows the bass rumble
        if (!draining && a.bass > 0.05) {
            const glow = ctx.createLinearGradient(0, 0, 0, H * 0.45);
            glow.addColorStop(0, `rgba(120, 130, 190, ${0.10 + a.bass * 0.25})`);
            glow.addColorStop(1, 'rgba(120, 130, 190, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, W, H * 0.45);
        }

        const genBolt = (x0, y0, x1, y1, jag) => {
            const pts = [[x0, y0]];
            const segs = 14;
            for (let i = 1; i < segs; i++) {
                const f = i / segs;
                pts.push([
                    x0 + (x1 - x0) * f + (Math.random() - 0.5) * jag * (1 - f * 0.4),
                    y0 + (y1 - y0) * f + (Math.random() - 0.5) * jag * 0.25
                ]);
            }
            pts.push([x1, y1]);
            return pts;
        };

        if (beat && !draining) {
            const x = W * (0.1 + Math.random() * 0.8);
            const main = genBolt(x, 0, x + (Math.random() - 0.5) * W * 0.25, H * (0.65 + Math.random() * 0.3), W * 0.06);
            const branches = [];
            for (let b = 0; b < 2 + Math.round(a.bass * 2); b++) {
                const at = main[2 + ((Math.random() * (main.length - 4)) | 0)];
                branches.push(genBolt(at[0], at[1], at[0] + (Math.random() - 0.5) * W * 0.2, at[1] + H * 0.25, W * 0.04));
            }
            st.bolts.push({ main, branches, life: 1 });
        }

        st.bolts = st.bolts.filter(b => b.life > 0);
        const hue = palette ? palette.hueBase : 225;
        for (const bolt of st.bolts) {
            bolt.life -= 0.12;
            const drawPath = (pts, wMul) => {
                ctx.beginPath();
                for (let i = 0; i < pts.length; i++) {
                    if (i === 0) ctx.moveTo(pts[i][0], pts[i][1]); else ctx.lineTo(pts[i][0], pts[i][1]);
                }
                ctx.lineWidth = 3.5 * S * wMul * bolt.life;
                ctx.strokeStyle = `hsla(${hue}, 60%, 75%, ${bolt.life * 0.35})`;
                ctx.stroke();
                ctx.lineWidth = 1.2 * S * wMul;
                ctx.strokeStyle = `hsla(${hue}, 30%, 96%, ${bolt.life})`;
                ctx.stroke();
            };
            drawPath(bolt.main, 1);
            for (const br of bolt.branches) drawPath(br, 0.5);
        }
    };

    /**
     * Spectro — scrolling waterfall spectrogram: time x frequency x heat.
     * Kicks read as bright stripes marching upward.
     */
    const drawWaterfall = (ctx, canvas, frequencyData, options) => {
        const { bufferLength, visualGain = 1, palette } = options;
        const W = canvas.width, H = canvas.height;
        const gw = 128, gh = 128;
        const st = getSceneState(canvas, 'waterfall', () => {
            const off = document.createElement('canvas');
            off.width = gw; off.height = gh;
            const offCtx = off.getContext('2d');
            return { off, offCtx, img: offCtx.createImageData(gw, gh) };
        });
        const trim = 0.6 + Math.min(visualGain, 1) * 0.8;

        // scroll history up one row, write the newest spectrum at the bottom
        const data = st.img.data;
        data.copyWithin(0, gw * 4);
        const rowStart = (gh - 1) * gw * 4;
        const bins = Math.min(96, bufferLength);
        for (let x = 0; x < gw; x++) {
            const fi = Math.floor((x / gw) * bins);
            const level = Math.pow((frequencyData[fi] / 255) * trim, 0.75);
            const i4 = rowStart + x * 4;
            if (palette) {
                const hue = palette.hueBase + level * Math.max(palette.hueRange, 20);
                // hsl -> quick approximation via canvas is costly; use simple ramp
                const l = level * 255;
                data[i4] = l * 0.9; data[i4 + 1] = l * 0.75; data[i4 + 2] = Math.min(255, 40 + l);
            } else {
                const l = level * 255;
                data[i4] = l; data[i4 + 1] = l * 0.45; data[i4 + 2] = Math.max(0, l - 120);
            }
            data[i4 + 3] = level > 0.02 ? 255 : 0;
        }
        st.offCtx.putImageData(st.img, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(st.off, 0, 0, W, H);
    };

    /**
     * Ferro — a ferrofluid blob spiking with the bass, like fluid on a
     * subwoofer magnet. Silence collapses it to nothing.
     */
    const drawFerrofluid = (ctx, canvas, frequencyData, options) => {
        const { bufferLength, visualGain = 1, palette } = options;
        const W = canvas.width, H = canvas.height;
        const cx = W / 2, cy = H / 2, R = Math.min(cx, cy);
        const a = audioBands(frequencyData, bufferLength, visualGain);
        const N = 96;
        const st = getSceneState(canvas, 'ferro', () => ({ r: new Float32Array(N) }));
        detectSceneBeat(st, a.bass);
        const draining = trackSilence(st, a.energy);

        const bins = Math.min(64, bufferLength);
        for (let i = 0; i < N; i++) {
            const mirrored = i < N / 2 ? i : N - i;
            const fi = Math.floor((mirrored / (N / 2)) * bins);
            const level = (frequencyData[fi] / 255) * a.trim;
            const spike = Math.pow(level, 2.2) * R * 0.55;
            const base = draining ? 0 : R * (0.16 + a.bass * 0.22);
            const target = base + spike;
            st.r[i] += (target - st.r[i]) * 0.35;
        }
        // neighbor smoothing keeps the blob liquid
        for (let pass = 0; pass < 2; pass++) {
            for (let i = 0; i < N; i++) {
                st.r[i] = (st.r[(i - 1 + N) % N] + st.r[i] * 2 + st.r[(i + 1) % N]) / 4;
            }
        }

        let maxR = 0;
        for (let i = 0; i < N; i++) maxR = Math.max(maxR, st.r[i]);
        if (maxR < 1) return;

        const accent = palette ? palette.accent : '#8899ff';
        ctx.beginPath();
        for (let i = 0; i <= N; i++) {
            const idx = i % N;
            const ang = (i / N) * Math.PI * 2 - Math.PI / 2;
            const x = cx + Math.cos(ang) * st.r[idx];
            const y = cy + Math.sin(ang) * st.r[idx];
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = '#07070c';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = accent;
        ctx.globalAlpha = 0.85;
        ctx.stroke();
        ctx.globalAlpha = 1;
    };

    /**
     * String — a plucked string under tension; beats pluck it, mids shimmer.
     */
    const drawString = (ctx, canvas, frequencyData, options) => {
        const { bufferLength, visualGain = 1, palette } = options;
        const W = canvas.width, H = canvas.height, S = Math.max(W, H) / 600;
        const a = audioBands(frequencyData, bufferLength, visualGain);
        const N = 72;
        const st = getSceneState(canvas, 'string', () => ({ y: new Float32Array(N), v: new Float32Array(N) }));
        const beat = detectSceneBeat(st, a.bass);
        const draining = trackSilence(st, a.energy);

        if (beat && !draining) {
            const at = 8 + ((Math.random() * (N - 16)) | 0);
            const dir = Math.random() < 0.5 ? -1 : 1;
            st.v[at] += dir * a.bass * H * 0.09;
            st.v[Math.max(0, at - 1)] += dir * a.bass * H * 0.05;
            st.v[Math.min(N - 1, at + 1)] += dir * a.bass * H * 0.05;
        }
        if (!draining && a.mid > 0.1) {
            for (let k = 0; k < 3; k++) {
                st.v[1 + ((Math.random() * (N - 2)) | 0)] += (Math.random() - 0.5) * a.mid * H * 0.004;
            }
        }

        for (let i = 1; i < N - 1; i++) {
            st.v[i] += (st.y[i - 1] + st.y[i + 1] - 2 * st.y[i]) * 0.42;
            st.v[i] *= 0.994;
        }
        let maxAmp = 0;
        for (let i = 1; i < N - 1; i++) {
            st.y[i] += st.v[i];
            maxAmp = Math.max(maxAmp, Math.abs(st.y[i]));
        }
        if (draining && maxAmp < 0.6 * S) return;

        const midY = H / 2;
        const stroke = palette ? palette.accent : '#e0c46a';
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2 * S;
        ctx.beginPath();
        for (let i = 0; i < N; i++) {
            const x = (i / (N - 1)) * W;
            if (i === 0) ctx.moveTo(x, midY + st.y[i]); else ctx.lineTo(x, midY + st.y[i]);
        }
        ctx.stroke();
    };

    /**
     * Ocean — a rolling wave train sorted by frequency: big slow swells on
     * the bass side (left) shrinking to choppy ripples on the treble side.
     * Each beat launches a swell that rolls across the water.
     */
    const drawOcean = (ctx, canvas, frequencyData, options) => {
        const { bufferLength, visualGain = 1, palette } = options;
        const W = canvas.width, H = canvas.height, S = Math.max(W, H) / 600;
        const a = audioBands(frequencyData, bufferLength, visualGain);
        const BANDS = 48;
        const st = getSceneState(canvas, 'ocean', () => ({
            env: new Float32Array(BANDS), swells: [], phase: 0, surge: 0
        }));
        const beat = detectSceneBeat(st, a.bass);
        const draining = trackSilence(st, a.energy);
        if (beat) st.surge = 1; else st.surge *= 0.92;

        // per-band envelopes across the width (bass left -> treble right)
        const bins = Math.min(96, bufferLength);
        let maxEnv = 0;
        for (let b = 0; b < BANDS; b++) {
            const fi = Math.floor((b / BANDS) * bins);
            const level = Math.pow((frequencyData[fi] / 255) * a.trim, 0.85);
            st.env[b] = Math.max(level, st.env[b] * 0.94);
            if (draining) st.env[b] *= 0.92;
            maxEnv = Math.max(maxEnv, st.env[b]);
        }
        if (draining && maxEnv < 0.02) return; // flat calm -> dark

        // the water rolls; beats push it and launch a traveling swell
        st.phase += 0.025 + a.energy * 0.04 + st.surge * 0.06;
        if (beat) {
            st.swells.push({ x: -W * 0.15, amp: 0.5 + a.bass, speed: (3.5 + a.bass * 6) * S });
        }
        st.swells = st.swells.filter(sw => sw.x < W * 1.3);
        for (const sw of st.swells) sw.x += sw.speed;

        const baseHue = palette ? palette.hueBase : 205;
        const sat = palette ? palette.saturation : 65;

        for (let l = 0; l < 3; l++) {
            const baseY = H * (0.42 + l * 0.18);
            const depth = 1 - l * 0.22;
            ctx.beginPath();
            ctx.moveTo(0, H);
            for (let x = 0; x <= W; x += 4) {
                const u = x / W;
                const level = st.env[Math.min(BANDS - 1, (u * BANDS) | 0)];
                // big slow rollers left -> small choppy ripples right
                const ampScale = (1.15 - u * 0.85) * depth;
                const k = 0.0045 + u * 0.024;
                const roll = st.phase * (1.6 - u * 0.7) + l * 1.7;
                let amp = (4 * S + level * H * 0.24) * ampScale;
                // traveling beat swells lift the surface as they pass
                for (const sw of st.swells) {
                    const d = (x - sw.x) / (W * 0.09);
                    amp += Math.exp(-d * d) * sw.amp * H * 0.10 * ampScale;
                }
                const y = baseY
                    + Math.sin(x * k - roll) * amp * 0.65
                    + Math.sin(x * k * 2.3 + roll * 0.7) * amp * 0.35;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(W, H);
            ctx.closePath();
            ctx.fillStyle = `hsla(${baseHue + l * 7}, ${sat}%, ${15 + l * 10}%, 0.85)`;
            ctx.fill();

            // treble foam sparkling on the front layer's crests
            if (l === 2 && a.treble > 0.1) {
                ctx.fillStyle = `hsla(${baseHue}, 25%, 92%, 0.85)`;
                const n = a.treble * 40;
                for (let i = 0; i < n; i++) {
                    const x = Math.random() * W;
                    const u = x / W;
                    const level = st.env[Math.min(BANDS - 1, (u * BANDS) | 0)];
                    const ampScale = (1.15 - u * 0.85) * depth;
                    const k = 0.0045 + u * 0.024;
                    const roll = st.phase * (1.6 - u * 0.7) + l * 1.7;
                    let amp = (4 * S + level * H * 0.24) * ampScale;
                    const y = baseY + Math.sin(x * k - roll) * amp * 0.65 + Math.sin(x * k * 2.3 + roll * 0.7) * amp * 0.35;
                    ctx.fillRect(x | 0, (y - 1) | 0, Math.max(1, S | 0), Math.max(1, S | 0));
                }
            }
        }
    };

    /**
     * Aurora — slow light curtains waving with the mids. Calm's natural fit.
     */
    const drawAurora = (ctx, canvas, frequencyData, options) => {
        const { bufferLength, visualGain = 1, palette } = options;
        const W = canvas.width, H = canvas.height;
        const a = audioBands(frequencyData, bufferLength, visualGain);
        const st = getSceneState(canvas, 'aurora', () => ({ env: 0 }));
        trackSilence(st, a.energy);
        st.env = Math.max((a.mid + a.treble) / 2, st.env * 0.985);
        if (st.env < 0.02) return;
        const t = Date.now() * 0.0004;
        const baseHue = palette ? palette.hueBase : 140;
        const range = palette ? Math.max(palette.hueRange, 30) : 80;

        ctx.globalCompositeOperation = 'lighter';
        const step = Math.max(3, Math.round(W / 220));
        for (let x = 0; x < W; x += step) {
            const wave =
                Math.sin(x * 0.008 + t * 9) * 0.5 +
                Math.sin(x * 0.019 - t * 6) * 0.3 +
                Math.sin(x * 0.004 + t * 3.4) * 0.2;
            const hgt = H * (0.22 + 0.32 * Math.abs(wave)) * st.env * 1.6;
            const y0 = H * 0.12 + wave * H * 0.09;
            const hue = baseHue + (x / W) * range + Math.sin(t * 5) * 12;
            const grad = ctx.createLinearGradient(0, y0, 0, y0 + hgt);
            grad.addColorStop(0, `hsla(${hue}, 80%, 62%, ${0.16 * st.env * 2})`);
            grad.addColorStop(1, `hsla(${hue + 25}, 80%, 45%, 0)`);
            ctx.fillStyle = grad;
            ctx.fillRect(x, y0, step, hgt);
        }
        ctx.globalCompositeOperation = 'source-over';
    };

    /**
     * Matrix — falling glyph rain; column speed and density ride the bands,
     * beats flash bright heads. Trails come from the fade clear.
     */
    const MATRIX_GLYPHS = 'アィウェオカキクケコサシスセソタチツテトナニヌネノABCDEF0123456789';

    /**
     * Matrix — a full wall of falling code rain, dim by default; the music's
     * spectrum silhouette (bass left -> treble right) LIGHTS UP inside it, so
     * the beat emerges out of the chaos. Drops passing through their band's
     * lit region glow; beats flash them white and lurch the whole wall.
     */
    const drawMatrix = (ctx, canvas, frequencyData, options) => {
        const { bufferLength, visualGain = 1, palette } = options;
        const W = canvas.width, H = canvas.height, S = Math.max(W, H) / 600;
        const a = audioBands(frequencyData, bufferLength, visualGain);
        // Cap the font scale so big canvases get MORE columns, not giant glyphs,
        // and scale drops-per-column with the canvas height — fullscreen keeps
        // the same wall density as the strip view.
        const fontSize = Math.max(10, Math.round(13 * Math.min(S, 1.6)));
        const nCols = Math.ceil(W / fontSize);
        const nRows = Math.ceil(H / fontSize);
        const dropsPerCol = Math.max(2, Math.round(nRows / 4));
        const st = getSceneState(canvas, 'matrix', () => ({ drops: null, env: null, surge: 0, sig: 0 }));
        const beat = detectSceneBeat(st, a.bass);
        const draining = trackSilence(st, a.energy);
        if (beat) st.surge = 1; else st.surge *= 0.88;

        const sig = nCols * 1000 + dropsPerCol;
        if (st.sig !== sig) {
            st.sig = sig;
            st.env = new Float32Array(nCols);
            st.drops = [];
            for (let c = 0; c < nCols; c++) {
                for (let k = 0; k < dropsPerCol; k++) {
                    st.drops.push({ c, y: Math.random() * H * 2 - H, sp: 0.8 + Math.random() * 0.7 });
                }
            }
        }

        ctx.font = `${fontSize}px ui-monospace, monospace`;
        const bins = Math.min(96, bufferLength);
        const hue = palette ? palette.hueBase : 130;
        const sat = palette ? palette.saturation : 80;

        // per-column spectrum envelope (the silhouette that lights the rain)
        for (let c = 0; c < nCols; c++) {
            const fi = Math.floor((c / nCols) * bins);
            const level = Math.pow((frequencyData[fi] / 255) * a.trim, 0.8);
            st.env[c] = Math.max(level, st.env[c] * 0.87);
            if (draining) st.env[c] *= 0.9;
        }

        for (const d of st.drops) {
            d.y += (d.sp * 2.2 + st.env[d.c] * 3 + st.surge * 7) * S;
            if (d.y > H + fontSize) {
                if (draining) continue; // silence: drops exit and don't return
                d.y = -fontSize * (1 + Math.random() * 4);
                d.sp = 0.8 + Math.random() * 0.7;
            }
            if (d.y < -fontSize) continue;

            const env = st.env[d.c];
            // Lit region is a spectral ribbon along a line (like the mirror
            // visual's center line, one-sided): bars rise from the baseline,
            // peaking at ~50% of the canvas height
            const baseline = H * 0.7;
            const barH = env * H * 0.5 * (1 + st.surge * 0.2);
            const inLight = env > 0.04 && d.y <= baseline && d.y >= baseline - barH;
            const ch = MATRIX_GLYPHS[(Math.random() * MATRIX_GLYPHS.length) | 0];

            if (inLight) {
                // the beat emerging from the chaos: bright, white-hot on kicks
                const flare = env + st.surge * 0.5;
                ctx.fillStyle = st.surge > 0.55
                    ? `hsla(${hue}, 25%, ${88 + st.surge * 10}%, 1)`
                    : `hsla(${hue}, ${sat}%, ${48 + flare * 30}%, ${0.75 + flare * 0.25})`;
            } else {
                // the dim ambient wall
                ctx.fillStyle = `hsla(${hue}, ${sat * 0.7}%, 20%, 0.35)`;
            }
            ctx.fillText(ch, d.c * fontSize, d.y);
        }
    };

    /**
     * Main draw function - routes to appropriate visualizer
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {Uint8Array} frequencyData - Frequency data from analyser
     * @param {Uint8Array} waveformData - Waveform data from analyser
     * @param {Array} particles - Particle array (mutated)
     * @param {Object} options - Drawing options
     * @returns {Array} Updated particles array
     */
    const draw = (ctx, canvas, frequencyData, waveformData, particles, options) => {
        const {
            visType,
            visualGain = 1,
            darkMode = true,
            bufferLength,
            maxParticles = 100,
            spatialState = null,
            palette = null,
            stereoLeft = null,
            stereoRight = null
        } = options;

        const bgColor = darkMode ? '#1a2332' : '#0a0a0a';

        // Clear canvas. Trail-based scenes fade instead of wiping — the
        // translucent clear leaves previous frames as decaying motion trails
        // (the classic accumulation buffer). Alpha tunes each scene's tail.
        const FADE_ALPHA = { particles: 0.45, lissajous: 0.3, fireworks: 0.32, matrix: 0.14, pond: 0.5 };
        const fade = FADE_ALPHA[visType];
        if (fade !== undefined) {
            ctx.fillStyle = darkMode ? `rgba(26, 35, 50, ${fade})` : `rgba(10, 10, 10, ${fade})`;
        } else {
            ctx.fillStyle = bgColor;
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const drawOptions = { visualGain, bufferLength, maxParticles, spatialState, palette, stereoLeft, stereoRight };

        switch (visType) {
            case 'bars':
                drawBars(ctx, canvas, frequencyData, drawOptions);
                break;
            case 'waveform':
                drawWaveform(ctx, canvas, waveformData, drawOptions);
                break;
            case 'circular':
                drawCircular(ctx, canvas, frequencyData, drawOptions);
                break;
            case 'mirrored':
                drawMirrored(ctx, canvas, frequencyData, drawOptions);
                break;
            case 'particles':
                particles = drawParticles(ctx, canvas, frequencyData, particles, drawOptions);
                break;
            case 'fire':
                particles = drawFire(ctx, canvas, frequencyData, particles, drawOptions);
                break;
            case 'breathe':
                drawBreathe(ctx, canvas, frequencyData, drawOptions);
                break;
            case 'orbit':
                drawOrbit(ctx, canvas, frequencyData, drawOptions);
                break;
            case 'pond':
                drawPond(ctx, canvas, frequencyData, drawOptions);
                break;
            case 'lissajous':
                drawLissajous(ctx, canvas, waveformData, drawOptions);
                break;
            case 'fireworks':
                drawFireworks(ctx, canvas, frequencyData, drawOptions);
                break;
            case 'lightning':
                drawLightning(ctx, canvas, frequencyData, drawOptions);
                break;
            case 'waterfall':
                drawWaterfall(ctx, canvas, frequencyData, drawOptions);
                break;
            case 'ferrofluid':
                drawFerrofluid(ctx, canvas, frequencyData, drawOptions);
                break;
            case 'string':
                drawString(ctx, canvas, frequencyData, drawOptions);
                break;
            case 'ocean':
                drawOcean(ctx, canvas, frequencyData, drawOptions);
                break;
            case 'aurora':
                drawAurora(ctx, canvas, frequencyData, drawOptions);
                break;
            case 'matrix':
                drawMatrix(ctx, canvas, frequencyData, drawOptions);
                break;
            default:
                drawBars(ctx, canvas, frequencyData, drawOptions);
        }

        return particles;
    };

    // Scene catalog — drives the app's visualizer dropdown and icon lookups
    const LIST = [
        { id: 'bars', icon: '📊', label: 'Bars' },
        { id: 'waveform', icon: '〰️', label: 'Wave' },
        { id: 'circular', icon: '🔘', label: 'Circular' },
        { id: 'mirrored', icon: '🪞', label: 'Mirror' },
        { id: 'particles', icon: '⏳', label: 'Sand' },
        { id: 'fire', icon: '🔥', label: 'Fire' },
        { id: 'breathe', icon: '🫧', label: 'Breathe' },
        { id: 'orbit', icon: '🪐', label: 'Orbit' },
        { id: 'pond', icon: '💧', label: 'Pond' },
        { id: 'lissajous', icon: '♾️', label: 'Scope' },
        { id: 'fireworks', icon: '🎆', label: 'Fireworks' },
        { id: 'lightning', icon: '⚡', label: 'Storm' },
        { id: 'waterfall', icon: '🌫️', label: 'Spectro' },
        { id: 'ferrofluid', icon: '🧲', label: 'Ferro' },
        { id: 'string', icon: '🎸', label: 'String' },
        { id: 'ocean', icon: '🌊', label: 'Ocean' },
        { id: 'aurora', icon: '🌌', label: 'Aurora' },
        { id: 'matrix', icon: '🟩', label: 'Matrix' }
    ];

    return {
        draw,
        LIST,
        drawBars,
        drawWaveform,
        drawCircular,
        drawMirrored,
        drawParticles,
        drawFire,
        drawBreathe,
        drawOrbit,
        drawPond,
        drawLissajous,
        drawFireworks,
        drawLightning,
        drawWaterfall,
        drawFerrofluid,
        drawString,
        drawOcean,
        drawAurora,
        drawMatrix
    };
});
