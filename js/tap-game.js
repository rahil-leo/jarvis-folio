// ==========================================
// NEON TAP RUSH — Game 5
// ==========================================

(function() {
    'use strict';

    // DOM Elements
    const gameArea = document.getElementById('tap-game-area');
    const scoreEl = document.getElementById('tap-score');
    const timerEl = document.getElementById('tap-timer');
    const comboContainer = document.getElementById('tap-combo-container');
    const comboEl = document.getElementById('tap-combo');
    
    const startScreen = document.getElementById('tap-start-screen');
    const endScreen = document.getElementById('tap-end-screen');
    const startBtn = document.getElementById('tap-start-btn');
    const restartBtn = document.getElementById('tap-restart-btn');
    const finalScoreEl = document.getElementById('tap-final-score');
    const finalMessageEl = document.getElementById('tap-final-message');

    if (!gameArea) return;

    // Game Variables
    let isPlaying = false;
    let score = 0;
    let timeLeft = 30;
    let combo = 1;
    let gameInterval;
    let spawnTimer;
    let spawnRate = 1200; // ms
    let targetLifespan = 1500; // ms
    let activeTargets = [];

    // Colors
    const targetColors = ['blue', 'purple', 'red'];

    // ==========================================
    // AUDIO
    // ==========================================
    let tapAudioCtx;
    function getAudioCtx() {
        if (!tapAudioCtx) {
            tapAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (tapAudioCtx.state === 'suspended') tapAudioCtx.resume();
        return tapAudioCtx;
    }

    function playTapSound(comboMultiplier) {
        try {
            const actx = getAudioCtx();
            const osc = actx.createOscillator();
            const gain = actx.createGain();
            
            // Higher pitch for higher combo
            const baseFreq = 400;
            const freq = Math.min(baseFreq + (comboMultiplier * 50), 1200);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, actx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 2, actx.currentTime + 0.1);
            
            gain.gain.setValueAtTime(0.2, actx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.15);
            
            osc.connect(gain);
            gain.connect(actx.destination);
            
            osc.start();
            osc.stop(actx.currentTime + 0.15);
        } catch(e) {}
    }

    function playMissSound() {
        try {
            const actx = getAudioCtx();
            const osc = actx.createOscillator();
            const gain = actx.createGain();
            
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, actx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, actx.currentTime + 0.2);
            
            gain.gain.setValueAtTime(0.1, actx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.2);
            
            osc.connect(gain);
            gain.connect(actx.destination);
            
            osc.start();
            osc.stop(actx.currentTime + 0.2);
        } catch(e) {}
    }

    // ==========================================
    // GAME LOGIC
    // ==========================================
    function initGame() {
        getAudioCtx();
        
        // Reset state
        score = 0;
        timeLeft = 30;
        combo = 1;
        spawnRate = 1200;
        targetLifespan = 1500;
        activeTargets = [];
        
        // Update UI
        scoreEl.textContent = '0';
        timerEl.textContent = '30';
        comboContainer.style.opacity = '0';
        comboEl.textContent = 'x1';
        
        // Clear area
        gameArea.innerHTML = '';
        
        startScreen.style.display = 'none';
        endScreen.style.display = 'none';
        
        isPlaying = true;
        
        // Start Loops
        gameInterval = setInterval(updateTimer, 1000);
        scheduleNextSpawn();
    }

    function updateTimer() {
        timeLeft--;
        timerEl.textContent = timeLeft;
        
        // Increase difficulty
        if (timeLeft === 20) {
            spawnRate = 900;
            targetLifespan = 1200;
        } else if (timeLeft === 10) {
            spawnRate = 600;
            targetLifespan = 900;
        }
        
        if (timeLeft <= 0) {
            gameOver();
        }
    }

    function scheduleNextSpawn() {
        if (!isPlaying) return;
        
        spawnTarget();
        
        // Vary spawn timing slightly for unpredictability
        const variance = Math.random() * 400 - 200;
        spawnTimer = setTimeout(scheduleNextSpawn, spawnRate + variance);
    }

    function spawnTarget() {
        if (!isPlaying) return;

        const target = document.createElement('div');
        const color = targetColors[Math.floor(Math.random() * targetColors.length)];
        
        target.className = `tap-target ${color}`;
        
        // Random position (keep inside bounds)
        // Area is 100% width/height. Target is 50x50.
        // Use percentages for responsiveness
        const xPos = 10 + Math.random() * 80; // 10% to 90%
        const yPos = 10 + Math.random() * 80; // 10% to 90%
        
        target.style.left = `${xPos}%`;
        target.style.top = `${yPos}%`;
        
        // Attach data
        target.dataset.id = Math.random().toString(36).substring(7);
        activeTargets.push(target.dataset.id);
        
        // Click handler
        target.addEventListener('mousedown', (e) => handleHit(e, target));
        target.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent double fire
            handleHit(e.touches[0], target);
        }, { passive: false });
        
        gameArea.appendChild(target);
        
        // Set removal timer (Miss)
        setTimeout(() => {
            if (activeTargets.includes(target.dataset.id)) {
                handleMiss(target);
            }
        }, targetLifespan);
    }

    function handleHit(event, target) {
        if (!isPlaying || !activeTargets.includes(target.dataset.id)) return;
        
        // Remove from active
        activeTargets = activeTargets.filter(id => id !== target.dataset.id);
        
        // Update score
        const points = 10 * combo;
        score += points;
        scoreEl.textContent = score;
        
        // Update combo
        combo++;
        if (combo > 1) {
            comboContainer.style.opacity = '1';
            comboEl.textContent = `x${combo}`;
            // Bounce animation
            if (typeof gsap !== 'undefined') {
                gsap.fromTo(comboEl, { scale: 1.5 }, { scale: 1, duration: 0.3, ease: 'back.out(2)' });
            }
        }
        
        playTapSound(combo);
        
        // Visual effects
        createBurst(target.style.left, target.style.top);
        createScorePop(points, target.style.left, target.style.top);
        
        // Remove target
        target.remove();
    }

    function handleMiss(target) {
        if (!isPlaying) return;
        
        activeTargets = activeTargets.filter(id => id !== target.dataset.id);
        
        // Reset combo
        combo = 1;
        comboContainer.style.opacity = '0';
        comboEl.textContent = `x1`;
        
        playMissSound();
        
        // Fade out quickly
        if (typeof gsap !== 'undefined') {
            gsap.to(target, { scale: 0, opacity: 0, duration: 0.2, onComplete: () => target.remove() });
        } else {
            target.remove();
        }
    }

    function createBurst(x, y) {
        const burst = document.createElement('div');
        burst.className = 'tap-burst';
        burst.style.left = x;
        burst.style.top = y;
        gameArea.appendChild(burst);
        
        setTimeout(() => burst.remove(), 400);
    }

    function createScorePop(points, x, y) {
        const pop = document.createElement('div');
        pop.className = 'tap-score-pop';
        pop.textContent = `+${points}`;
        pop.style.left = x;
        pop.style.top = y;
        
        // Color based on combo
        if (combo >= 10) pop.style.color = '#ffcc00'; // Gold
        else if (combo >= 5) pop.style.color = '#af4dff'; // Purple
        else pop.style.color = '#00f3ff'; // Cyan
        
        gameArea.appendChild(pop);
        
        setTimeout(() => pop.remove(), 600);
    }

    function gameOver() {
        isPlaying = false;
        clearInterval(gameInterval);
        clearTimeout(spawnTimer);
        
        // Clear remaining targets
        activeTargets = [];
        
        // Update end screen
        finalScoreEl.textContent = score;
        
        let msg = '';
        if (score > 1000) msg = '⚡ Godlike Reflexes! You are definitely not a robot.';
        else if (score > 500) msg = '🚀 Great Job! Fast and precise.';
        else msg = '💡 Good effort! Keep practicing to build that combo.';
        
        finalMessageEl.textContent = msg;
        
        setTimeout(() => {
            gameArea.innerHTML = ''; // Clean up
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

})();
