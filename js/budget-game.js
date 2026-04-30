// ==========================================
// AD BUDGET OPTIMIZER — Game 2
// ==========================================

(function() {
    'use strict';

    // DOM References
    const fbSlider = document.getElementById('fb-slider');
    const googleSlider = document.getElementById('google-slider');
    const instaSlider = document.getElementById('insta-slider');

    const fbValue = document.getElementById('fb-value');
    const googleValue = document.getElementById('google-value');
    const instaValue = document.getElementById('insta-value');

    const budgetUsedEl = document.getElementById('budget-used');
    const budgetRemainingEl = document.getElementById('budget-remaining');
    const budgetBar = document.getElementById('budget-bar');
    const runBtn = document.getElementById('run-campaign-btn');

    const resultsPanel = document.getElementById('budget-results');
    const fbLeadsEl = document.getElementById('fb-leads');
    const googleLeadsEl = document.getElementById('google-leads');
    const instaLeadsEl = document.getElementById('insta-leads');
    const totalLeadsEl = document.getElementById('total-leads');
    const budgetMessageEl = document.getElementById('budget-message');
    const restartBtn = document.getElementById('budget-restart-btn');

    // Config
    const TOTAL_BUDGET = 1000;
    const RATES = {
        fb: 2,       // 1₹ = 2 leads
        google: 3,   // 1₹ = 3 leads
        insta: 1.5   // 1₹ = 1.5 leads
    };
    // Best combo: all on Google = 3000 leads
    const PERFECT_SCORE = TOTAL_BUDGET * RATES.google;

    // ==========================================
    // SLIDER LOGIC
    // ==========================================
    function updateBudget() {
        const fb = parseInt(fbSlider.value);
        const google = parseInt(googleSlider.value);
        const insta = parseInt(instaSlider.value);
        const total = fb + google + insta;

        // Update value displays
        fbValue.textContent = '₹' + fb;
        googleValue.textContent = '₹' + google;
        instaValue.textContent = '₹' + insta;

        // Budget status
        budgetUsedEl.textContent = '₹' + total;
        budgetRemainingEl.textContent = (TOTAL_BUDGET - total);

        // Budget bar
        const pct = Math.min((total / TOTAL_BUDGET) * 100, 100);
        budgetBar.style.width = pct + '%';

        // Over budget warning
        if (total > TOTAL_BUDGET) {
            budgetBar.classList.add('over-budget');
            runBtn.disabled = true;
            budgetUsedEl.style.color = '#ff003c';
        } else {
            budgetBar.classList.remove('over-budget');
            budgetUsedEl.style.color = '';
            // Enable button only when some budget is allocated
            runBtn.disabled = total === 0;
        }
    }

    // Clamp sliders so they don't exceed total
    function clampSlider(changedSlider) {
        const sliders = [fbSlider, googleSlider, instaSlider];
        const others = sliders.filter(s => s !== changedSlider);
        const changedVal = parseInt(changedSlider.value);
        const otherTotal = others.reduce((sum, s) => sum + parseInt(s.value), 0);

        if (changedVal + otherTotal > TOTAL_BUDGET) {
            changedSlider.value = TOTAL_BUDGET - otherTotal;
        }
    }

    if (fbSlider) {
        fbSlider.addEventListener('input', () => { clampSlider(fbSlider); updateBudget(); });
        googleSlider.addEventListener('input', () => { clampSlider(googleSlider); updateBudget(); });
        instaSlider.addEventListener('input', () => { clampSlider(instaSlider); updateBudget(); });
    }

    // ==========================================
    // COUNT-UP ANIMATION
    // ==========================================
    function animateCount(element, target, suffix, duration) {
        const start = 0;
        const startTime = performance.now();

        function tick(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out quad
            const eased = 1 - (1 - progress) * (1 - progress);
            const current = Math.round(start + (target - start) * eased);
            element.textContent = current + (suffix || '');

            if (progress < 1) {
                requestAnimationFrame(tick);
            }
        }

        requestAnimationFrame(tick);
    }

    // ==========================================
    // RUN CAMPAIGN
    // ==========================================
    if (runBtn) {
        runBtn.addEventListener('click', () => {
            const fb = parseInt(fbSlider.value);
            const google = parseInt(googleSlider.value);
            const insta = parseInt(instaSlider.value);
            const total = fb + google + insta;

            if (total === 0 || total > TOTAL_BUDGET) return;

            // Calculate leads
            const fbLeads = Math.round(fb * RATES.fb);
            const googleLeads = Math.round(google * RATES.google);
            const instaLeads = Math.round(insta * RATES.insta);
            const totalLeads = fbLeads + googleLeads + instaLeads;

            // Play sound
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.3);
                gain.gain.setValueAtTime(0.15, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.4);
            } catch(e) {}

            // Hide sliders/button, show results
            document.querySelector('.budget-sliders').style.display = 'none';
            document.querySelector('.budget-status').style.display = 'none';
            runBtn.style.display = 'none';
            resultsPanel.style.display = 'block';

            // Animate count-up
            animateCount(fbLeadsEl, fbLeads, ' leads', 800);
            animateCount(googleLeadsEl, googleLeads, ' leads', 800);
            animateCount(instaLeadsEl, instaLeads, ' leads', 800);
            animateCount(totalLeadsEl, totalLeads, ' leads', 1200);

            // Determine message
            let message = '';
            if (totalLeads >= PERFECT_SCORE * 0.95) {
                message = '🏆 PERFECT SCORE! You\'re a natural media buyer. Maximum ROI achieved!';
            } else if (totalLeads >= PERFECT_SCORE * 0.8) {
                message = '🚀 Excellent strategy! Smart allocation = better results!';
            } else if (totalLeads >= PERFECT_SCORE * 0.6) {
                message = '📈 Good attempt! Try shifting more budget to high-performing channels.';
            } else {
                message = '💡 There\'s room to improve. Analyze the per-channel rates and try again!';
            }
            budgetMessageEl.textContent = message;

            // GSAP animations if available
            if (typeof gsap !== 'undefined') {
                gsap.from('.result-row', {
                    x: -30, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out'
                });
                gsap.from('.budget-message', {
                    y: 20, opacity: 0, duration: 0.6, delay: 0.5, ease: 'power2.out'
                });
                gsap.from('.end-buttons', {
                    y: 20, opacity: 0, duration: 0.6, delay: 0.7, ease: 'power2.out'
                });
            }
        });
    }

    // ==========================================
    // RESTART
    // ==========================================
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            // Reset sliders
            fbSlider.value = 0;
            googleSlider.value = 0;
            instaSlider.value = 0;

            // Reset displays
            updateBudget();

            // Show sliders, hide results
            document.querySelector('.budget-sliders').style.display = 'flex';
            document.querySelector('.budget-status').style.display = 'block';
            runBtn.style.display = 'flex';
            resultsPanel.style.display = 'none';
        });
    }

})();
