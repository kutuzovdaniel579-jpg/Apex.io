const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const playBtn = document.getElementById('play-btn');
const uiLayer = document.querySelector('.menu-container');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let isPlaying = false;
let mouse = { x: canvas.width / 2, y: canvas.height / 2 };

// Player Object
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 20,
    color: '#00fff2',
    mass: 20,
    speed: 4
};

// Particles (Food)
let particles = [];
const colors = ['#00fff2', '#bcff00', '#ff00ff'];

function createParticles() {
    for (let i = 0; i < 100; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: 3,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }
}

// Event Listeners
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

playBtn.addEventListener('click', () => {
    uiLayer.classList.add('hidden');
    document.getElementById('scoreboard').classList.remove('hidden');
    isPlaying = true;
    createParticles();
    animate();
});

function drawPlayer() {
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = player.color;
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0; // Reset shadow for other elements
}

function drawParticles() {
    particles.forEach((p, index) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.6;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        
        // Collision Detection
        const dist = Math.hypot(player.x - p.x, player.y - p.y);
        if (dist < player.radius) {
            particles.splice(index, 1);
            player.radius += 0.5;
            player.mass += 1;
            // Respawn particle
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: 3,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }
    });
}

function update() {
    if (!isPlaying) return;

    // Smooth movement towards mouse
    const dx = mouse.x - player.x;
    const dy = mouse.y - player.y;
    const angle = Math.atan2(dy, dx);
    
    // Slow down as cell gets bigger
    const currentSpeed = Math.max(1.5, player.speed - (player.radius / 50));
    
    if (Math.hypot(dx, dy) > 5) {
        player.x += Math.cos(angle) * currentSpeed;
        player.y += Math.sin(angle) * currentSpeed;
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw subtle grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for(let i=0; i<canvas.width; i+=50) {
        ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,canvas.height); ctx.stroke();
    }
    for(let i=0; i<canvas.height; i+=50) {
        ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(canvas.width,i); ctx.stroke();
    }

    drawParticles();
    drawPlayer();
    update();

    requestAnimationFrame(animate);
}
