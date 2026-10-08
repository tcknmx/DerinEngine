/* DerinEngine HTML — game/bosses.js (Python game/bosses.py birebir portu)
 * Bölüm sonu boss sınıfları: BossController (zemin), FlyingBoss, SniperBoss,
 * CosmicBoss (astro final), ShieldBoss.
 *  - Flask benzeri fizik bağımsız boss'lar (flying/sniper/cosmic) Rigidbody KULLANMAZ
 *    (kinematik: hareketi doğrudan pozisyona yazar; kutusu trigger → oyuncu içinden geçer).
 *  - Zemin boss'lar (shield/archer) Rigidbody + katı BoxCollider kullanır.
 *  - Canvas çizimi: Python pygame primitiflerinin birebir benzeri (fillRect/arc/line).
 *  - NOT: Python'ın _draw_shield_bar son döngüsü yarım kalmıştır (hiçbir şey çizmez);
 *    burada amaçlanan görsel segmentler çizilir (belgeli kozmetik düzeltme).
 */
var DE_GAME = DE_GAME || {};

function _boss_scene() {
    return (DE.Engine.instance && DE.Engine.instance.active_scene) || null;
}

function _boss_bar_name(boss_key) {
    const known = ["forest", "cave", "ice", "desert", "astro"];
    return known.indexOf(boss_key) >= 0 ? ("boss_" + boss_key) : "boss_cave_fallback";
}

function _now() {
    return (typeof performance !== "undefined") ? performance.now() : Date.now();
}

function _round_rect_path(ctx, x, y, w, h, r) {
    // Python pygame.draw.rect(border_radius) eşi: yumuşak köşeli dikdörtgen yolu.
    if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, r);
        return;
    }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function _fill_rect(ctx, color, x, y, w, h, radius = 0) {
    if (w <= 0 || h <= 0) return;
    ctx.fillStyle = "rgb(" + color[0] + "," + color[1] + "," + color[2] + ")";
    if (radius > 0) {
        ctx.beginPath();
        _round_rect_path(ctx, Math.trunc(x), Math.trunc(y), Math.trunc(w), Math.trunc(h), radius);
        ctx.fill();
    } else {
        ctx.fillRect(Math.trunc(x), Math.trunc(y), Math.trunc(w), Math.trunc(h));
    }
}

function _stroke_rect(ctx, color, x, y, w, h, width, radius = 0) {
    ctx.strokeStyle = "rgb(" + color[0] + "," + color[1] + "," + color[2] + ")";
    ctx.lineWidth = width;
    if (radius > 0) {
        ctx.beginPath();
        _round_rect_path(ctx, Math.trunc(x), Math.trunc(y), Math.trunc(w), Math.trunc(h), radius);
        ctx.stroke();
    } else {
        ctx.strokeRect(Math.trunc(x), Math.trunc(y), Math.trunc(w), Math.trunc(h));
    }
}

function _arc_stroke(ctx, cx, cy, r, color, width) {
    if (!ctx.beginPath || !ctx.arc || !ctx.stroke) return;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
}

function _line(ctx, color, x1, y1, x2, y2, width) {
    if (!ctx.beginPath || !ctx.moveTo || !ctx.lineTo || !ctx.stroke) return;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = "rgb(" + color[0] + "," + color[1] + "," + color[2] + ")";
    ctx.lineWidth = width;
    ctx.stroke();
}

/* Boss sağlık barı + ad çizimi (tüm boss türleri tarafından paylaşılır). */
function _draw_boss_bar(ctx, obj, health, boss_key, camera_offset, bar_w = 80) {
    _draw_enrage_aura(ctx, obj, health, camera_offset);
    const sx = Math.trunc(obj.position.x - camera_offset.x);
    const sy = Math.trunc(obj.position.y - camera_offset.y);
    const w = Math.trunc(obj.size.x);
    const bar_h = 10;
    const bar_x = sx - Math.trunc((bar_w - w) / 2);
    const bar_y = sy - 24;
    _fill_rect(ctx, [30, 30, 30], bar_x, bar_y, bar_w, bar_h, 3);
    const pct = Math.max(0.0, health.current_hp / health.max_hp);
    const fill_w = Math.trunc(bar_w * pct);
    if (fill_w > 0) _fill_rect(ctx, [255, 80, 60], bar_x, bar_y, fill_w, bar_h, 3);
    _stroke_rect(ctx, [255, 255, 255], bar_x, bar_y, bar_w, bar_h, 1, 3);
    if (typeof ctx.fillText === "function") {
        const name_key = _boss_bar_name(boss_key);
        ctx.fillStyle = "rgb(255,210,180)";
        ctx.font = "bold 14px monospace";
        ctx.fillText(DE.I18n.t(name_key) + ": " + Math.trunc(health.current_hp) + " HP", bar_x, bar_y - 6);
    }
}

/* Düşük HP'de uyarı aurası: nefes alan kırmızı/amber halka + çıtırtı kıvılcımları.
 * Sadece görseldir (mekanik yarısı zaten düşük HP'de daha hızlı ateş eder). */
function _draw_enrage_aura(ctx, obj, health, camera_offset) {
    if (!health || health.max_hp <= 0) return;
    const pct = health.current_hp / health.max_hp;
    if (pct >= 0.5 || pct <= 0) return;
    const sx = Math.trunc(obj.position.x - camera_offset.x);
    const sy = Math.trunc(obj.position.y - camera_offset.y);
    const w = Math.trunc(obj.size.x), h = Math.trunc(obj.size.y);
    const cx = sx + w / 2, cy = sy + h / 2;
    const pulse = 0.5 + 0.5 * Math.sin(_now() * 0.012);
    const strength = 1.0 - Math.min(1.0, pct * 2.0);
    const r = Math.trunc(Math.max(w, h) * (0.55 + 0.25 * pulse) * (1.0 + 0.35 * strength));
    _arc_stroke(ctx, cx, cy, r, "rgba(180,40,20,0.35)", 3);
    _arc_stroke(ctx, cx, cy, r + 5, "rgba(255,110,30,0.27)", 2);
    const tick = _now();
    for (let i = 0; i < 6; i++) {
        const ang = tick * 0.006 + i * (Math.PI / 3);
        const dist = r + 8 + Math.trunc(6 * Math.sin(tick * 0.02 + i * 2.4));
        const px = cx + Math.cos(ang) * dist;
        const py = cy + Math.sin(ang) * dist;
        _line(ctx, [255, 140, 40], cx + Math.cos(ang) * (r - 6), cy + Math.sin(ang) * (r - 6), px, py, 2);
    }
}

/* --- BossController: zemin boss'u (zıplar, ateş topu atar, üst sağlık barı) --- */
class BossController extends DE.Component {
    constructor(patrol_distance = 200.0, speed = 60.0, fire_interval = 2.0, bullet_speed = 320.0,
                shoot_count = 1, body_color = [220, 40, 30], accent_color = [255, 230, 80],
                boss_key = "cave") {
        super();
        this.distance = patrol_distance;
        this.speed = speed;
        this.fire_interval = fire_interval;
        this.bullet_speed = bullet_speed;
        this.shoot_count = shoot_count;
        this.body_color = body_color.slice();
        this.accent_color = accent_color.slice();
        this.boss_key = boss_key;
        this.start_x = 0.0;
        this.direction = -1;
        this.jump_timer = 0.0;
        this.shoot_timer = 0.0;
        this.health = null;
        this._pattern_index = 0;        // saldırı deseni döngüsü (çeşitlilik)
        this._telegraph_timer = 0.0;    // saldırı öncesi işaret (görsel)
        this._telegraph_active = false;
    }
    start() {
        this.start_x = this.game_object.position.x;
        this.health = this.game_object.get_component(DE.Health);
    }
    update(dt) {
        const rb = this.game_object.get_component(DE.Rigidbody2D);
        if (!rb) return;
        // Time-slow powerup: boss hareketi/ateşi yavaşlar (oyuncu etkilenmez)
        dt = DE._slow_dt(dt);

        this.game_object.position.x += this.speed * this.direction * dt;
        if (Math.abs(this.game_object.position.x - this.start_x) >= this.distance) {
            this.direction *= -1;
        }

        this.jump_timer += dt;
        if (this.jump_timer > 3.2 && rb.is_grounded) {
            this.jump_timer = 0.0;
            rb.velocity.y = -620.0;
            rb.is_grounded = false;
            if (DE.SoundFX && DE.SoundFX.play) DE.SoundFX.play("jump");
        }

        this.shoot_timer += dt;
        // DeSene desen döngüsü + düşük HP'de hızlanma (enrage)
        let eff_interval = this.fire_interval;
        if (this.health && this.health.max_hp > 0 && this.health.current_hp > 0) {
            const hp_ratio = this.health.current_hp / this.health.max_hp;
            if (hp_ratio < 0.5) eff_interval = this.fire_interval * 0.75;
        }
        if (this.shoot_timer > eff_interval) {
            this.shoot_timer = 0.0;
            this._pattern_index = (this._pattern_index + 1) % 3;
            if (this._pattern_index === 0) this._shoot_fireball();
            else if (this._pattern_index === 1) this._shoot_ring();
            else this._shoot_aimed();
        }
    }
    _shoot_fireball() {
        const scene = _boss_scene();
        if (!scene) return;
        if (DE.SoundFX && DE.SoundFX.play) DE.SoundFX.play("shoot");
        const fb_x = this.game_object.position.x + (this.direction > 0 ? this.game_object.size.x : -16);
        const fb_y = this.game_object.position.y + 20;
        const steps = Math.max(1, this.shoot_count);
        const spread_angle = 0.35; // yaklaşık 20°
        for (let i = 0; i < steps; i++) {
            let angle = 0.0;
            if (steps > 1) angle = spread_angle * (i / (steps - 1) - 0.5);
            let dx = this.direction * Math.abs(Math.cos(angle));
            let dy = Math.sin(angle) + 0.1;
            const mag = Math.sqrt(dx * dx + dy * dy);
            if (mag === 0) continue;
            const direction = new DE.Vector2(dx / mag, dy / mag);
            const fireball = new DE.GameObject("Fireball", fb_x, fb_y, 16, 16, "Enemy");
            fireball.add_component(new DE.SpriteRenderer(this.accent_color, "circle", 10));
            fireball.add_component(new DE.BoxCollider(true, false));
            fireball.add_component(new DE.ParticleEmitter());
            fireball.add_component(new DE.LightSource(90, this.accent_color, 0.9, false, 3.0, 15.0, [8, 8]));
            fireball.add_component(new DE.Projectile(direction, this.bullet_speed, 1, true));
            scene.add_object(fireball);
        }
    }
    _fire_projectile(direction) {
        /* Tek bir boss ateş topunu verilen yönde fırlatır (paylaşılan yardımcı). */
        const scene = _boss_scene();
        if (!scene) return;
        const fb_x = this.game_object.position.x + this.game_object.size.x / 2 - 8;
        const fb_y = this.game_object.position.y + this.game_object.size.y / 2 - 8;
        const fireball = new DE.GameObject("Fireball", fb_x, fb_y, 16, 16, "Enemy");
        fireball.add_component(new DE.SpriteRenderer(this.accent_color, "circle", 10));
        fireball.add_component(new DE.BoxCollider(true, false));
        fireball.add_component(new DE.ParticleEmitter());
        fireball.add_component(new DE.LightSource(90, this.accent_color, 0.9, false, 3.0, 15.0, [8, 8]));
        fireball.add_component(new DE.Projectile(direction, this.bullet_speed, 1, true));
        scene.add_object(fireball);
    }
    _shoot_ring() {
        /* Saldırı 2: merkezden 360° halka patlaması (her yöne mermi). */
        if (DE.SoundFX && DE.SoundFX.play) DE.SoundFX.play("shoot");
        const steps = Math.max(6, this.shoot_count * 3);
        for (let i = 0; i < steps; i++) {
            const ang = (Math.PI * 2 / steps) * i;
            this._fire_projectile(new DE.Vector2(Math.cos(ang), Math.sin(ang)));
        }
    }
    _shoot_aimed() {
        /* Saldırı 3: oyuncu yönüne nişanlı, hafif yay dağılımıyla. */
        if (DE.SoundFX && DE.SoundFX.play) DE.SoundFX.play("shoot");
        const scene = _boss_scene();
        const player = scene ? scene.find_by_tag("Player") : null;
        if (player === null || !player.active) return;
        let dirx = (player.position.x + player.size.x / 2) - (this.game_object.position.x + this.game_object.size.x / 2);
        let diry = (player.position.y + player.size.y / 2) - (this.game_object.position.y + this.game_object.size.y / 2);
        const mag = Math.sqrt(dirx * dirx + diry * diry);
        if (mag === 0) return;
        dirx /= mag; diry /= mag;
        const count = this.shoot_count;
        for (let i = 0; i < count; i++) {
            let off = 0.0;
            if (count > 1) off = (i / (count - 1) - 0.5) * 0.14;
            const a = Math.atan2(diry, dirx) + off;
            this._fire_projectile(new DE.Vector2(Math.cos(a), Math.sin(a)));
        }
    }
    draw(ctx, camera_offset) {
        const sx = Math.trunc(this.game_object.position.x - camera_offset.x);
        const sy = Math.trunc(this.game_object.position.y - camera_offset.y);
        const w = Math.trunc(this.game_object.size.x);
        const h = Math.trunc(this.game_object.size.y);
        // Gövde (border_radius=8, Python bosses.py:gövde) + gözler (accent) + ağız
        _fill_rect(ctx, this.body_color, sx, sy, w, h, 8);
        _fill_rect(ctx, this.accent_color, sx + 12, sy + 16, 12, 8, 2);
        _fill_rect(ctx, this.accent_color, sx + 36, sy + 16, 12, 8, 2);
        _fill_rect(ctx, [20, 10, 10], sx + 16, sy + 36, 28, 6, 2);
        if (this.health) {
            const bar_w = 80, bar_h = 10;
            const bar_x = sx - Math.trunc((bar_w - w) / 2);
            const bar_y = sy - 24;
            _fill_rect(ctx, [30, 30, 30], bar_x, bar_y, bar_w, bar_h, 3);
            const pct = Math.max(0.0, this.health.current_hp / this.health.max_hp);
            const fill_w = Math.trunc(bar_w * pct);
            if (fill_w > 0) _fill_rect(ctx, [255, 80, 60], bar_x, bar_y, fill_w, bar_h, 3);
            _stroke_rect(ctx, [255, 255, 255], bar_x, bar_y, bar_w, bar_h, 1, 3);
            if (typeof ctx.fillText === "function") {
                ctx.fillStyle = "rgb(255,210,180)";
                ctx.font = "bold 14px monospace";
                ctx.fillText(DE.I18n.t(_boss_bar_name(this.boss_key)) + ": " + Math.trunc(this.health.current_hp) + " HP", bar_x, bar_y - 6);
            }
        }
        // Düşük HP enrage aurası (gövdenin üzerine çizilir)
        _draw_enrage_aura(ctx, this.game_object, this.health, camera_offset);
    }
}

/* --- FlyingBoss: havada süzülen, aşağıya ateş topu yağdıran boss (kinematik) --- */
class FlyingBoss extends DE.Component {
    constructor(distance = 180.0, speed = 70.0, fire_interval = 1.6, bullet_speed = 260.0,
                shoot_count = 2, body_color = [120, 210, 255], accent_color = [230, 180, 60],
                boss_key = "ice", wind_force = 150.0, wind_radius = 130.0) {
        super();
        this.distance = distance;
        this.speed = speed;
        this.fire_interval = fire_interval;
        this.bullet_speed = bullet_speed;
        this.shoot_count = shoot_count;
        this.body_color = body_color.slice();
        this.accent_color = accent_color.slice();
        this.boss_key = boss_key;
        this.wind_force = wind_force;       // boss altındaki oyuncuyu aşağı iten rüzgar
        this.wind_radius = wind_radius;     // yatay rüzgar etki genişliği
        this.start_x = 0.0;
        this.start_y = 0.0;
        this.health = null;
        this.shoot_timer = 0.0;
        this._t = 0.0;
        this._wind_timer = 0.0;
    }
    start() {
        this.start_x = this.game_object.position.x;
        this.start_y = this.game_object.position.y;
        this.health = this.game_object.get_component(DE.Health);
    }
    update(dt) {
        dt = DE._slow_dt(dt);
        this._t += dt;
        const scene = _boss_scene();
        const player = scene ? scene.find_by_tag("Player") : null;

        // Yatay salınım (start_x çevresinde ileri geri)
        this.game_object.position.x = this.start_x + Math.sin(this._t * this.speed / 40.0) * this.distance;
        if (player) {
            // Oyuncunun yüksekliğine yavaşça süzül (havada kalır)
            const target_y = player.position.y - 90;
            this.game_object.position.y += (target_y - this.game_object.position.y) * dt * 1.2;
        } else {
            this.game_object.position.y = this.start_y;
        }

        this.shoot_timer += dt;
        if (this.shoot_timer >= this.fire_interval) {
            this.shoot_timer = 0.0;
            this._shoot_rain();
        }

        // RÜZGAR (aşağı akım): oyuncu boss'un altında ve yatay menzildeyken hafifçe
        // aşağı itilir -> zıplama ve zamanlama zorlaşır (imza boss etkisi).
        if (player && player.active &&
            player.position.x < this.game_object.position.x + this.game_object.size.x + this.wind_radius &&
            player.position.x + player.size.x > this.game_object.position.x - this.wind_radius) {
            const px = player.position.x + player.size.x / 2;
            const bx = this.game_object.position.x + this.game_object.size.x / 2;
            if (player.position.y > this.game_object.position.y + this.game_object.size.y) {
                const dist = Math.abs(px - bx);
                const falloff = Math.max(0.0, 1.0 - dist / this.wind_radius);
                if (falloff > 0.05) {
                    const prb = player.get_component(DE.Rigidbody2D);
                    if (prb) {
                        prb.velocity.y += this.wind_force * falloff * dt;
                        this._wind_timer -= dt;
                        if (this._wind_timer <= 0) {
                            this._wind_timer = 0.08;
                            this._spawn_wind_puff(bx, player.position.y, falloff);
                        }
                    }
                }
            }
        }
    }
    _spawn_wind_puff(bx, py, falloff) {
        const scene = _boss_scene();
        if (!scene) return;
        const puff = new DE.GameObject("WindPuff", bx - 14, py + 10, 28, 8, "FX");
        puff.add_component(new DE.ParticleEmitter());
        puff.add_component(new DE._AutoRemove());
        const pe = puff.get_component(DE.ParticleEmitter);
        if (pe) pe.burst(4, [200, 230, 255], [15, 40], [2, 4], [0.2, 0.4], -30.0, [14, 4]);
        scene.add_object(puff);
    }
    _shoot_rain() {
        const scene = _boss_scene();
        if (!scene) return;
        if (DE.SoundFX && DE.SoundFX.play) DE.SoundFX.play("shoot");
        const cx = this.game_object.position.x + this.game_object.size.x / 2;
        const cy = this.game_object.position.y + this.game_object.size.y;
        // Dik aşağı DEĞİL, oyuncuya nişanlı (hafif yay dağılımında shoot_count mermi)
        const player = scene.find_by_tag("Player");
        let tx = cx, ty = cy + 200;
        if (player && player.active) {
            tx = player.position.x + player.size.x / 2;
            ty = player.position.y + player.size.y / 2;
        }
        const base = Math.atan2(ty - cy, tx - cx);
        for (let i = 0; i < this.shoot_count; i++) {
            const ang = base + (i - (this.shoot_count - 1) / 2) * 0.16;
            const dir = new DE.Vector2(Math.cos(ang), Math.sin(ang));
            const ox = (i - (this.shoot_count - 1) / 2) * 26;
            const fb = new DE.GameObject("Fireball", cx + ox - 8, cy, 14, 14, "Enemy");
            fb.add_component(new DE.SpriteRenderer(this.accent_color, "circle", 10));
            fb.add_component(new DE.BoxCollider(true, false));
            fb.add_component(new DE.ParticleEmitter());
            fb.add_component(new DE.Projectile(dir, this.bullet_speed, 1, true));
            scene.add_object(fb);
        }
    }
    draw(ctx, camera_offset) {
        const sx = Math.trunc(this.game_object.position.x - camera_offset.x);
        const sy = Math.trunc(this.game_object.position.y - camera_offset.y);
        const w = Math.trunc(this.game_object.size.x);
        // Kanatlar (salınıma göre çırpma hissi)
        const flap = Math.sin(this._t * 10.0);
        _fill_rect(ctx, this.accent_color, sx - 14, sy + 14 + Math.trunc(flap * 6), 10, 5, 2);
        _fill_rect(ctx, this.accent_color, sx + w + 4, sy + 14 + Math.trunc(-flap * 6), 10, 5, 2);
        _fill_rect(ctx, this.body_color, sx, sy, w, Math.trunc(this.game_object.size.y), 8);
        _fill_rect(ctx, [220, 40, 40], sx + 10, sy + 14, 8, 8, 4);
        _fill_rect(ctx, [220, 40, 40], sx + w - 18, sy + 14, 8, 8, 4);
        if (this.health) {
            _draw_boss_bar(ctx, this.game_object, this.health, this.boss_key, camera_offset);
        }
    }
}

/* --- SniperBoss: hareketsiz durur, kırmızı lazerle kilitler, anlık ışın atar --- */
class SniperBoss extends DE.Component {
    constructor(distance = 0.0, speed = 30.0, fire_interval = 2.4, bullet_speed = 0.0,
                shoot_count = 1, body_color = [220, 120, 60], accent_color = [255, 60, 60],
                boss_key = "desert", aim_time = 1.0, lock_time = 0.8, beam_width = 7,
                range = 600.0) {
        super();
        this.distance = distance;
        this.speed = speed;
        this.fire_interval = fire_interval;
        this.bullet_speed = bullet_speed;
        this.shoot_count = shoot_count;
        this.body_color = body_color.slice();
        this.accent_color = accent_color.slice();
        this.boss_key = boss_key;
        this.aim_time = aim_time;
        this.lock_time = lock_time;
        this.beam_width = beam_width;
        this.range = range;
        this.start_x = 0.0;
        this.health = null;
        this.timer = 0.0;
        this._target_x = null;
        this._target_y = null;
        this._lock_x = null;
        this._lock_y = null;
        this._locked = false;
        this._aim_state = "aim";
        this._beam_flash = 0.0;
    }
    start() {
        this.start_x = this.game_object.position.x;
        this.health = this.game_object.get_component(DE.Health);
    }
    _phase() {
        const t = this.timer % this.fire_interval;
        if (t >= this.fire_interval - this.lock_time) return "lock";
        return "aim";
    }
    update(dt) {
        dt = DE._slow_dt(dt);
        this._beam_flash = Math.max(0.0, this._beam_flash - dt);
        this.timer += dt;
        const scene = _boss_scene();
        const player = scene ? scene.find_by_tag("Player") : null;
        const cx = this.game_object.position.x + this.game_object.size.x / 2;
        const cy = this.game_object.position.y + this.game_object.size.y / 2;
        if (player === null || !player.active) return;
        const dx = player.position.x - cx;
        const dy = player.position.y - cy;
        if (Math.abs(dx) > this.range || Math.abs(dy) > this.range) {
            this._locked = false;
            this._aim_state = "aim";
            return;
        }

        const phase = this._phase();
        // Ateş (hitscan) — faz güncellemesinden önce, sonra dön
        if (this.timer >= this.fire_interval) {
            if (this._lock_x !== null) this._fire_beam(cx, cy, this._lock_x, this._lock_y, player);
            this.timer = 0.0;
            this._locked = false;
            this._lock_x = this._lock_y = null;
            return;
        }

        if (phase === "aim") {
            this._aim_state = "aim";
            this._locked = false;
            this._target_x = player.position.x + player.size.x / 2;
            this._target_y = player.position.y + player.size.y / 2;
            this._lock_x = this._lock_y = null;
        } else if (phase === "lock") {
            if (!this._locked) {
                this._locked = true;
                this._lock_x = this._target_x;
                this._lock_y = this._target_y;
            }
            this._aim_state = "lock";
        }
    }
    _fire_beam(sx, sy, tx, ty, player) {
        this._beam_flash = 0.14;
        if (DE.SoundFX && DE.SoundFX.play) DE.SoundFX.play("shoot");
        // kilitli ışın üzerinde oyuncu varsa isabet
        const px = player.position.x + player.size.x / 2;
        const py = player.position.y + player.size.y / 2;
        const vx = tx - sx, vy = ty - sy;
        const mag2 = vx * vx + vy * vy;
        if (mag2 < 1) return;
        const t = Math.max(0.0, Math.min(1.0, ((px - sx) * vx + (py - sy) * vy) / mag2));
        const closest_x = sx + vx * t;
        const closest_y = sy + vy * t;
        const dist = Math.hypot(px - closest_x, py - closest_y);
        if (dist <= this.beam_width) {
            const player_health = player.get_component(DE.Health);
            if (player_health && !player_health.is_invulnerable()) {
                player_health.take_damage(1);
                const ctrl = player.get_component(DE_GAME.PlayerController);
                if (ctrl) {
                    ctrl.hitstop_timer = Math.max(ctrl.hitstop_timer, 0.06);
                    if (ctrl._screen_shake) ctrl._screen_shake(0.2);
                }
                const scene = _boss_scene();
                if (scene) scene.add_shake(0.2);
            }
        }
    }
    draw(ctx, camera_offset) {
        const sx = Math.trunc(this.game_object.position.x - camera_offset.x);
        const sy = Math.trunc(this.game_object.position.y - camera_offset.y);
        const w = Math.trunc(this.game_object.size.x);
        const h = Math.trunc(this.game_object.size.y);
        _fill_rect(ctx, this.body_color, sx, sy, w, h, 8);
        _fill_rect(ctx, this.accent_color, sx + Math.trunc(w / 2) - 6, sy + Math.trunc(h / 2) - 3, 12, 6, 2);

        const cx = sx + w / 2;
        const cy = sy + h / 2;
        if (this._aim_state === "lock" && this._lock_x !== null && this._lock_y !== null) {
            const tx = Math.trunc(this._lock_x - camera_offset.x);
            const ty = Math.trunc(this._lock_y - camera_offset.y);
            // kilitli: donmuş, yanıp sönen kırmızı lazer
            const blink = Math.sin(this.timer * 30) > 0;
            _line(ctx, blink ? [255, 60, 60] : [200, 40, 40], cx, cy, tx, ty, this.beam_width);
        } else if (this._target_x !== null && this._target_y !== null) {
            const tx = Math.trunc(this._target_x - camera_offset.x);
            const ty = Math.trunc(this._target_y - camera_offset.y);
            _line(ctx, [255, 90, 60], cx, cy, tx, ty, 3);
        }

        if (this._beam_flash > 0) {
            const tx = Math.trunc((this._lock_x !== null ? this._lock_x : this._target_x) - camera_offset.x);
            const ty = Math.trunc((this._lock_y !== null ? this._lock_y : this._target_y) - camera_offset.y);
            _line(ctx, [255, 120, 80], cx, cy, tx, ty, this.beam_width + 4);
        }

        if (this.health) {
            _draw_boss_bar(ctx, this.game_object, this.health, this.boss_key, camera_offset);
        }
    }
}

/* --- CosmicBoss (ASTRO = SON): FlyingBoss + periyodik sniper lazeri --- */
class CosmicBoss extends FlyingBoss {
    constructor(distance = 180.0, speed = 70.0, fire_interval = 1.6, bullet_speed = 260.0,
                shoot_count = 2, body_color = [120, 210, 255], accent_color = [230, 180, 60],
                boss_key = "astro", wind_force = 150.0, wind_radius = 130.0,
                beam_interval = 4.2, aim_time = 1.0, lock_time = 0.8,
                beam_width = 7, beam_range = 700.0) {
        super(distance, speed, fire_interval, bullet_speed, shoot_count, body_color, accent_color,
              boss_key, wind_force, wind_radius);
        this.beam_interval = beam_interval;   // lazer atışları arası süre
        this.aim_time = aim_time;
        this.lock_time = lock_time;
        this.beam_width = beam_width;
        this.beam_range = beam_range;
        // Sniper fazı için ayrı sayaç (FlyingBoss.shoot_timer ile çakışmaz)
        this._beam_timer = 0.0;
        this._aim_state = "aim";
        this._locked = false;
        this._target_x = null;
        this._target_y = null;
        this._lock_x = null;
        this._lock_y = null;
        this._beam_flash = 0.0;
    }
    update(dt) {
        // FlyingBoss.update: uçuş + nişanlı ateş topları + rüzgar
        super.update(dt);
        // Sniper lazer fazı
        const scene = _boss_scene();
        const player = scene ? scene.find_by_tag("Player") : null;
        this._beam_flash = Math.max(0.0, this._beam_flash - dt);
        this._beam_timer += dt;
        if (player === null || !player.active) return;
        const cx = this.game_object.position.x + this.game_object.size.x / 2;
        const cy = this.game_object.position.y + this.game_object.size.y / 2;
        const dx = player.position.x - cx;
        const dy = player.position.y - cy;
        if (Math.abs(dx) > this.beam_range || Math.abs(dy) > this.beam_range) {
            this._locked = false;
            this._aim_state = "aim";
            return;
        }
        // Faz: periyodun sonuna kadar nişan -> son kilit penceresi
        const t = this._beam_timer % this.beam_interval;
        const phase = (t >= this.beam_interval - this.lock_time) ? "lock" : "aim";
        if (this._beam_timer >= this.beam_interval) {
            if (this._lock_x !== null) this._fire_beam(cx, cy, this._lock_x, this._lock_y, player);
            this._beam_timer = 0.0;
            this._locked = false;
            this._lock_x = this._lock_y = null;
            return;
        }
        if (phase === "aim") {
            this._aim_state = "aim";
            this._locked = false;
            this._target_x = player.position.x + player.size.x / 2;
            this._target_y = player.position.y + player.size.y / 2;
            this._lock_x = this._lock_y = null;
        } else if (phase === "lock") {
            if (!this._locked) {
                this._locked = true;
                this._lock_x = this._target_x;
                this._lock_y = this._target_y;
            }
            this._aim_state = "lock";
        }
    }
    _fire_beam(sx, sy, tx, ty, player) {
        this._beam_flash = 0.16;
        if (DE.SoundFX && DE.SoundFX.play) DE.SoundFX.play("shoot");
        const px = player.position.x + player.size.x / 2;
        const py = player.position.y + player.size.y / 2;
        const vx = tx - sx, vy = ty - sy;
        const mag2 = vx * vx + vy * vy;
        if (mag2 < 1) return;
        const t = Math.max(0.0, Math.min(1.0, ((px - sx) * vx + (py - sy) * vy) / mag2));
        const closest_x = sx + vx * t;
        const closest_y = sy + vy * t;
        const dist = Math.hypot(px - closest_x, py - closest_y);
        if (dist <= this.beam_width) {
            const player_health = player.get_component(DE.Health);
            if (player_health && !player_health.is_invulnerable()) {
                player_health.take_damage(1, 1.15);
                const ctrl = player.get_component(DE_GAME.PlayerController);
                if (ctrl) {
                    ctrl.hitstop_timer = Math.max(ctrl.hitstop_timer, 0.06);
                    if (ctrl._screen_shake) ctrl._screen_shake(0.2);
                }
                const scene = _boss_scene();
                if (scene) scene.add_shake(0.2);
            }
        }
    }
    draw(ctx, camera_offset) {
        // Uçan boss gövdesi (kanatlar dahil)
        super.draw(ctx, camera_offset);
        const sx = Math.trunc(this.game_object.position.x - camera_offset.x);
        const sy = Math.trunc(this.game_object.position.y - camera_offset.y);
        const w = Math.trunc(this.game_object.size.x);
        const cx = sx + w / 2;
        const cy = sy + this.game_object.size.y / 2;
        if (this._aim_state === "lock" && this._lock_x !== null && this._lock_y !== null) {
            const tx = Math.trunc(this._lock_x - camera_offset.x);
            const ty = Math.trunc(this._lock_y - camera_offset.y);
            const blink = Math.sin(this._beam_timer * 30) > 0;
            _line(ctx, blink ? [255, 60, 60] : [200, 40, 40], cx, cy, tx, ty, this.beam_width);
        } else if (this._target_x !== null && this._target_y !== null) {
            const tx = Math.trunc(this._target_x - camera_offset.x);
            const ty = Math.trunc(this._target_y - camera_offset.y);
            _line(ctx, [255, 90, 60], cx, cy, tx, ty, 3);
        }
        if (this._beam_flash > 0) {
            const tx = Math.trunc((this._lock_x !== null ? this._lock_x : this._target_x) - camera_offset.x);
            const ty = Math.trunc((this._lock_y !== null ? this._lock_y : this._target_y) - camera_offset.y);
            _line(ctx, [255, 120, 80], cx, cy, tx, ty, this.beam_width + 4);
        }
    }
}

/* --- ShieldBoss: etrafında kırılabilir platformlardan kalkan olan boss --- */
class ShieldBoss extends DE.Component {
    constructor(distance = 60.0, speed = 45.0, fire_interval = 2.2, bullet_speed = 320.0,
                shoot_count = 2, body_color = [150, 70, 210], accent_color = [255, 230, 80],
                boss_key = "cave") {
        super();
        this.distance = distance;
        this.speed = speed;
        this.fire_interval = fire_interval;
        this.bullet_speed = bullet_speed;
        this.shoot_count = shoot_count;
        this.body_color = body_color.slice();
        this.accent_color = accent_color.slice();
        this.boss_key = boss_key;
        this.start_x = 0.0;
        this.health = null;
        this.shoot_timer = 0.0;
        this._timer = 0.0;
        this.shield_parts = [];   // kalkanı oluşturan Breakable nesneleri
        this._previously_shielded = true;
    }
    start() {
        this.start_x = this.game_object.position.x;
        this.health = this.game_object.get_component(DE.Health);
    }
    _register_shield_parts() {
        // Sahnedeki kırılabilir parçaları bul (nesne: boss yakınındaki Breakable)
        if (this.shield_parts.length) return;
        const scene = _boss_scene();
        if (!scene) return;
        const cx = this.game_object.position.x + this.game_object.size.x / 2;
        const cy = this.game_object.position.y + this.game_object.size.y / 2;
        for (const o of scene.game_objects) {
            if (o.tag === "Breakable" && o.active) {
                const ox = o.position.x + o.size.x / 2;
                const oy = o.position.y + o.size.y / 2;
                if (Math.abs(ox - cx) < 150 && Math.abs(oy - cy) < 90) {
                    this.shield_parts.push(o);
                }
            }
        }
    }
    shield_intact() {
        this._register_shield_parts();
        // 'tümü': her parça sağlam olmalı. Yani tek parçayı (oyuncunun atış
        // menzilindekini) kırmak yeterli — hepsi değil.
        return Boolean(this.shield_parts.length) && this.shield_parts.every(p => p.active);
    }
    update(dt) {
        dt = DE._slow_dt(dt);
        this._timer += dt;
        this.shoot_timer += dt;
        // Her zaman ateş eder: kalkan içindeyken bile saldırabilir (kale);
        // kendi mermileri kırılabilir kalkandan GEÇER (onlara dokunmaz, kırmaz).
        if (this.shoot_timer >= this.fire_interval) {
            this.shoot_timer = 0.0;
            this._shoot_fan();
        }
        // Hareket: kalkan kırılana dek kalesinde durur; kırılınca (menzildeki
        // parça yok olduğunda) kaleden çıkıp gezinir.
        if (this.shield_intact()) return;
        this.game_object.position.x = this.start_x + Math.sin(this._timer * 0.8) * this.distance * 0.5;
    }
    _shoot_fan() {
        const scene = _boss_scene();
        if (!scene) return;
        if (DE.SoundFX && DE.SoundFX.play) DE.SoundFX.play("shoot");
        const cx = this.game_object.position.x + this.game_object.size.x / 2;
        const cy = this.game_object.position.y + this.game_object.size.y / 2;
        // Oyuncuya nişanlı ateş (kalkanın içinden dışarı)
        const player = scene.find_by_tag("Player");
        let base_ang = Math.PI;   // oyuncu yoksa varsayılan sol
        if (player && player.active) {
            const dx = (player.position.x + player.size.x / 2) - cx;
            const dy = (player.position.y + player.size.y / 2) - cy;
            if (Math.abs(dx) + Math.abs(dy) > 1) base_ang = Math.atan2(dy, dx);
        }
        const steps = Math.max(1, this.shoot_count);
        const spread = 0.35;
        for (let i = 0; i < steps; i++) {
            let ang = base_ang;
            if (steps > 1) ang = base_ang + spread * (i / (steps - 1) - 0.5);
            const d = new DE.Vector2(Math.cos(ang), Math.sin(ang));
            const fb = new DE.GameObject("Fireball", cx - 8, cy - 8, 16, 16, "Enemy");
            fb.add_component(new DE.SpriteRenderer(this.accent_color, "circle", 10));
            fb.add_component(new DE.BoxCollider(true, false));
            fb.add_component(new DE.ParticleEmitter());
            fb.add_component(new DE.Projectile(d, this.bullet_speed, 1, true));
            scene.add_object(fb);
        }
    }
    draw(ctx, camera_offset) {
        const sx = Math.trunc(this.game_object.position.x - camera_offset.x);
        const sy = Math.trunc(this.game_object.position.y - camera_offset.y);
        const w = Math.trunc(this.game_object.size.x);
        const h = Math.trunc(this.game_object.size.y);
        _fill_rect(ctx, this.body_color, sx, sy, w, h, 10);
        _fill_rect(ctx, this.accent_color, sx + 14, sy + 16, 12, 8, 2);
        _fill_rect(ctx, this.accent_color, sx + w - 26, sy + 16, 12, 8, 2);
        _fill_rect(ctx, [20, 10, 10], sx + 16, sy + 36, w - 32, 6, 2);
        if (this.health) {
            _draw_boss_bar(ctx, this.game_object, this.health, this.boss_key, camera_offset);
            this._draw_shield_bar(ctx, camera_offset);
        }
    }
    _draw_shield_bar(ctx, camera_offset) {
        // Kalkan sağlık çubuğu: kalkanı oluşturan kırılabilir parçalardan kaçının
        // hâlâ sağlam olduğunu segment segment gösterir. Hepsi kırılınca kaybolur.
        // (NOT: Python'da bu döngü gövdesi yarım kalmıştır ve hiç çizmez; burada
        //  amaçlanan segment çizgisi belgeli kozmetik düzeltme olarak çizilir.)
        this._register_shield_parts();
        if (!this.shield_parts.length) return;
        const total = this.shield_parts.length;
        const intact = this.shield_parts.filter(p => p.active).length;
        if (intact <= 0) return;
        const sx = Math.trunc(this.game_object.position.x - camera_offset.x) + Math.trunc(this.game_object.size.x / 2);
        const sy = Math.trunc(this.game_object.position.y - camera_offset.y);
        const bar_w = 60;
        const seg = 12;
        const x0 = sx - Math.trunc(bar_w / 2);
        const y0 = sy - 14;
        for (let i = 0; i < total; i++) {
            const px = x0 + i * seg;
            _fill_rect(ctx, intact > i ? [160, 160, 200] : [70, 70, 90], px, y0, 8, 6);
        }
    }
}

DE_GAME.BossController = BossController;
DE_GAME.FlyingBoss = FlyingBoss;
DE_GAME.SniperBoss = SniperBoss;
DE_GAME.CosmicBoss = CosmicBoss;
DE_GAME.ShieldBoss = ShieldBoss;
DE_GAME._draw_boss_bar = _draw_boss_bar;
DE_GAME._draw_enrage_aura = _draw_enrage_aura;