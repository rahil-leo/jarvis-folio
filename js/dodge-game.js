// ==========================================
// DODGE THE SYSTEM — Game 4
// ==========================================

(function() {
    'use strict';

    // DOM Elements
    const canvas = document.getElementById('dodge-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    const scoreEl = document.getElementById('dodge-score');
    const timeEl = document.getElementById('dodge-time');
    const startScreen = document.getElementById('dodge-start-screen');
    const endScreen = document.getElementById('dodge-end-screen');
    const startBtn = document.getElementById('dodge-start-btn');
    const restartBtn = document.getElementById('dodge-restart-btn');
    const finalScoreEl = document.getElementById('dodge-final-score');
    const finalTimeEl = document.getElementById('dodge-final-time');
    const wrapper = document.getElementById('dodge-wrapper');

    if (!canvas) return;

    // Game Variables
    let animationId;
    let isPlaying = false;
    let score = 0;
    let startTime = 0;
    let survivalTime = 0;
    let lastTime = 0;
    
    // Player
    const player = {
        x: 0,
        y: 0,
        radius: 15,
        color: '#00f3ff',
        speed: 6,
        dx: 0,
        particles: [] // For trail effect
    };

    // Obstacles
    let obstacles = [];
    let spawnTimer = 0;
    let spawnRate = 1000; // ms between spawns
    let minSpawnRate = 300;
    let baseObstacleSpeed = 4;
    
    // Resize Canvas
    function resizeCanvas() {
        if (!wrapper) return;
        const rect = wrapper.getBoundingClientRect();
        canvas.width = rect.width || 800;
        canvas.height = rect.height || 600;
        
        // Reset player to bottom center if game hasn't started
        if (!isPlaying && score === 0) {
            player.x = canvas.width / 2;
            player.y = canvas.height - 50;
        }
    }

    window.addEventListener('resize', resizeCanvas);
    // Observe wrapper size changes (since it's inside a hidden modal initially)
    const observer = new ResizeObserver(() => resizeCanvas());
    observer.observe(wrapper);

    // ==========================================
    // AUDIO
    // ==========================================
    let dodgeAudioCtx;
    function getAudioCtx() {
        if (!dodgeAudioCtx) {
            dodgeAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (dodgeAudioCtx.state === 'suspended') dodgeAudioCtx.resume();
        return dodgeAudioCtx;
    }

    function playCollisionSound() {
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
    // INPUT HANDLING
    // ==========================================
    const keys = { ArrowLeft: false, ArrowRight: false, a: false, d: false };

    window.addEventListener('keydown', (e) => {
        if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
    });

    window.addEventListener('keyup', (e) => {
        if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    });

    // Mobile touch controls
    let touchX = null;
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchX = e.touches[0].clientX;
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (touchX !== null) {
            const currentX = e.touches[0].clientX;
            const diff = currentX - touchX;
            player.x += diff * 1.5; // Sensitivity multiplier
            touchX = currentX;
            
            // Constrain
            if (player.x < player.radius) player.x = player.radius;
            if (player.x > canvas.width - player.radius) player.x = canvas.width - player.radius;
        }
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
        touchX = null;
    });

    // ==========================================
    // GAME LOOP LOGIC
    // ==========================================
    function initGame() {
        resizeCanvas();
        getAudioCtx(); // Init audio context on user gesture
        
        player.x = canvas.width / 2;
        player.y = canvas.height - 50;
        player.particles = [];
        
        obstacles = [];
        score = 0;
        spawnRate = 1000;
        baseObstacleSpeed = 4;
        
        scoreEl.textContent = '0';
        timeEl.textContent = '0s';
        
        startScreen.style.display = 'none';
        endScreen.style.display = 'none';
        
        isPlaying = true;
        startTime = performance.now();
        lastTime = performance.now();
        
        // Ensure canvas has focus for keyboard
        canvas.setAttribute('tabindex', '0');
        canvas.focus();
        
        animationId = requestAnimationFrame(gameLoop);
    }

    function createObstacle() {
        const size = Math.random() * 30 + 20; // 20 to 50
        const x = Math.random() * (canvas.width - size);
        
        // Red neon color variations
        const colors = ['#ff003c', '#ff3366', '#cc0033'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        obstacles.push({
            x: x,
            y: -size,
            width: size,
            height: size + (Math.random() * 20), // sometimes rectangular
            speed: baseObstacleSpeed + (Math.random() * 3), // Varying speeds
            color: color
        });
    }

    function addPlayerParticle() {
        player.particles.push({
            x: player.x,
            y: player.y + player.radius/2,
            radius: player.radius * 0.6,
            life: 1, // 1 to 0
            decay: 0.05 + (Math.random() * 0.05)
        });
    }

    function update(dt) {
        // Time tracking
        survivalTime = Math.floor((performance.now() - startTime) / 1000);
        timeEl.textContent = survivalTime + 's';
        
        // Increase difficulty over time
        spawnRate = Math.max(minSpawnRate, 1000 - (survivalTime * 15));
        baseObstacleSpeed = 4 + (survivalTime * 0.1);
        
        // Score (10 points per second alive roughly)
        score = survivalTime * 10;
        scoreEl.textContent = score;

        // Player Movement (Keyboard)
        if (keys.ArrowLeft || keys.a) player.dx = -player.speed;
        else if (keys.ArrowRight || keys.d) player.dx = player.speed;
        else player.dx = 0;

        player.x += player.dx;

        // Constrain player
        if (player.x < player.radius) player.x = player.radius;
        if (player.x > canvas.width - player.radius) player.x = canvas.width - player.radius;

        // Add trail particle (every frame)
        addPlayerParticle();

        // Update trail particles
        for (let i = player.particles.length - 1; i >= 0; i--) {
            let p = player.particles[i];
            p.life -= p.decay;
            p.y += 2; // drift down
            if (p.life <= 0) {
                player.particles.splice(i, 1);
            }
        }

        // Spawn obstacles
        spawnTimer += dt;
        if (spawnTimer > spawnRate) {
            createObstacle();
            spawnTimer = 0;
        }

        // Update obstacles & Check collision
        for (let i = obstacles.length - 1; i >= 0; i--) {
            let obs = obstacles[i];
            obs.y += obs.speed;

            // Simple Circle-Rect Collision
            // Find closest point on rect to circle center
            let testX = player.x;
            let testY = player.y;

            if (player.x < obs.x) testX = obs.x; // left edge
            else if (player.x > obs.x + obs.width) testX = obs.x + obs.width; // right edge

            if (player.y < obs.y) testY = obs.y; // top edge
            else if (player.y > obs.y + obs.height) testY = obs.y + obs.height; // bottom edge

            let distX = player.x - testX;
            let distY = player.y - testY;
            let distance = Math.sqrt((distX*distX) + (distY*distY));

            if (distance <= player.radius * 0.8) { // 0.8 to make hitbox slightly forgiving
                gameOver();
            }

            // Remove if off screen
            if (obs.y > canvas.height) {
                obstacles.splice(i, 1);
                score += 5; // Bonus for dodging
                scoreEl.textContent = score;
            }
        }
    }

    function draw() {
        // Clear screen with slight transparency for motion blur effect
        ctx.fillStyle = 'rgba(5, 8, 16, 0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw trail particles
        ctx.globalCompositeOperation = 'lighter';
        player.particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 243, 255, ${p.life * 0.5})`;
            ctx.fill();
            ctx.closePath();
        });
        ctx.globalCompositeOperation = 'source-over';

        // Draw Player (Glowing Orb)
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        ctx.fillStyle = player.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = player.color;
        ctx.fill();
        ctx.closePath();
        ctx.shadowBlur = 0; // reset

        // Draw Obstacles
        obstacles.forEach(obs => {
            ctx.fillStyle = obs.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = obs.color;
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            
            // Add a glitchy inner line
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(obs.x + 2, obs.y + 2, obs.width - 4, obs.height - 4);
        });
        ctx.shadowBlur = 0; // reset
    }

    function gameLoop(timestamp) {
        if (!isPlaying) return;
        
        const dt = timestamp - lastTime;
        lastTime = timestamp;

        update(dt);
        draw();

        if (isPlaying) {
            animationId = requestAnimationFrame(gameLoop);
        }
    }

    function gameOver() {
        isPlaying = false;
        cancelAnimationFrame(animationId);
        playCollisionSound();

        // Screen Flash Effect
        ctx.fillStyle = 'rgba(255, 0, 60, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Update end screen
        finalScoreEl.textContent = score;
        finalTimeEl.textContent = survivalTime;
        
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

    // Initial draw to show the background
    resizeCanvas();
    ctx.fillStyle = '#050810';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

})();
