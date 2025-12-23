/**
 * APEX.IO - DEFINITIEVE VERSIE
 * FIX: SFX activatie, Verbeterde VFX en Bot Growth
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- AUDIO ENGINE ---
let audioCtx;
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playSound(freq, type, duration, vol = 0.1) {
    if (!audioCtx) return;
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
}

// Game State
let isPlaying = false;
let selectedColor = '#00fff2';
let difficulty = 'easy';
let selectedMode = 'classic';
let timeLeft = 120;
let bots = [];
let particles = [];
let explosions = []; 
let mouse = { x: 0, y: 0 };
let player = { x: 0, y: 0, radius: 22 };

const diffSettings = {
    easy: { botCount: 8, botSpeed: 1.2, growth: 1.2 },
    medium: { botCount: 12, botSpeed: 2.2, growth: 1.8 },
    hard: { botCount: 18, botSpeed: 3.2, growth: 2.5 },
    hardcore: { botCount: 25, botSpeed: 4.5, growth: 4.0 }
};

const colors = ["#00fff2", "#ff00ff", "#bcff00", "#ff9500", "#ffffff"];
const botNames = ["Alpha", "Zera", "Nova", "Predator", "Cortex", "Zenith", "Void", "Echo"];

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- UI HANDLERS ---
document.getElementById('to-hub-btn').onclick = () => {
    initAudio(); // Activeer audio op eerste klik
    playSound(440, 'sine', 0.1);
    document.getElementById('splash-screen').classList.add('hidden');
    document.getElementById('main-hub').classList.remove('hidden');
};

document.getElementById('start-match-btn').onclick = () => {
    initAudio();
    playSound(660, 'sine', 0.2);
    document.getElementById('main-hub').classList.add('hidden');
    initGame();
    isPlaying = true;
    requestAnimationFrame(gameLoop);
};

// --- VFX ENGINE ---
function createExplosion(x, y, color) {
    for(let i=0; i<20; i++) {
        explosions.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.5) * 12,
            life: 1.0,
            color: color,
            size: Math.random() * 5 + 2
        });
    }
}

class Bot {
    constructor() {
        this.reset();
        this.name = botNames[Math.floor(Math.random() * botNames.length)];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }
    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.radius = 12 + Math.random() * 15;
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

        const speed = Math.max(0.7, s.botSpeed - (this.radius / 120));
        this.x += Math.cos(this.angle) * speed;
        this.y += Math.sin(this.angle) * speed;

        if(this.x < 0 || this.x > canvas.width) this.angle = Math.PI - this.angle;
        if(this.y < 0 || this.y > canvas.height) this.angle = -this.angle;

        // BOT GROEIT HIER
        particles.forEach((p, i) => {
            if(Math.hypot(this.x - p.x, this.y - p.y) < this.radius) {
                particles.splice(i, 1);
                this.radius += 0.35 * s.growth; 
                spawnParticle();
            }
        });
    }
    draw() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        if (this.radius > player.radius * 1.1) {
            ctx.strokeStyle = "#ff0000";
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.shadowColor = "red";
            ctx.shadowBlur = 20;
        } else {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
        }
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
        
        ctx.fillStyle = "white";
        ctx.font = "bold 11px Montserrat";
        ctx.textAlign = "center";
        ctx.fillText(this.name, this.x, this.y - this.radius - 10);
    }
}

function initGame() {
    player = { x: canvas.width / 2, y: canvas.height / 2, radius: 22 };
    bots = []; particles = []; explosions = [];
    const s = diffSettings[difficulty];
    for(let i=0; i < s.botCount; i++) bots.push(new Bot());
    for(let i=0; i < 150; i++) spawnParticle();
}

function spawnParticle() {
    particles.push({ 
        x: Math.random() * canvas.width, 
        y: Math.random() * canvas.height, 
        color: colors[Math.floor(Math.random() * colors.length)], 
        radius: 2.5 
    });
}

function endGame(win) {
    isPlaying = false;
    if(!win) {
        playSound(100, 'sawtooth', 0.4, 0.2);
        document.body.classList.add('shake');
        setTimeout(() => document.body.classList.remove('shake'), 300);
    } else {
        playSound(880, 'sine', 0.5, 0.2);
    }
    document.getElementById('end-screen').classList.remove('hidden');
    document.getElementById('final-mass').innerText = Math.round(player.radius);
}

window.onmousemove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };

function gameLoop() {
    if(!isPlaying) return;
    ctx.fillStyle = "#050608";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // DEELTJES & ETEN (Met SFX)
    particles.forEach((p, i) => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fillStyle = p.color; ctx.fill();
        if(Math.hypot(player.x - p.x, player.y - p.y) < player.radius) {
            particles.splice(i, 1);
            player.radius += 0.25;
            playSound(1200, 'sine', 0.04, 0.03); // Eet geluid
            spawnParticle();
        }
    });

    const s = diffSettings[difficulty];
    bots.forEach((bot, index) => {
        bot.update(s);
        bot.draw();
        
        const dist = Math.hypot(player.x - bot.x, player.y - bot.y);
        if(dist < player.radius + bot.radius - 5) {
            if(player.radius > bot.radius * 1.1) {
                player.radius += bot.radius * 0.5;
                createExplosion(bot.x, bot.y, bot.color); // VFX
                playSound(300, 'square', 0.2, 0.1); // Kill geluid
                bot.reset();
            } else if(bot.radius > player.radius * 1.1) {
                endGame(false);
            }
        }
    });

    // VFX EXPLOSIES RENDER
    explosions.forEach((ex, i) => {
        ex.x += ex.vx; ex.y += ex.vy;
        ex.life -= 0.02;
        ctx.globalAlpha = ex.life;
        ctx.fillStyle = ex.color;
        ctx.fillRect(ex.x, ex.y, ex.size, ex.size);
        ctx.globalAlpha = 1.0;
        if(ex.life <= 0) explosions.splice(i, 1);
    });

    // PLAYER
    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    const pSpeed = Math.max(1.3, 4.0 - (player.radius / 100));
    if(Math.hypot(mouse.x - player.x, mouse.y - player.y) > 5) {
        player.x += Math.cos(angle) * pSpeed;
        player.y += Math.sin(angle) * pSpeed;
    }
    ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, Math.PI*2);
    ctx.fillStyle = selectedColor; ctx.shadowBlur = 25; ctx.shadowColor = selectedColor;
    ctx.fill(); ctx.shadowBlur = 0;

    // HUD
    ctx.fillStyle = "white"; ctx.font = "bold 16px Montserrat";
    ctx.fillText(`MASS: ${Math.round(player.radius)}`, 30, 50);

    requestAnimationFrame(gameLoop);
}

// Button listeners voor skins/diff (Zorg dat deze ook in index.html staan)
document.querySelectorAll('.diff-btn').forEach(b => b.onclick = () => {
    difficulty = b.dataset.diff;
    document.querySelectorAll('.diff-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
});
