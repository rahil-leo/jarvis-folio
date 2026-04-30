// ==========================================
// QUICK FIX SYSTEM (PUZZLE) — Game 6
// ==========================================

(function() {
    'use strict';

    // DOM Elements
    const gridEl = document.getElementById('puzzle-grid');
    const movesEl = document.getElementById('puzzle-moves');
    const timerEl = document.getElementById('puzzle-timer');
    
    const startScreen = document.getElementById('puzzle-start-screen');
    const endScreen = document.getElementById('puzzle-end-screen');
    const startBtn = document.getElementById('puzzle-start-btn');
    const restartBtn = document.getElementById('puzzle-restart-btn');
    const finalMovesEl = document.getElementById('puzzle-final-moves');
    const endTitleEl = document.getElementById('puzzle-end-title');
    const finalMessageEl = document.getElementById('puzzle-final-message');

    if (!gridEl) return;

    // Game Variables
    const SIZE = 3; // 3x3 grid
    let tiles = []; // 1D array representing the grid
    let emptyIndex = SIZE * SIZE - 1; // Last position is empty
    let isPlaying = false;
    let moves = 0;
    let timeLeft = 45;
    let timerInterval;

    // The solved state: [1, 2, 3, 4, 5, 6, 7, 8, 0]
    const solvedState = Array.from({length: SIZE * SIZE - 1}, (_, i) => i + 1).concat(0);

    // ==========================================
    // AUDIO
    // ==========================================
    let pzAudioCtx;
    function getAudioCtx() {
        if (!pzAudioCtx) {
            pzAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (pzAudioCtx.state === 'suspended') pzAudioCtx.resume();
        return pzAudioCtx;
    }

    function playMoveSound() {
        try {
            const actx = getAudioCtx();
            const osc = actx.createOscillator();
            const gain = actx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, actx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, actx.currentTime + 0.05);
            
            gain.gain.setValueAtTime(0.1, actx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.1);
            
            osc.connect(gain);
            gain.connect(actx.destination);
            
            osc.start();
            osc.stop(actx.currentTime + 0.1);
        } catch(e) {}
    }

    function playGlitchSound() {
        try {
            const actx = getAudioCtx();
            const osc = actx.createOscillator();
            const gain = actx.createGain();
            
            osc.type = 'square';
            osc.frequency.setValueAtTime(100, actx.currentTime);
            // Random chaotic frequencies
            for(let i=0; i<10; i++) {
                osc.frequency.setValueAtTime(100 + Math.random()*500, actx.currentTime + (i*0.05));
            }
            
            gain.gain.setValueAtTime(0.2, actx.currentTime);
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
        getAudioCtx();
        
        moves = 0;
        timeLeft = 45;
        movesEl.textContent = moves;
        timerEl.textContent = timeLeft;
        
        startScreen.style.display = 'none';
        endScreen.style.display = 'none';
        gridEl.classList.add('glitch-anim');
        playGlitchSound();
        
        // Initialize solved state first to generate DOM elements
        tiles = [...solvedState];
        emptyIndex = SIZE * SIZE - 1;
        renderGrid();
        
        // Scramble after a short delay for glitch effect
        setTimeout(() => {
            gridEl.classList.remove('glitch-anim');
            scrambleBoard();
            renderGrid();
            
            isPlaying = true;
            clearInterval(timerInterval);
            timerInterval = setInterval(updateTimer, 1000);
        }, 600);
    }

    function scrambleBoard() {
        // Simple random scramble by doing valid moves backward
        // Guarantees the puzzle is solvable
        for (let i = 0; i < 150; i++) {
            const validMoves = getValidMoves();
            const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
            
            // Swap
            tiles[emptyIndex] = tiles[randomMove];
            tiles[randomMove] = 0;
            emptyIndex = randomMove;
        }
    }

    function getValidMoves() {
        const moves = [];
        const row = Math.floor(emptyIndex / SIZE);
        const col = emptyIndex % SIZE;

        if (row > 0) moves.push(emptyIndex - SIZE); // Up
        if (row < SIZE - 1) moves.push(emptyIndex + SIZE); // Down
        if (col > 0) moves.push(emptyIndex - 1); // Left
        if (col < SIZE - 1) moves.push(emptyIndex + 1); // Right

        return moves;
    }

    function handleTileClick(index) {
        if (!isPlaying) return;

        const validMoves = getValidMoves();
        if (validMoves.includes(index)) {
            // Swap tile with empty space
            tiles[emptyIndex] = tiles[index];
            tiles[index] = 0;
            emptyIndex = index;

            moves++;
            movesEl.textContent = moves;
            playMoveSound();
            renderGrid();
            checkWin();
        }
    }

    function renderGrid() {
        gridEl.innerHTML = '';
        
        tiles.forEach((value, index) => {
            const tile = document.createElement('div');
            
            if (value === 0) {
                tile.className = 'puzzle-tile empty';
            } else {
                tile.className = 'puzzle-tile';
                tile.textContent = value;
                
                // Check if tile is in correct position (1-indexed matching)
                if (value === index + 1) {
                    tile.classList.add('correct');
                }
                
                tile.addEventListener('click', () => handleTileClick(index));
            }
            
            gridEl.appendChild(tile);
        });
    }

    function updateTimer() {
        if (!isPlaying) return;
        
        timeLeft--;
        timerEl.textContent = timeLeft;
        
        if (timeLeft <= 0) {
            endGame(false);
        }
    }

    function checkWin() {
        const isWin = tiles.every((val, index) => val === solvedState[index]);
        if (isWin) {
            endGame(true);
        }
    }

    function endGame(isWin) {
        isPlaying = false;
        clearInterval(timerInterval);
        
        finalMovesEl.textContent = moves;
        
        if (isWin) {
            endTitleEl.textContent = 'System Restored ✅';
            endTitleEl.style.color = 'var(--neon-blue)';
            
            let msg = '';
            if (moves < 20) msg = 'Flawless execution! You are a puzzle master.';
            else if (moves < 40) msg = 'Great job restoring the firewall.';
            else msg = 'System saved, but it took a lot of moves!';
            finalMessageEl.textContent = msg;
        } else {
            endTitleEl.textContent = 'System Failure ⚠️';
            endTitleEl.style.color = 'var(--neon-red)';
            finalMessageEl.textContent = 'Time ran out. The corruption spread.';
        }
        
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

    // Initial render (solved state)
    tiles = [...solvedState];
    renderGrid();

})();
