const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const splash = document.getElementById('splash-screen');
const hub = document.getElementById('main-hub');
const endScreen = document.getElementById('end-screen');

let isPlaying = false;
let selectedColor = '#00fff2';
let selectedMode = 'classic';
let difficulty = 'easy';
let timeLeft = 120;
let gameInterval;
let bots = [];
let particles = [];
let mouse = { x: 0, y: 0 };
let player = { x: 0, y: 0, radius: 22 };

const diffSettings = {
    easy: { botCount: 6, botSpeed: 1.2, aggression: 0.1 },
    medium: { botCount: 10, botSpeed: 2.2, aggression: 0.3 },
    hard: { botCount: 16, botSpeed: 3.2, aggression: 0.6 },
    hardcore: { botCount: 22, botSpeed: 4.5, aggression: 0.9 }
};

const botNames = ["Alpha", "Zera_Bot", "Nova", "Predator", "Cortex", "Zenith", "Void", "Echo"];
const colors = ["#00fff2", "#ff00ff", "#bcff00", "#ff9500", "#ffffff"];

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// UI LOGICA
document.getElementById('to-hub-btn').onclick = () => {
    splash.classList.add('hidden');
    hub.classList.remove('hidden');
};

document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-view').forEach(v => v.classList.add('hidden'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.remove('hidden');
    };
});

document.querySelectorAll('.card').forEach(card => {
    card.onclick = () => {
        document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedMode = card.dataset.mode;
    };
});

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

class Bot {
    constructor() {
        this.reset();
        this.name = botNames[Math.floor(Math.random() * botNames.length)];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }
    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.radius = 12 + Math.random() * 20;
        this.angle = Math.random() * Math.PI * 2;
    }
    update(settings) {
        const d = Math.hypot(player.x - this.x, player.y - this.y);
        if (d < 400 && settings.aggression > Math.random()) {
            const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
            this.angle = (this.radius > player.radius * 1.1) ? angleToPlayer : angleToPlayer + Math.PI;
        } else {
            this.angle += (Math.random() - 0.5) * 0.15;
        }
        
        const speed = Math.max(1.0, settings.botSpeed - (this.radius / 100));
        this.x += Math.cos(this.angle) * speed;
        this.y += Math.sin(this.angle) * speed;

        if(this.x < 0 || this.x > canvas.width) this.angle = Math.PI - this.angle;
        if(this.y < 0 || this.y > canvas.height) this.angle = -this.angle;

        // BOTS ETEN DEELTJES
        particles.forEach((p, i) => {
            if(Math.hypot(this.x - p.x, this.y - p.y) < this.radius) {
                particles.splice(i, 1); this.radius += 0.2; spawnParticle();
            }
        });
    }
    draw() {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color; ctx.shadowBlur = 10; ctx.shadowColor = this.color;
        ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = "white"; ctx.font = "bold 10px Montserrat"; ctx.textAlign = "center";
        ctx.fillText(this.name, this.x, this.y - this.radius - 8);
    }
}

function initGame() {
    resize();
    player = { x: canvas.width / 2, y: canvas.height / 2, radius: 22 };
    bots = []; particles = [];
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
    particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, color: colors[Math.floor(Math.random() * colors.length)], radius: 2.5 });
}

function endGame(win) {
    isPlaying = false; clearInterval(gameInterval);
    endScreen.classList.remove('hidden');
    document.getElementById('end-title').innerText = win ? "VICTORY" : "GAME OVER";
    document.getElementById('end-title').className = win ? "win-theme" : "lose-theme";
    document.getElementById('final-mass').innerText = Math.round(player.radius);
}

document.getElementById('start-match-btn').onclick = () => { hub.classList.add('hidden'); initGame(); isPlaying = true; gameLoop(); };
document.getElementById('restart-btn').onclick = () => { endScreen.classList.add('hidden'); hub.classList.remove('hidden'); };
window.onmousemove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };

function gameLoop() {
    if(!isPlaying) return;
    ctx.fillStyle = "#050608"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // GRID
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    for(let x=0; x<canvas.width; x+=60) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
    for(let y=0; y<canvas.height; y+=60) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }

    // PLAYER
    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    const speed = Math.max(1.2, 3.5 - (player.radius / 80));
    if(Math.hypot(mouse.x - player.x, mouse.y - player.y) > 5) {
        player.x += Math.cos(angle) * speed; player.y += Math.sin(angle) * speed;
    }

    particles.forEach((p, i) => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fillStyle = p.color; ctx.fill();
        if(Math.hypot(player.x - p.x, player.y - p.y) < player.radius) { particles.splice(i, 1); player.radius += 0.25; spawnParticle(); }
    });

    const s = diffSettings[difficulty];
    bots.forEach((bot, index) => {
        bot.update(s); bot.draw();
        
        // BOTS ETEN ELKAAR
        bots.forEach((ob, oi) => {
            if(index !== oi && Math.hypot(bot.x - ob.x, bot.y - ob.y) < bot.radius && bot.radius > ob.radius * 1.1) {
                bot.radius += ob.radius * 0.4; ob.reset();
            }
        });

        const d = Math.hypot(player.x - bot.x, player.y - bot.y);
        if(d < player.radius + bot.radius) {
            if(player.radius > bot.radius * 1.1) { player.radius += bot.radius * 0.35; bot.reset(); }
            else if(bot.radius > player.radius * 1.1) { endGame(false); }
        }
    });

    ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, Math.PI*2);
    ctx.fillStyle = selectedColor; ctx.shadowBlur = 25; ctx.shadowColor = selectedColor;
    ctx.fill(); ctx.shadowBlur = 0;

    ctx.fillStyle = "white"; ctx.font = "bold 16px Montserrat";
    ctx.fillText(`MASS: ${Math.round(player.radius)}`, 30, 50);
    if(selectedMode === 'rush') ctx.fillText(`TIME: ${timeLeft}s`, 30, 80);

    requestAnimationFrame(gameLoop);
}
