/**
 * APEX.IO - Core Game Script
 * Versie: 1.2 (F11 & Splash Fix)
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- GAME STATE ---
let isPlaying = false;
let selectedColor = '#00fff2';
let selectedMode = 'classic';
let difficulty = 'easy';
let timeLeft = 120;
let gameInterval;
let bots = [];
let particles = [];
let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

// Player Config
let player = { 
    x: window.innerWidth / 2, 
    y: window.innerHeight / 2, 
    radius: 20, 
    mass: 20,
    speed: 3
};

// Configuratie per moeilijkheid
const diffSettings = {
    easy: { botCount: 6, botSpeed: 1.2, aggression: 0.1 },
    medium: { botCount: 10, botSpeed: 2.2, aggression: 0.3 },
    hard: { botCount: 15, botSpeed: 3.2, aggression: 0.6 },
    hardcore: { botCount: 22, botSpeed: 4.2, aggression: 0.9 }
};

const botNames = ["Alpha", "Zera_Bot", "Nova", "Apex_Predator", "Cortex", "Zenith", "Void", "Echo", "Raider", "Ghost"];
const colors = ["#00fff2", "#ff00ff", "#bcff00", "#ff9500", "#ffffff"];

// --- RESIZE ENGINE (F11 FIX) ---
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize(); // Start direct met de juiste maat

// --- UI NAVIGATIE & FLOW ---
const splash = document.getElementById('splash-screen');
const hub = document.getElementById('main-hub');
const endScreen = document.getElementById('end-screen');

// Van Splash naar Hub
document.getElementById('to-hub-btn').addEventListener('click', () => {
    splash.classList.add('hidden');
    hub.classList.remove('hidden');
});

// Tab Systeem in Hub
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-view').forEach(v => v.classList.add('hidden'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.remove('hidden');
    });
});

// Mode & Difficulty Selection
document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedMode = card.dataset.mode;
    });
});

document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.dataset.diff;
    });
});

// Skin Selection
document.querySelectorAll('.skin').forEach(s => {
    s.addEventListener('click', () => {
        document.querySelectorAll('.skin').forEach(sk => sk.classList.remove('active'));
        s.classList.add('active');
        selectedColor = s.dataset.color;
        document.getElementById('current-skin-preview').style.backgroundColor = selectedColor;
        document.getElementById('current-skin-preview').style.boxShadow = `0 0 15px ${selectedColor}`;
    });
});

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
        this.radius = 12 + Math.random() * 25;
        this.angle = Math.random() * Math.PI * 2;
    }

    update(settings) {
        const d = Math.hypot(player.x - this.x, player.y - this.y);
        
        // Bot AI: Jagen of Vluchten
        if (d < 350 && settings.aggression > Math.random()) {
            const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
            this.angle = (this.radius > player.radius) ? angleToPlayer : angleToPlayer + Math.PI;
        } else {
            this.angle += (Math.random() - 0.5) * 0.1;
        }

        this.x += Math.cos(this.angle) * settings.botSpeed;
        this.y += Math.sin(this.angle) * settings.botSpeed;
        
        // Canvas Boundaries (Bots blijven binnen beeld)
        if(this.x < 0) { this.x = 0; this.angle = 0; }
        if(this.x > canvas.width) { this.x = canvas.width; this.angle = Math.PI; }
        if(this.y < 0) { this.y = 0; this.angle = Math.PI/2; }
        if(this.y > canvas.height) { this.y = canvas.height; this.angle = -Math.PI/2; }
    }

    draw() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.closePath();
        
        // Bot Naam
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.font = "bold 10px Montserrat";
        ctx.textAlign = "center";
        ctx.fillText(this.name, this.x, this.y - this.radius - 8);
        ctx.restore();
    }
}

// --- GAME CORE FUNCTIES ---
function spawnParticle() {
    particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        color: colors[Math.floor(Math.random() * colors.length)],
        radius: 2 + Math.random() * 2
    });
}

function initGame() {
    resize();
    player = { x: canvas.width/2, y: canvas.height/2, radius: 22, mass: 22 };
    bots = [];
    particles = [];
    
    const s = diffSettings[difficulty];
    for(let i=0; i < s.botCount; i++) bots.push(new Bot());
    for(let i=0; i < 120; i++) spawnParticle();
    
    if(selectedMode === 'rush') {
        timeLeft = 120;
        clearInterval(gameInterval);
        gameInterval = setInterval(() => {
            timeLeft--;
            if(timeLeft <= 0) endGame(true);
        }, 1000);
    }
}

function endGame(win) {
    isPlaying = false;
    clearInterval(gameInterval);
    endScreen.classList.remove('hidden');
    const title = document.getElementById('end-title');
    title.innerText = win ? "VICTORY" : "GAME OVER";
    title.className = win ? "win-theme" : "lose-theme";
    document.getElementById('final-mass').innerText = Math.round(player.radius);
}

// Event Listeners
document.getElementById('start-match-btn').addEventListener('click', () => {
    hub.classList.add('hidden');
    initGame();
    isPlaying = true;
    requestAnimationFrame(gameLoop);
});

document.getElementById('restart-btn').addEventListener('click', () => {
    endScreen.classList.add('hidden');
    hub.classList.remove('hidden');
});

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

// --- HOOFD LOOP ---
function gameLoop() {
    if(!isPlaying) return;

    // Achtergrond & Subtiel Grid
    ctx.fillStyle = "#050608";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = "rgba(255,255,255,0.02)";
    ctx.lineWidth = 1;
    for(let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for(let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Player Movement (Smooth)
    const dx = mouse.x - player.x;
    const dy = mouse.y - player.y;
    const angle = Math.atan2(dy, dx);
    const dist = Math.hypot(dx, dy);

    if(dist > 5) {
        // Speler wordt iets trager als hij groter is
        const speed = Math.max(1.5, 4 - (player.radius / 100));
        player.x += Math.cos(angle) * speed;
        player.y += Math.sin(angle) * speed;
    }

    // Particles Render & Collision
    particles.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.5;
        ctx.fill();
        ctx.globalAlpha = 1;

        if(Math.hypot(player.x - p.x, player.y - p.y) < player.radius) {
            particles.splice(i, 1);
            player.radius += 0.25;
            spawnParticle();
        }
    });

    // Bots Render & Collision
    const s = diffSettings[difficulty];
    bots.forEach(bot => {
        bot.update(s);
        bot.draw();
        
        const d = Math.hypot(player.x - bot.x, player.y - bot.y);
        if(d < player.radius + bot.radius) {
            // Check wie groter is (met 10% marge voor balans)
            if(player.radius > bot.radius * 1.1) {
                player.radius += bot.radius * 0.4;
                bot.reset();
            } else if(bot.radius > player.radius * 1.1) {
                endGame(false);
            }
        }
    });

    // Player Draw
    ctx.save();
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI*2);
    ctx.fillStyle = selectedColor;
    ctx.shadowBlur = 25;
    ctx.shadowColor = selectedColor;
    ctx.fill();
    ctx.closePath();
    ctx.restore();

    // In-Game HUD
    ctx.fillStyle = "white";
    ctx.font = "bold 16px Montserrat";
    ctx.textAlign = "left";
    ctx.fillText(`MASS: ${Math.round(player.radius)}`, 30, 50);
    
    if(selectedMode === 'rush') {
        ctx.fillStyle = timeLeft < 20 ? "#ff0055" : "#00fff2";
        ctx.fillText(`TIME: ${timeLeft}s`, 30, 80);
    }

    requestAnimationFrame(gameLoop);
}
