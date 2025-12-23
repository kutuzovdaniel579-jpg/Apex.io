const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let isPlaying = false;
let selectedColor = '#00fff2';
let selectedMode = 'classic';
let difficulty = 'easy';
let timeLeft = 120;
let gameInterval;
let bots = [];
let particles = [];
let player = { x: 0, y: 0, radius: 25, mass: 25 };
let mouse = { x: 0, y: 0 };

const diffSettings = {
    easy: { botCount: 5, botSpeed: 1.5, aggression: 0.1 },
    medium: { botCount: 8, botSpeed: 2.5, aggression: 0.3 },
    hard: { botCount: 12, botSpeed: 3.5, aggression: 0.6 },
    hardcore: { botCount: 18, botSpeed: 4.5, aggression: 0.9 }
};

const botNames = ["Alpha", "Zera_Bot", "Nova", "Apex_Predator", "Cortex", "Zenith", "Void", "Echo"];

// --- UI NAVIGATIE ---
document.getElementById('to-hub-btn').addEventListener('click', () => {
    document.getElementById('splash-screen').classList.add('hidden');
    document.getElementById('main-hub').classList.remove('hidden');
});

// Tab Switching
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-view').forEach(v => v.classList.add('hidden'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.remove('hidden');
    });
});

// Mode Selection
document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedMode = card.dataset.mode;
    });
});

// Difficulty Selection
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
    });
});

// --- GAME LOGICA ---
class Bot {
    constructor() {
        this.reset();
        this.name = botNames[Math.floor(Math.random() * botNames.length)];
        this.color = ["#ff00ff", "#bcff00", "#ff9500", "#ffffff"][Math.floor(Math.random()*4)];
    }
    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.radius = 15 + Math.random() * 30;
        this.angle = Math.random() * Math.PI * 2;
    }
    update(settings) {
        const d = Math.hypot(player.x - this.x, player.y - this.y);
        if (d < 400 && settings.aggression > Math.random()) {
            const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
            this.angle = (this.radius > player.radius) ? angleToPlayer : angleToPlayer + Math.PI;
        } else {
            this.angle += (Math.random() - 0.5) * 0.1;
        }
        this.x += Math.cos(this.angle) * settings.botSpeed;
        this.y += Math.sin(this.angle) * settings.botSpeed;
        
        // Boundaries
        if(this.x < 0 || this.x > canvas.width) this.angle = Math.PI - this.angle;
        if(this.y < 0 || this.y > canvas.height) this.angle = -this.angle;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10; ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "white";
        ctx.font = "10px Montserrat";
        ctx.fillText(this.name, this.x - 15, this.y - this.radius - 5);
    }
}

function initGame() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    player = { x: canvas.width/2, y: canvas.height/2, radius: 20, mass: 20 };
    bots = [];
    particles = [];
    const s = diffSettings[difficulty];
    for(let i=0; i<s.botCount; i++) bots.push(new Bot());
    for(let i=0; i<100; i++) spawnParticle();
    
    if(selectedMode === 'rush') {
        timeLeft = 120;
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
        color: selectedColor,
        radius: 3
    });
}

function endGame(win) {
    isPlaying = false;
    clearInterval(gameInterval);
    document.getElementById('end-screen').classList.remove('hidden');
    const title = document.getElementById('end-title');
    title.innerText = win ? "VICTORY" : "GAME OVER";
    title.className = win ? "win-theme" : "lose-theme";
    document.getElementById('final-mass').innerText = Math.round(player.mass);
}

document.getElementById('start-match-btn').addEventListener('click', () => {
    document.getElementById('main-hub').classList.add('hidden');
    initGame();
    isPlaying = true;
    requestAnimationFrame(gameLoop);
});

document.getElementById('restart-btn').addEventListener('click', () => {
    document.getElementById('end-screen').classList.add('hidden');
    document.getElementById('main-hub').classList.remove('hidden');
});

window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });

function gameLoop() {
    if(!isPlaying) return;
    ctx.fillStyle = "#050608";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update Player
    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    player.x += Math.cos(angle) * 3;
    player.y += Math.sin(angle) * 3;

    // Particles
    particles.forEach((p, i) => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
        ctx.fillStyle = p.color; ctx.fill();
        if(Math.hypot(player.x - p.x, player.y - p.y) < player.radius) {
            particles.splice(i, 1); player.radius += 0.2; player.mass += 1; spawnParticle();
        }
    });

    // Bots
    const s = diffSettings[difficulty];
    bots.forEach(bot => {
        bot.update(s);
        bot.draw();
        const d = Math.hypot(player.x - bot.x, player.y - bot.y);
        if(d < player.radius + bot.radius) {
            if(player.radius > bot.radius * 1.1) {
                player.radius += bot.radius * 0.3; player.mass += bot.radius; bot.reset();
            } else if(bot.radius > player.radius * 1.1) {
                endGame(false);
            }
        }
    });

    // Draw Player
    ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, Math.PI*2);
    ctx.fillStyle = selectedColor; ctx.shadowBlur = 20; ctx.shadowColor = selectedColor;
    ctx.fill(); ctx.shadowBlur = 0;

    // HUD
    ctx.fillStyle = "white"; ctx.font = "20px Montserrat";
    ctx.fillText(`MASS: ${Math.round(player.mass)}`, 20, 40);
    if(selectedMode === 'rush') ctx.fillText(`TIME: ${timeLeft}s`, 20, 70);

    requestAnimationFrame(gameLoop);
}
