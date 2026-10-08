/* DerinEngine HTML — game/entities.js (Python game/entities.py birebir portu)
 * Oyuncu denetleyicisi (hareket/zıplama/ateş/dash/squash-stretch/sağlık),
 * hedef portalı, standart düşmanlar (devriye/uçan/zıplayan/taret/keskin nişancı),
 * yüzen skor, portal oku ve eğitim şeridi. Grafofikler Canvas2D'ye çevrildi.
 * Engine API'si DE.* üzerinden (Python üstteki gibi: Input statik köprüsü vb.).
 */
var DE_GAME = DE_GAME || {};

function _engine() { return DE.Engine.instance; }
function _scene() { const e = _engine(); return e ? e.active_scene : null; }

DE_GAME._now_ms = function () {
    if (typeof performance !== "undefined" && performance.now) return performance.now();
    return Date.now();
};

// Düşman parçacık fırlatmalarında kullanılan ortak rastgele (Python random.randint).
function _rand_int(a, b) { return Math.floor(DE._rng.uniform(a, b + 1)); }

// İki dikdörtgenin örtüşmesi (probe rect'leri için).
function _rects_overlap(a, b) {
    return a.x < (b.x + b.w) && (a.x + a.w) > b.x && a.y < (b.y + b.h) && (a.y + a.h) > b.y;
}

/* ---------------------------------------------------------------------------
 * PLAYER — PlayerController
 * ------------------------------------------------------------------------ */

DE_GAME.PlayerController = class PlayerController extends DE.Component {
    constructor(speed = 260.0, jump_force = 560.0, restart_scene_factory = null) {
        super();
        this.speed = speed;
        this.jump_force = jump_force;
        this.restart_scene_factory = restart_scene_factory;
        this.score = 0;
        this.score_text_obj = null;
        this.goal_text_obj = null;
        this.health_text_obj = null;
        this.streak_text_obj = null;   // coin streak çarpanı (x2/x3...) UI nesnesi
        this.particles = null;
        this.health = null;
        this._profile = null;          // Oyun ilerleme kaydı (yüksek skor) - ilk puanla oluşur
        this.spawn_pos = new DE.Vector2(80, 300);
        this.checkpoint_pos = null;    // son güvenli kara konumu (düşme kurtarması/respawn)
        this.can_double_jump = false;
        this.facing_dir = 1;
        this.dash_timer = 0.0;
        this.dash_cooldown = 0.0;
        this.dash_speed = 2.8;         // dash hız çarpanı (ağırlık/ramp-up için)
        this.dash_momentum = 0.0;      // dash sonrası kalan ileri momentum (ağırlık hissi)
        this.direction_dash = 1;
        this.shoot_cooldown = 0.0;

        // Dash after-image (deneyim 5): dash boyunca izleyen yarı saydam kopyalar.
        this._afterimage_timer = 0.0;
        this._afterimages = [];        // her biri: [sx, sy, w, h, age] (ekran uzayı)
        // Fall streaks (deneyim 7): hız eşiğinin üstünde sürekli düşme süresi.
        this.fall_streak_time = 0.0;

        // Prosedürel Animasyon (Squish & Stretch)
        this.scale_x = 1.0;
        this.scale_y = 1.0;
        this.air_time = 0.0;

        // --- Jump forgiveness / game-feel ayarı ---
        this.coyote_timer = 0.0;       // platformdan ayrılınca zıplama penceresi (kenar toleransı)
        this.jump_buffer_timer = 0.0;  // yere inmeden hemen önce basılan zıplamayı tamponla
        this.COAYOTE_TIME = 0.06;      // saniye
        this.JUMP_BUFFER = 0.06;       // saniye
        this.gravity_scale = 1.0;      // düşerken ekstra yerçekimi (ağır iniş)

        // Biome-feel fizikleri (biyoma özel): her dünya farklı hissettirir.
        this.biome = "forest";
        this.biome_gravity = 1.0;      // Rigidbody2D.gravity çarpanı
        this.biome_jump = 1.0;         // jump_force çarpanı
        this.biome_grip = 1.0;         // yatay tutuş: 1.0 anında, <1.0 kaygan
        this.biome_wind = 0.0;         // sabit yatay itme (çöl rüzgarı)

        // Hit-stop: hasar alınca kısa bir 'donma'
        this.hitstop_timer = 0.0;

        // Wall-slide / Wall-jump
        this.wall_dir = 0;             // oyuncunun değdiği duvar yönü: -1 sol / +1 sağ / 0 yok
        this.wall_sliding = false;
        this.wall_slide_speed = 220.0;
        this.wall_jump_x = 210.0;
        this.wall_jump_y = 330.0;
        this.jump_squash_timer = 0.0;  // zıplama 'pre-squash' (telgraf): önce çömel, sonra patla

        // Çimen/toz partikülleri (koşu puf + iniş tozu)
        this.was_grounded = true;
        this.run_puff_timer = 0.0;
        this._bounce_timer = 0.0;      // trambolin zıplamasından sonra jump-cut'ı atla

        // --- PowerUp Zamanlayıcıları ---
        this.powerup_magnet = 0.0;
        this.powerup_triple = 0.0;
        this.powerup_shield = false;
        this.powerup_speed = 0.0;
        this.powerup_slow = 0.0;
        this.powerup_label_timer = 0.0;
        this.powerup_label_text = "";
        this.powerup_label_text_obj = null;

        // V2.0: ana menü arka planındaki 'yıldıza bakan figür' modu. True iken
        // oyuncu giriş almaz, sabit durur (dev ışık saçan gözlerle gökyüzüne
        // bakar); oyun başlayınca False olur.
        this.menu_idle = false;

        // --- Coin Streak (art arda toplama çarpanı) ---
        this.coin_streak = 0;
        this.streak_timer = 0.0;
        this.STREAK_WINDOW = 2.5;      // saniye - bu sürede yeni coin gelmezse zincir kırılır
        this.STREAK_MAX_X = 4;         // en yüksek çarpan (x4)
    }

    start() {
        this.rb = this.game_object.get_component(DE.Rigidbody2D);
        this.particles = this.game_object.get_component(DE.ParticleEmitter);
        this.health = this.game_object.get_component(DE.Health);
        this.spawn_pos = new DE.Vector2(this.game_object.position.x, this.game_object.position.y);
        if (this.checkpoint_pos === null) {
            this.checkpoint_pos = new DE.Vector2(this.spawn_pos.x, this.spawn_pos.y);
        }
    }

    _detect_wall() {
        // Kalıcı düzeltme: prosedürel zeminin basamaklı Ground blokları (300px +
        // alt dolgu) artık duvar SAYILMAZ. Yalnız dar platform/duvar blokları
        // (genişlik < 80) ve oyuncunun ittiği yön dikkate alınır. One-way
        // platformlar zaten hariç tutulur.
        const eng = _engine();
        if (!eng || !eng.active_scene) return 0;
        const o = this.game_object;
        const axis = DE.Input.get_horizontal_axis();
        for (const side of [-1, 1]) {
            if (axis !== 0 && (axis < 0) !== (side < 0)) continue;  // itilmeyen yönü atla
            const colx = side < 0 ? o.position.x - 3 : o.position.x + o.size.x + 3;
            const probe = {
                x: Math.trunc(colx), y: Math.trunc(o.position.y + 6),
                w: 4, h: Math.trunc(o.size.y - 12),
            };
            for (const obj of eng.active_scene.game_objects) {
                if (!obj.active) continue;
                if (obj.tag !== "Ground" && obj.tag !== "Platform") continue;
                const col = obj.get_component(DE.BoxCollider);
                if (!col || col.is_trigger || col.one_way) continue;
                if (obj.tag === "Ground" && obj.size.x >= 90) continue;  // kalıcı zemin = duvar değil
                const r = col.get_aabb();
                if (_rects_overlap(probe, r)) return side;
            }
        }
        return 0;
    }

    update(dt) {
        if (!this.rb) return;

        // V2.0: ana menü modu — giriş yok, sabit durur (varsayılan modelle çizilir).
        if (this.menu_idle) {
            this.scale_x = 1.0;
            this.scale_y = 1.0;
            return;
        }

        if (this.dash_cooldown > 0) this.dash_cooldown -= dt;
        if (this.shoot_cooldown > 0) this.shoot_cooldown -= dt;

        // Hit-stop: hasar anında kısa donma (darbeli, ağır vuruş hissi).
        if (this.hitstop_timer > 0) {
            this.hitstop_timer -= dt;
            return;
        }

        // --- Zıplama 'pre-squash' (telgraf): çömel -> patla ---
        if (this.jump_squash_timer > 0) {
            this.jump_squash_timer -= dt;
            if (this.jump_squash_timer <= 0) {
                this.scale_x = 0.7;
                this.scale_y = 1.4;
            }
        }

        // --- Çimen/toz partikülleri (koşu puf + iniş tozu) ---
        if (this.rb.velocity.y >= 900.0 && !this.rb.is_grounded) {
            this.fall_streak_time += dt;
        } else if (this.rb.is_grounded) {
            this.fall_streak_time = 0.0;
        } else {
            this.fall_streak_time = Math.max(0.0, this.fall_streak_time - dt);
        }

        if (!this.was_grounded && this.rb.is_grounded) {
            if (this.particles) this.particles.burst(7, [150, 170, 120], [15, 55], [3, 5], [0.2, 0.4], 80.0, [16, this.game_object.size.y - 2]);
        }
        this.was_grounded = this.rb.is_grounded;

        // Son GÜVENLİ kara konumunu checkpoint olarak sakla (çukura düşünce buraya dönülür).
        if (this.rb.is_grounded && !this.menu_idle) {
            this.checkpoint_pos = new DE.Vector2(this.game_object.position.x, this.game_object.position.y);
        }

        // --- PowerUp zamanlayıcılarını azalt ---
        if (this.powerup_magnet > 0) this.powerup_magnet -= dt;
        if (this.powerup_triple > 0) this.powerup_triple -= dt;
        if (this.powerup_speed > 0) this.powerup_speed -= dt;
        if (this.powerup_slow > 0) {
            // Zaman katmanı: motor (Engine) kendi sayacını eritir; oyuncu yalnız aynalar.
            const _eng = _engine();
            if (_eng) this.powerup_slow = Math.max(0.0, _eng._time_slow_remaining);
            else this.powerup_slow = Math.max(0.0, this.powerup_slow - dt);
        }
        if (this.powerup_label_timer > 0) this.powerup_label_timer -= dt;

        // Magnet Pull: etraftaki yıldızları oyuncuya çek
        if (this.powerup_magnet > 0) {
            const eng = _engine();
            if (eng && eng.active_scene) {
                const px = this.game_object.position.x + 16;
                const py = this.game_object.position.y + 16;
                for (const obj of eng.active_scene.game_objects) {
                    if (obj.active && obj.tag === "Coin") {
                        const dx = px - obj.position.x;
                        const dy = py - obj.position.y;
                        const dist = Math.max(1.0, Math.sqrt(dx * dx + dy * dy));
                        const pull = Math.min(320.0, 8000.0 / dist);
                        obj.position.x += (dx / dist) * pull * dt;
                        obj.position.y += (dy / dist) * pull * dt;
                    }
                }
            }
        }

        // Speed Boost: koşarken parlayan ember izi
        if (this.powerup_speed > 0) {
            if (this.particles && DE._rng.rand() < 0.6) {
                this.particles.burst(2, [255, 200, 30], [10, 40], [3, 5], [0.2, 0.4], 0, [16, 24]);
            }
        }

        // Prosedürel Squash & Stretch Pürüzsüzleştirme (Lerp).
        // Çöl kumu: yerdeyken hafif basık kalır (görsel mini-biyom efekti).
        const squash_home_x = (this.biome === "desert" && this.rb.is_grounded) ? 1.05 : 1.0;
        const squash_home_y = (this.biome === "desert" && this.rb.is_grounded) ? 0.93 : 1.0;
        this.scale_x += (squash_home_x - this.scale_x) * Math.min(dt * 14.0, 1.0);
        this.scale_y += (squash_home_y - this.scale_y) * Math.min(dt * 14.0, 1.0);

        // Dash after-image ömür: dash sırasında da, bittikten sonra da yaşlanır;
        // age>=0.18 (alpha<=0 sınırı) üstü havuzdan düşer (kalıcı iz bug'ı fix).
        for (let i = this._afterimages.length - 1; i >= 0; i--) {
            this._afterimages[i][4] += dt;
            if (this._afterimages[i][4] >= 0.18) this._afterimages.splice(i, 1);
        }

        // Havada geçen süre + doğru iniş algılama
        if (!this.rb.is_grounded) {
            this.air_time += dt;
        } else {
            if (this.air_time > 0.10) {
                this.scale_x = 1.25;
                this.scale_y = 0.75;
                if (this.particles) this.particles.burst(6, [200, 220, 255], [15, 45], [2, 4], [0.15, 0.3], 30.0, [16, 30]);
            }
            this.air_time = 0.0;
        }

        // Dash Davranışı (ağırlık: hız rampalanır, bitince momentum kalır)
        if (this.dash_timer > 0) {
            this.dash_timer -= dt;
            this.rb.velocity.y = 0;
            this.dash_speed = Math.min(3.2, this.dash_speed + 8.0 * dt);
            this.rb.velocity.x = this.direction_dash * this.speed * this.dash_speed;
            const sand_dash = this.biome === "desert";
            if (this.particles && DE._rng.rand() < (sand_dash ? 0.9 : 0.5)) {
                // Çöl kumu: dash'te ayak hizasından kum sıçrar (mini-biyom efekti).
                this.particles.burst(sand_dash ? 4 : 2,
                    sand_dash ? [220, 180, 110] : [100, 220, 255],
                    [10, 40], [3, 5], [0.2, 0.4], 0,
                    sand_dash ? [0, this.game_object.size.y - 4] : [0, 0]);
            }
            // After-image: dash sırasında ~0.03s'de bir anlık görüntü
            this._afterimage_timer -= dt;
            if (this._afterimage_timer <= 0) {
                this._afterimage_timer = 0.03 / Math.max(1.0, this.dash_speed);
                this._afterimages.push([
                    this.game_object.position.x, this.game_object.position.y,
                    this.scale_x, this.scale_y, 0.0]);
                if (this._afterimages.length > 6) this._afterimages.shift();
            }
            if (this.dash_timer <= 0) {
                this.dash_momentum = this.direction_dash * this.speed * 1.6;
            }
            return;
        }

        // Yatay Hareket (klavye A/D + kumanda analog/D-Pad birleşik; speed powerup 1.7x)
        const move_x = DE.Input.get_horizontal_axis();
        if (move_x < 0) this.facing_dir = -1;
        else if (move_x > 0) this.facing_dir = 1;

        const speed_mult = this.powerup_speed > 0 ? 1.7 : 1.0;
        if (this.dash_momentum !== 0) {
            this.rb.velocity.x = this.dash_momentum;
            this.dash_momentum *= (1.0 - Math.min(dt * 4.0, 1.0));
            if (Math.abs(this.dash_momentum) < 20.0) this.dash_momentum = 0.0;
        } else {
            // Biome-feel: grip hedef hıza doğru karıştırır, wind hafif itme ekler.
            const target_x = move_x * this.speed * speed_mult + this.biome_wind;
            if (this.biome_grip >= 1.0) {
                this.rb.velocity.x = target_x;
            } else {
                const blend = (this.biome_grip + 0.5);
                this.rb.velocity.x += (target_x - this.rb.velocity.x) * Math.min(dt * (this.rb.is_grounded ? 14.0 : 6.0) * blend, 1.0);
            }
        }

        // --- Coyote Time & Jump Buffer (zıplama affı) ---
        if (this.rb.is_grounded) this.coyote_timer = this.COAYOTE_TIME;
        else this.coyote_timer = Math.max(0.0, this.coyote_timer - dt);

        const jump_down = DE.Input.get_key_down("SPACE") || DE.Input.get_key_down("W") || DE.Input.get_key_down("UP");
        if (jump_down) this.jump_buffer_timer = this.JUMP_BUFFER;
        else this.jump_buffer_timer = Math.max(0.0, this.jump_buffer_timer - dt);

        if (this.rb.is_grounded) this.can_double_jump = true;

        // --- Wall-slide algılama ---
        if (this.rb.is_grounded || this.dash_timer > 0) this.wall_dir = 0;
        else this.wall_dir = this._detect_wall();
        this.wall_sliding = this.wall_dir !== 0;
        if (this.wall_sliding) {
            this.facing_dir = this.wall_dir;
            if (this.rb.velocity.y > this.wall_slide_speed) this.rb.velocity.y = this.wall_slide_speed;
            if (this.particles && DE._rng.rand() < 0.4) {
                const wx = this.game_object.position.x + (this.wall_dir < 0 ? 0 : this.game_object.size.x);
                this.particles.burst(1, [200, 210, 230], [10, 30], [2, 3], [0.2, 0.4], 20.0, [wx - this.game_object.position.x, this.game_object.size.y - 6]);
            }
        }

        // Zıplamayı uygula: wall jump > yer zıplaması > çift zıplama önceliği
        if (this.jump_buffer_timer > 0) {
            if (this.wall_sliding) {
                this.rb.velocity.x = -this.wall_dir * this.wall_jump_x;
                this.rb.velocity.y = -this.wall_jump_y;
                this.rb.is_grounded = false;
                this.coyote_timer = 0.0;
                this.jump_buffer_timer = 0.0;
                this.facing_dir = -this.wall_dir;
                // Çift zıplama yenilenmez: wall jump yeni çift zıplama vermez.
                this.scale_x = 1.5;
                this.scale_y = 0.6;
                this.jump_squash_timer = 0.06;
                DE.SoundFX.play_jump();
                this._screen_shake(0.1);
                if (this.particles) {
                    const wx = this.game_object.position.x + (this.wall_dir < 0 ? 0 : this.game_object.size.x);
                    this.particles.burst(12, [220, 225, 245], [40, 120], [3, 5], [0.25, 0.5], 20.0, [wx - this.game_object.position.x, this.game_object.size.y - 6]);
                }
            } else if (this.rb.is_grounded || this.coyote_timer > 0) {
                this.rb.velocity.y = -this.jump_force * this.biome_jump;
                this.rb.is_grounded = false;
                this.coyote_timer = 0.0;
                this.jump_buffer_timer = 0.0;
                this.scale_x = 1.6;
                this.scale_y = 0.55;
                this.jump_squash_timer = 0.06;
                DE.SoundFX.play_jump();
                if (this.particles) this.particles.burst(8, [200, 220, 255], [20, 70], [2, 4], [0.2, 0.4], 40.0, [16, 30]);
            } else if (this.can_double_jump) {
                this.rb.velocity.y = -this.jump_force * 0.9 * this.biome_jump;
                this.can_double_jump = false;
                this.jump_buffer_timer = 0.0;
                this.scale_x = 1.45;
                this.scale_y = 0.6;
                this.jump_squash_timer = 0.05;
                DE.SoundFX.play_jump();
                if (this.particles) this.particles.burst(16, [120, 240, 255], [40, 120], [3, 5], [0.3, 0.5], 20.0, [16, 16]);
            }
        }

        // --- Değişken zıplama yüksekliği (kısa/tam zıplama) ---
        if (this._bounce_timer > 0) {
            this._bounce_timer -= dt;
        } else {
            const jump_held = DE.Input.get_key("SPACE") || DE.Input.get_key("W") || DE.Input.get_key("UP");
            if (!jump_held && this.rb.velocity.y < -400) this.rb.velocity.y = -400;
        }

        // --- Düşerken ekstra yerçekimi (ağır iniş hissi) ---
        if (this.rb.velocity.y > 0) this.rb.velocity.y += 550 * dt;

        // Koşu puf: yerdeyken ayak altından periyodik çimen tozları
        if (this.rb.is_grounded && Math.abs(this.rb.velocity.x) > 60 && this.particles) {
            this.run_puff_timer -= dt;
            if (this.run_puff_timer <= 0) {
                this.run_puff_timer = 0.09;
                this.particles.burst(1, [160, 180, 130], [4, 20], [2, 4], [0.15, 0.35], 30.0, [16, this.game_object.size.y - 2]);
            }
        }

        // Dash (LSHIFT)
        if (DE.Input.get_key_down("LSHIFT") && this.dash_cooldown <= 0) {
            this.dash_timer = 0.16;
            this.dash_cooldown = 0.6;
            this.dash_speed = 2.3;
            this.direction_dash = this.facing_dir;
            this.dash_momentum = 0.0;
            this.scale_x = 1.45;
            this.scale_y = 0.75;
            const eng = _engine();
            if (eng && eng.active_scene) eng.active_scene.kick_camera(this.facing_dir * 20, 0);
            this.rb.velocity.x = this.facing_dir * this.speed * 2.3;
            DE.SoundFX.play_jump();
            if (this.particles) this.particles.burst(15, [80, 200, 255], [30, 100], [3, 6], [0.25, 0.5], 0, [16, 16]);
        }

        // Ateş (F veya Sol Tık)
        if ((DE.Input.get_key_down("F") || DE.Input.get_mouse_button_down(0)) && this.shoot_cooldown <= 0) {
            this.shoot_bullet();
        }

        // Dünyanın altına düşünce: son güvenli kara konumuna (checkpoint) dön.
        if (this.game_object.position.y > 900) {
            if (this.health) this.health.take_damage(1);
            this.respawn(true);
        }

        // Can & Skor UI Güncelleme
        if (this.health && this.health_text_obj) {
            const txt = this.health_text_obj.get_component(DE.TextRenderer);
            if (txt) {
                let hearts = "❤️ ".repeat(this.health.current_hp) + "🖤 ".repeat(Math.max(0, this.health.max_hp - this.health.current_hp));
                const shield_icon = this.powerup_shield ? " 🛡️" : "";
                txt.text = `${DE.I18n.t("health")}: ${hearts}${shield_icon}`;
            }
        }

        // Kampanya: görünen skor = kalıcı taban + aktif sektör toplamı.
        if (DE_GAME.state.game_mode === "campaign") {
            this.score = DE_GAME.state.campaign_state["score"] + DE_GAME.state.campaign_state["sector_score"];
        } else if (DE_GAME.state.game_mode === "endless") {
            this.score = DE_GAME.state.endless_state["score"];
        }

        if (this.score_text_obj) {
            const txt = this.score_text_obj.get_component(DE.TextRenderer);
            if (txt) txt.text = `${DE.I18n.t("score")}: ${this.score}`;
        }

        // Streak: pencerede yeni coin toplanmazsa zincir sıfırlanır.
        if (this.streak_timer > 0.0) {
            this.streak_timer -= dt;
            if (this.streak_timer <= 0.0) {
                this.coin_streak = 0;
                this.streak_timer = 0.0;
            }
        }
        const mult = this._streak_multiplier();
        if (this.streak_text_obj) {
            const txt = this.streak_text_obj.get_component(DE.TextRenderer);
            if (txt) {
                if (mult > 1) {
                    txt.text = DE.I18n.localize("streak_x", { n: mult });
                    txt.color = mult === 2 ? [255, 200, 60] : (mult === 3 ? [255, 170, 40] : [255, 120, 30]);
                } else {
                    txt.text = "";
                }
            }
        }

        // Aktif PowerUp bildirimi (kalkan her zaman, diğerleri sürelerince)
        if (this.powerup_label_text_obj) {
            const ltxt = this.powerup_label_text_obj.get_component(DE.TextRenderer);
            if (ltxt) {
                let label_key = "";
                if (this.powerup_shield) label_key = "pu_shield";
                else if (this.powerup_label_timer > 0 && this.powerup_label_text) label_key = "pu_" + this.powerup_label_text;
                ltxt.text = label_key ? DE.I18n.t(label_key) : "";
            }
        }
    }

    apply_powerup(power_type, duration) {
        this.powerup_label_timer = power_type === "shield" ? 3.0 : duration;
        this.powerup_label_text = power_type;
        if (power_type === "magnet") this.powerup_magnet = duration;
        else if (power_type === "triple") this.powerup_triple = duration;
        else if (power_type === "shield") this.powerup_shield = true;
        else if (power_type === "speed") this.powerup_speed = duration;
        else if (power_type === "slow") {
            this.powerup_slow = duration;
            const _eng = _engine();
            if (_eng) _eng._time_slow_remaining = duration;
        }
    }

    shoot_bullet() {
        this.shoot_cooldown = 0.22;
        DE.SoundFX.play("shoot");
        this.scale_x = 1.15;
        this.scale_y = 0.9;

        const engine = _engine();
        if (!engine || !engine.active_scene) return;

        const bx = this.game_object.position.x + (this.facing_dir > 0 ? 34 : -14);
        const by = this.game_object.position.y + 10;

        let directions;
        if (this.powerup_triple > 0) {
            directions = [
                new DE.Vector2(this.facing_dir, 0),
                new DE.Vector2(this.facing_dir, -0.5),
                new DE.Vector2(this.facing_dir, 0.5),
            ];
        } else {
            directions = [new DE.Vector2(this.facing_dir, 0)];
        }

        for (const d of directions) {
            const bullet = new DE.GameObject("Bullet", bx, by, 12, 12, "Bullet");
            bullet.add_component(new DE.SpriteRenderer([80, 220, 255], "circle"));
            bullet.add_component(new DE.BoxCollider(true, false));
            bullet.add_component(new DE.ParticleEmitter());
            bullet.add_component(new DE.LightSource(80, [100, 220, 255], 0.9));
            bullet.add_component(new DE.Projectile(d, 580.0, 25, false));
            engine.active_scene.add_object(bullet);
        }

        if (this.particles) this.particles.burst(6, [140, 240, 255], [20, 60], [2, 4], [0.15, 0.3], [16, 16]);
    }

    respawn(recover = false) {
        const target = (recover && this.checkpoint_pos !== null) ? this.checkpoint_pos : this.spawn_pos;
        this.game_object.position.x = target.x;
        this.game_object.position.y = target.y;
        this.rb.velocity.x = 0;
        this.rb.velocity.y = 0;
    }

    _record_score() {
        if (this._profile === null) this._profile = DE_GAME.savegame();
        this._profile.update_high_score("high_score", this.score);
    }

    _streak_multiplier() {
        if (this.coin_streak >= 15) return 4;
        if (this.coin_streak >= 10) return 3;
        if (this.coin_streak >= 5) return 2;
        return 1;
    }

    _add_score(amount) {
        if (DE_GAME.state.game_mode === "campaign") {
            DE_GAME.state.campaign_state["sector_score"] += amount;
            this.score = DE_GAME.state.campaign_state["score"] + DE_GAME.state.campaign_state["sector_score"];
        } else if (DE_GAME.state.game_mode === "endless") {
            DE_GAME.state.endless_state["score"] += amount;
            this.score = DE_GAME.state.endless_state["score"];
        } else {
            this.score += amount;
        }
        this._record_score();
    }

    _screen_shake(amount) {
        const eng = _engine();
        if (eng && eng.active_scene) eng.active_scene.add_shake(amount);
    }

    on_collision(other) {
        if (other.tag === "Coin" && other.active) {
            other.active = false;
            this.coin_streak += 1;
            this.streak_timer = this.STREAK_WINDOW;
            const mult = this._streak_multiplier();
            this._add_score(10 * mult);
            DE.SoundFX.play("coin");
            if (this.particles) {
                const rel_x = other.position.x - this.game_object.position.x + 8;
                const rel_y = other.position.y - this.game_object.position.y + 8;
                this.particles.burst(40, [255, 235, 80], [80, 240], [3, 7], [0.4, 0.8], 120.0, [rel_x, rel_y]);
                this.particles.burst(16, [255, 255, 255], [40, 140], [2, 4], [0.2, 0.5], 0, [rel_x, rel_y]);
            }
            this._screen_shake(0.06);
            DE_GAME._spawn_float_score(other.position.x + 8, other.position.y, `+${10 * mult}`,
                mult === 1 ? [255, 215, 50] : (mult === 2 ? [255, 200, 80] : (mult === 3 ? [255, 170, 40] : [255, 120, 30])));
            this._check_all_coins_collected();

        } else if (other.tag === "Enemy" && other.active) {
            // Spawn grace: henüz yanıp sönen (SpawnIn) düşman zararsızdır --
            // telegraf oyuncuya gerçekten söz veriyorsa dokunma hasar vermemeli.
            if (_is_spawning_in(other)) return;
            // Stun dash: hızlıyken düşmana çarpmak onu sersemletir; hasar alınmaz.
            if (this.dash_timer > 0 || Math.abs(this.dash_momentum) > 40) {
                this._stun_enemy_dash(other);
            } else if (this.rb.velocity.y > 50 && this.game_object.position.y + this.game_object.size.y <= other.position.y + 16) {
                other.active = false;
                this.rb.velocity.y = -this.jump_force * 0.75;
                this._add_score(30);
                DE.SoundFX.play("coin");
                if (this.particles) this.particles.burst(25, [255, 80, 80], [80, 200], [3, 7], [0.3, 0.6], [16, 28]);
            } else {
                if (this.powerup_shield) {
                    this.powerup_shield = false;
                    DE.SoundFX.play("shield_break");
                    if (this.particles) this.particles.burst(30, [100, 200, 255], [80, 220], [3, 7], [0.3, 0.6], [16, 16]);
                } else if (this.health) {
                    this.health.take_damage(1);
                    this.hitstop_timer = 0.06;
                    this.rb.velocity.x = -this.facing_dir * 250;
                    this.rb.velocity.y = -220;
                    this._screen_shake(0.3);
                }
            }

        } else if (other.tag === "Boss" && other.active) {
            // Dash (ya da momentum) ile boss'a çarpmak hasar vermez (boss sersemlemez).
            if (this.dash_timer > 0 || Math.abs(this.dash_momentum) > 40) {
                this.rb.velocity.x = -this.facing_dir * 160;
                this.rb.velocity.y = -140;
                DE.SoundFX.play("hit");
                this._screen_shake(0.1);
            } else if (this.powerup_shield) {
                this.powerup_shield = false;
                DE.SoundFX.play("shield_break");
                if (this.particles) this.particles.burst(40, [100, 200, 255], [100, 280], [4, 8], [0.4, 0.7], [16, 16]);
            } else if (this.health) {
                this.health.take_damage(1, 1.15);
                this.hitstop_timer = 0.09;
                this.rb.velocity.x = -this.facing_dir * 320;
                this.rb.velocity.y = -280;
                this._screen_shake(0.45);
            }

        } else if (other.tag === "Hazard") {
            // Spike'larda dash geçişi hasar/respawn yapmaz.
            if (this.dash_timer > 0 || Math.abs(this.dash_momentum) > 40) {
                // geçiş — zararsız
            } else {
                let hit = false;
                if (this.powerup_shield) {
                    this.powerup_shield = false;
                    DE.SoundFX.play("shield_break");
                    hit = true;
                } else if (this.health) {
                    hit = this.health.take_damage(1);
                }
                if (hit) {
                    this.hitstop_timer = 0.05;
                    this.rb.velocity.x = -this.facing_dir * 220;
                    this.rb.velocity.y = -330;
                    this._screen_shake(0.35);
                    if (this.particles) this.particles.burst(12, [255, 80, 80], [60, 180], [3, 6], [0.25, 0.5], [16, 16]);
                }
            }
        }
    }

    _stun_enemy_dash(enemy_obj) {
        for (const comp of enemy_obj.components) {
            if (comp.stun_timer !== undefined) comp.stun_timer = 1.2;
        }
        DE.SoundFX.play("hit");
        this._screen_shake(0.12);
        this.rb.velocity.x = -this.facing_dir * 60;
        this.rb.velocity.y = -140;
    }

    on_beam_hit() {
        // Keskin nişancı lazeri: kalkan emer, aksi halde can kaybı (i-frame'lerle).
        if (this.powerup_shield) {
            this.powerup_shield = false;
            DE.SoundFX.play("shield_break");
            if (this.particles) this.particles.burst(30, [100, 200, 255], [80, 220], [3, 7], [0.3, 0.6], [16, 16]);
        } else if (this.health) {
            this.health.take_damage(1);
            this.hitstop_timer = 0.06;
            this._screen_shake(0.3);
        }
    }

    _check_all_coins_collected() {
        const engine = _engine();
        if (!engine || !engine.active_scene) return;
        const remaining = engine.active_scene.game_objects.filter(o => o.active && o.tag === "Coin");
        const portal_obj = engine.active_scene.find_by_tag("Portal");
        if (portal_obj) {
            const portal_comp = portal_obj.get_component(DE_GAME.GoalPortal);
            if (portal_comp) {
                if (remaining.length === 0) {
                    portal_comp.unlock();
                    if (this.goal_text_obj) {
                        const txt = this.goal_text_obj.get_component(DE.TextRenderer);
                        if (txt) {
                            txt.text = DE.I18n.t("portal_unlocked");
                            txt.color = [50, 255, 150];
                        }
                    }
                } else {
                    if (this.goal_text_obj) {
                        const txt = this.goal_text_obj.get_component(DE.TextRenderer);
                        if (txt) {
                            txt.text = `${DE.I18n.t("remaining_stars")}: ${remaining.length} (${DE.I18n.t("stars_goal_desc")})`;
                        }
                    }
                }
            }
        }
    }

    apply_biome(biome) {
        this.biome = biome || "forest";
        // Biyoma özel fizikler MINIMUM tutulur: zıplama/yayçekimi/rüzgar her biyomda
        // AYNI kalsın (normal + çift zıplama tutarlı). Yalnız yüzey hissi değişir:
        //   - ice: kaygan zemin (grip 0.55)
        //   - desert: kuma hafif gömülme (squash üstte) + dash'te kum sıçraması
        this.biome_gravity = 1.0;
        this.biome_jump = 1.0;
        this.biome_wind = 0.0;
        this.biome_grip = (biome === "ice") ? 0.55 : 1.0;
        const rb = this.game_object.get_component(DE.Rigidbody2D);
        // Oyuncu taban yerçekimi 1400 (bkz. _build_player); biyomlar artık ölçüsünde.
        if (rb !== null) rb.gravity = 1400.0 * this.biome_gravity;
    }

    draw(ctx, camera_offset) {
        if (this.health && this.health.is_invulnerable()) {
            if (Math.trunc(this.health.flash_timer * 15) % 2 === 0) return;
        }

        const o = this.game_object;
        const base_w = o.size.x;
        const base_h = o.size.y;
        const anim_w = base_w * this.scale_x;
        const anim_h = base_h * this.scale_y;

        const sx = Math.trunc(o.position.x - camera_offset.x - (anim_w - base_w) / 2);
        const sy = Math.trunc(o.position.y - camera_offset.y - (anim_h - base_h));

        // Hız çizgileri (deneyim 7): hızlı düşüşte üst kenardan inen çizgiler.
        if (this.fall_streak_time > 0.12 && this.rb && this.rb.velocity.y >= 900.0) {
            const intensity = Math.min(1.0, (this.fall_streak_time - 0.12) / 0.5 + 0.3);
            const n = Math.trunc(4 + 4 * intensity);
            const w = ctx.canvas && ctx.canvas.width ? ctx.canvas.width : 900;
            const h = ctx.canvas && ctx.canvas.height ? ctx.canvas.height : 600;
            const px = sx + Math.trunc(anim_w / 2);
            for (let i = 0; i < n; i++) {
                const t = (DE_GAME._now_ms() * 0.020 + i * 0.31) % 1.0;
                const lx = Math.trunc(w * (0.12 + 0.76 * t));
                const ln = 26 + Math.trunc(46 * intensity);
                ctx.strokeStyle = "rgb(210,225,255)";
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(lx, -2); ctx.lineTo(lx, ln); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(lx, h + 2); ctx.lineTo(lx, h - ln); ctx.stroke();
            }
            void px;
        }

        // Dash after-image hayaletleri (oyuncunun ARKASINDA çizilir).
        for (const [gx, gy, gscx, gscy, age] of this._afterimages) {
            if (gscx <= 0 || gscy <= 0) continue;
            const gw = base_w * gscx;
            const gh = base_h * gscy;
            const ix = Math.trunc(gx - camera_offset.x - (gw - base_w) / 2);
            const iy = Math.trunc(gy - camera_offset.y - (gh - base_h));
            const alpha = Math.max(0, Math.trunc(110 * (1.0 - age / 0.18)));
            if (alpha <= 0) continue;
            ctx.globalAlpha = alpha / 255;
            ctx.fillStyle = "rgb(80,190,245)";
            _round_rect(ctx, ix, iy, Math.trunc(gw), Math.trunc(gh), 6);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Speed powerup: karakter sarı parlar
        if (this.powerup_speed > 0) {
            const pulse = Math.trunc(30 + 20 * Math.sin(DE_GAME._now_ms() * 0.015));
            ctx.strokeStyle = `rgb(255,220,30)`;
            ctx.lineWidth = 2;
            _round_rect(ctx, sx - 3, sy - 3, Math.trunc(anim_w) + 6, Math.trunc(anim_h) + 6, 8);
            ctx.stroke();
            void pulse;
        }

        // Karakter Gövdesi
        ctx.fillStyle = "rgb(60,200,245)";
        _round_rect(ctx, sx, sy, Math.trunc(anim_w), Math.trunc(anim_h), 6);
        ctx.fill();

        // Gözler
        const eo = this.facing_dir > 0 ? 3 : -3;
        ctx.fillStyle = "rgb(15,20,35)";
        ctx.beginPath(); ctx.arc(sx + Math.trunc(anim_w * 0.3) + eo, sy + Math.trunc(anim_h * 0.35), 3, 0, 6.283185307); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + Math.trunc(anim_w * 0.7) + eo, sy + Math.trunc(anim_h * 0.35), 3, 0, 6.283185307); ctx.fill();
        ctx.fillStyle = "rgb(255,255,255)";
        ctx.beginPath(); ctx.arc(sx + Math.trunc(anim_w * 0.3) + eo + 1, sy + Math.trunc(anim_h * 0.35) - 1, 1, 0, 6.283185307); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + Math.trunc(anim_w * 0.7) + eo + 1, sy + Math.trunc(anim_h * 0.35) - 1, 1, 0, 6.283185307); ctx.fill();

        // Kalkan: parlayan mavi halka
        if (this.powerup_shield) {
            const cx = sx + Math.trunc(anim_w / 2);
            const cy = sy + Math.trunc(anim_h / 2);
            const radius = Math.trunc(Math.max(anim_w, anim_h) * 0.75);
            ctx.strokeStyle = "rgb(80,180,255)";
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(cx, cy, radius, 0, 6.283185307); ctx.stroke();
            ctx.strokeStyle = "rgb(140,220,255)";
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(cx, cy, radius + 4, 0, 6.283185307); ctx.stroke();
        }

        // Magnet: mor halka
        if (this.powerup_magnet > 0) {
            const cx = sx + Math.trunc(anim_w / 2);
            const cy = sy + Math.trunc(anim_h / 2);
            const r = Math.trunc(35 + 8 * Math.sin(DE_GAME._now_ms() * 0.008));
            ctx.strokeStyle = "rgb(200,80,255)";
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283185307); ctx.stroke();
        }

        // Triple-shot: turuncu namlu göstergesi
        if (this.powerup_triple > 0) {
            const tip_x = sx + (this.facing_dir > 0 ? Math.trunc(anim_w) : 0);
            const tip_y = sy + Math.trunc(anim_h / 2);
            ctx.fillStyle = "rgb(255,140,30)";
            ctx.beginPath(); ctx.arc(tip_x, tip_y, 5, 0, 6.283185307); ctx.fill();
            ctx.fillStyle = "rgb(255,200,80)";
            ctx.beginPath(); ctx.arc(tip_x, tip_y, 3, 0, 6.283185307); ctx.fill();
        }
    }
};

function _round_rect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, r);
    } else {
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
}

/* ---------------------------------------------------------------------------
 * GOAL PORTAL
 * ------------------------------------------------------------------------ */

DE_GAME.GoalPortal = class GoalPortal extends DE.Component {
    constructor(next_scene_factory) {
        super();
        this.next_scene_factory = next_scene_factory;
        this.is_unlocked = false;
    }

    unlock() {
        this.is_unlocked = true;
        const renderer = this.game_object.get_component(DE.SpriteRenderer);
        if (renderer) renderer.color = [120, 255, 180];
        const particles = this.game_object.get_component(DE.ParticleEmitter);
        if (particles) particles.burst(30, [100, 255, 200], [50, 150], [3, 6], [0.5, 0.9], [20, 30]);
        const light = this.game_object.get_component(DE.LightSource);
        if (light) {
            light.color = [100, 255, 180];
            light.base_radius = 200;
        }
    }

    update(dt) {
        if (this.is_unlocked) {
            const particles = this.game_object.get_component(DE.ParticleEmitter);
            if (particles && DE._rng.rand() < 0.3) {
                particles.burst(2, [150, 255, 220], [20, 60], [2, 4], [0.4, 0.7], [20, 20]);
            }
        }
    }

    on_collision(other) {
        if (other.tag === "Player" && this.is_unlocked) {
            DE.SoundFX.play("win");
            if (this.next_scene_factory === null) return;
            const next_scene = this.next_scene_factory();
            if (next_scene === null) return;
            DE.Engine.switch_scene(next_scene);
        }
    }
};

/* ---------------------------------------------------------------------------
 * STANDART DÜŞMANLAR & PLATFORMLAR
 * ------------------------------------------------------------------------ */

// "Sessiz Deneyim" uyanış (trigger) sistemi: düşman oyuncu wake_radius'ine
// girinceye kadar uyur (hareketsiz/ateşsiz). Uyanan kalıcı olarak uyanır.
function _is_spawning_in(obj) {
    // Python game/entities.py _is_spawning_in: SpawnIn telegrafı sürerken zararsız.
    for (const c of obj.components || []) {
        if (c instanceof DE.SpawnIn && !c.done) return true;
    }
    return false;
}

function _wake_up(component) {
    const obj = component.game_object;
    if (component._awake) return true;
    const scene = _scene();
    if (scene === null) return false;
    const player = scene.find_by_tag("Player");
    if (!player || !player.active) return false;
    // SpawnIn animasyonu sırasında uyanma yok (pusuları engeller).
    if (_is_spawning_in(obj)) return false;
    const radius = component.wake_radius !== undefined ? component.wake_radius : 380.0;
    if (Math.abs(player.position.x - obj.position.x) <= radius) {
        component._awake = true;
        return true;
    }
    return false;
}

DE_GAME.PatrolEnemy = class PatrolEnemy extends DE.Component {
    constructor(patrol_distance = 120.0, speed = 70.0, wake_radius = 380.0) {
        super();
        this.distance = patrol_distance;
        this.speed = speed;
        this.wake_radius = wake_radius;
        this._awake = false;
        this.start_x = 0.0;
        this.direction = 1;
        this._turn_cooldown = 0.0;
        this.stun_timer = 0.0;
        this._sprite = null;
        this._base_color = [200, 60, 60];
    }

    start() {
        this.start_x = this.game_object.position.x;
        this._sprite = this.game_object.get_component(DE.SpriteRenderer);
        if (this._sprite) this._base_color = [...this._sprite.color];
    }

    _static_ground_rects() {
        const scene = _scene();
        if (scene === null) return [];
        const rects = [];
        for (const tag of ["Ground", "Platform"]) {
            for (const obj of scene.find_all_by_tag(tag)) {
                const col = obj.get_component(DE.BoxCollider);
                if (col) rects.push(col.get_aabb());
            }
        }
        return rects;
    }

    update(dt) {
        const o = this.game_object;
        if (!_wake_up(this)) return;
        dt = DE._slow_dt(dt);
        if (this.stun_timer > 0) {
            this.stun_timer -= dt;
            if (this._sprite) this._sprite.color = this.stun_timer > 0 ? [255, 235, 80] : this._base_color;
            return;
        }
        const forward = this.direction;
        this._turn_cooldown = Math.max(0.0, this._turn_cooldown - dt);

        const grounds = this._static_ground_rects();
        const fwd_edge = o.position.x + (forward > 0 ? o.size.x : 0);

        let turn = false;
        // 1) ÖNDE DUVAR/YÜKSELEN ZEMİN
        const wall = new DE.Rect(
            Math.trunc(fwd_edge) + (forward > 0 ? 2 : -2),
            Math.trunc(o.position.y - 2), 2, Math.trunc(o.size.y - 2));
        if (grounds.some(g => wall.overlaps(g))) turn = true;
        else {
            // 2) BOŞLUK: ayak altında zemin yok
            const foot = new DE.Rect(
                Math.trunc(fwd_edge - o.size.x / 2) - (forward < 0 ? 1 : 0),
                Math.trunc(o.position.y + o.size.y - 2), Math.trunc(o.size.x), 18);
            if (!grounds.some(g => foot.overlaps(g))) turn = true;
        }

        if (turn && this._turn_cooldown <= 0) {
            this.direction *= -1;
            this._turn_cooldown = 0.4;
            return;
        }

        // 3) İz sınırı: start_x'ten çok uzaklaşınca geri dön
        o.position.x += this.speed * forward * dt;
        if (Math.abs(o.position.x - this.start_x) >= this.distance && this._turn_cooldown <= 0) {
            this.direction *= -1;
            this._turn_cooldown = 0.4;
        }
    }

    draw(ctx, camera_offset) {
        const sx = Math.trunc(this.game_object.position.x - camera_offset.x);
        const sy = Math.trunc(this.game_object.position.y - camera_offset.y);
        ctx.fillStyle = "rgb(255,255,255)";
        ctx.beginPath(); ctx.arc(sx + 8, sy + 10, 3, 0, 6.283185307); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + 20, sy + 10, 3, 0, 6.283185307); ctx.fill();
        ctx.fillStyle = "rgb(0,0,0)";
        ctx.beginPath(); ctx.arc(sx + (this.direction > 0 ? 9 : 7), sy + 10, 1, 0, 6.283185307); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + (this.direction > 0 ? 21 : 19), sy + 10, 1, 0, 6.283185307); ctx.fill();
    }
};

DE_GAME.FlyerEnemy = class FlyerEnemy extends DE.Component {
    constructor(patrol_distance = 160.0, speed = 55.0, wake_radius = 400.0) {
        super();
        this.distance = patrol_distance;
        this.speed = speed;
        this.wake_radius = wake_radius;
        this._awake = false;
        this.start_x = 0.0;
        this.base_y = 0.0;
        this.direction = 1;
        this.stun_timer = 0.0;
        this._sprite = null;
        this._base_color = [120, 180, 220];
    }

    start() {
        this.start_x = this.game_object.position.x;
        this.base_y = this.game_object.position.y;
        this._sprite = this.game_object.get_component(DE.SpriteRenderer);
        if (this._sprite) this._base_color = [...this._sprite.color];
    }

    update(dt) {
        if (!_wake_up(this)) return;
        dt = DE._slow_dt(dt);
        if (this.stun_timer > 0) {
            this.stun_timer -= dt;
            if (this._sprite) this._sprite.color = this.stun_timer > 0 ? [255, 235, 80] : this._base_color;
            return;
        }
        this.game_object.position.x += this.speed * this.direction * dt;
        if (Math.abs(this.game_object.position.x - this.start_x) >= this.distance) {
            this.direction *= -1;
        }
        // Dikey salınım motorun KeyframeAnimator'u tarafından yapılır (seviye
        // kurucusu ekler) — bu bileşen yalnız saf-hareket.
    }
};

DE_GAME.HopperEnemy = class HopperEnemy extends DE.Component {
    constructor(hop_force = 420.0, hop_interval = 1.1, speed = 40.0, wake_radius = 380.0) {
        super();
        this.hop_force = hop_force;
        this.hop_interval = hop_interval;
        this.speed = speed;
        this.wake_radius = wake_radius;
        this._awake = false;
        this.timer = 0.0;
        this.direction = 1;
        this.stun_timer = 0.0;
        this._sprite = null;
        this._base_color = [190, 90, 160];
    }

    start() {
        this._sprite = this.game_object.get_component(DE.SpriteRenderer);
        if (this._sprite) this._base_color = [...this._sprite.color];
    }

    update(dt) {
        if (!_wake_up(this)) return;
        dt = DE._slow_dt(dt);
        if (this.stun_timer > 0) {
            this.stun_timer -= dt;
            const rb = this.game_object.get_component(DE.Rigidbody2D);
            if (rb) rb.velocity.x = 0.0;
            if (this._sprite) this._sprite.color = this.stun_timer > 0 ? [255, 235, 80] : this._base_color;
            return;
        }
        this.timer += dt;
        const obj = this.game_object;
        const rb = obj.get_component(DE.Rigidbody2D);
        if (rb === null) return;
        rb.velocity.x = this.speed * this.direction;
        if (rb.is_grounded && this.timer >= this.hop_interval) {
            this.timer = 0.0;
            rb.velocity.y = -this.hop_force;
            rb.is_grounded = false;
        }
    }
};

DE_GAME.TurretEnemy = class TurretEnemy extends DE.Component {
    constructor(fire_interval = 2.0, bullet_speed = 240.0, bullet_damage = 25, range = 460.0, wake_radius = 330.0) {
        super();
        this.fire_interval = fire_interval;
        this.bullet_speed = bullet_speed;
        this.bullet_damage = bullet_damage;
        this.range = range;
        this.wake_radius = wake_radius;
        this._awake = false;
        this.timer = 0.6;
        this.telegraph_time = 0.35;
        this._sprite = null;
        this._base_color = [255, 90, 60];
        this.stun_timer = 0.0;
    }

    start() {
        this._sprite = this.game_object.get_component(DE.SpriteRenderer);
        if (this._sprite) this._base_color = [...this._sprite.color];
    }

    _apply_telegraph(dt) {
        if (this._sprite === null) return;
        const warn = this.timer >= (this.fire_interval - this.telegraph_time);
        if (warn) {
            const blink = (Math.trunc(this.timer * 14) % 2) === 0;
            this._sprite.color = blink ? [255, 70, 40] : this._base_color;
        } else {
            this._sprite.color = this._base_color;
        }
    }

    update(dt) {
        if (!_wake_up(this)) return;
        dt = DE._slow_dt(dt);
        if (this.stun_timer > 0) {
            this.stun_timer -= dt;
            if (this._sprite) this._sprite.color = this.stun_timer > 0 ? [255, 235, 80] : this._base_color;
            return;
        }
        this.timer += dt;
        this._apply_telegraph(dt);
        if (this.timer < this.fire_interval) return;
        const obj = this.game_object;
        const scene = _scene();
        if (scene === null) return;
        const player = scene.find_by_tag("Player");
        if (!player || !player.active) return;
        const dx = player.position.x - obj.position.x;
        const dy = player.position.y - obj.position.y;
        if (Math.abs(dx) > this.range) return;

        this.timer = 0.0;
        const bullet = new DE.GameObject("EnemyBullet", obj.position.x + obj.size.x / 2 - 4,
            obj.position.y + obj.size.y / 2 - 4, 8, 8, "EnemyBullet");
        bullet.add_component(new DE.SpriteRenderer([255, 90, 60], "circle"));
        bullet.add_component(new DE.BoxCollider(false, false));
        bullet.add_component(new DE.ParticleEmitter());
        bullet.add_component(new DE.Projectile(new DE.Vector2(dx, dy), this.bullet_speed, this.bullet_damage, true, 2.5));
        scene.add_object(bullet);
        DE.SoundFX.play("shoot");
        if (this._sprite) this._sprite.color = this._base_color;
    }
};

DE_GAME.SniperEnemy = class SniperEnemy extends DE.Component {
    constructor(fire_interval = 3.2, aim_time = 1.1, lock_time = 0.85,
                beam_width = 6, range = 900.0, wake_radius = 520.0) {
        super();
        this.fire_interval = fire_interval;
        this.aim_time = aim_time;
        this.lock_time = lock_time;
        this.beam_width = beam_width;
        this.range = range;
        this.wake_radius = wake_radius;
        this._awake = false;
        this.stun_timer = 0.0;
        this.timer = 0.0;
        this._sprite = null;
        this._base_color = [120, 200, 90];
        this._target_x = null;
        this._target_y = null;
        this._lock_x = null;
        this._lock_y = null;
        this._locked = false;
        this.__aim_state = "aim";
        this._beam_flash = 0.0;
    }

    start() {
        this._sprite = this.game_object.get_component(DE.SpriteRenderer);
        if (this._sprite) this._base_color = [...this._sprite.color];
    }

    _phase() {
        const t = this.timer % this.fire_interval;
        if (t >= this.fire_interval - this.lock_time) return "lock";
        return "aim";
    }

    _find_player() {
        const scene = _scene();
        if (scene === null) return null;
        const p = scene.find_by_tag("Player");
        if (!p || !p.active) return null;
        return p;
    }

    update(dt) {
        if (!_wake_up(this)) {
            this.__aim_state = "aim";
            this._locked = false;
            return;
        }
        dt = DE._slow_dt(dt);
        if (this.stun_timer > 0) {
            this.stun_timer -= dt;
            if (this._sprite) this._sprite.color = this.stun_timer > 0 ? [255, 235, 80] : this._base_color;
            return;
        }
        if (this._sprite && (this._sprite.color[0] !== this._base_color[0] ||
            this._sprite.color[1] !== this._base_color[1] ||
            this._sprite.color[2] !== this._base_color[2])) {
            this._sprite.color = this._base_color;
        }

        this._beam_flash = Math.max(0.0, this._beam_flash - dt);
        this.timer += dt;

        const player = this._find_player();
        if (player === null) {
            this._locked = false;
            this.__aim_state = "aim";
            return;
        }
        const dx = player.position.x - this.game_object.position.x;
        const dy = player.position.y - this.game_object.position.y;
        if (Math.abs(dx) > this.range || Math.abs(dy) > this.range) {
            this._locked = false;
            this.__aim_state = "aim";
            return;
        }

        const phase = this._phase();
        const o = this.game_object;
        const cx = o.position.x + o.size.x / 2;
        const cy = o.position.y + o.size.y / 2;

        // Ateş: periyot dolunca kilitli kiriş boyunca hitscan. Faza geçmeden ÖNCE
        // yapılır; aksi halde aim bloğu _lock_x'i sıfırlardı.
        if (this.timer >= this.fire_interval) {
            if (this._lock_x !== null) this._fire_beam(cx, cy, this._lock_x, this._lock_y, player);
            this.timer = 0.0;
            this._locked = false;
            this._lock_x = this._lock_y = null;
            return;
        }

        if (phase === "aim") {
            this.__aim_state = "aim";
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
            this.__aim_state = "lock";
        }
    }

    _fire_beam(sx, sy, tx, ty, player) {
        this._beam_flash = 0.12;
        DE.SoundFX.play("shoot");
        const px = player.position.x + player.size.x / 2;
        const py = player.position.y + player.size.y / 2;
        const dx = tx - sx;
        const dy = ty - sy;
        let seg2 = dx * dx + dy * dy;
        if (seg2 === 0) seg2 = 1.0;
        const t = ((px - sx) * dx + (py - sy) * dy) / seg2;
        if (t < 0 || t > 1) return;
        const mx = sx + t * dx;
        const my = sy + t * dy;
        const dist = Math.sqrt((px - mx) * (px - mx) + (py - my) * (py - my));
        const half = this.beam_width / 2 + player.size.x / 2;
        if (dist <= half) {
            const pc = player.get_component(DE_GAME.PlayerController);
            if (pc !== null) pc.on_beam_hit();
            else {
                const hp = player.get_component(DE.Health);
                if (hp) hp.take_damage(1);
            }
            const scene = _scene();
            if (scene) scene.add_shake(0.25);
        }
    }

    draw(ctx, camera_offset) {
        const o = this.game_object;
        const sx = Math.trunc(o.position.x - camera_offset.x);
        const sy = Math.trunc(o.position.y - camera_offset.y);
        const cx = sx + Math.trunc(o.size.x / 2);
        const cy = sy + Math.trunc(o.size.y / 2);
        if (this._beam_flash > 0) {
            const ex = this._lock_x !== null ? this._lock_x - camera_offset.x : cx;
            const ey = this._lock_y !== null ? this._lock_y - camera_offset.y : cy;
            const width = Math.max(2, Math.trunc(6 * (this._beam_flash / 0.12)));
            ctx.strokeStyle = "rgb(255,255,255)";
            ctx.lineWidth = width + 2;
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(Math.trunc(ex), Math.trunc(ey)); ctx.stroke();
            ctx.strokeStyle = "rgb(255,60,60)";
            ctx.lineWidth = Math.max(1, width);
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(Math.trunc(ex), Math.trunc(ey)); ctx.stroke();
        } else if (this._locked && this._lock_x !== null) {
            const ex = this._lock_x - camera_offset.x;
            const ey = this._lock_y - camera_offset.y;
            const blink = (Math.trunc(this.timer * 18) % 2) === 0;
            ctx.strokeStyle = blink ? "rgb(255,235,80)" : "rgb(255,80,80)";
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(Math.trunc(ex), Math.trunc(ey)); ctx.stroke();
        } else if (this._target_x !== null) {
            const ex = this._target_x - camera_offset.x;
            const ey = this._target_y - camera_offset.y;
            ctx.strokeStyle = "rgb(255,70,70)";
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(Math.trunc(ex), Math.trunc(ey)); ctx.stroke();
        }
        ctx.fillStyle = "rgb(255,255,255)";
        ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 6.283185307); ctx.fill();
    }
};

/* Coin gorsellestirme: koyu altin kontur + ust-sol parlamasi.
 * Siradan ONCE eklenir (SpriteRenderer'dan once cizilir) -> altin daire
 * konturun ustune biner, her zeminde okunur olur. */
DE_GAME.CoinVisual = class CoinVisual extends DE.Component {
    constructor() {
        super();
        this.time = 0.0;
    }

    update(dt) { this.time += dt; }

    draw(ctx, camera_offset) {
        const o = this.game_object;
        if (!o || !o.active) return;
        const sx = o.position.x - camera_offset.x;
        const sy = o.position.y - camera_offset.y;
        const r = o.size.x / 2;
        ctx.fillStyle = "rgb(86,54,0)";
        ctx.beginPath(); ctx.arc(sx + r, sy + r, r + 2, 0, 6.283185307); ctx.fill();
        // Nabiz gibi parlamasi (coin yerinde durmasin, canli dursun).
        const pulse = 0.22 + 0.10 * Math.sin(this.time * 4.0);
        ctx.fillStyle = "rgba(255,255,235," + pulse.toFixed(2) + ")";
        ctx.beginPath();
        ctx.arc(sx + r - r * 0.3, sy + r - r * 0.34, Math.max(1.5, r * 0.30), 0, 6.283185307);
        ctx.fill();
    }
};

DE_GAME.BobbingAnimation = class BobbingAnimation extends DE.Component {
    constructor(amplitude = 6.0, speed = 4.0) {
        super();
        this.amplitude = amplitude;
        this.speed = speed;
        this.time = DE._rng.uniform(0, 3.14);
        this.base_y = 0.0;
    }

    start() {
        this.base_y = this.game_object.position.y;
    }

    update(dt) {
        this.time += dt;
        this.game_object.position.y = this.base_y + Math.sin(this.time * this.speed) * this.amplitude;
    }
};

DE_GAME.PatrolPlatform = class PatrolPlatform extends DE.Component {
    constructor(distance = 140.0, speed = 80.0, vertical = false) {
        super();
        this.distance = distance;
        this.speed = speed;
        this.vertical = vertical;
        this.start_pos = 0.0;
        this.direction = 1;
    }

    start() {
        this.start_pos = this.vertical ? this.game_object.position.y : this.game_object.position.x;
    }

    update(dt) {
        if (this.vertical) {
            this.game_object.position.y += this.speed * this.direction * dt;
            if (Math.abs(this.game_object.position.y - this.start_pos) >= this.distance) {
                this.direction *= -1;
            }
        } else {
            this.game_object.position.x += this.speed * this.direction * dt;
            if (Math.abs(this.game_object.position.x - this.start_pos) >= this.distance) {
                this.direction *= -1;
            }
        }
    }
};

DE_GAME.FloatingScore = class FloatingScore extends DE.Component {
    constructor(text = "+10", color = [255, 215, 50], font_size = 20, duration = 0.8) {
        super();
        this.text = text;
        this.color = color;
        this.font_size = font_size;
        this.timer = 0.0;
        this.duration = duration;
    }

    update(dt) {
        this.timer += dt;
        if (this.timer >= this.duration) {
            const eng = _engine();
            if (eng && eng.active_scene) {
                const list = eng.active_scene.game_objects;
                const i = list.indexOf(this.game_object);
                if (i !== -1) list.splice(i, 1);
            }
            return;
        }
        this.game_object.position.y -= 45 * dt;
    }

    draw(ctx, camera_offset) {
        const alpha = Math.max(0.0, 1.0 - this.timer / this.duration);
        const col = [
            Math.trunc(this.color[0] * alpha + 30 * (1 - alpha)),
            Math.trunc(this.color[1] * alpha + 30 * (1 - alpha)),
            Math.trunc(this.color[2] * alpha + 30 * (1 - alpha)),
        ];
        const x = Math.trunc(this.game_object.position.x - camera_offset.x);
        const y = Math.trunc(this.game_object.position.y - camera_offset.y);
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${this.font_size}px Arial`;
        ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
        ctx.fillText(this.text, x, y);
        ctx.globalAlpha = 1;
    }
};

DE_GAME.PortalArrowUI = class PortalArrowUI extends DE.Component {
    // is_ui=True: kamera/zoomdan bağımsız, ekran uzayında çizilir.
    // NOT (HTML): motor UI nesnelerine camera_offset=0 verir; Python gerçek
    // kamera verir. Eşdeğer davranış için kamera konumu sahneden okunur.
    constructor(color = [175, 90, 255], margin = 28, size = 18) {
        super();
        this.color = color;
        this.margin = margin;
        this.size = size;
        this.is_ui = true;
    }

    draw(ctx, camera_offset) {
        const eng = _engine();
        if (!eng || !eng.active_scene) return;
        const scene = eng.active_scene;
        const cam = scene.camera_position;
        const player_obj = scene.find_by_tag("Player");
        if (player_obj) {
            const pc = player_obj.get_component(DE_GAME.PlayerController);
            if (pc && pc.menu_idle) return;
        }
        const portal = scene.game_objects.find(o => o.active && o.tag === "Portal");
        if (!portal) return;
        const w = ctx.canvas && ctx.canvas.width ? ctx.canvas.width : 900;
        const h = ctx.canvas && ctx.canvas.height ? ctx.canvas.height : 600;
        const cx = w / 2, cy = h / 2;
        const px = portal.position.x - cam.x;
        const py = portal.position.y - cam.y;
        if (this.margin <= px && px <= w - this.margin && this.margin <= py && py <= h - this.margin) return;
        const dx = px - cx, dy = py - cy;
        const length = Math.hypot(dx, dy);
        if (length < 1e-6) return;
        const ux = dx / length, uy = dy / length;
        const cand = [];
        if (ux > 0) cand.push((w - this.margin - cx) / ux);
        else if (ux < 0) cand.push((cx - this.margin) / -ux);
        if (uy > 0) cand.push((h - this.margin - cy) / uy);
        else if (uy < 0) cand.push((cy - this.margin) / -uy);
        const ts = cand.filter(c => c > 0);
        if (ts.length === 0) return;
        const t = Math.min(...ts);
        const tip_x = cx + ux * t;
        const tip_y = cy + uy * t;
        const base_x = tip_x - ux * this.size;
        const base_y = tip_y - uy * this.size;
        const px2 = -uy, py2 = ux;
        const head = this.size * 0.55;
        ctx.strokeStyle = `rgb(${this.color[0]},${this.color[1]},${this.color[2]})`;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(base_x, base_y); ctx.lineTo(tip_x, tip_y); ctx.stroke();
        ctx.fillStyle = `rgb(${this.color[0]},${this.color[1]},${this.color[2]})`;
        ctx.beginPath();
        ctx.moveTo(tip_x, tip_y);
        ctx.lineTo(base_x + px2 * head, base_y + py2 * head);
        ctx.lineTo(base_x - px2 * head, base_y - py2 * head);
        ctx.closePath();
        ctx.fill();
    }
};

DE_GAME.TutorialBanner = class TutorialBanner extends DE.Component {
    // Eğitim şeridi: ilk kampanya girişinde mekanikleri adım adım öğretir.
    // is_ui=True: kameradan bağımsız, altta-orta sabit.
    constructor() {
        super();
        this.is_ui = true;
        this.steps = [
            ["tut_move", "_done_move"],
            ["tut_jump", "_done_jump"],
            ["tut_double", "_done_double"],
            ["tut_dash", "_done_dash"],
            ["tut_shoot", "_done_shoot"],
            ["tut_coin", "_done_coin"],
            ["tut_goal", null],
        ];
        this.index = 0;
        this.timer = 0.0;
        this.done = false;
        this._pc = null;
        this._rb = null;
        this.MIN_SHOW = 1.2;
        this.MAX_SHOW = 8.0;
    }

    start() {
        const eng = _engine();
        if (!eng || !eng.active_scene) return;
        const po = eng.active_scene.find_by_tag("Player");
        if (po) {
            this._pc = po.get_component(DE_GAME.PlayerController);
            this._rb = po.get_component(DE.Rigidbody2D);
        }
    }

    static _done_move(pc, rb, scene) { return rb !== null && Math.abs(rb.velocity.x) > 30; }
    static _done_jump(pc, rb, scene) { return rb !== null && !rb.is_grounded; }
    static _done_double(pc, rb, scene) { return rb !== null && pc !== null && !rb.is_grounded && !pc.can_double_jump; }
    static _done_dash(pc, rb, scene) { return pc !== null && pc.dash_timer > 0; }
    static _done_shoot(pc, rb, scene) { return pc !== null && pc.shoot_cooldown > 0.1; }
    static _done_coin(pc, rb, scene) { return pc !== null && pc.coin_streak >= 2; }

    update(dt) {
        if (this.done) return;
        if (this._pc === null) this.start();
        if (this._pc === null) return;
        if (this._pc.menu_idle) {
            this.timer = 0.0;
            return;
        }
        this.timer += dt;
        if (this.timer < this.MIN_SHOW) return;
        const [key, condName] = this.steps[this.index];
        let ok = false;
        if (condName !== null) {
            try {
                const cond = DE_GAME.TutorialBanner[condName];
                const eng = _engine();
                ok = Boolean(cond(this._pc, this._rb, eng ? eng.active_scene : null));
            } catch (e) {
                ok = false;
            }
        }
        if (ok || condName === null || this.timer >= this.MAX_SHOW) {
            this.index += 1;
            this.timer = 0.0;
            try { DE.SoundFX.play("click"); } catch (e) {}
            if (this.index >= this.steps.length) {
                this.done = true;
                this._mark_done();
                if (this.game_object) this.game_object.active = false;
            }
        }
    }

    _mark_done() {
        try {
            const profile = DE_GAME.savegame();
            profile.set("tutorial_done", true);
            profile.save();
        } catch (e) {}
    }

    draw(ctx, camera_offset) {
        if (this.done || this._pc === null || this._pc.menu_idle) return;
        const [key, _c] = this.steps[this.index];
        const w = ctx.canvas && ctx.canvas.width ? ctx.canvas.width : 900;
        const h = ctx.canvas && ctx.canvas.height ? ctx.canvas.height : 600;
        const band_w = Math.min(w - 60, 620);
        const band_h = 34;
        const bx = Math.trunc((w - band_w) / 2);
        const by = h - band_h - 14;
        ctx.globalAlpha = 180 / 255;
        ctx.fillStyle = "rgb(8,12,20)";
        ctx.fillRect(bx, by, band_w, band_h);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgb(120,200,255)";
        ctx.lineWidth = 1;
        _round_rect(ctx, bx, by, band_w, band_h, 8);
        ctx.stroke();
        ctx.font = "13px Arial";
        ctx.fillStyle = "rgb(150,210,255)";
        ctx.fillText(DE.I18n.localize("tut_banner", { index: this.index + 1, total: this.steps.length }),
            bx + 10, by + 12);
        ctx.font = "bold 18px Arial";
        ctx.fillStyle = "rgb(240,245,255)";
        ctx.fillText(DE.I18n.t(key), bx + 10, by + 28);
        for (let i = 0; i < this.steps.length; i++) {
            let c = [120, 220, 120];
            if (i > this.index) c = [90, 120, 150];
            else if (i === this.index) c = [255, 220, 90];
            const dpx = bx + band_w - 10 - (this.steps.length - i) * 16;
            ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
            ctx.beginPath(); ctx.arc(dpx, by + band_h / 2, 4, 0, 6.283185307); ctx.fill();
        }
    }
};

// Ekrana (dünya-koordinat noktasından) yüzen '+skor' metni doğurur.
DE_GAME._spawn_float_score = function (world_x, world_y, text = "+10", color = [255, 215, 50], font_size = 20) {
    try {
        const eng = _engine();
        if (!eng || !eng.active_scene) return;
        // Dünya koordinatında doğur; FloatingScore DÜNYA-mekanı çizer (non-UI),
        // draw() kamera kaymasını kendisi çıkarır. (Eski hata: cam.x burada
        // bir kez de draw'da çıkarılıyordu -> skor 2x kayıyordu.)
        const obj = new DE.GameObject("FloatScore", world_x, world_y);
        obj.add_component(new DE_GAME.FloatingScore(text, color, font_size));
        eng.active_scene.add_object(obj);
    } catch (e) {}
};