/**
 * APEX.IO - DEFINITIEVE PRO VERSIE
 * Inclusief: Agressieve AI, Leaderboard, Minimap & Rush Timer
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const miniCanvas = document.getElementById('minimap');
const miniCtx = miniCanvas ? miniCanvas.getContext('2d') : null;

// --- CONFIGURATIE & STATE ---
let audioCtx = null;
let isPlaying = false;
let selectedColor = '#00fff2';
let difficulty = 'easy';
let selectedMode = 'classic';
let player = { x: 0, y: 0, radius: 25 };
let bots = [];
let particles = [];
let explosions = [];
let mouse = { x: 0, y: 0 };
let timeLeft = 120;
let gameInterval;

const botNames = ["Nova", "Shadow", "Rex", "Vortex", "Hunter", "Zion", "Cortex", "Blaze", "Fury", "Alpha", "Zenith", "Omega"];
const colors = ["#ff0055", "#00fff2", "#bcff00", "#ff9500", "#ff00ff", "#ffffff"];

// --- AUDIO ENGINE ---
const playSound = (f, t, d, v = 0.05) => {
    if(!audioCtx) return;
    try {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = t; o.frequency.setValueAtTime(f, audioCtx.currentTime);
        g.gain.setValueAtTime(v, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(); o.stop(audioCtx.currentTime + d);
    } catch(e) {}
};

// --- UI LOGIC (Globale functies voor onclick in HTML) ---
window.ui = {
    showHub: () => {
        if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        document.getElementById('splash-screen').classList.add('hidden');
        document.getElementById('main-hub').classList.remove('hidden');
    },
    tab: (id, btn) => {
        document.querySelectorAll('.tab-view').forEach(t => t.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        playSound(800, 'sine', 0.1);
    },
    setMode: (m, btn) => {
        selectedMode = m;
        document.querySelectorAll('.card').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        playSound(600, 'sine', 0.1);
    },
    setDiff: (d, btn) => {
        difficulty = d;
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        playSound(500, 'sine', 0.1);
    },
    setSkin: (c) => { 
        selectedColor = c; 
        playSound(1000, 'sine', 0.05);
    },
    start: () => {
        document.getElementById('main-hub').classList.add('hidden');
        isPlaying = true;
        initGame();
        requestAnimationFrame(loop);
    }
};

// --- GAME FUNCTIES ---
function initGame() {
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight;
    if(miniCanvas) { miniCanvas.width = 150; miniCanvas.height = 150; }

    player = { x: canvas.width/2, y: canvas.height/2, radius: 25 };
    bots = []; particles = []; explosions = [];
    
    const botCount = (difficulty === 'easy') ? 10 : 22;
    for(let i=0; i<botCount; i++) spawnBot();
    for(let i=0; i<150; i++) spawnParticle();

    if(selectedMode === 'rush') {
        timeLeft = 120;
        const timerEl = document.getElementById('rush-timer');
        timerEl.classList.remove('hidden');
        timerEl.innerText = timeLeft;
        clearInterval(gameInterval);
        gameInterval = setInterval(() => {
            timeLeft--;
            timerEl.innerText = timeLeft;
            if(timeLeft <= 0) endGame(true);
        }, 1000);
    }
}

function spawnBot() {
    const name = botNames[Math.floor(Math.random() * botNames.length)] + "_" + Math.floor(Math.random()*99);
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const color = `hsl(${Math.abs(hash) % 360}, 75%, 60%)`;

    bots.push({
        name: name,
        x: Math.random()*canvas.width, y: Math.random()*canvas.height,
        radius: 12 + Math.random()*22, color: color, angle: Math.random()*Math.PI*2
    });
}

function spawnParticle() {
    particles.push({ 
        x: Math.random()*canvas.width, 
        y: Math.random()*canvas.height, 
        color: colors[Math.floor(Math.random()*colors.length)],
        radius: 2.5 
    });
}

function updateLeaderboard() {
    let list = bots.map(b => ({ name: b.name, radius: b.radius, isPlayer: false }));
    list.push({ name: "YOU", radius: player.radius, isPlayer: true });
    list.sort((a, b) => b.radius - a.radius);
    
    const container = document.getElementById('leaderboard-list');
    if(!container) return;
    container.innerHTML = list.slice(0, 5).map((p, i) => `
        <div class="leader-item ${p.isPlayer ? 'player' : ''}">
            <span>${i+1}. ${p.name}</span>
            <span>${Math.round(p.radius)}</span>
        </div>
    `).join('');
}

function drawMinimap() {
    if(!miniCtx) return;
    miniCtx.clearRect(0, 0, miniCanvas.width, miniCanvas.height);
    
    // Speler
    const px = (player.x / canvas.width) * miniCanvas.width;
    const py = (player.y / canvas.height) * miniCanvas.height;
    miniCtx.fillStyle = selectedColor;
    miniCtx.beginPath(); miniCtx.arc(px, py, 4, 0, 7); miniCtx.fill();

    // Gevaarlijke bots
    bots.forEach(b => {
        if(b.radius > player.radius * 1.05) {
            const bx = (b.x / canvas.width) * miniCanvas.width;
            const by = (b.y / canvas.height) * miniCanvas.height;
            miniCtx.fillStyle = "#ff0055";
            miniCtx.beginPath(); miniCtx.arc(bx, by, 2, 0, 7); miniCtx.fill();
        }
    });
}

function loop() {
    if(!isPlaying) return;
    ctx.fillStyle = '#0a0b10'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 1. Particles
    particles.forEach((p, i) => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, 7); ctx.fillStyle = p.color; ctx.fill();
        if(Math.hypot(player.x-p.x, player.y-p.y) < player.radius) {
            particles.splice(i, 1); player.radius += 0.25;
            playSound(1200, 'sine', 0.05, 0.02); spawnParticle();
        }
    });

    // 2. Bots AI & Collision
    bots.forEach((b, bi) => {
        const dist = Math.hypot(player.x-b.x, player.y-b.y);
        const canEatPlayer = b.radius > player.radius * 1.05;

        // AI gedrag
        if(dist < 400) {
            const angleToPlayer = Math.atan2(player.y - b.y, player.x - b.x);
            b.angle = canEatPlayer ? angleToPlayer : angleToPlayer + Math.PI;
        } else {
            b.angle += (Math.random()-0.5) * 0.1;
        }

        const speed = (difficulty === 'easy' ? 1.4 : 2.4) * (30/b.radius);
        b.x += Math.cos(b.angle) * speed;
        b.y += Math.sin(b.angle) * speed;

        // Randen check
        if(b.x < 0 || b.x > canvas.width) b.angle = Math.PI - b.angle;
        if(b.y < 0 || b.y > canvas.height) b.angle = -b.angle;

        // Teken Bot
        ctx.save();
        if(canEatPlayer) {
            ctx.shadowBlur = 15; ctx.shadowColor = 'red';
            ctx.strokeStyle = 'red'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, 7); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, 7); ctx.fillStyle = b.color; ctx.fill();
        ctx.restore();

        // Getal
        ctx.fillStyle = "white"; ctx.font = `bold ${Math.max(10, b.radius*0.6)}px Arial`; ctx.textAlign = "center";
        ctx.fillText(Math.round(b.radius), b.x, b.y + (b.radius*0.2));

        // Exacte Collision
        if(dist < player.radius + b.radius) {
            if(player.radius > b.radius * 1.05) {
                player.radius += b.radius * 0.3;
                for(let i=0; i<15; i++) explosions.push({x:b.x, y:b.y, vx:(Math.random()-0.5)*12, vy:(Math.random()-0.5)*12, life:1, color:b.color});
                playSound(300, 'square', 0.2, 0.1);
                bots.splice(bi, 1); spawnBot();
            } else if(canEatPlayer) {
                endGame(false);
            }
        }
    });

    // 3. VFX
    explosions.forEach((ex, i) => {
        ex.x += ex.vx; ex.y += ex.vy; ex.life -= 0.03;
        ctx.globalAlpha = ex.life; ctx.fillStyle = ex.color;
        ctx.fillRect(ex.x, ex.y, 4, 4);
        if(ex.life <= 0) explosions.splice(i, 1);
    });
    ctx.globalAlpha = 1;

    // 4. Player
    const pAngle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    const pDist = Math.hypot(mouse.x - player.x, mouse.y - player.y);
    if(pDist > 5) {
        player.x += Math.cos(pAngle) * 3.6;
        player.y += Math.sin(pAngle) * 3.6;
    }

    ctx.save();
    ctx.shadowBlur = 20; ctx.shadowColor = selectedColor;
    ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, 7); ctx.fillStyle = selectedColor; ctx.fill();
    ctx.restore();

    ctx.fillStyle = "black"; ctx.font = `bold ${Math.max(12, player.radius*0.6)}px Arial`; ctx.textAlign = "center";
    ctx.fillText(Math.round(player.radius), player.x, player.y + (player.radius*0.2));

    // 5. HUD Updates
    updateLeaderboard();
    drawMinimap();

    requestAnimationFrame(loop);
}

function endGame(win) {
    if(!isPlaying) return;
    isPlaying = false;
    clearInterval(gameInterval);
    playSound(100, 'sawtooth', 0.5, 0.2);
    document.getElementById('end-screen').classList.remove('hidden');
    document.getElementById('rush-timer').classList.add('hidden');
    document.getElementById('final-mass').innerText = Math.round(player.radius);
    document.getElementById('status-text').innerText = win ? "VICTORY" : "GAME OVER";
}

window.onmousemove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
