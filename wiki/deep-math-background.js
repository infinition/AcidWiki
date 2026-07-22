/* Animated Deep Math Academy background. */
(() => {
    'use strict';
    const THEME_ID = 'deep-math-academy';

    function init() {
        const canvas = document.getElementById('home-bg-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const particles = [];
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        let width = 0;
        let height = 0;
        let pixelRatio = 1;
        let animationFrame = 0;
        let running = false;

        const isThemeActive = () => document.documentElement.dataset.theme === THEME_ID;

        function resize() {
            width = window.innerWidth;
            height = window.innerHeight;
            pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(width * pixelRatio);
            canvas.height = Math.round(height * pixelRatio);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        }

        class Particle {
            constructor() { this.reset(); }
            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
                this.size = Math.random() * 2 + 1;
                this.color = `rgba(${100 + Math.random() * 100}, ${100 + Math.random() * 100}, 255, ${Math.random() * 0.5})`;
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;
                if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) this.reset();
            }
            draw() {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function drawFrame(updateParticles) {
            ctx.clearRect(0, 0, width, height);
            ctx.strokeStyle = 'rgba(100, 100, 255, 0.05)';
            ctx.lineWidth = 1;
            particles.forEach((particle, index) => {
                if (updateParticles) particle.update();
                particle.draw();
                for (let otherIndex = index + 1; otherIndex < particles.length; otherIndex += 1) {
                    const other = particles[otherIndex];
                    const dx = particle.x - other.x;
                    const dy = particle.y - other.y;
                    if (Math.hypot(dx, dy) < 150) {
                        ctx.beginPath();
                        ctx.moveTo(particle.x, particle.y);
                        ctx.lineTo(other.x, other.y);
                        ctx.stroke();
                    }
                }
            });
        }

        function animate() {
            if (!running) return;
            drawFrame(true);
            animationFrame = window.requestAnimationFrame(animate);
        }

        function syncAnimation() {
            const shouldRun = isThemeActive() && !document.hidden && !reduceMotion.matches;
            if (shouldRun && !running) {
                running = true;
                animate();
            } else if (!shouldRun && running) {
                running = false;
                window.cancelAnimationFrame(animationFrame);
            }
            if (isThemeActive() && reduceMotion.matches) drawFrame(false);
            if (!isThemeActive()) ctx.clearRect(0, 0, width, height);
        }

        resize();
        for (let index = 0; index < 100; index += 1) particles.push(new Particle());
        window.addEventListener('resize', () => {
            resize();
            if (isThemeActive() && reduceMotion.matches) drawFrame(false);
        }, { passive: true });
        document.addEventListener('visibilitychange', syncAnimation);
        reduceMotion.addEventListener('change', syncAnimation);
        new MutationObserver(syncAnimation).observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        });
        syncAnimation();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
