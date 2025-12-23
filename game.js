/**
 * APEX.IO - ULTIMATE ARENA
 * Inclusief: Slimmere Groeiende Bots, Gevaar-uitlijning, VFX en procedurele SFX.
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- AUDIO ENGINE (Geen MP3 nodig) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(freq, type, duration, volume = 0.1) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

// UI Elements
const splash = document.getElementById('splash-screen');
const hub = document.getElementById('main-hub');
const endScreen = document.getElementById('end-screen');

// Game State
let isPlaying = false;
let selectedColor = '#00fff2';
let difficulty = 'easy';
let selectedMode = 'classic';
let timeLeft = 120;
let gameInterval;
let bots = [];
let particles = [];
let explosions = []; 
let mouse = { x: 0, y: 0 };
let player = { x: 0, y: 0, radius: 22 };

const diffSettings = {
    easy: { botCount: 8, botSpeed: 1.2, growthRate: 1.0 },
    medium: { botCount: 12, botSpeed: 2.2, growthRate: 1.5 },
    hard: { botCount: 18, botSpeed: 3.2, growthRate: 2.0 },
    hardcore: { botCount: 25, botSpeed: 4.5, growthRate: 3.0 }
};

const botNames = ["Alpha", "Zera_Bot", "Nova", "Predator", "Cortex", "Zenith", "Void", "Echo", "Raider", "Ghost"];
const colors = ["#00fff2", "#ff00ff", "#bcff00", "#ff9500", "#ffffff"];

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- UI EVENT LISTENERS ---
document.getElementById('to-hub-btn').onclick = () => {
    playSound(440, 'sine', 0.1);
    splash.classList.add('hidden');
    hub.classList.remove('hidden');
};

document.getElementById('start-match-btn').onclick = () => {
    playSound(660, 'sine', 0.2);
    hub.classList.add('hidden');
    initGame();
    isPlaying = true;
    requestAnimationFrame(gameLoop);
};

// --- VFX: EXPLOSIES ---
function createExplosion(x, y, color) {
    for(let i=0; i<15; i++) {
        explosions.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1.0,
            color: color,
            size: Math.random() * 4 + 2
        });
    }
}

// --- BOT KLASSE ---
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
    update(settings) {
        // AI Logica: Vlucht voor grotere speler, jaag op kleinere
        const d = Math.hypot(player.x - this.x, player.y - this.y);
        if (d < 350) {
            const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
            this.angle = (this.radius > player.radius * 1.1) ? angleToPlayer : angleToPlayer + Math.PI;
        } else {
            this.angle += (Math.random() - 0.5) * 0.1;
        }

        const speed = Math.max(0.8, settings.botSpeed - (this.radius / 100));
        this.x += Math.cos(this.angle) * speed;
        this.y += Math.sin(this.angle) * speed;

        // Randen
        if(this.x < 0 || this.x > canvas.width) this.angle = Math.PI - this.angle;
        if(this.y < 0 || this.y > canvas.height) this.angle = -this.angle;

        // BOT GROEI (Eet deeltjes)
        particles.forEach((p, i) => {
            if(Math.hypot(this.x - p.x, this.y - p.y) < this.radius) {
                particles.splice(i, 1);
                this.radius += 0.3 * settings.growthRate; // Hier vindt de groei plaats
                spawnParticle();
            }
        });
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        // RODE UITLIJNING ALS GEVAARLIJK
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
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = "white";
        ctx.font = "bold 10px Montserrat";
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

    if(selectedMode === 'rush') {
        timeLeft = 120;
        clearInterval(gameInterval);
        gameInterval = setInterval(() => { timeLeft--; if(timeLeft <= 0) endGame(true); }, 1000);
    }
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
    clearInterval(gameInterval);
    if(!win) {
        playSound(100, 'sawtooth', 0.5, 0.2); 
        document.body.classList.add('shake');
        setTimeout(() => document.body.classList.remove('shake'), 300);
    } else {
        playSound(880, 'sine', 0.5, 0.2);
    }
    endScreen.classList.remove('hidden');
    document.getElementById('end-title').innerText = win ? "VICTORY" : "DEFEAT";
    document.getElementById('end-title').className = win ? "win-theme" : "lose-theme";
    document.getElementById('final-mass').innerText = Math.round(player.radius);
}

window.onmousemove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };

function gameLoop() {
    if(!isPlaying) return;
    ctx.fillStyle = "#050608";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // GRID
    ctx.strokeStyle = "rgba(255,255,255,0.02)";
    for(let x=0; x<canvas.width; x+=60) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
    for(let y=0; y<canvas.height; y+=60) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }

    // PLAYER BEWEGING
    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    const speed = Math.max(1.2, 4.0 - (player.radius / 100));
    if(Math.hypot(mouse.x - player.x, mouse.y - player.y) > 5) {
        player.x += Math.cos(angle) * speed;
        player.y += Math.sin(angle) * speed;
    }

    // VOEDSEL ETEN
    particles.forEach((p, i) => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fillStyle = p.color; ctx.fill();
        if(Math.hypot(player.x - p.x, player.y - p.y) < player.radius) {
            particles.splice(i, 1);
            player.radius += 0.25;
            playSound(1000, 'sine', 0.05, 0.05);
            spawnParticle();
        }
    });

    // BOTS & GEVECHT
    const s = diffSettings[difficulty];
    bots.forEach((bot, index) => {
        bot.update(s);
        bot.draw();
        
        // Bots eten elkaar
        bots.forEach((ob, oi) => {
            if(index !== oi && Math.hypot(bot.x - ob.x, bot.y - ob.y) < bot.radius && bot.radius > ob.radius * 1.1) {
                bot.radius += ob.radius * 0.5;
                createExplosion(ob.x, ob.y, ob.color);
                ob.reset();
            }
        });

        // Player vs Bot
        const dist = Math.hypot(player.x - bot.x, player.y - bot.y);
        if(dist < player.radius + bot.radius - 5) {
            if(player.radius > bot.radius * 1.1) {
                // Speler eet bot
                player.radius += bot.radius * 0.4;
                createExplosion(bot.x, bot.y, bot.color);
                playSound(300, 'square', 0.15);
                bot.reset();
            } else if(bot.radius > player.radius * 1.1) {
                // Bot eet speler
                endGame(false);
            }
        }
    });

    // VFX: EXPLOSIE UPDATE
    explosions.forEach((ex, i) => {
        ex.x += ex.vx; ex.y += ex.vy;
        ex.life -= 0.02;
        ctx.globalAlpha = ex.life;
        ctx.fillStyle = ex.color;
        ctx.fillRect(ex.x, ex.y, ex.size, ex.size);
        ctx.globalAlpha = 1.0;
        if(ex.life <= 0) explosions.splice(i, 1);
    });

    // PLAYER TEKENEN
    ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, Math.PI*2);
    ctx.fillStyle = selectedColor; ctx.shadowBlur = 25; ctx.shadowColor = selectedColor;
    ctx.fill(); ctx.shadowBlur = 0;

    // HUD
    ctx.fillStyle = "white"; ctx.font = "bold 16px Montserrat";
    ctx.fillText(`MASS: ${Math.round(player.radius)}`, 30, 50);
    if(selectedMode === 'rush') ctx.fillText(`TIME: ${timeLeft}s`, 30, 80);

    requestAnimationFrame(gameLoop);
}

// ELEMENTEN VOOR SKINS & DIFFICULTY (Uit index.html logica)
document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.dataset.diff;
    };
});

document.querySelectorAll('.skin').forEach(s => {
    s.onclick = () => {
        document.querySelectorAll('.skin').forEach(sk => sk.classList.remove('active'));
        s.classList.add('active');
        selectedColor = s.dataset.color;
        document.getElementById('current-skin-preview').style.backgroundColor = selectedColor;
    };
});

document.querySelectorAll('.card').forEach(card => {
    card.onclick = () => {
        document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedMode = card.dataset.mode;
    };
});
