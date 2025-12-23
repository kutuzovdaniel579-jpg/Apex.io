const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- AUDIO & VFX ENGINE ---
let audioCtx = null;
const playSound = (f, t, d, v = 0.05) => {
    if(!audioCtx) return;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = t; o.frequency.setValueAtTime(f, audioCtx.currentTime);
    g.gain.setValueAtTime(v, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + d);
};

// --- GAME STATE ---
let isPlaying = false, selectedColor = '#00fff2', difficulty = 'easy', selectedMode = 'classic';
let player = { x: 0, y: 0, radius: 30 }, bots = [], particles = [], explosions = [];
let mouse = { x: 0, y: 0 }, timer = 120, gameInterval;

// --- UI LOGIC ---
const ui = {
    showHub: () => {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        document.getElementById('splash-screen').classList.add('hidden');
        document.getElementById('main-hub').classList.remove('hidden');
    },
    tab: (id, btn) => {
        document.querySelectorAll('.tab-view').forEach(t => t.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    },
    setMode: (m, btn) => {
        selectedMode = m;
        document.querySelectorAll('.card').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    },
    setDiff: (d, btn) => {
        difficulty = d;
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    },
    setSkin: (c) => { selectedColor = c; },
    start: () => {
        document.getElementById('main-hub').classList.add('hidden');
        isPlaying = true;
        initGame();
        requestAnimationFrame(loop);
    }
};

function initGame() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    player = { x: canvas.width/2, y: canvas.height/2, radius: 30 };
    bots = []; particles = []; explosions = [];
    const botCount = (difficulty === 'easy') ? 8 : 18;
    for(let i=0; i<botCount; i++) spawnBot();
    for(let i=0; i<100; i++) spawnParticle();
}

function spawnBot() {
    bots.push({
        x: Math.random()*canvas.width, y: Math.random()*canvas.height,
        radius: 15 + Math.random()*20, color: '#ff0055', angle: Math.random()*Math.PI*2
    });
}

function spawnParticle() {
    particles.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, color: '#fff' });
}

function createExplosion(x, y, color) {
    for(let i=0; i<15; i++) {
        explosions.push({ x, y, vx:(Math.random()-0.5)*10, vy:(Math.random()-0.5)*10, life:1, color });
    }
}

function loop() {
    if(!isPlaying) return;
    ctx.fillStyle = '#050608'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Particles
    particles.forEach((p, i) => {
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 7); ctx.fillStyle = p.color; ctx.fill();
        if(Math.hypot(player.x-p.x, player.y-p.y) < player.radius) {
            particles.splice(i, 1); player.radius += 0.3;
            playSound(1000, 'sine', 0.1); spawnParticle();
        }
    });

    // Bots Logic
    bots.forEach((b, bi) => {
        const speed = (difficulty === 'easy') ? 1.2 : 2.5;
        b.x += Math.cos(b.angle) * speed; b.y += Math.sin(b.angle) * speed;
        if(b.x<0 || b.x>canvas.width) b.angle = Math.PI - b.angle;
        if(b.y<0 || b.y>canvas.height) b.angle = -b.angle;

        // Bot Growth (Eet particles)
        particles.forEach((p, pi) => {
            if(Math.hypot(b.x-p.x, b.y-p.y) < b.radius) {
                particles.splice(pi, 1); b.radius += 0.4; spawnParticle();
            }
        });

        // Draw Bot & Danger Border
        ctx.save();
        if(b.radius > player.radius * 1.1) {
            ctx.shadowBlur = 15; ctx.shadowColor = 'red';
            ctx.strokeStyle = 'red'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, 7); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, 7); ctx.fillStyle = b.color; ctx.fill();
        ctx.restore();

        // Massa Getal Bot
        ctx.fillStyle = "white"; ctx.font = "bold 14px Arial"; ctx.textAlign = "center";
        ctx.fillText(Math.round(b.radius), b.x, b.y + 5);

        // Collision Player vs Bot
        const dist = Math.hypot(player.x-b.x, player.y-b.y);
        if(dist < player.radius + b.radius - 5) {
            if(player.radius > b.radius * 1.1) {
                createExplosion(b.x, b.y, b.color); playSound(200, 'square', 0.3);
                player.radius += b.radius * 0.4; bots.splice(bi, 1); spawnBot();
            } else if(b.radius > player.radius * 1.1) {
                isPlaying = false; document.getElementById('end-screen').classList.remove('hidden');
                document.getElementById('final-mass').innerText = Math.round(player.radius);
                document.body.classList.add('shake');
            }
        }
    });

    // VFX Explosions
    explosions.forEach((ex, i) => {
        ex.x += ex.vx; ex.y += ex.vy; ex.life -= 0.02;
        ctx.globalAlpha = ex.life; ctx.fillStyle = ex.color;
        ctx.fillRect(ex.x, ex.y, 4, 4);
        if(ex.life <= 0) explosions.splice(i, 1);
    });
    ctx.globalAlpha = 1;

    // Player Update & Draw
    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    player.x += Math.cos(angle) * 3; player.y += Math.sin(angle) * 3;
    ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, 7); ctx.fillStyle = selectedColor; ctx.fill();
    
    // Massa Getal Player
    ctx.fillStyle = "black"; ctx.font = "bold 16px Arial"; ctx.textAlign = "center";
    ctx.fillText(Math.round(player.radius), player.x, player.y + 5);

    requestAnimationFrame(loop);
}

window.onmousemove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
