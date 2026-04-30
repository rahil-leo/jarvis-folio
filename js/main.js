// ==========================================
// Register GSAP ScrollTrigger
// ==========================================
gsap.registerPlugin(ScrollTrigger);

// ==========================================
// 1. THREE.JS BACKGROUND
// ==========================================
const canvasContainer = document.getElementById('canvas-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 30;

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
canvasContainer.appendChild(renderer.domElement);

// Particles
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 1000;
const posArray = new Float32Array(particlesCount * 3);
for(let i = 0; i < particlesCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 100;
}
particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

const particlesMaterial = new THREE.PointsMaterial({
    size: 0.1,
    color: 0x00f3ff,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
});
const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particlesMesh);

// Energy Rings
const ringsGeometry = new THREE.TorusGeometry(15, 0.05, 16, 100);
const ringsMaterial = new THREE.MeshBasicMaterial({
    color: 0x00f3ff, transparent: true, opacity: 0.08, wireframe: true
});
const ring1 = new THREE.Mesh(ringsGeometry, ringsMaterial);
const ring2 = new THREE.Mesh(ringsGeometry, ringsMaterial);
ring1.rotation.x = Math.PI / 2;
ring2.rotation.y = Math.PI / 2;
scene.add(ring1);
scene.add(ring2);

// Mouse Parallax
let mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) - 0.5;
    mouseY = (e.clientY / window.innerHeight) - 0.5;
});

// Render Loop
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    particlesMesh.rotation.y = t * 0.03;
    ring1.rotation.z = t * 0.05;
    ring2.rotation.x = t * 0.05;
    camera.position.x += (mouseX * 2 - camera.position.x) * 0.05;
    camera.position.y += (-mouseY * 2 - camera.position.y) * 0.05;
    camera.lookAt(scene.position);
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ==========================================
// 2. GENERATE ARC REACTOR COILS
// ==========================================
const coilContainer = document.querySelector('.coil-container');
if (coilContainer) {
    for (let i = 0; i < 12; i++) {
        const coil = document.createElement('div');
        coil.classList.add('coil');
        coil.style.transform = `rotate(${i * 30}deg)`;
        coilContainer.appendChild(coil);
    }
}

// ==========================================
// 3. WEB AUDIO API — POWER-UP SOUND
// ==========================================
let audioCtx;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playPowerUpSound() {
    if (!audioCtx) return;

    // Layer 1: sweeping tone
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(80, audioCtx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(1500, audioCtx.currentTime + 1.2);
    gain1.gain.setValueAtTime(0.01, audioCtx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.3);
    gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.4);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start();
    osc1.stop(audioCtx.currentTime + 1.4);

    // Layer 2: sub bass thump
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(60, audioCtx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.5);
    gain2.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start();
    osc2.stop(audioCtx.currentTime + 0.5);
}

// ==========================================
// 4. REACTOR CLICK — CINEMATIC REVEAL
// ==========================================
const arcReactor = document.getElementById('arc-reactor');
const flashOverlay = document.getElementById('flash-overlay');
const navbar = document.getElementById('navbar');
const reactorPrompt = document.querySelector('.reactor-prompt');
let systemActivated = false;

if (arcReactor) {
    arcReactor.addEventListener('click', activateSystem);
}

function activateSystem() {
    if (systemActivated) return;
    systemActivated = true;

    // Play sound
    initAudio();
    playPowerUpSound();

    // Master timeline
    const tl = gsap.timeline();

    // Step 1: Reactor intensifies
    tl.to(arcReactor, {
        scale: 1.4,
        duration: 0.4,
        ease: 'power2.in'
    })

    // Step 2: Flash the prompt away
    .to(reactorPrompt, {
        opacity: 0,
        duration: 0.2,
    }, '<')

    // Step 3: Screen shake
    .to('#main-content', {
        x: 'random(-6, 6)',
        y: 'random(-6, 6)',
        duration: 0.04,
        repeat: 12,
        yoyo: true,
        ease: 'none',
    })
    .set('#main-content', { x: 0, y: 0 })

    // Step 4: Flash overlay (white-blue explosion)
    .to(flashOverlay, {
        opacity: 0.7,
        duration: 0.15,
        ease: 'power4.in'
    })
    .to(flashOverlay, {
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out'
    })

    // Step 5: Reactor shrinks and repositions to top area, becomes decorative
    .to(arcReactor, {
        scale: 0,
        opacity: 0,
        duration: 0.5,
        ease: 'power3.in',
        onComplete: () => {
            arcReactor.style.display = 'none';
            reactorPrompt.style.display = 'none';
        }
    }, '-=0.6')

    // Step 6: Show navbar
    .to(navbar, {
        y: 0,
        opacity: 1,
        duration: 0.6,
        ease: 'power3.out',
        onStart: () => {
            navbar.classList.remove('nav-hidden');
        }
    }, '-=0.3')

    // Step 7: Reveal hero content (title, buttons)
    .to('.hero-content', {
        opacity: 1,
        y: 0,
        visibility: 'visible',
        duration: 0.8,
        ease: 'power3.out',
        onStart: () => {
            document.querySelector('.hero-content').style.pointerEvents = 'auto';
        }
    }, '-=0.3')

    // Step 8: Unlock scroll & reveal all sections
    .call(() => {
        document.body.classList.remove('locked');
        revealSections();
    });
}

// ==========================================
// 5. REVEAL SECTIONS + SCROLL ANIMATIONS
// ==========================================
function revealSections() {
    // Make all hidden sections visible (but still transparent for GSAP to animate)
    const hiddenSections = document.querySelectorAll('.hidden-section:not(.hero-content)');
    hiddenSections.forEach(section => {
        section.style.visibility = 'visible';
        section.style.pointerEvents = 'auto';
    });

    // About Section
    gsap.to('#about', {
        scrollTrigger: { trigger: '#about', start: 'top 85%' },
        opacity: 1, y: 0, duration: 1, ease: 'power3.out'
    });
    gsap.from('.about-image-wrapper', {
        scrollTrigger: { trigger: '#about', start: 'top 80%' },
        x: -80, opacity: 0, duration: 1, ease: 'power3.out'
    });
    gsap.from('.about-text', {
        scrollTrigger: { trigger: '#about', start: 'top 80%' },
        x: 80, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.2
    });

    // Services Section
    gsap.to('#services', {
        scrollTrigger: { trigger: '#services', start: 'top 85%' },
        opacity: 1, y: 0, duration: 1, ease: 'power3.out'
    });
    gsap.from('.service-card', {
        scrollTrigger: { trigger: '#services', start: 'top 80%' },
        y: 50, opacity: 0, duration: 0.8, stagger: 0.15, ease: 'power2.out'
    });

    // Skills Section
    gsap.to('#skills', {
        scrollTrigger: { trigger: '#skills', start: 'top 85%' },
        opacity: 1, y: 0, duration: 1, ease: 'power3.out'
    });

    // Animate skill bars when scrolled into view
    ScrollTrigger.create({
        trigger: '#skills',
        start: 'top 80%',
        onEnter: () => {
            document.querySelectorAll('.progress-bar-fill').forEach(bar => {
                bar.style.width = bar.getAttribute('data-width');
            });
        }
    });

    // Portfolio Section
    gsap.to('#work', {
        scrollTrigger: { trigger: '#work', start: 'top 85%' },
        opacity: 1, y: 0, duration: 1, ease: 'power3.out'
    });
    gsap.from('.portfolio-card', {
        scrollTrigger: { trigger: '#work', start: 'top 80%' },
        y: 50, opacity: 0, duration: 0.8, stagger: 0.15, ease: 'power2.out'
    });

    // Testimonials Section
    gsap.to('#testimonials', {
        scrollTrigger: { trigger: '#testimonials', start: 'top 85%' },
        opacity: 1, y: 0, duration: 1, ease: 'power3.out'
    });

    // Contact Section
    gsap.to('#contact', {
        scrollTrigger: { trigger: '#contact', start: 'top 85%' },
        opacity: 1, y: 0, duration: 1, ease: 'power3.out'
    });
    gsap.from('.contact-info', {
        scrollTrigger: { trigger: '#contact', start: 'top 80%' },
        x: -50, opacity: 0, duration: 1, ease: 'power3.out'
    });
    gsap.from('.contact-form-wrapper', {
        scrollTrigger: { trigger: '#contact', start: 'top 80%' },
        x: 50, opacity: 0, duration: 1, ease: 'power3.out'
    });

    // Lab CTA button reveal
    gsap.to('#lab-cta', {
        scrollTrigger: { trigger: '#lab-cta', start: 'top 90%' },
        opacity: 1, y: 0, visibility: 'visible', duration: 0.8, ease: 'power3.out'
    });

    // Footer
    gsap.to('footer', {
        scrollTrigger: { trigger: 'footer', start: 'top 95%' },
        opacity: 1, y: 0, duration: 0.8, ease: 'power3.out'
    });
}

// ==========================================
// 6. LAB OVERLAY — MULTI-SCREEN NAVIGATION
// ==========================================
const labOverlay = document.getElementById('lab-overlay');
const openLabBtn = document.getElementById('open-lab-btn');
const closeLabBtn = document.getElementById('close-lab-btn');
const labNavLink = document.querySelector('a[href="#playground"]');
const gameCloseCta = document.getElementById('game-close-cta');
const budgetCloseCta = document.getElementById('budget-close-cta');

const labMenu = document.getElementById('lab-menu');
const labGame1 = document.getElementById('lab-game1');
const labGame2 = document.getElementById('lab-game2');
const labGame3 = document.getElementById('lab-game3');
const labGame4 = document.getElementById('lab-game4');
const labGame5 = document.getElementById('lab-game5');
const labGame6 = document.getElementById('lab-game6');
const labGame7 = document.getElementById('lab-game7');
const labGame8 = document.getElementById('lab-game8');
const labGame9 = document.getElementById('lab-game9');
const abCloseCta = document.getElementById('ab-close-cta');
const dodgeCloseCta = document.getElementById('dodge-close-cta');
const tapCloseCta = document.getElementById('tap-close-cta');
const puzzleCloseCta = document.getElementById('puzzle-close-cta');
const aimCloseCta = document.getElementById('aim-close-cta');
const memoryCloseCta = document.getElementById('memory-close-cta');
const orbitCloseCta = document.getElementById('orbit-close-cta');

// Show a specific lab screen, hide others
function showLabScreen(screenId) {
    [labMenu, labGame1, labGame2, labGame3, labGame4, labGame5, labGame6, labGame7, labGame8, labGame9].forEach(s => {
        if (s) s.style.display = 'none';
    });
    const target = document.getElementById(screenId);
    if (target) target.style.display = 'flex';
}

function openLab() {
    showLabScreen('lab-menu'); // Always open to menu
    labOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLab() {
    labOverlay.classList.remove('active');
    document.body.style.overflow = 'auto';
    // Reset to menu for next open
    setTimeout(() => showLabScreen('lab-menu'), 400);
}

if (openLabBtn) openLabBtn.addEventListener('click', openLab);
if (closeLabBtn) closeLabBtn.addEventListener('click', closeLab);
if (labNavLink) {
    labNavLink.addEventListener('click', (e) => {
        e.preventDefault();
        openLab();
    });
}

// Game selection cards → open specific game
document.querySelectorAll('.game-select-card').forEach(card => {
    card.addEventListener('click', () => {
        const gameId = card.getAttribute('data-game');
        if (gameId === 'game1') showLabScreen('lab-game1');
        if (gameId === 'game2') showLabScreen('lab-game2');
        if (gameId === 'game3') showLabScreen('lab-game3');
        if (gameId === 'game4') showLabScreen('lab-game4');
        if (gameId === 'game5') showLabScreen('lab-game5');
        if (gameId === 'game6') showLabScreen('lab-game6');
        if (gameId === 'game7') showLabScreen('lab-game7');
        if (gameId === 'game8') showLabScreen('lab-game8');
        if (gameId === 'game9') showLabScreen('lab-game9');
    });
});

// Back buttons → return to menu
document.querySelectorAll('.lab-back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        showLabScreen('lab-menu');
    });
});

// CTA buttons from game end screens → close lab + scroll to contact
if (gameCloseCta) {
    gameCloseCta.addEventListener('click', () => {
        closeLab();
        setTimeout(() => {
            document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
        }, 400);
    });
}
if (budgetCloseCta) {
    budgetCloseCta.addEventListener('click', () => {
        closeLab();
        setTimeout(() => {
            document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
        }, 400);
    });
}
if (abCloseCta) {
    abCloseCta.addEventListener('click', () => {
        closeLab();
        setTimeout(() => {
            document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
        }, 400);
    });
}
if (dodgeCloseCta) {
    dodgeCloseCta.addEventListener('click', () => {
        closeLab();
        setTimeout(() => {
            document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
        }, 400);
    });
}
if (tapCloseCta) {
    tapCloseCta.addEventListener('click', () => {
        closeLab();
        setTimeout(() => {
            document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
        }, 400);
    });
}
if (puzzleCloseCta) {
    puzzleCloseCta.addEventListener('click', () => {
        closeLab();
        setTimeout(() => {
            document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
        }, 400);
    });
}
if (aimCloseCta) {
    aimCloseCta.addEventListener('click', () => {
        closeLab();
        setTimeout(() => {
            document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
        }, 400);
    });
}
if (memoryCloseCta) {
    memoryCloseCta.addEventListener('click', () => {
        closeLab();
        setTimeout(() => {
            document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
        }, 400);
    });
}
if (orbitCloseCta) {
    orbitCloseCta.addEventListener('click', () => {
        closeLab();
        setTimeout(() => {
            document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
        }, 400);
    });
}

// ==========================================
// 7. NAVBAR SCROLL EFFECT
// ==========================================
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ==========================================
// 7. MOBILE MENU TOGGLE
// ==========================================
const mobileToggle = document.getElementById('mobile-toggle');
const navLinks = document.querySelector('.nav-links');

if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
}

// Close mobile menu on link click
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
    });
});

// ==========================================
// 8. PORTFOLIO MODAL LOGIC
// ==========================================
const modal = document.getElementById('project-modal');
const closeModalBtn = document.querySelector('.close-modal');
const projectCards = document.querySelectorAll('.portfolio-card');

const projectData = {
    "1": {
        title: "Global E-commerce Scale",
        result: "+300% ROAS in 90 Days",
        desc: "Implemented a full-funnel Meta Ads strategy paired with dynamic retargeting. We optimized the creative testing framework, resulting in a dramatic reduction in CPA and allowing the brand to scale globally.",
        tags: ["Meta Ads", "Funnel Optimization", "Creative Strategy"]
    },
    "2": {
        title: "SaaS Lead Generation",
        result: "10k+ Qualified Leads",
        desc: "Developed a comprehensive B2B lead generation engine using LinkedIn Ads and gated content. We set up automated nurturing sequences via HubSpot that increased the lead-to-opportunity conversion rate by 45%.",
        tags: ["LinkedIn Ads", "HubSpot", "B2B Marketing"]
    },
    "3": {
        title: "Local Business SEO",
        result: "Ranked #1 for 15 Keywords",
        desc: "Conducted a complete technical SEO audit and rebuilt the client's localized content strategy. Acquired high-quality local backlinks which pushed their Google Business Profile into the coveted top 3 map pack.",
        tags: ["Technical SEO", "Local SEO", "Content Strategy"]
    }
};

projectCards.forEach(card => {
    card.addEventListener('click', () => {
        const id = card.getAttribute('data-project');
        const data = projectData[id];
        if(data) {
            document.getElementById('modal-title').innerText = data.title;
            document.getElementById('modal-result').innerText = data.result;
            document.getElementById('modal-desc').innerText = data.desc;
            const tagsContainer = document.querySelector('.modal-tags');
            tagsContainer.innerHTML = '';
            data.tags.forEach(tag => {
                const span = document.createElement('span');
                span.innerText = tag;
                tagsContainer.appendChild(span);
            });
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    });
});

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    });
}

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
});
