window.onload = function() {
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
        } catch (e) { console.warn("Audio uitgesteld"); }
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

    // --- KNOPPEN KOPPELEN (MET EXTRA CHECK) ---

    // 1. Enter Arena
    const enterBtn = document.getElementById('to-hub-btn');
    if(enterBtn) enterBtn.onclick = () => {
        playSound(440, 'sine', 0.1);
        document.getElementById('splash-screen').classList.add('hidden');
        document.getElementById('main-hub').classList.remove('hidden');
    };

    // 2. Start Match
    const startBtn = document.getElementById('start-match-btn');
    if(startBtn) startBtn.onclick = () => {
        playSound(660, 'sine', 0.2);
        document.getElementById('main-hub').classList.add('hidden');
        initGame();
        isPlaying = true;
        requestAnimationFrame(gameLoop);
    };

    // 3. Back to Hub
    const restartBtn = document.getElementById('restart-btn');
    if(restartBtn) restartBtn.onclick = () => {
        document.getElementById('end-screen').classList.add('hidden');
        document.getElementById('main-hub').classList.remove('hidden');
    };

    // 4. Navigatie (Skins, Rewards, Play)
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-view').forEach(v => v.classList.add('hidden'));
            btn.classList.add('active');
            const target = btn.getAttribute('data-target');
            document.getElementById(target).classList.remove('hidden');
            playSound(800, 'sine', 0.05, 0.05);
        };
    });

    // 5. Rush Mode Selectie
    document.querySelectorAll('.card').forEach(card => {
        card.onclick = () => {
            document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            selectedMode = card.getAttribute('data-mode');
            playSound(500, 'sine', 0.05, 0.05);
        };
    });

    // 6. Difficulty & Skins
    document.querySelectorAll('.diff-btn').forEach(b => {
        b.onclick = () => {
            difficulty = b.getAttribute('data-diff');
            document.querySelectorAll('.diff-btn').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
        };
    });

    document.querySelectorAll('.skin').forEach(s => {
        s.onclick = () => {
            document.querySelectorAll('.skin').forEach(sk => sk.classList.remove('active'));
            s.classList.add('active');
            selectedColor = s.getAttribute('data-color');
            document.getElementById('current-skin-preview').style.backgroundColor = selectedColor;
        };
    });

    // --- GAME LOGIC ---

    class Bot {
        constructor() { this.reset(); this.color = colors[Math.floor(Math.random() * colors.length)]; }
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
            } else { this.angle += (Math.random() - 0.5) * 0.1; }
            
            const speed = Math.max(0.8, s.botSpeed - (this.radius / 150));
            this.x += Math.cos(this.angle) * speed;
            this.y += Math.sin(this.angle) * speed;

            particles.forEach((p, i) => {
                if(Math.hypot(this.x - p.x, this.y - p.y) < this.radius) {
                    particles.splice(i, 1); this.radius += 0.4 * s.growth; spawnParticle();
                }
            });
        }
        draw() {
            ctx.save();
            if (this.radius > player.radius * 1.1) {
                ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
                ctx.fillStyle = '#ff0000'; ctx.fill();
            }
            ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color; ctx.fill();
            ctx.restore();
            
            // Getal in het midden
            ctx.fillStyle = "white";
            ctx.font = `bold ${Math.max(10, this.radius * 0.6)}px Arial`;
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
            gameInterval = setInterval(() => { timeLeft--; if(timeLeft <= 0) endGame(true); }, 1000);
        }
    }

    function spawnParticle() {
        particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, color: colors[Math.floor(Math.random() * colors.length)], radius: 3 });
    }

    function endGame(win) {
        isPlaying = false;
        clearInterval(gameInterval);
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
                particles.splice(i, 1); player.radius += 0.3; 
                playSound(1000, 'sine', 0.05, 0.05); spawnParticle();
            }
        });

        const s = diffSettings[difficulty];
        bots.forEach((bot) => {
            bot.update(s); bot.draw();
            if(Math.hypot(player.x - bot.x, player.y - bot.y) < player.radius + bot.radius - 5) {
                if(player.radius > bot.radius * 1.1) {
                    player.radius += bot.radius * 0.5;
                    for(let i=0; i<15; i++) explosions.push({x:bot.x, y:bot.y, vx:(Math.random()-0.5)*10, vy:(Math.random()-0.5)*10, life:1.0, color:bot.color});
                    bot.reset();
                } else if(bot.radius > player.radius * 1.1) { endGame(false); }
            }
        });

        explosions.forEach((ex, i) => {
            ex.x += ex.vx; ex.y += ex.vy; ex.life -= 0.02;
            ctx.globalAlpha = ex.life; ctx.fillStyle = ex.color;
            ctx.fillRect(ex.x, ex.y, 4, 4);
            if(ex.life <= 0) explosions.splice(i, 1);
        });
        ctx.globalAlpha = 1.0;

        const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
        player.x += Math.cos(angle) * Math.max(1.5, 4 - (player.radius / 100));

        ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        ctx.fillStyle = selectedColor; ctx.fill();
        
        ctx.fillStyle = "black";
        ctx.font = `bold ${player.radius * 0.6}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(Math.round(player.radius), player.x, player.y);

        requestAnimationFrame(gameLoop);
    }
};
