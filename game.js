const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const miniCanvas = document.getElementById('minimap');
const miniCtx = miniCanvas ? miniCanvas.getContext('2d') : null;

let audioCtx = null, isPlaying = false, currentUser = null;
let selectedColor = '#00fff2', difficulty = 'easy', selectedMode = 'classic';
let player = { x: 0, y: 0, radius: 25 }, bots = [], particles = [], mouse = { x: 0, y: 0 }, timeLeft = 120, gameInterval;

// --- UI ENGINE ---
window.ui = {
    goToLogin: () => {
        document.getElementById('splash-screen').classList.add('hidden');
        document.getElementById('login-screen').classList.remove('hidden');
    },
    auth: (type) => {
        const u = document.getElementById('username').value.trim();
        const p = document.getElementById('password').value.trim();
        const msg = document.getElementById('auth-msg');
        if(u.length < 3) return msg.innerText = "Access Denied: Name too short";
        
        const key = `apex_v2_${u}`;
        const stored = localStorage.getItem(key);
        if(type === 'register') {
            if(stored) return msg.innerText = "Pilot already registered";
            localStorage.setItem(key, JSON.stringify({p, coins: 0}));
            msg.innerText = "Pilot Registered. Proceed to Login.";
        } else {
            if(!stored) return msg.innerText = "Pilot not found";
            const data = JSON.parse(stored);
            if(data.p !== p) return msg.innerText = "Invalid Credentials";
            currentUser = u;
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('main-hub').classList.remove('hidden');
            document.getElementById('hub-coin-count').innerText = data.coins;
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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
        document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
    },
    setDiff: (d, btn) => {
        difficulty = d;
        document.querySelectorAll('.diff-pill').forEach(b => b.classList.remove('active'));
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

// --- CORE GAME ---
function initGame() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    if(miniCanvas) { miniCanvas.width = 150; miniCanvas.height = 150; }
    player = { x: canvas.width/2, y: canvas.height/2, radius: 25 };
    bots = []; particles = [];
    for(let i=0; i<(difficulty==='easy'?12:22); i++) spawnBot();
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
    const names = ["Viper", "Ghost", "Titan", "Rogue", "Hunter"];
    bots.push({
        n: names[Math.floor(Math.random()*names.length)] + "_" + Math.floor(Math.random()*99),
        x: Math.random()*canvas.width, y: Math.random()*canvas.height,
        r: 15 + Math.random()*20, a: Math.random()*Math.PI*2,
        c: `hsl(${Math.random()*360}, 60%, 50%)`
    });
}

function spawnParticle() {
    particles.push({x: Math.random()*canvas.width, y: Math.random()*canvas.height, c: '#fff'});
}

function loop() {
    if(!isPlaying) return;
    ctx.fillStyle = '#05060a'; ctx.fillRect(0,0,canvas.width, canvas.height);

    // Particles
    particles.forEach((p, i) => {
        ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, 7); ctx.fillStyle = p.c; ctx.fill();
        if(Math.hypot(player.x-p.x, player.y-p.y) < player.radius) {
            particles.splice(i,1); player.radius += 0.2; spawnParticle();
        }
    });

    // Bots Logica & Boundary Fix
    bots.forEach((b, bi) => {
        const dist = Math.hypot(player.x-b.x, player.y-b.y);
        const speed = (difficulty === 'easy' ? 1.6 : 2.8);
        
        // AI: Vluchten of jagen
        if(dist < 350) {
            const angleToPlayer = Math.atan2(player.y-b.y, player.x-b.x);
            b.a = (b.r > player.radius * 1.05) ? angleToPlayer : angleToPlayer + Math.PI;
        } else {
            b.a += (Math.random()-0.5) * 0.05;
        }

        b.x += Math.cos(b.a) * speed;
        b.y += Math.sin(b.a) * speed;

        // --- DE FIX: BOTS BLIJVEN IN HET SCHERM ---
        if(b.x < b.r) { b.x = b.r; b.a = Math.PI - b.a; }
        if(b.x > canvas.width - b.r) { b.x = canvas.width - b.r; b.a = Math.PI - b.a; }
        if(b.y < b.r) { b.y = b.r; b.a = -b.a; }
        if(b.y > canvas.height - b.r) { b.y = canvas.height - b.r; b.a = -b.a; }

        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fillStyle = b.c;
        if(b.r > player.radius * 1.05) { ctx.strokeStyle = '#ff0055'; ctx.lineWidth = 3; ctx.stroke(); }
        ctx.fill();

        // Massa in het midden
        ctx.fillStyle = "white"; ctx.font = `bold ${b.r*0.5}px Arial`; ctx.textAlign = "center";
        ctx.fillText(Math.round(b.r), b.x, b.y + (b.r*0.15));

        if(dist < player.radius + b.r) {
            if(player.radius > b.r * 1.05) { player.radius += b.r*0.3; bots.splice(bi,1); spawnBot(); }
            else if(b.r > player.radius * 1.05) endGame(false);
        }
    });

    // Player
    const pAngle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    player.x += Math.cos(pAngle)*3.8; player.y += Math.sin(pAngle)*3.8;
    ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, 7); ctx.fillStyle = selectedColor; ctx.fill();
    ctx.fillStyle = "black"; ctx.font = `bold ${player.radius*0.5}px Arial`; ctx.textAlign = "center";
    ctx.fillText(Math.round(player.radius), player.x, player.y + (player.radius*0.15));

    updateHUD();
    requestAnimationFrame(loop);
}

function updateHUD() {
    let list = bots.map(b => ({n: b.n, r: b.r, p: false}));
    list.push({n: "YOU", r: player.radius, p: true});
    list.sort((a,b) => b.r - a.r);
    document.getElementById('leaderboard-list').innerHTML = list.slice(0,5).map((p,i) => `
        <div class="leader-item ${p.p?'player':''}"><span>${p.n}</span> <span>${Math.round(p.r)}</span></div>
    `).join('');
}

function endGame(win) {
    isPlaying = false; clearInterval(gameInterval);
    document.getElementById('end-screen').classList.remove('hidden');
    document.getElementById('final-mass').innerText = Math.round(player.radius);
    if(currentUser) {
        const key = `apex_v2_${currentUser}`;
        const data = JSON.parse(localStorage.getItem(key));
        data.coins += Math.floor(player.radius/8);
        localStorage.setItem(key, JSON.stringify(data));
    }
}

window.onmousemove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
window.onresize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
