// ==========================================
// CATCH THE LEADS — Mini Game
// ==========================================

(function() {
    'use strict';

    // DOM References
    const gameArea = document.getElementById('game-area');
    const scoreDisplay = document.getElementById('game-score');
    const timerDisplay = document.getElementById('game-timer');
    const startScreen = document.getElementById('game-start-screen');
    const endScreen = document.getElementById('game-end-screen');
    const startBtn = document.getElementById('game-start-btn');
    const restartBtn = document.getElementById('game-restart-btn');
    const finalScoreEl = document.getElementById('final-score');

    // Game Config
    const GAME_DURATION = 30; // seconds
    const SPAWN_INTERVAL = 600; // ms between spawns
    const FALL_SPEED_MIN = 1.5;
    const FALL_SPEED_MAX = 3.5;
    const GOOD_SCORE = 10;
    const BAD_SCORE = -5;

    const GOOD_ITEMS = ['💰', '📈', '📊', '🎯'];
    const BAD_ITEMS = ['❌', '💸'];

    // Game State
    let score = 0;
    let timeLeft = GAME_DURATION;
    let gameRunning = false;
    let spawnTimer = null;
    let countdownTimer = null;
    let fallingItems = [];
    let animFrameId = null;

    // Audio context (reuse from main if available, or create own)
    let gameAudioCtx;

    function getAudioCtx() {
        if (gameAudioCtx) return gameAudioCtx;
        if (typeof audioCtx !== 'undefined' && audioCtx) {
            gameAudioCtx = audioCtx;
        } else {
            gameAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return gameAudioCtx;
    }

    // ==========================================
    // SOUND EFFECTS (Web Audio API)
    // ==========================================
    function playGoodSound() {
        try {
            const ctx = getAudioCtx();
            if (ctx.state === 'suspended') ctx.resume();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } catch(e) {}
    }

    function playBadSound() {
        try {
            const ctx = getAudioCtx();
            if (ctx.state === 'suspended') ctx.resume();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        } catch(e) {}
    }

    function playEndSound() {
        try {
            const ctx = getAudioCtx();
            if (ctx.state === 'suspended') ctx.resume();
            // Descending tone
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.5);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.6);
        } catch(e) {}
    }

    // ==========================================
    // GAME LOGIC
    // ==========================================

    function startGame() {
        // Reset state
        score = 0;
        timeLeft = GAME_DURATION;
        gameRunning = true;
        fallingItems = [];
        scoreDisplay.textContent = '0';
        timerDisplay.textContent = GAME_DURATION;

        // Clear any existing items
        gameArea.querySelectorAll('.falling-item, .score-pop, .click-burst').forEach(el => el.remove());

        // Hide screens
        startScreen.style.display = 'none';
        endScreen.style.display = 'none';

        // Start spawning
        spawnTimer = setInterval(spawnItem, SPAWN_INTERVAL);

        // Start countdown
        countdownTimer = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = timeLeft;

            // Flash timer red when low
            if (timeLeft <= 5) {
                timerDisplay.style.color = '#ff003c';
                timerDisplay.style.textShadow = '0 0 15px #ff003c';
            }

            if (timeLeft <= 0) {
                endGame();
            }
        }, 1000);

        // Start animation loop
        animFrameId = requestAnimationFrame(gameLoop);
    }

    function endGame() {
        gameRunning = false;
        clearInterval(spawnTimer);
        clearInterval(countdownTimer);
        cancelAnimationFrame(animFrameId);

        // Reset timer color
        timerDisplay.style.color = '';
        timerDisplay.style.textShadow = '';

        playEndSound();

        // Show end screen with animation
        finalScoreEl.textContent = Math.max(score, 0);
        endScreen.style.display = 'flex';
        endScreen.style.opacity = '0';

        // Fade in with GSAP if available
        if (typeof gsap !== 'undefined') {
            gsap.to(endScreen, { opacity: 1, duration: 0.5, ease: 'power2.out' });
        } else {
            endScreen.style.opacity = '1';
        }

        // Clean up remaining items
        setTimeout(() => {
            gameArea.querySelectorAll('.falling-item').forEach(el => el.remove());
            fallingItems = [];
        }, 300);
    }

    function spawnItem() {
        if (!gameRunning) return;

        const areaRect = gameArea.getBoundingClientRect();
        const isGood = Math.random() > 0.3; // 70% good, 30% bad
        const items = isGood ? GOOD_ITEMS : BAD_ITEMS;
        const emoji = items[Math.floor(Math.random() * items.length)];

        const el = document.createElement('div');
        el.classList.add('falling-item', isGood ? 'good' : 'bad');
        el.textContent = emoji;
        el.dataset.type = isGood ? 'good' : 'bad';

        // Random horizontal position (account for emoji width ~40px)
        const maxX = areaRect.width - 40;
        const x = Math.random() * maxX;
        el.style.left = x + 'px';
        el.style.top = '-50px';

        // Random speed
        const speed = FALL_SPEED_MIN + Math.random() * (FALL_SPEED_MAX - FALL_SPEED_MIN);

        // Add click handler
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            handleCatch(el, e);
        });

        // Touch support
        el.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleCatch(el, e.touches[0]);
        }, { passive: false });

        gameArea.appendChild(el);
        fallingItems.push({ el, speed, y: -50 });
    }

    function handleCatch(el, event) {
        if (!gameRunning) return;

        const isGood = el.dataset.type === 'good';
        const points = isGood ? GOOD_SCORE : BAD_SCORE;
        score += points;
        scoreDisplay.textContent = Math.max(score, 0);

        // Play sound
        if (isGood) {
            playGoodSound();
        } else {
            playBadSound();
        }

        // Get position for effects
        const rect = el.getBoundingClientRect();
        const areaRect = gameArea.getBoundingClientRect();
        const popX = rect.left - areaRect.left + rect.width / 2;
        const popY = rect.top - areaRect.top;

        // Score pop animation
        const pop = document.createElement('div');
        pop.classList.add('score-pop', isGood ? 'positive' : 'negative');
        pop.textContent = isGood ? `+${GOOD_SCORE}` : `${BAD_SCORE}`;
        pop.style.left = popX + 'px';
        pop.style.top = popY + 'px';
        gameArea.appendChild(pop);
        setTimeout(() => pop.remove(), 800);

        // Click burst effect
        const burst = document.createElement('div');
        burst.classList.add('click-burst', isGood ? 'good-burst' : 'bad-burst');
        burst.style.left = popX + 'px';
        burst.style.top = (popY + rect.height / 2) + 'px';
        gameArea.appendChild(burst);
        setTimeout(() => burst.remove(), 400);

        // Remove the item
        const idx = fallingItems.findIndex(item => item.el === el);
        if (idx > -1) fallingItems.splice(idx, 1);
        el.remove();

        // Animate score display
        if (typeof gsap !== 'undefined') {
            gsap.fromTo(scoreDisplay, 
                { scale: 1.5, color: isGood ? '#00f3ff' : '#ff003c' }, 
                { scale: 1, color: '#fff', duration: 0.3, ease: 'power2.out' }
            );
        }
    }

    // ==========================================
    // GAME LOOP (requestAnimationFrame)
    // ==========================================
    function gameLoop() {
        if (!gameRunning) return;

        const areaHeight = gameArea.clientHeight;

        for (let i = fallingItems.length - 1; i >= 0; i--) {
            const item = fallingItems[i];
            item.y += item.speed;
            item.el.style.top = item.y + 'px';

            // Remove if fallen past the bottom
            if (item.y > areaHeight + 50) {
                item.el.remove();
                fallingItems.splice(i, 1);
            }
        }

        animFrameId = requestAnimationFrame(gameLoop);
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================
    if (startBtn) {
        startBtn.addEventListener('click', startGame);
    }

    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            endScreen.style.display = 'none';
            startGame();
        });
    }

})();
