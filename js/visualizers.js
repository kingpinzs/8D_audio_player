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
     * Draw particles visualizer — a proper particle engine:
     * emitters (bottom fountain + beat bursts from center), physics (gravity,
     * drag, audio-driven turbulence), velocity streaks, additive glow sprites,
     * pop-in/fade-out life curves, treble sparkles, theme-palette colors.
     */
    const drawParticles = (ctx, canvas, frequencyData, particles, options) => {
        const { bufferLength, maxParticles, palette, visualGain = 1 } = options;
        const W = canvas.width;
        const H = canvas.height;
        const S = Math.max(W, H) / 600; // resolution scale so sprites keep proportion

        // ---- audio analysis: bass / mid / treble + beat detection ----
        const band = (from, to) => {
            const end = Math.min(to, bufferLength);
            let sum = 0;
            for (let i = from; i < end; i++) sum += frequencyData[i];
            return end > from ? (sum / (end - from)) / 255 : 0;
        };
        const bass = band(0, 8) * visualGain;
        const mid = band(8, 64) * visualGain;
        const treble = band(64, 256) * visualGain;

        let st = particleEngineState.get(canvas);
        if (!st) {
            st = { bassAvg: 0.1, beatCooldown: 0 };
            particleEngineState.set(canvas, st);
        }
        st.bassAvg = st.bassAvg * 0.95 + bass * 0.05; // rolling energy floor
        st.beatCooldown = Math.max(0, st.beatCooldown - 1);
        const isBeat = bass > st.bassAvg * 1.35 + 0.04 && st.beatCooldown === 0;
        if (isBeat) st.beatCooldown = 8; // ~130ms between beats at 60fps

        // Pixel particles: each particle renders as a single device pixel.
        // Density does the work — thousands of points, with motion trails
        // coming from the translucent frame fade (see draw()).
        const cap = maxParticles * 25;
        const hueFor = () => palette
            ? palette.hueBase + Math.random() * Math.max(palette.hueRange, 14)
            : Math.random() * 360;

        // ---- emitter 1: bottom fountain, rate follows the mids ----
        const fountainRate = Math.round((6 + mid * 40) * S);
        for (let i = 0; i < fountainRate && particles.length < cap; i++) {
            particles.push({
                x: Math.random() * W,
                y: H + 2,
                vx: (Math.random() - 0.5) * 1.6 * S,
                vy: (-1.6 - Math.random() * 3.0 - bass * 4) * S,
                life: 1,
                decay: 0.006 + Math.random() * 0.010,
                hue: hueFor(),
                hot: false
            });
        }

        // ---- emitter 2: beat burst — radial pixel explosion ----
        if (isBeat) {
            const bx = W / 2 + (Math.random() - 0.5) * W * 0.3;
            const by = H * (0.45 + Math.random() * 0.3);
            const count = Math.min(cap - particles.length, 90 + Math.round(bass * 160));
            const burstHue = hueFor();
            for (let i = 0; i < count; i++) {
                const a = Math.random() * Math.PI * 2;
                const speed = (1 + Math.random() * Math.random() * 6 + bass * 4) * S;
                particles.push({
                    x: bx,
                    y: by,
                    vx: Math.cos(a) * speed,
                    vy: Math.sin(a) * speed * 0.85 - 0.8 * S,
                    life: 1,
                    decay: 0.010 + Math.random() * 0.022,
                    hue: burstHue + (Math.random() - 0.5) * 24,
                    hot: Math.random() < 0.35
                });
            }
        }

        // ---- emitter 3: treble sparkles — brief pixel twinkles up top ----
        if (treble > 0.15) {
            const n = Math.min(cap - particles.length, Math.round(treble * 20));
            for (let i = 0; i < n; i++) {
                particles.push({
                    x: Math.random() * W,
                    y: Math.random() * H * 0.5,
                    vx: (Math.random() - 0.5) * 0.4 * S,
                    vy: 0.3 * S,
                    life: 0.5,
                    decay: 0.05 + Math.random() * 0.06,
                    hue: hueFor(),
                    hot: true
                });
            }
        }

        // ---- physics + single-pixel render ----
        const t = Date.now() * 0.001;
        const px = Math.max(1, Math.round(S)); // 1 device pixel (2 on retina backing)
        ctx.globalCompositeOperation = 'lighter';
        particles = particles.filter(p => p.life > 0);
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            // Foreign particles (fire embers sharing this array) lack decay —
            // retire them rather than feeding NaN into the physics
            if (!(p.decay > 0)) {
                p.life = 0;
                continue;
            }
            // turbulence field driven by the mids, gravity, drag
            p.vx += Math.sin(p.y * 0.02 + t * 1.7) * 0.06 * S * (0.3 + mid)
                  + Math.sin(p.x * 0.011 - t * 1.1) * 0.03 * S * mid;
            p.vy += 0.05 * S;
            p.vx *= 0.99;
            p.vy *= 0.99;
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            if (p.life <= 0 || p.x < 0 || p.x >= W || p.y < 0 || p.y >= H) {
                p.life = 0;
                continue;
            }

            const alpha = p.life * p.life;
            ctx.fillStyle = p.hot
                ? `hsla(${p.hue}, 45%, 88%, ${alpha})`
                : `hsla(${p.hue}, 85%, 62%, ${alpha})`;
            ctx.fillRect(p.x | 0, p.y | 0, px, px);
        }
        ctx.globalCompositeOperation = 'source-over';

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
        const { visualGain = 1, maxParticles } = options;
        const W = canvas.width;
        const H = canvas.height;

        // ---- audio ----
        let bassSum = 0;
        for (let i = 0; i < 8; i++) bassSum += frequencyData[i];
        const bass = Math.pow(bassSum / (8 * 255), 0.8) * visualGain * 1.4;
        let trebSum = 0;
        for (let i = 64; i < Math.min(160, frequencyData.length); i++) trebSum += frequencyData[i];
        const treble = (trebSum / (96 * 255)) * visualGain;

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

        // ---- seed the base: per-column flicker, bass = fuel, beats = flash ----
        for (let x = 0; x < gw; x++) {
            const flicker =
                0.62 +
                0.20 * Math.sin(x * 0.35 + t * 9) +
                0.12 * Math.sin(x * 0.9 - t * 13) +
                Math.random() * 0.22;
            let hVal = (135 + bass * 130) * flicker;
            if (isBeat) hVal += 80;
            hVal = Math.min(255, hVal);
            heat[(gh - 1) * gw + x] = hVal;
            heat[(gh - 2) * gw + x] = Math.min(255, hVal * 0.97);
        }

        // ---- propagate upward: each cell pulls from below with random decay
        //      and lateral jitter; slow wind leans the flames ----
        const wind = Math.sin(t * 0.6) * 0.9 + Math.sin(t * 1.7) * 0.3;
        // Decay normalized by grid height: flames reach ~75% of the canvas
        // at moderate levels regardless of resolution, taller on heavy bass
        const decayBase = (280 - Math.min(bass, 1) * 120) / gh;
        for (let y = 0; y < gh - 2; y++) {
            const rowOff = y * gw;
            const srcRow = (y + 1) * gw;
            for (let x = 0; x < gw; x++) {
                let srcX = x + ((Math.random() * 3) | 0) - 1;
                if (Math.random() < Math.abs(wind) * 0.4) srcX += wind > 0 ? 1 : -1;
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
            palette = null
        } = options;

        const bgColor = darkMode ? '#1a2332' : '#0a0a0a';

        // Clear canvas. Particles mode fades instead of wiping — the translucent
        // clear leaves each pixel's previous positions as a decaying motion trail
        // (the classic particle-engine accumulation buffer).
        if (visType === 'particles') {
            ctx.fillStyle = darkMode ? 'rgba(26, 35, 50, 0.28)' : 'rgba(10, 10, 10, 0.28)';
        } else {
            ctx.fillStyle = bgColor;
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const drawOptions = { visualGain, bufferLength, maxParticles, spatialState, palette };

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
            default:
                drawBars(ctx, canvas, frequencyData, drawOptions);
        }

        return particles;
    };

    return {
        draw,
        drawBars,
        drawWaveform,
        drawCircular,
        drawMirrored,
        drawParticles,
        drawFire,
        drawBreathe,
        drawOrbit
    };
});
