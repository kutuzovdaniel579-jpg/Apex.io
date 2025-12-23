const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let audioCtx = null;

// Audio
const playSound = (f, t, d, v = 0.05) => {
    if(!audioCtx) return;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = t; o.frequency.setValueAtTime(f, audioCtx.currentTime);
    g.gain.setValueAtTime(v, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + d);
};

// State
let isPlaying = false, selectedColor = '#00fff2', difficulty = 'easy', selectedMode = 'classic';
let player = { x: 0, y: 0, radius: 25 }, bots = [], particles = [], explosions = [];
let mouse = { x: 0, y: 0 }, timeLeft = 120, gameInterval;

const ui = {
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
    player = { x: canvas.width/2, y: canvas.height/2, radius: 25 };
    bots = []; particles = []; explosions = [];
    const botCount = (difficulty === 'easy') ? 10 : 20;
    for(let i=0; i<botCount; i++) spawnBot();
    for(let i=0; i<150; i++) spawnParticle();

    if(selectedMode === 'rush') {
        timeLeft = 120;
        document.getElementById('rush-timer').classList.remove('hidden');
        gameInterval = setInterval(() => {
            timeLeft--;
            document.getElementById('rush-timer').innerText = timeLeft;
            if(timeLeft <= 0) endGame(true);
        }, 1000);
    }
}

function spawnBot() {
    bots.push({
        x: Math.random()*canvas.width, y: Math.random()*canvas.height,
        radius: 12 + Math.random()*20, color: '#ff0055', angle: Math.random()*Math.PI*2,
        state: 'wander' 
    });
}

function spawnParticle() {
    particles.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, color: '#fff' });
}

function loop() {
    if(!isPlaying) return;
    ctx.fillStyle = '#0a0b10'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Particles
    particles.forEach((p, i) => {
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, 7); ctx.fillStyle = p.color; ctx.fill();
        if(Math.hypot(player.x-p.x, player.y-p.y) < player.radius) {
            particles.splice(i, 1); player.radius += 0.25;
            playSound(1200, 'sine', 0.05, 0.02); spawnParticle();
        }
    });

    // Bots AI & Movement
    bots.forEach((b, bi) => {
        const dist = Math.hypot(player.x-b.x, player.y-b.y);
        const canEatPlayer = b.radius > player.radius * 1.05;

        // Upgrade AI: Agressief achtervolgen of vluchten
        if(dist < 400) {
            const angleToPlayer = Math.atan2(player.y - b.y, player.x - b.x);
            b.angle = canEatPlayer ? angleToPlayer : angleToPlayer + Math.PI;
        } else {
            b.angle += (Math.random()-0.5) * 0.1;
        }

        const speed = (difficulty === 'easy' ? 1.5 : 2.5) * (30/b.radius);
        b.x += Math.cos(b.angle) * speed;
        b.y += Math.sin(b.angle) * speed;

        // Randen
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

        // Bot Massa Getal
        ctx.fillStyle = "white"; ctx.font = `bold ${Math.max(10, b.radius*0.6)}px Arial`; ctx.textAlign = "center";
        ctx.fillText(Math.round(b.radius), b.x, b.y + (b.radius*0.2));

        // Collision Check (Strakker)
        if(dist < player.radius + b.radius) {
            if(player.radius > b.radius * 1.05) {
                player.radius += b.radius * 0.3;
                for(let i=0; i<15; i++) explosions.push({x:b.x, y:b.y, vx:(Math.random()-0.5)*12, vy:(Math.random()-0.5)*12, life:1, color:b.color});
                playSound(300, 'square', 0.2);
                bots.splice(bi, 1); spawnBot();
            } else if(b.radius > player.radius * 1.05) {
                endGame(false);
            }
        }
    });

    // VFX Explosies
    explosions.forEach((ex, i) => {
        ex.x += ex.vx; ex.y += ex.vy; ex.life -= 0.03;
        ctx.globalAlpha = ex.life; ctx.fillStyle = ex.color;
        ctx.fillRect(ex.x, ex.y, 4, 4);
        if(ex.life <= 0) explosions.splice(i, 1);
    });
    ctx.globalAlpha = 1;

    // Player
    const pAngle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    const pDist = Math.hypot(mouse.x - player.x, mouse.y - player.y);
    if(pDist > 5) {
        player.x += Math.cos(pAngle) * 3.5;
        player.y += Math.sin(pAngle) * 3.5;
    }

    ctx.save();
    ctx.shadowBlur = 20; ctx.shadowColor = selectedColor;
    ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, 7); ctx.fillStyle = selectedColor; ctx.fill();
    ctx.restore();

    ctx.fillStyle = "black"; ctx.font = `bold ${Math.max(12, player.radius*0.6)}px Arial`; ctx.textAlign = "center";
    ctx.fillText(Math.round(player.radius), player.x, player.y + (player.radius*0.2));

    requestAnimationFrame(loop);
}

function endGame(win) {
    isPlaying = false;
    clearInterval(gameInterval);
    document.getElementById('end-screen').classList.remove('hidden');
    document.getElementById('rush-timer').classList.add('hidden');
    document.getElementById('final-mass').innerText = Math.round(player.radius);
    document.getElementById('status-text').innerText = win ? "VICTORY" : "GAME OVER";
}

window.onmousemove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
