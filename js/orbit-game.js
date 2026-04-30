// ==========================================
// ORBIT CONTROL — Game 9
// ==========================================

(function() {
    'use strict';

    // DOM Elements
    const canvas = document.getElementById('orbit-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    const scoreEl = document.getElementById('orbit-score');
    const timeEl = document.getElementById('orbit-time');
    
    const startScreen = document.getElementById('orbit-start-screen');
    const endScreen = document.getElementById('orbit-end-screen');
    const startBtn = document.getElementById('orbit-start-btn');
    const restartBtn = document.getElementById('orbit-restart-btn');
    
    const finalScoreEl = document.getElementById('orbit-final-score');
    const finalTimeEl = document.getElementById('orbit-final-time');
    const finalMessageEl = document.getElementById('orbit-final-message');
    const wrapper = document.getElementById('orbit-wrapper');

    if (!canvas) return;

    // Game State
    let isPlaying = false;
    let score = 0;
    let startTime = 0;
    let survivalTime = 0;
    let lastTime = 0;
    let animationId;
    let spawnTimer = 0;
    
    // Core parameters
    let centerX, centerY;
    const orbitRadius = 100;
    
    // Player Orb
    const orb = {
        angle: 0,
        speed: 2.5, // radians per second
        direction: 1, // 1 (CW) or -1 (CCW)
        radius: 12,
        color: '#00f3ff',
        trail: []
    };

    // Obstacles
    let obstacles = [];
    let spawnRate = 1200; // ms
    let obstacleSpeed = 100; // pixels per second

    function resizeCanvas() {
        if (!wrapper) return;
        const rect = wrapper.getBoundingClientRect();
        canvas.width = rect.width || 800;
        canvas.height = rect.height || 600;
        centerX = canvas.width / 2;
        centerY = canvas.height / 2;
    }

    window.addEventListener('resize', resizeCanvas);
    const observer = new ResizeObserver(() => resizeCanvas());
    observer.observe(wrapper);

    // ==========================================
    // AUDIO
    // ==========================================
    let orbAudioCtx;
    function getAudioCtx() {
        if (!orbAudioCtx) {
            orbAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (orbAudioCtx.state === 'suspended') orbAudioCtx.resume();
        return orbAudioCtx;
    }

    function playSwitchSound() {
        try {
            const actx = getAudioCtx();
            const osc = actx.createOscillator();
            const gain = actx.createGain();
            
            osc.type = 'sine';
            // Higher or lower pitch based on direction
            osc.frequency.setValueAtTime(orb.direction === 1 ? 800 : 400, actx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(orb.direction === 1 ? 1200 : 200, actx.currentTime + 0.1);
            
            gain.gain.setValueAtTime(0.1, actx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.1);
            
            osc.connect(gain);
            gain.connect(actx.destination);
            
            osc.start();
            osc.stop(actx.currentTime + 0.1);
        } catch(e) {}
    }

    function playCrashSound() {
        try {
            const actx = getAudioCtx();
            const osc = actx.createOscillator();
            const gain = actx.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, actx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, actx.currentTime + 0.5);
            
            gain.gain.setValueAtTime(0.3, actx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.5);
            
            osc.connect(gain);
            gain.connect(actx.destination);
            
            osc.start();
            osc.stop(actx.currentTime + 0.5);
        } catch(e) {}
    }

    // ==========================================
    // GAME LOGIC
    // ==========================================
    function initGame() {
        resizeCanvas();
        getAudioCtx();
        
        isPlaying = true;
        score = 0;
        spawnRate = 1200;
        obstacleSpeed = 100;
        obstacles = [];
        
        orb.angle = 0;
        orb.direction = 1;
        orb.speed = 2.5;
        orb.trail = [];
        
        scoreEl.textContent = '0';
        timeEl.textContent = '0s';
        
        startScreen.style.display = 'none';
        endScreen.style.display = 'none';
        wrapper.classList.remove('orbit-shake');
        
        startTime = performance.now();
        lastTime = performance.now();
        animationId = requestAnimationFrame(gameLoop);
    }

    function switchDirection() {
        if (!isPlaying) return;
        orb.direction *= -1;
        playSwitchSound();
    }

    function spawnObstacle() {
        // Spawn from edges of screen moving towards center
        const angle = Math.random() * Math.PI * 2;
        // Start distance far enough to be off screen
        const startDist = Math.max(canvas.width, canvas.height);
        
        obstacles.push({
            x: centerX + Math.cos(angle) * startDist,
            y: centerY + Math.sin(angle) * startDist,
            angle: angle,
            dist: startDist,
            radius: 8 + Math.random() * 8, // size
            color: Math.random() > 0.5 ? '#ff003c' : '#ff3366'
        });
    }

    function update(dtSec) {
        // Time & Score
        survivalTime = Math.floor((performance.now() - startTime) / 1000);
        timeEl.textContent = survivalTime + 's';
        
        score = survivalTime * 10;
        scoreEl.textContent = score;

        // Difficulty scaling
        spawnRate = Math.max(300, 1200 - (survivalTime * 20));
        obstacleSpeed = 100 + (survivalTime * 5);
        orb.speed = 2.5 + (survivalTime * 0.05);

        // Update Orb Angle
        orb.angle += orb.speed * orb.direction * dtSec;
        
        // Orb Position
        const orbX = centerX + Math.cos(orb.angle) * orbitRadius;
        const orbY = centerY + Math.sin(orb.angle) * orbitRadius;

        // Trail
        orb.trail.push({ x: orbX, y: orbY, life: 1 });
        if (orb.trail.length > 20) orb.trail.shift();
        
        for (let i = 0; i < orb.trail.length; i++) {
            orb.trail[i].life -= dtSec * 3;
        }

        // Spawn Obstacles
        spawnTimer += dtSec * 1000;
        if (spawnTimer >= spawnRate) {
            spawnObstacle();
            spawnTimer = 0;
        }

        // Update Obstacles & Collision
        for (let i = obstacles.length - 1; i >= 0; i--) {
            let obs = obstacles[i];
            obs.dist -= obstacleSpeed * dtSec;
            obs.x = centerX + Math.cos(obs.angle) * obs.dist;
            obs.y = centerY + Math.sin(obs.angle) * obs.dist;

            // Simple Circle Collision
            const dx = obs.x - orbX;
            const dy = obs.y - orbY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < orb.radius + obs.radius) {
                gameOver();
            }

            // Remove if it reaches center
            if (obs.dist < 10) {
                obstacles.splice(i, 1);
                score += 5; // Dodge bonus
                scoreEl.textContent = score;
            }
        }
    }

    function draw() {
        // Clear background with slight fade for motion blur
        ctx.fillStyle = 'rgba(5, 8, 16, 0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Central Reactor Core
        ctx.beginPath();
        ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
        ctx.fillStyle = '#00f3ff';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00f3ff';
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Draw Orbit Path
        ctx.beginPath();
        ctx.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 10]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Trail
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < orb.trail.length; i++) {
            let p = orb.trail[i];
            if (p.life > 0) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, orb.radius * p.life, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 243, 255, ${p.life * 0.5})`;
                ctx.fill();
            }
        }
        ctx.globalCompositeOperation = 'source-over';

        // Draw Orb
        const orbX = centerX + Math.cos(orb.angle) * orbitRadius;
        const orbY = centerY + Math.sin(orb.angle) * orbitRadius;
        ctx.beginPath();
        ctx.arc(orbX, orbY, orb.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = orb.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw Obstacles
        for (let i = 0; i < obstacles.length; i++) {
            let obs = obstacles[i];
            ctx.beginPath();
            ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
            ctx.fillStyle = obs.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = obs.color;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    function gameLoop(timestamp) {
        if (!isPlaying) return;
        
        const dtMs = timestamp - lastTime;
        lastTime = timestamp;
        
        // Prevent huge jumps if tab was inactive
        if (dtMs < 100) {
            update(dtMs / 1000);
            draw();
        }

        if (isPlaying) {
            animationId = requestAnimationFrame(gameLoop);
        }
    }

    function gameOver() {
        isPlaying = false;
        cancelAnimationFrame(animationId);
        playCrashSound();

        // Flash screen red
        ctx.fillStyle = 'rgba(255, 0, 60, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Shake wrapper
        wrapper.classList.remove('orbit-shake');
        void wrapper.offsetWidth; // trigger reflow
        wrapper.classList.add('orbit-shake');

        // Update end screen
        finalScoreEl.textContent = score;
        finalTimeEl.textContent = survivalTime + 's';
        
        let msg = '';
        if (survivalTime > 60) msg = 'Jedi Reflexes ⚔️';
        else if (survivalTime > 30) msg = 'Good Focus ⚡';
        else msg = 'Reaction speed suboptimal.';
        finalMessageEl.textContent = msg;

        setTimeout(() => {
            endScreen.style.display = 'flex';
            if (typeof gsap !== 'undefined') {
                gsap.fromTo(endScreen, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.4 });
            }
        }, 500);
    }

    // ==========================================
    // EVENTS
    // ==========================================
    if (startBtn) startBtn.addEventListener('click', initGame);
    if (restartBtn) restartBtn.addEventListener('click', initGame);

    // Any click/tap on the game area reverses direction
    canvas.addEventListener('mousedown', switchDirection);
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        switchDirection();
    }, { passive: false });

    // Initial draw
    resizeCanvas();
    if (ctx) {
        ctx.fillStyle = '#050810';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw idle state
        ctx.beginPath();
        ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
        ctx.fillStyle = '#00f3ff';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.2)';
        ctx.setLineDash([5, 10]);
        ctx.stroke();
    }

})();
