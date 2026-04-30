// ==========================================
// MEMORY FLASH — Game 8
// ==========================================

(function() {
    'use strict';

    // DOM Elements
    const levelEl = document.getElementById('memory-level');
    const scoreEl = document.getElementById('memory-score');
    
    const displayPhase = document.getElementById('memory-display-phase');
    const numberDisplay = document.getElementById('memory-number-display');
    
    const inputPhase = document.getElementById('memory-input-phase');
    const inputBox = document.getElementById('memory-input');
    const submitBtn = document.getElementById('memory-submit-btn');
    const feedbackEl = document.getElementById('memory-feedback');
    
    const startScreen = document.getElementById('memory-start-screen');
    const endScreen = document.getElementById('memory-end-screen');
    const startBtn = document.getElementById('memory-start-btn');
    const restartBtn = document.getElementById('memory-restart-btn');
    
    const finalLevelEl = document.getElementById('memory-final-level');
    const finalScoreEl = document.getElementById('memory-final-score');
    const finalMessageEl = document.getElementById('memory-final-message');
    const correctAnswerEl = document.getElementById('memory-correct-answer');

    if (!levelEl) return;

    // Game Variables
    let sequence = [];
    let currentLevel = 1;
    let score = 0;
    let sequenceLength = 3; // Starts at 3 digits
    let isPlaying = false;
    let flashSpeed = 1000; // MS per number
    let gapSpeed = 200; // MS between numbers

    // ==========================================
    // AUDIO
    // ==========================================
    let memAudioCtx;
    function getAudioCtx() {
        if (!memAudioCtx) {
            memAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (memAudioCtx.state === 'suspended') memAudioCtx.resume();
        return memAudioCtx;
    }

    function playBeep(pitchMult = 1) {
        try {
            const actx = getAudioCtx();
            const osc = actx.createOscillator();
            const gain = actx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400 * pitchMult, actx.currentTime);
            
            gain.gain.setValueAtTime(0.3, actx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.3);
            
            osc.connect(gain);
            gain.connect(actx.destination);
            
            osc.start();
            osc.stop(actx.currentTime + 0.3);
        } catch(e) {}
    }

    function playError() {
        try {
            const actx = getAudioCtx();
            const osc = actx.createOscillator();
            const gain = actx.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, actx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, actx.currentTime + 0.4);
            
            gain.gain.setValueAtTime(0.3, actx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.4);
            
            osc.connect(gain);
            gain.connect(actx.destination);
            
            osc.start();
            osc.stop(actx.currentTime + 0.4);
        } catch(e) {}
    }

    function playSuccess() {
        try {
            const actx = getAudioCtx();
            const osc = actx.createOscillator();
            const gain = actx.createGain();
            
            osc.type = 'square';
            osc.frequency.setValueAtTime(400, actx.currentTime);
            osc.frequency.setValueAtTime(600, actx.currentTime + 0.1);
            osc.frequency.setValueAtTime(800, actx.currentTime + 0.2);
            
            gain.gain.setValueAtTime(0.2, actx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.4);
            
            osc.connect(gain);
            gain.connect(actx.destination);
            
            osc.start();
            osc.stop(actx.currentTime + 0.4);
        } catch(e) {}
    }

    // ==========================================
    // GAME LOGIC
    // ==========================================
    function initGame() {
        getAudioCtx();
        
        currentLevel = 1;
        score = 0;
        sequenceLength = 3;
        isPlaying = true;
        
        levelEl.textContent = currentLevel;
        scoreEl.textContent = score;
        
        startScreen.style.display = 'none';
        endScreen.style.display = 'none';
        correctAnswerEl.textContent = '';
        
        startLevel();
    }

    function generateSequence(length) {
        sequence = [];
        for (let i = 0; i < length; i++) {
            sequence.push(Math.floor(Math.random() * 10)); // 0-9
        }
    }

    function startLevel() {
        generateSequence(sequenceLength);
        
        displayPhase.style.display = 'flex';
        inputPhase.style.display = 'none';
        numberDisplay.textContent = '';
        inputBox.value = '';
        feedbackEl.textContent = '';
        
        levelEl.textContent = currentLevel;
        
        // Speed up slightly as levels increase
        flashSpeed = Math.max(400, 1000 - (currentLevel * 50));
        gapSpeed = Math.max(100, 200 - (currentLevel * 10));

        // Start flashing sequence
        setTimeout(() => flashSequence(0), 1000);
    }

    function flashSequence(index) {
        if (!isPlaying) return;

        if (index >= sequence.length) {
            // Sequence finished, show input phase
            numberDisplay.textContent = '';
            displayPhase.style.display = 'none';
            inputPhase.style.display = 'block';
            inputBox.focus();
            return;
        }

        // Show number
        numberDisplay.textContent = sequence[index];
        numberDisplay.style.animation = 'none';
        void numberDisplay.offsetWidth; // trigger reflow
        numberDisplay.style.animation = `memoryPulse ${flashSpeed/1000}s cubic-bezier(0.25, 0.46, 0.45, 0.94) both`;
        
        // Vary pitch based on number
        playBeep(1 + (sequence[index] * 0.1));

        // Hide number after flashSpeed
        setTimeout(() => {
            numberDisplay.textContent = '';
            
            // Wait gapSpeed before next number
            setTimeout(() => {
                flashSequence(index + 1);
            }, gapSpeed);

        }, flashSpeed);
    }

    function checkAnswer() {
        if (!isPlaying) return;
        
        const userInput = inputBox.value.trim();
        const correctAnswer = sequence.join('');

        if (userInput === correctAnswer) {
            // Correct
            playSuccess();
            score += 10 * currentLevel;
            scoreEl.textContent = score;
            
            feedbackEl.textContent = 'Correct ✅';
            feedbackEl.style.color = '#00f3ff';
            
            inputBox.disabled = true;
            submitBtn.disabled = true;

            setTimeout(() => {
                currentLevel++;
                sequenceLength++;
                inputBox.disabled = false;
                submitBtn.disabled = false;
                startLevel();
            }, 1500);

        } else {
            // Wrong
            gameOver(correctAnswer);
        }
    }

    function gameOver(correctAnswer) {
        isPlaying = false;
        playError();
        
        inputPhase.style.display = 'none';
        displayPhase.style.display = 'none';
        
        finalLevelEl.textContent = currentLevel;
        finalScoreEl.textContent = score;
        
        correctAnswerEl.textContent = `Correct Sequence: ${correctAnswer}`;
        
        let msg = '';
        if (currentLevel >= 10) msg = 'Memory Strength: Superhuman 🧠';
        else if (currentLevel >= 5) msg = 'Memory Strength: Advanced ⚡';
        else msg = 'Memory Strength: Basic. Train More!';
        
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

    if (submitBtn) submitBtn.addEventListener('click', checkAnswer);
    
    // Allow 'Enter' key to submit
    if (inputBox) {
        inputBox.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                checkAnswer();
            }
        });
    }

})();
