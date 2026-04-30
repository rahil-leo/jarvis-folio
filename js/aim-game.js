// ==========================================
// LASER AIM TRAINER — Game 7
// ==========================================

(function() {
    'use strict';

    // DOM Elements
    const canvas = document.getElementById('aim-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    const scoreEl = document.getElementById('aim-score');
    const accuracyEl = document.getElementById('aim-accuracy');
    const timerEl = document.getElementById('aim-timer');
    const startScreen = document.getElementById('aim-start-screen');
    const endScreen = document.getElementById('aim-end-screen');
    const startBtn = document.getElementById('aim-start-btn');
    const restartBtn = document.getElementById('aim-restart-btn');
    const finalScoreEl = document.getElementById('aim-final-score');
    const finalAccuracyEl = document.getElementById('aim-final-accuracy');
    const finalMessageEl = document.getElementById('aim-final-message');
    const wrapper = document.getElementById('aim-wrapper');

    if (!canvas) return;

    // Game State
    let isPlaying = false;
    let score = 0;
    let hits = 0;
    let clicks = 0;
    let timeLeft = 30;
    let lastTime = 0;
    let spawnTimer = 0;
    let gameInterval;
    let animationId;
    
    // Difficulty Settings
    let spawnRate = 800; // MS between spawns
    let targetLifespan = 1200; // MS target stays alive
    let targetRadius = 30;

    // Entities
    let targets = [];
    let particles = [];
    let scorePops = [];

    // Resize Handling
    function resizeCanvas() {
        if (!wrapper) return;
        const rect = wrapper.getBoundingClientRect();
        canvas.width = rect.width || 800;
        canvas.height = rect.height || 600;
    }

    window.addEventListener('resize', resizeCanvas);
    const observer = new ResizeObserver(() => resizeCanvas());
    observer.observe(wrapper);

    // ==========================================
    // AUDIO
    // ==========================================
    let aimAudioCtx;
    function getAudioCtx() {
        if (!aimAudioCtx) {
            aimAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (aimAudioCtx.state === 'suspended') aimAudioCtx.resume();
        return aimAudioCtx;
    }

    function playLaserSound() {
        try {
            const actx = getAudioCtx();
            const osc = actx.createOscillator();
            const gain = actx.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(800, actx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, actx.currentTime + 0.1);
            
            gain.gain.setValueAtTime(0.2, actx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.1);
            
            osc.connect(gain);
            gain.connect(actx.destination);
            
            osc.start();
            osc.stop(actx.currentTime + 0.1);
        } catch(e) {}
    }

    function playMissSound() {
        try {
            const actx = getAudioCtx();
            const osc = actx.createOscillator();
            const gain = actx.createGain();
            
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, actx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, actx.currentTime + 0.15);
            
            gain.gain.setValueAtTime(0.1, actx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.15);
            
            osc.connect(gain);
            gain.connect(actx.destination);
            
            osc.start();
            osc.stop(actx.currentTime + 0.15);
        } catch(e) {}
    }

    // ==========================================
    // ENTITY CLASSES
    // ==========================================
    class Target {
        constructor(x, y, radius, lifespan) {
            this.x = x;
            this.y = y;
            this.baseRadius = radius;
            this.radius = 0; // Starts at 0 for pop-in animation
            this.lifespan = lifespan;
            this.age = 0;
            this.active = true;
            this.color = `hsl(${Math.random() * 60 + 180}, 100%, 50%)`; // Cyans/Blues
        }

        update(dt) {
            this.age += dt;
            
            // Pop-in animation
            if (this.age < 100) {
                this.radius = (this.age / 100) * this.baseRadius;
            } else {
                // Shrink as it gets older
                const remaining = this.lifespan - this.age;
                if (remaining < 300) {
                    this.radius = Math.max(0, (remaining / 300) * this.baseRadius);
                } else {
                    this.radius = this.baseRadius;
                }
            }

            if (this.age >= this.lifespan) {
                this.active = false;
                handleMiss();
            }
        }

        draw(ctx) {
            if (this.radius <= 0) return;

            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fill();
            
            ctx.lineWidth = 3;
            ctx.strokeStyle = this.color;
            ctx.stroke();

            // Inner dot
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();

            // Arc Reactor rings
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.7, 0, Math.PI * 2);
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.radius = Math.random() * 3 + 1;
            this.life = 1;
            this.decay = Math.random() * 0.05 + 0.02;
            this.color = color;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.life -= this.decay;
        }

        draw(ctx) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${this.life})`;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    class ScorePop {
        constructor(x, y, text, color) {
            this.x = x;
            this.y = y;
            this.text = text;
            this.color = color;
            this.life = 1;
            this.vy = -1;
        }

        update() {
            this.y += this.vy;
            this.life -= 0.02;
        }

        draw(ctx) {
            ctx.font = 'bold 20px "Rajdhani", sans-serif';
            ctx.fillStyle = `rgba(255, 255, 255, ${this.life})`;
            ctx.textAlign = 'center';
            ctx.shadowBlur = 5;
            ctx.shadowColor = this.color;
            ctx.fillText(this.text, this.x, this.y);
            ctx.shadowBlur = 0;
        }
    }

    // ==========================================
    // CORE LOGIC
    // ==========================================
    function initGame() {
        resizeCanvas();
        getAudioCtx();

        score = 0;
        hits = 0;
        clicks = 0;
        timeLeft = 30;
        spawnRate = 800;
        targetLifespan = 1200;
        targetRadius = 30;
        
        targets = [];
        particles = [];
        scorePops = [];
        
        updateHUD();
        
        startScreen.style.display = 'none';
        endScreen.style.display = 'none';
        wrapper.classList.remove('aim-shake');
        
        isPlaying = true;
        lastTime = performance.now();
        
        clearInterval(gameInterval);
        gameInterval = setInterval(() => {
            timeLeft--;
            
            // Difficulty curve
            if (timeLeft === 20) {
                spawnRate = 600;
                targetLifespan = 1000;
                targetRadius = 25;
            } else if (timeLeft === 10) {
                spawnRate = 450;
                targetLifespan = 800;
                targetRadius = 20;
            }

            updateHUD();
            if (timeLeft <= 0) gameOver();
        }, 1000);
        
        animationId = requestAnimationFrame(gameLoop);
    }

    function spawnTarget() {
        const padding = targetRadius + 10;
        const x = padding + Math.random() * (canvas.width - padding * 2);
        const y = padding + Math.random() * (canvas.height - padding * 2);
        targets.push(new Target(x, y, targetRadius, targetLifespan));
    }

    function createExplosion(x, y, color) {
        for (let i = 0; i < 15; i++) {
            particles.push(new Particle(x, y, color));
        }
    }

    function handleHit(target) {
        target.active = false;
        playLaserSound();
        createExplosion(target.x, target.y, target.color);
        
        score += 10;
        hits++;
        scorePops.push(new ScorePop(target.x, target.y, '+10', '#00f3ff'));
        updateHUD();
        
        // Screen shake
        wrapper.classList.remove('aim-shake');
        void wrapper.offsetWidth; // trigger reflow
        wrapper.classList.add('aim-shake');
    }

    function handleMiss() {
        playMissSound();
        score = Math.max(0, score - 5);
        updateHUD();
    }

    function updateHUD() {
        scoreEl.textContent = score;
        timerEl.textContent = timeLeft;
        const acc = clicks === 0 ? 100 : Math.round((hits / clicks) * 100);
        accuracyEl.textContent = `${acc}%`;
    }

    // ==========================================
    // GAME LOOP
    // ==========================================
    function gameLoop(timestamp) {
        if (!isPlaying) return;
        
        const dt = timestamp - lastTime;
        lastTime = timestamp;

        // Clear canvas with trail effect
        ctx.fillStyle = 'rgba(5, 8, 16, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Spawn logic
        spawnTimer += dt;
        if (spawnTimer >= spawnRate) {
            spawnTarget();
            spawnTimer = 0;
        }

        // Update & Draw Targets
        for (let i = targets.length - 1; i >= 0; i--) {
            let t = targets[i];
            t.update(dt);
            if (!t.active) {
                targets.splice(i, 1);
            } else {
                t.draw(ctx);
            }
        }

        // Update & Draw Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            p.update();
            if (p.life <= 0) particles.splice(i, 1);
            else p.draw(ctx);
        }

        // Update & Draw Score Pops
        for (let i = scorePops.length - 1; i >= 0; i--) {
            let sp = scorePops[i];
            sp.update();
            if (sp.life <= 0) scorePops.splice(i, 1);
            else sp.draw(ctx);
        }

        if (isPlaying) {
            animationId = requestAnimationFrame(gameLoop);
        }
    }

    function gameOver() {
        isPlaying = false;
        clearInterval(gameInterval);
        cancelAnimationFrame(animationId);
        
        const acc = clicks === 0 ? 0 : Math.round((hits / clicks) * 100);
        
        finalScoreEl.textContent = score;
        finalAccuracyEl.textContent = `${acc}%`;
        
        let msg = '';
        if (acc >= 90 && score > 300) msg = 'Precision Level: Elite 🔥';
        else if (acc >= 75) msg = 'Good shooting. Keep training.';
        else msg = 'Accuracy is low. Focus your fire! ⚡';
        finalMessageEl.textContent = msg;

        // Clear canvas
        ctx.fillStyle = '#050810';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        endScreen.style.display = 'flex';
        if (typeof gsap !== 'undefined') {
            gsap.fromTo(endScreen, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.4 });
        }
    }

    // ==========================================
    // INPUT HANDLING
    // ==========================================
    function onPointerDown(e) {
        if (!isPlaying) return;
        
        // Prevent default touch behavior
        if(e.type === 'touchstart') e.preventDefault();

        // Get coordinates
        const rect = canvas.getBoundingClientRect();
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        clicks++;
        let hitSomething = false;

        // Check targets (reverse loop to hit top-most first)
        for (let i = targets.length - 1; i >= 0; i--) {
            let t = targets[i];
            const dist = Math.hypot(t.x - x, t.y - y);
            if (dist <= t.radius) {
                handleHit(t);
                hitSomething = true;
                break; // Only hit one target per click
            }
        }

        if (!hitSomething) {
            handleMiss();
        } else {
            updateHUD();
        }
    }

    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('touchstart', onPointerDown, { passive: false });

    // ==========================================
    // EVENTS
    // ==========================================
    if (startBtn) startBtn.addEventListener('click', initGame);
    if (restartBtn) restartBtn.addEventListener('click', initGame);

    // Initial draw
    resizeCanvas();
    if(ctx) {
        ctx.fillStyle = '#050810';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

})();
