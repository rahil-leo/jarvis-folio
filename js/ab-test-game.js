// ==========================================
// A/B TEST CHALLENGE — Game 3
// ==========================================

(function() {
    'use strict';

    // DOM References
    const adABtn = document.getElementById('ad-a-btn');
    const adBBtn = document.getElementById('ad-b-btn');
    const adAHeadline = document.getElementById('ad-a-headline');
    const adADesc = document.getElementById('ad-a-desc');
    const adACta = document.getElementById('ad-a-cta');
    const adBHeadline = document.getElementById('ad-b-headline');
    const adBDesc = document.getElementById('ad-b-desc');
    const adBCta = document.getElementById('ad-b-cta');

    const roundIndicator = document.getElementById('ab-round-indicator');
    const scoreDisplay = document.getElementById('ab-score');
    
    const resultArea = document.getElementById('ab-result-area');
    const resultBadge = document.getElementById('ab-result-badge');
    const explanationEl = document.getElementById('ab-explanation');
    const nextBtn = document.getElementById('ab-next-btn');

    const gameArea = document.getElementById('ab-game-area');
    const endScreen = document.getElementById('ab-end-screen');
    const finalScoreEl = document.getElementById('ab-final-score');
    const finalMessageEl = document.getElementById('ab-final-message');
    const restartBtn = document.getElementById('ab-restart-btn');

    // Audio context
    let abAudioCtx;
    function getAbAudioCtx() {
        if (!abAudioCtx) {
            abAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (abAudioCtx.state === 'suspended') abAudioCtx.resume();
        return abAudioCtx;
    }

    // ==========================================
    // SOUND EFFECTS
    // ==========================================
    function playSound(type) {
        try {
            const ctx = getAbAudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (type === 'correct') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                osc.start();
                osc.stop(ctx.currentTime + 0.3);
            } else if (type === 'wrong') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                osc.start();
                osc.stop(ctx.currentTime + 0.3);
            }
        } catch(e) {}
    }

    // ==========================================
    // GAME DATA
    // ==========================================
    const ROUNDS = [
        {
            variationA: {
                headline: 'Advanced CRM Software',
                desc: 'Includes 50+ features for managing contacts and tracking sales pipelines efficiently.',
                cta: 'View Features'
            },
            variationB: {
                headline: 'Close Deals 3x Faster',
                desc: 'Stop losing track of leads. Our CRM helps your sales team organize, track, and win more deals.',
                cta: 'Start Free Trial'
            },
            correct: 'B',
            explanation: 'Variation B sells the **benefit** ("Close Deals 3x Faster") rather than the **feature**. The CTA is also more action-oriented.'
        },
        {
            variationA: {
                headline: 'Get 20% Off Your First Order',
                desc: 'Sign up for our newsletter today and receive a discount code directly in your inbox.',
                cta: 'Submit'
            },
            variationB: {
                headline: 'Claim Your 20% Discount',
                desc: 'Join our VIP list today to instantly unlock 20% off your first purchase.',
                cta: 'Get My 20% Off'
            },
            correct: 'B',
            explanation: 'Variation B uses strong action words ("Claim", "Unlock"). The CTA ("Get My 20% Off") clearly states what the user gets compared to a generic "Submit".'
        },
        {
            variationA: {
                headline: 'The Ultimate Guide to SEO',
                desc: 'Learn everything you need to know about search engine optimization in this 50-page ebook.',
                cta: 'Download Now'
            },
            variationB: {
                headline: 'How We Ranked #1 in 30 Days',
                desc: 'Steal the exact step-by-step SEO framework we used to dominate Google rankings. Free template included.',
                cta: 'Steal Our Framework'
            },
            correct: 'B',
            explanation: 'Variation B uses **curiosity** and offers a specific, proven result ("Ranked #1 in 30 Days"). It frames the offer as an insider secret ("Steal our framework").'
        },
        {
            variationA: {
                headline: 'Need a Plumber?',
                desc: 'We offer residential and commercial plumbing services in your local area. Call us today.',
                cta: 'Contact Us'
            },
            variationB: {
                headline: 'Plumbing Emergency?',
                desc: 'We\'ll be at your door in 45 minutes or less. 24/7 service. No hidden fees.',
                cta: 'Request Immediate Service'
            },
            correct: 'B',
            explanation: 'Variation B addresses a specific pain point (urgency), offers a clear guarantee ("45 minutes or less"), and removes friction ("No hidden fees").'
        },
        {
            variationA: {
                headline: 'Try Our New Fitness App',
                desc: 'Track your workouts, count calories, and stay healthy with our newly redesigned mobile application.',
                cta: 'Install App'
            },
            variationB: {
                headline: 'Transform Your Body in 30 Days',
                desc: 'Get personalized daily workouts and meal plans tailored specifically to your body type and goals.',
                cta: 'Start My Transformation'
            },
            correct: 'B',
            explanation: 'Variation B speaks to the user\'s ultimate desire (transformation) rather than the tool (fitness app). Personalization increases conversion rates.'
        }
    ];

    // ==========================================
    // GAME STATE
    // ==========================================
    let currentRound = 0;
    let score = 0;
    let hasGuessed = false;

    // ==========================================
    // LOGIC
    // ==========================================
    function loadRound(roundIndex) {
        hasGuessed = false;
        const roundData = ROUNDS[roundIndex];

        // Update UI
        roundIndicator.textContent = `Round ${roundIndex + 1} / ${ROUNDS.length}`;
        
        adAHeadline.textContent = roundData.variationA.headline;
        adADesc.textContent = roundData.variationA.desc;
        adACta.textContent = roundData.variationA.cta;

        adBHeadline.textContent = roundData.variationB.headline;
        adBDesc.textContent = roundData.variationB.desc;
        adBCta.textContent = roundData.variationB.cta;

        // Reset classes
        adABtn.className = 'ab-card glass-panel';
        adBBtn.className = 'ab-card glass-panel';
        resultArea.style.display = 'none';

        // Animate cards in
        if (typeof gsap !== 'undefined') {
            gsap.fromTo([adABtn, adBBtn], 
                { y: 30, opacity: 0 }, 
                { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
            );
        }
    }

    function handleGuess(selectedOption) {
        if (hasGuessed) return;
        hasGuessed = true;

        const roundData = ROUNDS[currentRound];
        const isCorrect = selectedOption === roundData.correct;

        const selectedCard = selectedOption === 'A' ? adABtn : adBBtn;
        const otherCard = selectedOption === 'A' ? adBBtn : adABtn;

        // Apply styles
        if (isCorrect) {
            score += 10;
            scoreDisplay.textContent = score;
            selectedCard.classList.add('selected-correct');
            playSound('correct');
            
            // Animate score pop
            if (typeof gsap !== 'undefined') {
                gsap.fromTo(scoreDisplay, 
                    { scale: 1.5, color: '#00f3ff' }, 
                    { scale: 1, color: '#ffcc00', duration: 0.4 }
                );
            }
        } else {
            selectedCard.classList.add('selected-wrong');
            playSound('wrong');
            
            // Highlight the correct one too
            const correctCard = roundData.correct === 'A' ? adABtn : adBBtn;
            correctCard.classList.add('selected-correct');
        }

        otherCard.classList.add('dimmed');

        // Show results
        resultBadge.textContent = isCorrect ? 'Correct! ✅' : 'Wrong ❌';
        resultBadge.className = 'ab-result-badge ' + (isCorrect ? 'correct' : 'wrong');
        
        // Parse basic markdown bolding for explanation
        let expl = roundData.explanation.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        explanationEl.innerHTML = expl;

        // Change next button text on final round
        if (currentRound === ROUNDS.length - 1) {
            nextBtn.innerHTML = 'See Final Results <i class="fas fa-flag-checkered"></i>';
        } else {
            nextBtn.innerHTML = 'Next Round <i class="fas fa-arrow-right"></i>';
        }

        resultArea.style.display = 'block';
    }

    function showEndScreen() {
        gameArea.style.display = 'none';
        
        finalScoreEl.textContent = score;

        const maxScore = ROUNDS.length * 10;
        let msg = '';
        if (score === maxScore) {
            msg = '🏆 Flawless! You have the mind of a master marketer.';
        } else if (score >= maxScore * 0.6) {
            msg = '🚀 Great job! You definitely understand marketing psychology.';
        } else {
            msg = '💡 Good effort! Conversion rate optimization takes practice.';
        }
        finalMessageEl.textContent = msg;

        endScreen.style.display = 'flex';

        if (typeof gsap !== 'undefined') {
            gsap.fromTo(endScreen, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.5 });
        }
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================
    if (adABtn) adABtn.addEventListener('click', () => handleGuess('A'));
    if (adBBtn) adBBtn.addEventListener('click', () => handleGuess('B'));

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentRound++;
            if (currentRound < ROUNDS.length) {
                loadRound(currentRound);
            } else {
                showEndScreen();
            }
        });
    }

    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            currentRound = 0;
            score = 0;
            scoreDisplay.textContent = '0';
            endScreen.style.display = 'none';
            gameArea.style.display = 'block';
            loadRound(0);
        });
    }

    // Initialize first round on load (will be hidden by main.js until clicked)
    loadRound(0);

})();
