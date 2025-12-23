const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const miniCanvas = document.getElementById('minimap');
const miniCtx = miniCanvas ? miniCanvas.getContext('2d') : null;

// --- STATE ---
let audioCtx = null;
let isPlaying = false;
let currentUser = null;
let selectedColor = '#00fff2';
let difficulty = 'easy';
let selectedMode = 'classic';
let player = { x: 0, y: 0, radius: 25 };
let bots = [], particles = [], explosions = [];
let mouse = { x: 0, y: 0 }, timeLeft = 120, gameInterval;

// --- UI & AUTH ---
window.ui = {
    goToLogin: () => {
        document.getElementById('splash-screen').classList.add('hidden');
        document.getElementById('login-screen').classList.remove('hidden');
    },
    auth: (type) => {
        const user = document.getElementById('username').value.trim();
        const pass = document.getElementById('password').value.trim();
        const msg = document.getElementById('auth-msg');
        if (user.length < 3) return msg.innerText = "Username too short";
        
        const stored = localStorage.getItem(`apex_u_${user}`);
        if (type === 'register') {
            if (stored) return msg.innerText = "Exists already";
            localStorage.setItem(`apex_u_${user}`, JSON.stringify({pass, coins: 0}));
            msg.innerText = "Success! Now Login.";
        } else {
            if (!stored) return msg.innerText = "Not found";
            const data = JSON.parse(stored);
            if (data.pass !== pass) return msg.innerText = "Wrong password";
            currentUser = user;
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('main-hub').classList.remove('hidden');
            document.getElementById('hub-coin-count').innerText = data.coins;
            if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },
    tab: (id, btn) => {
        document.querySelectorAll('.tab-view').forEach(t => t.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    },
    setMode: (m, btn) => {
        selectedMode = m;
        document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
    },
    setDiff: (d, btn) => {
        difficulty = d;
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    },
    setSkin: (c) => selectedColor = c,
    start: () => {
        document.getElementById('main-hub').classList.add('hidden');
        isPlaying = true;
        initGame();
        requestAnimationFrame(loop);
    }
};

// --- GAME LOGIC ---
function initGame() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    if(miniCanvas) { miniCanvas.width = 150; miniCanvas.height = 150; }
    player = { x: canvas.width/2, y: canvas.height/2, radius: 25 };
    bots = []; particles = [];
    for(let i=0; i<(difficulty==='easy'?10:20); i++) spawnBot();
    for(let i=0; i<100; i++) spawnParticle();
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
    const names = ["Cortex", "Zenith", "Blaze", "Fury", "Vortex"];
    const name = names[Math.floor(Math.random()*names.length)] + "_" + Math.floor(Math.random()*99);
    bots.push({
        name, x: Math.random()*canvas.width, y: Math.random()*canvas.height,
        radius: 15 + Math.random()*20, angle: Math.random()*Math.PI*2,
        color: `hsl(${Math.random()*360}, 70%, 50%)`
    });
}

function spawnParticle() {
    particles.push({x: Math.random()*canvas.width, y: Math.random()*canvas.height, color: '#fff'});
}

function loop() {
    if(!isPlaying) return;
    ctx.fillStyle = '#050608'; ctx.fillRect(0,0,canvas.width, canvas.height);

    // Particles
    particles.forEach((p, i) => {
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, 7); ctx.fillStyle = p.color; ctx.fill();
        if(Math.hypot(player.x-p.x, player.y-p.y) < player.radius) {
            particles.splice(i,1); player.radius += 0.25; spawnParticle();
        }
    });

    // Bots AI & Drawing
    bots.forEach((b, bi) => {
        const dist = Math.hypot(player.x-b.x, player.y-b.y);
        const speed = (difficulty === 'easy' ? 1.5 : 2.5);
        if(dist < 300) b.angle = (b.radius > player.radius * 1.05) ? Math.atan2(player.y-b.y, player.x-b.x) : Math.atan2(player.y-b.y, player.x-b.x) + Math.PI;
        b.x += Math.cos(b.angle)*speed; b.y += Math.sin(b.angle)*speed;

        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, 7); ctx.fillStyle = b.color;
        if(b.radius > player.radius * 1.05) { ctx.strokeStyle = 'red'; ctx.lineWidth = 3; ctx.stroke(); }
        ctx.fill();

        // Massa Getal in het midden
        ctx.fillStyle = "white"; ctx.font = `bold ${b.radius*0.6}px Arial`; ctx.textAlign = "center";
        ctx.fillText(Math.round(b.radius), b.x, b.y + (b.radius*0.2));

        if(dist < player.radius + b.radius) {
            if(player.radius > b.radius * 1.05) { player.radius += b.radius*0.3; bots.splice(bi,1); spawnBot(); }
            else if(b.radius > player.radius * 1.05) endGame(false);
        }
    });

    // Player Movement & Drawing
    const pAngle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    player.x += Math.cos(pAngle)*3.5; player.y += Math.sin(pAngle)*3.5;
    ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, 7); ctx.fillStyle = selectedColor; ctx.fill();
    
    // Player Massa Getal
    ctx.fillStyle = "black"; ctx.font = `bold ${player.radius*0.6}px Arial`; ctx.textAlign = "center";
    ctx.fillText(Math.round(player.radius), player.x, player.y + (player.radius*0.2));

    updateHUD();
    requestAnimationFrame(loop);
}

function updateHUD() {
    let list = bots.map(b => ({n: b.name, r: b.radius, p: false}));
    list.push({n: "YOU", r: player.radius, p: true});
    list.sort((a,b) => b.r - a.r);
    document.getElementById('leaderboard-list').innerHTML = list.slice(0,5).map((p,i) => `
        <div class="leader-item ${p.p?'player':''}">#${i+1} ${p.n} <span>${Math.round(p.r)}</span></div>
    `).join('');

    if(miniCtx) {
        miniCtx.clearRect(0,0,150,150);
        miniCtx.fillStyle = selectedColor; miniCtx.beginPath(); miniCtx.arc((player.x/canvas.width)*150, (player.y/canvas.height)*150, 3, 0, 7); miniCtx.fill();
    }
}

function endGame(win) {
    isPlaying = false; clearInterval(gameInterval);
    document.getElementById('end-screen').classList.remove('hidden');
    document.getElementById('final-mass').innerText = Math.round(player.radius);
    // Safe Save
    if(currentUser) {
        const data = JSON.parse(localStorage.getItem(`apex_u_${currentUser}`));
        data.coins += Math.floor(player.radius/10);
        localStorage.setItem(`apex_u_${currentUser}`, JSON.stringify(data));
    }
}

window.onmousemove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
