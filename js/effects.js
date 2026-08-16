// Particles, screen shake, glow lights — the "juice" layer.
const Particles = [];   // {x,y,z, vx,vy,vz, life,maxLife, size, col, grav}
let shakeAmt = 0;

function addShake(a) { shakeAmt = Math.min(9, shakeAmt + a); }

function spawnSparks(x, y, n, cols, speed = 3) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = (0.4 + Math.random() * 0.6) * speed;
    Particles.push({
      x, y, z: 4 + Math.random() * 6,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 1 + Math.random() * 2.5,
      life: 0.35 + Math.random() * 0.35, maxLife: 0.7,
      size: 1, col: cols[(Math.random() * cols.length) | 0], grav: 10,
    });
  }
}

function spawnSmoke(x, y, n) {
  for (let i = 0; i < n; i++) {
    Particles.push({
      x, y, z: 2 + Math.random() * 4,
      vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6, vz: 0.9 + Math.random(),
      life: 0.6 + Math.random() * 0.5, maxLife: 1.1,
      size: 2, col: 'rgba(120,110,100,0.5)', grav: -1,
    });
  }
}

function updateParticles(dt) {
  for (let i = Particles.length - 1; i >= 0; i--) {
    const p = Particles[i];
    p.life -= dt;
    if (p.life <= 0) { Particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.z += p.vz * 10 * dt; p.vz -= p.grav * dt;
    if (p.z < 0) { p.z = 0; p.vz *= -0.4; p.vx *= 0.6; p.vy *= 0.6; }
  }
  shakeAmt = Math.max(0, shakeAmt - 26 * (shakeAmt / 9 + 0.15) * dt);
}

// Glow lights collected each frame, drawn additively in the light pass
const Lights = [];
function addLight(x, y, z, radius, color, alpha) {
  Lights.push({ x, y, z, radius, color, alpha });
}
