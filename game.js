/**
 * APEX.IO - FINAL STABLE VERSION
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- AUDIO ENGINE ---
let audioCtx = null;
function playSound(freq, type, duration, vol = 0.1) {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) { console.error(e); }
}

// --- GAME STATE ---
let isPlaying = false;
let selectedColor = '#00fff2';
let difficulty = 'easy';
let selectedMode = 'classic';
let timeLeft = 120;
let gameInterval;
let bots = [];
let particles = [];
let explosions = []; 
let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let player = { x: 0, y: 0, radius: 25 };

const diffSettings = {
    easy: { botCount: 8, botSpeed: 1.2, growth: 1.5 },
    medium: { botCount: 12, botSpeed: 2.2, growth: 2.2 },
    hard: { botCount: 18, botSpeed: 3.2, growth: 3.0 },
    hardcore: { botCount: 25, botSpeed: 4.5, growth: 4.5 }
};

const colors = ["#00fff2", "#ff00ff", "#bcff00", "#ff9500", "#ffffff"];

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- UI EVENT HANDLERS (KNOPPEN FIX) ---

// Splash naar Hub
document.getElementById('to-hub-btn').onclick = () => {
    playSound(440, 'sine', 0.1);
    document.getElementById('splash-screen').classList.add('hidden');
    document.getElementById('main-hub').classList.remove('hidden');
};

// Start Match
document.getElementById('start-match-btn').onclick = () => {
    playSound(660, 'sine', 0.2);
    document.getElementById('main-hub').classList.add('hidden');
    initGame();
    isPlaying = true;
    requestAnimationFrame(gameLoop);
};

// Back to Hub (End Screen)
document.getElementById('restart-btn').onclick = () => {
    document.getElementById('end-screen').classList.add('hidden');
    document.getElementById('main-hub').classList.remove('hidden');
};

// Navigatie (Skins, Rewards, Play)
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-view').forEach(v => v.classList.add('hidden'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.remove('hidden');
        playSound(800, 'sine', 0.05, 0.05);
    };
});

// Mode Selectie (Classic vs Rush)
document.querySelectorAll('.card').forEach(card => {
    card.onclick = () => {
        document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedMode = card.dataset.mode;
        playSound(500, 'sine', 0.05, 0.05);
    };
});

// Difficulty Selectie
document.querySelectorAll('.diff-btn').forEach(b => {
    b.onclick = () => {
        difficulty = b.dataset.diff;
        document.querySelectorAll('.diff-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        playSound(400, 'sine', 0.05, 0.05);
    };
});

// Skin Selectie
document.querySelectorAll('.skin').forEach(s => {
    s.onclick = () => {
        document.querySelectorAll('.skin').forEach(sk => sk.classList.remove('active'));
        s.classList.add('active');
        selectedColor = s.dataset.color;
        document.getElementById('current-skin-preview').style.backgroundColor = selectedColor;
        playSound(900, 'sine', 0.05, 0.05);
    };
});

// --- GAME ENGINE ---

class Bot {
    constructor() {
        this.reset();
        this.name = "BOT_" + Math.floor(Math.random() * 99);
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }
    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.radius = 15 + Math.random() * 15;
        this.angle = Math.random() * Math.PI * 2;
    }
    update(s) {
        const d = Math.hypot(player.x - this.x, player.y - this.y);
        if (d < 300) {
            const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
            this.angle = (this.radius > player.radius * 1.1) ? angleToPlayer : angleToPlayer + Math.PI;
        } else {
            this.angle += (Math.random() - 0.5) * 0.15;
        }
        const speed = Math.max(0.8, s.botSpeed - (this.radius / 150));
        this.x += Math.cos(this.angle) * speed;
        this.y += Math.sin(this.angle) * speed;
        if(this.x < 0 || this.x > canvas.width) this.angle = Math.PI - this.angle;
        if(this.y < 0 || this.y > canvas.height) this.angle = -this.angle;

        particles.forEach((p, i) => {
            if(Math.hypot(this.x - p.x, this.y - p.y) < this.radius) {
                particles.splice(i, 1);
                this.radius += 0.4 * s.growth; 
                spawnParticle();
            }
        });
    }
    draw() {
        ctx.save();
        if (this.radius > player.radius * 1.1) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
            ctx.fillStyle = '#ff0000';
            ctx.fill();
            ctx.shadowColor = 'red'; ctx.shadowBlur = 15;
        }
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
        
        // Massa getal in het midden
        ctx.fillStyle = "white";
        ctx.font = `bold ${this.radius * 0.5}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(Math.round(this.radius), this.x, this.y);
    }
}

function initGame() {
    player = { x: canvas.width / 2, y: canvas.height / 2, radius: 25 };
    bots = []; particles = []; explosions = [];
    const s = diffSettings[difficulty];
    for(let i=0; i < s.botCount; i++) bots.push(new Bot());
    for(let i=0; i < 150; i++) spawnParticle();
    
    if(selectedMode === 'rush') {
        timeLeft = 120;
        clearInterval(gameInterval);
        gameInterval = setInterval(() => {
            timeLeft--;
            if(timeLeft <= 0) endGame(true);
        }, 1000);
    }
}

function spawnParticle() {
    particles.push({ 
        x: Math.random() * canvas.width, 
        y: Math.random() * canvas.height, 
        color: colors[Math.floor(Math.random() * colors.length)], 
        radius: 3 
    });
}

function endGame(win) {
    isPlaying = false;
    clearInterval(gameInterval);
    if(!win) playSound(80, 'sawtooth', 0.5, 0.3);
    else playSound(880, 'sine', 0.5, 0.3);
    document.getElementById('end-screen').classList.remove('hidden');
    document.getElementById('final-mass').innerText = Math.round(player.radius);
}

window.onmousemove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };

function gameLoop() {
    if(!isPlaying) return;
    ctx.fillStyle = "#050608";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p, i) => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fillStyle = p.color; ctx.fill();
        if(Math.hypot(player.x - p.x, player.y - p.y) < player.radius) {
            particles.splice(i, 1);
            player.radius += 0.3;
            playSound(1000, 'sine', 0.05, 0.05);
            spawnParticle();
        }
    });

    const s = diffSettings[difficulty];
    bots.forEach((bot) => {
        bot.update(s);
        bot.draw();
        if(Math.hypot(player.x - bot.x, player.y - bot.y) < player.radius + bot.radius - 5) {
            if(player.radius > bot.radius * 1.1) {
                player.radius += bot.radius * 0.5;
                createExplosion(bot.x, bot.y, bot.color);
                playSound(200, 'square', 0.2, 0.2);
                bot.reset();
            } else if(bot.radius > player.radius * 1.1) {
                endGame(false);
            }
        }
    });

    explosions.forEach((ex, i) => {
        ex.x += ex.vx; ex.y += ex.vy; ex.life -= 0.02;
        ctx.globalAlpha = ex.life; ctx.fillStyle = ex.color;
        ctx.fillRect(ex.x, ex.y, ex.size, ex.size); ctx.globalAlpha = 1.0;
        if(ex.life <= 0) explosions.splice(i, 1);
    });

    // Player Update & Draw
    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    const pSpeed = Math.max(1.5, 4.2 - (player.radius / 100));
    player.x += Math.cos(angle) * pSpeed;
    player.y += Math.sin(angle) * pSpeed;

    ctx.save();
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = selectedColor;
    ctx.shadowColor = selectedColor; ctx.shadowBlur = 20;
    ctx.fill();
    ctx.restore();

    // Player Massa getal
    ctx.fillStyle = "black"; // Contrast op felle skins
    ctx.font = `bold ${player.radius * 0.5}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(Math.round(player.radius), player.x, player.y);

    if(selectedMode === 'rush') {
        ctx.fillStyle = "white"; ctx.font = "bold 20px Arial";
        ctx.fillText("TIME: " + timeLeft, 60, 100);
    }

    requestAnimationFrame(gameLoop);
}

function createExplosion(x, y, color) {
    for(let i=0; i<25; i++) {
        explosions.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            life: 1.0, color: color, size: Math.random() * 6 + 2
        });
    }
}
