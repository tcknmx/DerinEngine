/* DerinEngine HTML — particles (Particle, ParticleEmitter)
 * Python deep_engine/particles.py birebir taşıması. Matematik fonksiyonları
 * DE._rng kullanır (test edilebilirlik: sabit tohum verilebilir).
 */
var DE = DE || {};

DE.Particle = class Particle {
    constructor(x, y, vx, vy, color, size = 4.0, lifespan = 0.5, gravity = 100.0) {
        this.x = Number(x);
        this.y = Number(y);
        this.vx = Number(vx);
        this.vy = Number(vy);
        this.color = color;
        this.initial_size = Number(size);
        this.size = Number(size);
        this.lifespan = Number(lifespan);
        this.max_lifespan = Number(lifespan);
        this.gravity = Number(gravity);
        this.is_alive = true;
    }
    update(dt) {
        this.lifespan -= dt;
        if (this.lifespan <= 0) { this.is_alive = false; return; }
        this.vy += this.gravity * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        const progress = this.lifespan / this.max_lifespan;
        this.size = Math.max(0.5, this.initial_size * progress);
    }
    /* Python Particle.draw: parçacığı TEK BAŞINA çizer (emitter'dan bağımsız
     * çağrılabilir — test ve özel efektler için). */
    draw(ctx, camera_offset) {
        if (!this.is_alive || this.size <= 0 || !ctx) return;
        const sx = this.x - (camera_offset ? camera_offset.x : 0);
        const sy = this.y - (camera_offset ? camera_offset.y : 0);
        ctx.fillStyle = `rgb(${this.color[0]},${this.color[1]},${this.color[2]})`;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.5, this.size), 0, Math.PI * 2);
        ctx.fill();
    }
}

DE.ParticleEmitter = class ParticleEmitter extends DE.Component {
    constructor() {
        super();
        this.particles = [];
        this.rng = DE._rng;   // varsayılan rastgele (global DE._rng)
    }
    burst(count = 15, color = [255, 215, 0], speed_range = [40, 160],
           size_range = [3, 6], lifespan_range = [0.3, 0.7], gravity = 120.0,
           origin_offset = [0, 0]) {
        const o = this.game_object;
        const ox = o.position.x + (origin_offset[0] || 0);
        const oy = o.position.y + (origin_offset[1] || 0);
        for (let i = 0; i < count; i++) {
            const angle = this.rng.uniform(0, 6.283185307179586);
            const speed = this.rng.uniform(speed_range[0], speed_range[1]);
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const size = this.rng.uniform(size_range[0], size_range[1]);
            const lifespan = this.rng.uniform(lifespan_range[0], lifespan_range[1]);
            this.particles.push(new DE.Particle(ox, oy, vx, vy, color, size, lifespan, gravity));
        }
    }
    update(dt) {
        for (const p of this.particles) p.update(dt);
        this.particles = this.particles.filter(p => p.is_alive);
    }
draw(ctx, camera_offset) {
        for (const p of this.particles) {
            if (!p.is_alive || p.size <= 0) continue;
            const sx = p.x - (camera_offset ? camera_offset.x : 0);
            const sy = p.y - (camera_offset ? camera_offset.y : 0);
            if (sx < -20 || sx > ctx.canvas.width + 20 || sy < -20 || sy > ctx.canvas.height + 20) continue;
            ctx.fillStyle = `rgb(${p.color[0]},${p.color[1]},${p.color[2]})`;
            ctx.beginPath();
            ctx.arc(sx, sy, Math.max(0.5, p.size), 0, Math.PI * 2);
            ctx.fill();
        }
    }
}