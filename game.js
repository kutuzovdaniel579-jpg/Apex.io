/**
 * APEX.IO - PRO VERSION
 * FIX: SFX & VFX PC-compatibiliteit + Rode Randen Fix
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- AUDIO ENGINE FIX ---
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
    } catch (e) { console.error("Audio error", e); }
}

// Game State
let isPlaying = false;
let selectedColor = '#00fff2';
let difficulty = 'easy';
let bots = [];
let particles = [];
let explosions = []; 
let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let player = { x: 0, y: 0, radius: 22 };

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

// UI EVENTS
document.getElementById('to-hub-btn').onclick = () => {
    playSound(440, 'sine', 0.1); // Forceert audio activatie
    document.getElementById('splash-screen').classList.add('hidden');
    document.getElementById('main-hub').classList.remove('hidden');
};

document.getElementById('start-match-btn').onclick = () => {
    playSound(660, 'sine', 0.2);
    document.getElementById('main-hub').classList.add('hidden');
    initGame();
    isPlaying = true;
    requestAnimationFrame(gameLoop);
};

// --- VFX: EXPLOSIES ---
function createExplosion(x, y, color) {
    for(let i=0; i<25; i++) {
        explosions.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            life: 1.0,
            color: color,
            size: Math.random() * 6 + 2
        });
    }
}

class Bot {
    constructor() {
        this.reset();
        this.name = "BOT_" + Math.floor(Math.random() * 99);
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

        const speed = Math.max(0.7, s.botSpeed - (this.radius / 150));
        this.x += Math.cos(this.angle) * speed;
        this.y += Math.sin(this.angle) * speed;

        if(this.x < 0 || this.x > canvas.width) this.angle = Math.PI - this.angle;
        if(this.y < 0 || this.y > canvas.height) this.angle = -this.angle;

        // BOT GROWTH LOGIC
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
        
        // --- FIX: PC RODE RANDEN ---
        // We tekenen eerst een grotere rode cirkel eronder voor 100% zichtbaarheid
        if (this.radius > player.radius * 1.1) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
            ctx.fillStyle = '#ff0000';
            ctx.fill();
            // Gloei effect
            ctx.shadowColor = 'red';
            ctx.shadowBlur = 15;
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
        
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.font = "bold 12px Arial";
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
        radius: 3 
    });
}

function endGame(win) {
    isPlaying = false;
    if(!win) playSound(80, 'sawtooth', 0.5, 0.3);
    document.getElementById('end-screen').classList.remove('hidden');
    document.getElementById('final-mass').innerText = Math.round(player.radius);
}

window.onmousemove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };

function gameLoop() {
    if(!isPlaying) return;
    
    // Clear screen
    ctx.fillStyle = "#050608";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Particles
    particles.forEach((p, i) => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fillStyle = p.color; ctx.fill();
        if(Math.hypot(player.x - p.x, player.y - p.y) < player.radius) {
            particles.splice(i, 1);
            player.radius += 0.3;
            playSound(1000, 'sine', 0.05, 0.05); // EET GELUID
            spawnParticle();
        }
    });

    // Bots
    const s = diffSettings[difficulty];
    bots.forEach((bot) => {
        bot.update(s);
        bot.draw();
        
        if(Math.hypot(player.x - bot.x, player.y - bot.y) < player.radius + bot.radius - 5) {
            if(player.radius > bot.radius * 1.1) {
                player.radius += bot.radius * 0.5;
                createExplosion(bot.x, bot.y, bot.color); // EXPLOSIE VFX
                playSound(200, 'square', 0.2, 0.2); // KILL GELUID
                bot.reset();
            } else if(bot.radius > player.radius * 1.1) {
                endGame(false);
            }
        }
    });

    // Explosies renderen
    explosions.forEach((ex, i) => {
        ex.x += ex.vx; ex.y += ex.vy;
        ex.life -= 0.02;
        ctx.globalAlpha = ex.life;
        ctx.fillStyle = ex.color;
        ctx.fillRect(ex.x, ex.y, ex.size, ex.size);
        ctx.globalAlpha = 1.0;
        if(ex.life <= 0) explosions.splice(i, 1);
    });

    // Player
    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    const pSpeed = Math.max(1.5, 4.2 - (player.radius / 100));
    player.x += Math.cos(angle) * pSpeed;
    player.y += Math.sin(angle) * pSpeed;

    ctx.save();
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = selectedColor;
    ctx.shadowColor = selectedColor;
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.restore();

    requestAnimationFrame(gameLoop);
}

// Koppelen van UI knoppen die in de HTML staan
document.querySelectorAll('.diff-btn').forEach(b => b.onclick = () => {
    difficulty = b.dataset.diff;
    document.querySelectorAll('.diff-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
});

document.querySelectorAll('.skin').forEach(s => {
    s.onclick = () => {
        selectedColor = s.dataset.color;
        document.getElementById('current-skin-preview').style.backgroundColor = selectedColor;
    };
});
