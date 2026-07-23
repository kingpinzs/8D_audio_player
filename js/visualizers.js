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
        const { visualGain, bufferLength } = options;
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = ((frequencyData[i] / 255) * canvas.height) * visualGain;
            const hue = (i / bufferLength) * 360;
            ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    };

    /**
     * Draw waveform visualizer
     */
    const drawWaveform = (ctx, canvas, waveformData, options) => {
        const { visualGain, bufferLength } = options;
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#4ade80';
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
        ctx.shadowColor = '#4ade80';
        ctx.stroke();
        ctx.shadowBlur = 0;
    };

    /**
     * Draw circular visualizer
     */
    const drawCircular = (ctx, canvas, frequencyData, options) => {
        const { visualGain, bufferLength } = options;
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
            const hue = (i / bars) * 360;
            ctx.beginPath();
            ctx.moveTo(centerX + Math.cos(angle) * innerR, centerY + Math.sin(angle) * innerR);
            ctx.lineTo(centerX + Math.cos(angle) * outerR, centerY + Math.sin(angle) * outerR);
            ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;
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

    /**
     * Draw particles visualizer
     */
    const drawParticles = (ctx, canvas, frequencyData, particles, options) => {
        const { bufferLength, maxParticles } = options;
        const avgFreq = frequencyData.reduce((a, b) => a + b, 0) / bufferLength;

        if (avgFreq > 50 && particles.length < maxParticles) {
            particles.push({
                x: Math.random() * canvas.width,
                y: canvas.height,
                vx: (Math.random() - 0.5) * 4,
                vy: -Math.random() * 5 - 2,
                life: 1,
                hue: Math.random() * 360,
                size: Math.random() * 4 + 2
            });
        }

        particles = particles.filter(p => p.life > 0);
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05;
            p.life -= 0.015;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, ${p.life})`;
            ctx.fill();
        });

        return particles;
    };

    /**
     * Draw fire visualizer with beat reactivity
     */
    const drawFire = (ctx, canvas, frequencyData, particles, options) => {
        const { visualGain, maxParticles } = options;
        const time = Date.now() * 0.001;

        // Audio analysis - STRONG beat response
        const bassSum = frequencyData.slice(0, 8).reduce((a, b) => a + b, 0);
        const bass = Math.pow(bassSum / (8 * 255), 0.7) * visualGain * 1.5;

        // Heat glow background - pulses with beat
        const bgGlow = ctx.createLinearGradient(0, canvas.height, 0, 0);
        bgGlow.addColorStop(0, `rgba(255, 80, 0, ${0.5 + bass * 0.5})`);
        bgGlow.addColorStop(0.4, `rgba(180, 40, 0, ${0.2 + bass * 0.3})`);
        bgGlow.addColorStop(0.7, `rgba(60, 10, 0, ${0.1 + bass * 0.1})`);
        bgGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = bgGlow;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw fire using canvas compositing for glow
        ctx.globalCompositeOperation = 'lighter';

        const flameCount = 35;
        for (let layer = 0; layer < 3; layer++) {
            const layerAlpha = [0.3, 0.5, 0.8][layer];
            const layerOffset = [12, 6, 0][layer];

            for (let i = 0; i < flameCount; i++) {
                const x = (i + 0.5) * (canvas.width / flameCount);

                // Frequency-based height
                const fi = Math.floor((i / flameCount) * 24);
                const freq = frequencyData[fi] / 255;

                // Multiple wave layers for organic movement
                const t = time + layer * 0.3;
                const w1 = Math.sin(t * 3 + i * 0.5) * 0.2;
                const w2 = Math.sin(t * 5 + i * 0.3) * 0.15;
                const w3 = Math.cos(t * 2 + i * 0.7) * 0.1;
                const wobble = w1 + w2 + w3;

                // Height = base + beat boost + frequency + wobble
                const baseH = canvas.height * 0.2;
                const beatH = bass * canvas.height * 0.5;
                const freqH = freq * canvas.height * 0.3;
                const height = (baseH + beatH + freqH) * (1 + wobble);

                // X wobble
                const xOff = Math.sin(t * 4 + i) * 15 + Math.cos(t * 6 + i * 0.5) * 10;

                // Flame width
                const w = (canvas.width / flameCount) * 2;

                // Draw organic flame shape
                const gradient = ctx.createLinearGradient(
                    x, canvas.height + layerOffset,
                    x, canvas.height + layerOffset - height
                );

                const a = layerAlpha * (0.5 + bass * 0.5);
                gradient.addColorStop(0, `rgba(255, 255, 200, ${a})`);
                gradient.addColorStop(0.15, `rgba(255, 200, 50, ${a})`);
                gradient.addColorStop(0.35, `rgba(255, 120, 20, ${a * 0.85})`);
                gradient.addColorStop(0.55, `rgba(255, 60, 5, ${a * 0.65})`);
                gradient.addColorStop(0.75, `rgba(180, 20, 0, ${a * 0.4})`);
                gradient.addColorStop(1, 'rgba(80, 10, 0, 0)');

                ctx.beginPath();
                ctx.moveTo(x - w/2 + xOff, canvas.height + layerOffset);

                // Curved flame shape with bezier
                const midY = canvas.height + layerOffset - height * 0.5;
                const topY = canvas.height + layerOffset - height;

                // Left side up
                ctx.bezierCurveTo(
                    x - w/2 + xOff + Math.sin(t * 5 + i) * 8, midY + height * 0.2,
                    x - w/4 + xOff + Math.sin(t * 7 + i) * 12, midY - height * 0.1,
                    x + xOff + Math.sin(t * 3 + i) * 5, topY
                );

                // Right side down
                ctx.bezierCurveTo(
                    x + w/4 + xOff + Math.cos(t * 7 + i) * 12, midY - height * 0.1,
                    x + w/2 + xOff + Math.cos(t * 5 + i) * 8, midY + height * 0.2,
                    x + w/2 + xOff, canvas.height + layerOffset
                );

                ctx.closePath();
                ctx.fillStyle = gradient;
                ctx.fill();
            }
        }

        ctx.globalCompositeOperation = 'source-over';

        // Embers on beat
        if (bass > 0.25 && particles.length < maxParticles * 2) {
            const n = Math.floor(bass * 12) + 2;
            for (let i = 0; i < n; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: canvas.height - Math.random() * canvas.height * 0.35,
                    vx: (Math.random() - 0.5) * 4,
                    vy: -Math.random() * 5 - 2,
                    life: 1,
                    hue: 20 + Math.random() * 40,
                    size: Math.random() * 5 + 2,
                    phase: Math.random() * Math.PI * 2
                });
            }
        }

        // Update embers
        particles = particles.filter(p => p.life > 0);
        ctx.globalCompositeOperation = 'lighter';
        particles.forEach(p => {
            p.phase += 0.15;
            p.x += p.vx + Math.sin(p.phase) * 2;
            p.y += p.vy;
            p.vy *= 0.97;
            p.life -= 0.018;

            const flicker = 0.6 + Math.sin(p.phase * 2) * 0.4;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 100%, ${55 + flicker * 25}%, ${p.life * flicker})`;
            ctx.fill();
        });
        ctx.globalCompositeOperation = 'source-over';

        // Base glow pulsing with beat
        const baseGlow = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - 60);
        baseGlow.addColorStop(0, `rgba(255, 200, 100, ${0.6 + bass * 0.4})`);
        baseGlow.addColorStop(0.4, `rgba(255, 120, 30, ${0.3 + bass * 0.3})`);
        baseGlow.addColorStop(1, 'rgba(255, 60, 0, 0)');
        ctx.fillStyle = baseGlow;
        ctx.fillRect(0, canvas.height - 60, canvas.width, 60);

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

        // Source position: live engine state, or a slow idle orbit
        const idleAngle = (Date.now() * 0.001 * (Math.PI * 2)) / 16; // 16s idle rev
        const angle = spatialState ? spatialState.angle : idleAngle;
        const depth = spatialState ? spatialState.depthMultiplier : 1;
        // angle 0 = front (top of screen), increasing clockwise
        const sx = cx + Math.sin(angle) * R;
        const sy = cy - Math.cos(angle) * R * (0.9 + depth * 0.1);

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
            spatialState = null
        } = options;

        const bgColor = darkMode ? '#1a2332' : '#0a0a0a';

        // Clear canvas
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const drawOptions = { visualGain, bufferLength, maxParticles, spatialState };

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
