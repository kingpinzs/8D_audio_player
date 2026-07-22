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
            maxParticles = 100
        } = options;

        const bgColor = darkMode ? '#1a2332' : '#0a0a0a';

        // Clear canvas
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const drawOptions = { visualGain, bufferLength, maxParticles };

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
        drawFire
    };
});
