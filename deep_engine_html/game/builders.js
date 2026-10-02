/* DerinEngine HTML — game/builders.js (Python game/builders.py birebir portu)
 * Place_object tüketicileri: JSON kaydı -> sahnedeki oyun nesneleri. Boss
 * builder/extractor M2'ye kadar KAYITLI DEĞİLDİR (M1 kapsamı: oynanabilir çekirdek).
 */
var DE_GAME = DE_GAME || {};

const _g = (data, key, def) => (data[key] !== undefined && data[key] !== null ? data[key] : def);
const _rgb_arr = (c) => ([c[0] | 0, c[1] | 0, c[2] | 0]);

function _build_breakable(scene, data) {
    const x = _g(data, "x", 0), y = _g(data, "y", 0);
    const w = _g(data, "w", 48), h = _g(data, "h", 48);
    const plat = new DE.GameObject("Breakable", x, y, w, h, "Breakable");
    plat.add_component(new DE.SpriteRenderer(_rgb_arr(_g(data, "color", [150, 120, 90])), "rect", 4));
    // Trigger (boss kalkanı parçaları) fiziksel engel olmaz; saldırıyla kırılır.
    plat.add_component(new DE.BoxCollider(!!_g(data, "trigger", false)));
    plat.add_component(new DE.ParticleEmitter());
    plat.add_component(new DE.BreakablePlatform(_g(data, "hits", 1)));
    scene.add_object(plat);
    return plat;
}

function _build_platform(scene, data) {
    const x = _g(data, "x", 0), y = _g(data, "y", 0);
    const w = _g(data, "w", 32), h = _g(data, "h", 32);
    const plat = new DE.GameObject("Platform", x, y, w, h, "Ground");
    plat.add_component(new DE.SpriteRenderer(_rgb_arr(_g(data, "color", [60, 90, 130])), "rect", 4));
    // Tek yönlü platform: üstten zıplanabilir, alttan/yandan geçilir.
    plat.add_component(new DE.BoxCollider(false, !!_g(data, "one_way", false)));
    scene.add_object(plat);
    if (_g(data, "move_distance", null)) {
        plat.add_component(new DE_GAME.PatrolPlatform(
            _g(data, "move_distance", 140.0),
            _g(data, "move_speed", 75.0),
            !!_g(data, "move_vertical", false)));
    }
    return plat;
}

/* Ramp (PolygonCollider) için oyun tarafı üçgen çizici. */
DE_GAME.RampVisual = class RampVisual extends DE.Component {
    constructor(points, color, edge_color = null) {
        super();
        this.points = points;
        this.color = _rgb_arr(color);
        this.edge_color = edge_color ? _rgb_arr(edge_color) : _rgb_arr(this.color.map(c => Math.max(0, c - 40)));
    }
    draw(ctx, camera_offset) {
        if (!this.game_object.active) return;
        const ox = this.game_object.position.x, oy = this.game_object.position.y;
        const camx = camera_offset ? camera_offset.x : 0;
        const camy = camera_offset ? camera_offset.y : 0;
        ctx.beginPath();
        for (let i = 0; i < this.points.length; i++) {
            const px = Math.trunc(ox + this.points[i][0] - camx);
            const py = Math.trunc(oy + this.points[i][1] - camy);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = "rgb(" + this.color[0] + "," + this.color[1] + "," + this.color[2] + ")";
        ctx.fill();
        ctx.strokeStyle = "rgb(" + this.edge_color[0] + "," + this.edge_color[1] + "," + this.edge_color[2] + ")";
        ctx.lineWidth = 2;
        ctx.stroke();
    }
};

function _build_ramp(scene, data) {
    const x = _g(data, "x", 0), y = _g(data, "y", 0);
    const w = _g(data, "w", 96), h = _g(data, "h", 48);
    const slope = Math.trunc(_g(data, "slope", 1));
    const pts = slope >= 0 ? [[0, h], [w, 0], [w, h]] : [[0, 0], [0, h], [w, h]];
    const ramp = new DE.GameObject("Ramp", x, y, w, h, "Ground");
    ramp.add_component(new DE.PolygonCollider(pts));
    const color = _g(data, "color", [60, 90, 130]);
    ramp.add_component(new DE_GAME.RampVisual(pts, color));
    scene.add_object(ramp);
    return ramp;
}

function _build_coin(scene, data) {
    const x = _g(data, "x", 0), y = _g(data, "y", 0);
    const coin = new DE.GameObject("Coin", x, y, 18, 18, "Coin");
    coin.add_component(new DE_GAME.CoinVisual());
    coin.add_component(new DE.SpriteRenderer([255, 215, 0], "circle", 0));
    const anim = coin.add_component(new DE.Animator(8));
    anim.add_state("glow", [[255, 215, 0], [255, 235, 90], [255, 255, 170], [255, 235, 90]]);
    anim.play("glow");
    coin.add_component(new DE.BoxCollider(true, false));
    coin.add_component(new DE_GAME.BobbingAnimation(6.0, 4.0));
    coin.add_component(new DE.LightSource(80, [255, 220, 50], 0.8, true, 4.0, 12.0, [16, 16]));
    scene.add_object(coin);
    return coin;
}

function _build_spring(scene, data) {
    const x = _g(data, "x", 0), y = _g(data, "y", 0);
    const spring = new DE.GameObject("Spring", x, y, 32, 16, "Spring");
    spring.add_component(new DE.SpriteRenderer([50, 220, 120], "rect", 3));
    spring.add_component(new DE.BoxCollider(true, false));
    spring.add_component(new DE.LightSource(75, [60, 230, 130], 0.7, false, 3.0, 15.0, [8, 8]));
    spring.add_component(new DE.BouncePad(_g(data, "bounce", 850.0)));
    scene.add_object(spring);
    return spring;
}

function _build_portal(scene, data) {
    const x = _g(data, "x", 0), y = _g(data, "y", 0);
    const w = _g(data, "w", 40), h = _g(data, "h", 60);
    const next_key = data["next"] !== undefined ? data["next"] : "victory";
    const factory = DE_GAME._NEXT_SCENE_FACTORIES[next_key] || DE_GAME.build_victory_scene;
    const portal = new DE.GameObject("Portal", x, y, w, h, "Portal");
    portal.add_component(new DE.SpriteRenderer([70, 70, 90], "rect", 12));
    portal.add_component(new DE.BoxCollider(true, false));
    portal.add_component(new DE.ParticleEmitter());
    portal.add_component(new DE.LightSource(160, [140, 80, 230], 0.85, true, 2.5, 25.0, [20, 30]));
    portal.add_component(new DE_GAME.GoalPortal(factory));
    portal.scene_key = next_key;
    scene.add_object(portal);
    return portal;
}

function _build_enemy(scene, data) {
    const x = _g(data, "x", 0), y = _g(data, "y", 0);
    const w = _g(data, "w", 28), h = _g(data, "h", 28);
    const enemy = new DE.GameObject("Enemy", x, y, w, h, "Enemy");
    const base = _rgb_arr(_g(data, "color", [235, 55, 75]));
    enemy.add_component(new DE.SpriteRenderer(base, "rect", 6));
    const anim = enemy.add_component(new DE.Animator(6));
    const darker = base.map(c => Math.max(0, c - 50));
    anim.add_state("threat", [darker, base, darker, base]);
    anim.play("threat");
    enemy.add_component(new DE.BoxCollider(false, false));
    enemy.add_component(new DE.Health(_g(data, "hp", 25), false, null, 0.2));
    enemy.add_component(new DE.LightSource(80, [255, 60, 60], 0.7, false, 3.0, 15.0, [14, 14]));
    enemy.add_component(new DE_GAME.PatrolEnemy(_g(data, "patrol_distance", 90.0), _g(data, "speed", 65.0)));
    enemy.add_component(new DE.SpawnIn(0.5));
    scene.add_object(enemy);
    return enemy;
}

function _build_flyer(scene, data) {
    const x = _g(data, "x", 0), y = _g(data, "y", 40);
    const w = _g(data, "w", 26), h = _g(data, "h", 22);
    const enemy = new DE.GameObject("Flyer", x, y, w, h, "Enemy");
    const base = _rgb_arr(_g(data, "color", [90, 220, 200]));
    enemy.add_component(new DE.SpriteRenderer(base, "circle", 0));
    const anim = enemy.add_component(new DE.Animator(7));
    const light = base.map(c => Math.min(255, c + 40));
    anim.add_state("fly", [base, light, base, light]);
    anim.play("fly");
    enemy.add_component(new DE.BoxCollider(false, false));
    enemy.add_component(new DE.Health(_g(data, "hp", 20), false, null, 0.2));
    enemy.add_component(new DE_GAME.FlyerEnemy(_g(data, "patrol_distance", 160.0), _g(data, "speed", 55.0)));
    // Nazik salınım: keyframe animatörü (position.y 3 noktalı döngü).
    const bob_amp = _g(data, "bob_amplitude", 14.0);
    const bob_speed = _g(data, "bob_speed", 2.2);
    const period = Math.max(0.3, 2 * Math.PI / bob_speed);
    const kf = enemy.add_component(new DE.KeyframeAnimator(true, true));
    kf.animate("position.y", [[y, 0.0], [y - bob_amp, period * 0.5], [y, period]], "in_out", period);
    enemy.add_component(new DE.LightSource(70, [80, 230, 200], 0.6, false, 3.0, 15.0, [13, 11]));
    enemy.add_component(new DE.SpawnIn(0.6));
    scene.add_object(enemy);
    return enemy;
}

function _build_hopper(scene, data) {
    const x = _g(data, "x", 0), y = _g(data, "y", 0);
    const w = _g(data, "w", 28), h = _g(data, "h", 28);
    const enemy = new DE.GameObject("Hopper", x, y, w, h, "Enemy");
    enemy.add_component(new DE.SpriteRenderer(_rgb_arr(_g(data, "color", [250, 170, 60])), "rect", 6));
    enemy.add_component(new DE.Rigidbody2D(1300.0, true, 1800));
    enemy.add_component(new DE.BoxCollider(false, false));
    enemy.add_component(new DE.Health(_g(data, "hp", 22), false, null, 0.2));
    enemy.add_component(new DE_GAME.HopperEnemy(
        _g(data, "hop_force", 430.0), _g(data, "hop_interval", 1.1), _g(data, "speed", 40.0)));
    enemy.add_component(new DE.LightSource(70, [255, 180, 70], 0.6, false, 3.0, 15.0, [14, 14]));
    enemy.add_component(new DE.SpawnIn(0.5));
    scene.add_object(enemy);
    return enemy;
}

function _build_turret(scene, data) {
    const x = _g(data, "x", 0), y = _g(data, "y", 0);
    const w = _g(data, "w", 30), h = _g(data, "h", 30);
    let fire_interval = _g(data, "fire_interval", 2.0);
    // İlk seviyede (düşük zorluk) taret saldırganlığını yumuşat: alt sınır koy.
    if (DE_GAME.state.game_mode === "campaign" && _g(DE_GAME.state.campaign_state, "difficulty", 1) <= 1) {
        fire_interval = Math.max(fire_interval, 2.0);
    }
    fire_interval = Math.max(1.4, fire_interval);
    const enemy = new DE.GameObject("Turret", x, y, w, h, "Enemy");
    enemy.add_component(new DE.SpriteRenderer(_rgb_arr(_g(data, "color", [170, 60, 220])), "rect", 5));
    enemy.add_component(new DE.BoxCollider(false, false));
    enemy.add_component(new DE.Health(_g(data, "hp", 30), false, null, 0.2));
    enemy.add_component(new DE_GAME.TurretEnemy(
        fire_interval, _g(data, "bullet_speed", 240.0),
        _g(data, "bullet_damage", 25), _g(data, "range", 460.0)));
    enemy.add_component(new DE.LightSource(90, [190, 90, 255], 0.8, true, 3.0, 15.0, [15, 15]));
    enemy.add_component(new DE.SpawnIn(0.8));
    scene.add_object(enemy);
    return enemy;
}

function _build_sniper(scene, data) {
    const x = _g(data, "x", 0), y = _g(data, "y", 0);
    const w = _g(data, "w", 24), h = _g(data, "h", 26);
    const enemy = new DE.GameObject("Sniper", x, y, w, h, "Enemy");
    enemy.add_component(new DE.SpriteRenderer(_rgb_arr(_g(data, "color", [120, 200, 90])), "rect", 5));
    enemy.add_component(new DE.BoxCollider(false, false));
    enemy.add_component(new DE.Health(_g(data, "hp", 30), false, null, 0.2));
    enemy.add_component(new DE_GAME.SniperEnemy(_g(data, "fire_interval", 2.8)));
    enemy.add_component(new DE.LightSource(90, [140, 255, 110], 0.7, true, 3.0, 15.0, [12, 13]));
    enemy.add_component(new DE.SpawnIn(1.0));
    scene.add_object(enemy);
    return enemy;
}

function _build_spikes(scene, data) {
    const x = _g(data, "x", 0), y = _g(data, "y", 0);
    const w = _g(data, "w", 32), h = _g(data, "h", 16);
    const spikes = new DE.GameObject("Spikes", x, y, w, h, "Hazard");
    spikes.add_component(new DE.SpriteRenderer([150, 150, 160], "spikes", 0));
    // Tetikleyici: katı blok DEĞİL — temas halinde hasar + sıçrama (on_collision).
    spikes.add_component(new DE.BoxCollider(true, false));
    spikes.add_component(new DE.LightSource(60, [200, 200, 210], 0.4, false, 3.0, 15.0, [16, 8]));
    scene.add_object(spikes);
    return spikes;
}

function _build_powerup(scene, data) {
    const x = _g(data, "x", 0), y = _g(data, "y", 0);
    const power_type = _g(data, "power_type", "magnet");
    const duration = _g(data, "duration", 8.0);
    const colors = {
        "magnet": [180, 60, 255], "triple": [255, 140, 30], "shield": [60, 180, 255],
        "speed": [255, 220, 30], "slow": [160, 200, 255],
    };
    const light_colors = {
        "magnet": [180, 80, 255], "triple": [255, 160, 60], "shield": [100, 210, 255],
        "speed": [255, 240, 80], "slow": [140, 200, 255],
    };
    const body_color = colors[power_type] || [200, 200, 200];
    const light_color = light_colors[power_type] || [220, 220, 220];
    const pu = new DE.GameObject("PowerUp_" + power_type, x, y, 24, 24, "PowerUp");
    pu.add_component(new DE.SpriteRenderer(body_color, "rect", 6));
    pu.add_component(new DE.BoxCollider(true, false));
    pu.add_component(new DE_GAME.BobbingAnimation(5.0, 3.5));
    pu.add_component(new DE.LightSource(100, light_color, 0.85, true, 5.0, 15.0, [12, 12]));
    pu.add_component(new DE.PowerUp(power_type, duration));
    scene.add_object(pu);
    return pu;
}

function _build_player(scene, data) {
    const x = _g(data, "x", 80), y = _g(data, "y", 300);
    const w = _g(data, "w", 32), h = _g(data, "h", 32);

    // Varsayılan yeniden başlatma: ana menü (gerçek sahneler bunu ezer).
    const _restart_factory = DE_GAME.build_main_menu_scene;

    const score_obj = new DE.GameObject("ScoreUI", 20, 10, 0, 0, "UI");
    score_obj.add_component(new DE.TextRenderer(DE.I18n.t("score") + ": 0", 22, [255, 215, 0], true, null, false, false));
    scene.add_object(score_obj);

    const health_obj = new DE.GameObject("HealthUI", 160, 10, 0, 0, "UI");
    health_obj.add_component(new DE.TextRenderer(DE.I18n.t("health") + ": ❤️ ❤️ ❤️", 22, [255, 80, 80], true, null, false, false));
    scene.add_object(health_obj);

    const goal_obj = new DE.GameObject("GoalUI", 20, 36, 0, 0, "UI");
    goal_obj.add_component(new DE.TextRenderer(DE.I18n.t("remaining_stars") + ": 0", 16, [180, 220, 255], true, null, false, false));
    scene.add_object(goal_obj);

    const info_obj = new DE.GameObject("InfoUI", 20, 60, 0, 0, "UI");
    info_obj.add_component(new DE.TextRenderer(DE.I18n.t("l1_info"), 13, [160, 240, 200], true, null, false, false));
    scene.add_object(info_obj);

    const pu_label = new DE.GameObject("PowerUpLabelUI", 20, 84, 0, 0, "UI");
    pu_label.add_component(new DE.TextRenderer("", 18, [255, 230, 120], true, null, false, false));
    scene.add_object(pu_label);

    const streak_label = new DE.GameObject("StreakUI", 20, 110, 0, 0, "UI");
    streak_label.add_component(new DE.TextRenderer("", 24, [255, 200, 60], true, null, false, false));
    scene.add_object(streak_label);

    const portal_arrow = new DE.GameObject("PortalArrowUI", 0, 0, 0, 0, "UI");
    portal_arrow.add_component(new DE_GAME.PortalArrowUI());
    scene.add_object(portal_arrow);

    const player = new DE.GameObject("Player", x, y, w, h, "Player");
    player.add_component(new DE.Rigidbody2D(1400.0, true, 1800));
    player.add_component(new DE.BoxCollider(false, false));
    player.add_component(new DE.ParticleEmitter());
    player.add_component(new DE.LightSource(150, [100, 210, 255], 0.95, false, 3.0, 15.0, [16, 16]));
    player.add_component(new DE.Health(3, true,
        () => DE.Engine.switch_scene(DE_GAME.build_game_over_scene(_restart_factory)), 1.0));
    const ctrl = player.add_component(new DE_GAME.PlayerController(260.0, 620.0, _restart_factory));
    ctrl.score_text_obj = score_obj;
    ctrl.health_text_obj = health_obj;
    ctrl.goal_text_obj = goal_obj;
    ctrl.powerup_label_text_obj = pu_label;
    ctrl.streak_text_obj = streak_label;
    scene.add_object(player);
    scene.set_camera_target(player);
    return player;
}

/* --- _build_boss: boss arenası verisini (procedural.js PR_BOSSES) sahneye kurar.
 * Python game/builders.py _build_boss birebir portu. -- */
function _build_boss(scene, data) {
    const x = _g(data, "x", 1800), y = _g(data, "y", 360);
    const w = _g(data, "w", 64), h = _g(data, "h", 64);
    const boss_key = _g(data, "boss_key", "cave");   // hangi biyomun boss'u
    const color = (_g(data, "color", [220, 40, 30])).slice();
    const light_color = (_g(data, "light", color)).slice();
    // Accent: gövde renginden az daha parlak
    const accent = color.map(c => Math.min(255, c + 45));
    const boss = new DE.GameObject("Boss", x, y, w, h, "Boss");
    const boss_type = _g(data, "boss_type", "archer");
    boss.boss_type = boss_type;
    boss.add_component(new DE.SpriteRenderer(color, "rect", 10));
    // Flying, sniper ve cosmic (final) boss'ları yerçekimsiz/kinematiktir -> Rigidbody YOK.
    // Shield ve archer boss'ları zeminde gezinir -> Rigidbody + katı BoxCollider.
    if (boss_type === "flying" || boss_type === "sniper" || boss_type === "cosmic") {
        boss.add_component(new DE.BoxCollider(true, false));
    } else {
        boss.add_component(new DE.Rigidbody2D(1100.0, true, 1800));
        boss.add_component(new DE.BoxCollider(false, false));
    }
    boss.add_component(new DE.ParticleEmitter());
    boss.add_component(new DE.LightSource(240, light_color, 1.0, true, 3.0, 30.0, [32, 32]));
    boss.boss_key = boss_key;

    // Bu boss'un çıkış portalı (kampanyada boss'un "next" hedefine götüren portal).
    // NOT: portal, generate_boss_arena verisinde boss'tan SONRA kurulduğu için
    // boss'a "next" anahtarını saklayıp portalı boss ÖLDÜĞÜNDE ararız (tüm sahne
    // kurulduktan sonra). Erken arama -> portal bulunamaz -> açılmaz.
    const next_key = _g(data, "next", "victory");
    boss.scene_key = next_key;

    const on_boss_death = () => {
        boss.active = false;
        if (DE.SoundFX && DE.SoundFX.play) DE.SoundFX.play("explosion");
        const eng = DE.Engine.instance;
        // Zafer slow-mo: düşman dünyasını (düşmanlar, düşman mermileri, sonraki
        // boss'lar) kısa süre dramatik yavaşlatır. Oyuncu tam kontrolü korur.
        eng._time_slow_remaining = 0.9;
        eng._time_slow_factor = 0.28;
        if (eng && eng.active_scene) {
            eng.active_scene.add_shake(0.9);
            // Zoom punch: boss son darbesinde hızlı dramatik yakınlaşma.
            eng.active_scene.zoom_punch(1.18, 0.35);
            // Boss pozisyonunda büyük çok-parçalı patlama
            const emitter = boss.get_component(DE.ParticleEmitter);
            if (emitter) {
                const center = [boss.size.x / 2, boss.size.y / 2];
                for (let i = 0; i < 3; i++) {
                    emitter.burst(14, [255, 160, 60], [70, 220], [5, 10], [0.5, 1.0], 140.0, center);
                    emitter.burst(10, [255, 240, 200], [40, 160], [3, 7], [0.35, 0.7], 0, center);
                }
            }
        }
        // Portalı dinamik bul: her şey boss ölünce kurulur. DİKKAT: boss aynı
        // scene_key (next hedefi) paylaşabilir ve nesne listesinde portaldan önce
        // gelir; o yüzden yalnızca tag="Portal" aranır.
        const exit_portal = scene.game_objects.find(
            (o) => o.tag === "Portal" && o.scene_key === boss.scene_key) || null;
        if (exit_portal) {
            const portal_comp = exit_portal.get_component(DE_GAME.GoalPortal);
            if (portal_comp) portal_comp.unlock();
        }
        // "portal'a gir" bildirimi UI'da (varsa)
        const ctrl = scene.find_by_tag("Player");
        if (ctrl) {
            const pc = ctrl.get_component(DE_GAME.PlayerController);
            if (pc && pc.powerup_label_text_obj) {
                const tr = pc.powerup_label_text_obj.get_component(DE.TextRenderer);
                if (tr) {
                    tr.text = DE.I18n.t("campaign_defeated");
                    tr.color = [120, 255, 180];
                }
            }
        }
    };

    boss.add_component(new DE.Health(_g(data, "hp", 100), false, on_boss_death));
    if (boss_type === "flying") {
        boss.add_component(new DE_GAME.FlyingBoss(
            _g(data, "patrol_distance", 180.0), _g(data, "speed", 70.0),
            _g(data, "fire_interval", 1.6), _g(data, "bullet_speed", 260.0),
            _g(data, "shoot_count", 2), color, accent, boss_key));
    } else if (boss_type === "sniper") {
        boss.add_component(new DE_GAME.SniperBoss(
            0.0, _g(data, "speed", 30.0),
            _g(data, "fire_interval", 2.4), _g(data, "bullet_speed", 0.0),
            _g(data, "shoot_count", 1), color, accent, boss_key));
    } else if (boss_type === "shield") {
        boss.add_component(new DE_GAME.ShieldBoss(
            _g(data, "patrol_distance", 60.0), _g(data, "speed", 45.0),
            _g(data, "fire_interval", 2.2), _g(data, "bullet_speed", 320.0),
            _g(data, "shoot_count", 2), color, accent, boss_key));
    } else if (boss_type === "cosmic") {
        // ASTRO (FINAL) boss: uçar + (oyuncuya nişanlı) ateş topları + sniper lazeri.
        boss.add_component(new DE_GAME.CosmicBoss(
            _g(data, "patrol_distance", 180.0), _g(data, "speed", 70.0),
            _g(data, "fire_interval", 1.6), _g(data, "bullet_speed", 260.0),
            _g(data, "shoot_count", 2), color, accent, boss_key,
            150.0, 130.0, Math.max(3.0, _g(data, "fire_interval", 4.2) * 2.0)));
    } else {  // archer (varsayılan BossController)
        boss.add_component(new DE_GAME.BossController(
            _g(data, "patrol_distance", 160.0), _g(data, "speed", 65.0),
            _g(data, "fire_interval", 2.0), _g(data, "bullet_speed", 320.0),
            _g(data, "shoot_count", 1), color, accent, boss_key));
    }
    scene.add_object(boss);
    return boss;
}

/* --- Extractors: nesneyi JSON'a döndürürken tip verisi toplar --- */
function _extract_enemy(obj) {
    const comp = obj.get_component(DE_GAME.PatrolEnemy);
    const hp = obj.get_component(DE.Health);
    return { "patrol_distance": comp ? comp.distance : 90.0, "speed": comp ? comp.speed : 65.0, "hp": hp ? hp.max_hp : 25 };
}

function _extract_ramp(obj) {
    const coll = obj.get_component(DE.PolygonCollider);
    const pts = coll ? coll.points : [[0, 0], [32, 0], [32, 32]];
    let w = 0, h = 0;
    for (const p of pts) { w = Math.max(w, p[0]); h = Math.max(h, p[1]); }
    w = Math.trunc(w); h = Math.trunc(h);
    const left_low = pts.length >= 2 && pts[0][0] === 0 && pts[0][1] === h;
    const spr = obj.get_component(DE.SpriteRenderer);
    return { "w": w, "h": h, "slope": left_low ? 1 : -1, "color": spr ? [].concat(spr.color) : [60, 90, 130] };
}

function _extract_platform(obj) {
    const comp = obj.get_component(DE_GAME.PatrolPlatform);
    const data = {};
    if (comp) {
        data["move_distance"] = comp.distance;
        data["move_speed"] = comp.speed;
        data["move_vertical"] = comp.vertical;
    }
    const collider = obj.get_component(DE.BoxCollider);
    if (collider && collider.one_way) data["one_way"] = true;
    return data;
}

function _extract_breakable(obj) {
    const comp = obj.get_component(DE.BreakablePlatform);
    const data = { "hits": comp ? comp.hits_to_break : 1 };
    const col = obj.get_component(DE.BoxCollider);
    if (col && col.is_trigger) data["trigger"] = true;
    return data;
}

function _extract_spring(obj) {
    const comp = obj.get_component(DE.BouncePad);
    return { "bounce": comp ? comp.bounce_force : 850.0 };
}

function _extract_powerup(obj) {
    const comp = obj.get_component(DE.PowerUp);
    return { "power_type": comp ? comp.power_type : "magnet", "duration": comp ? comp.duration : 8.0 };
}

function _extract_portal(obj) {
    return { "next": obj.scene_key !== undefined ? obj.scene_key : "victory" };
}

function _extract_flyer(obj) {
    const kf = obj.get_component(DE.KeyframeAnimator);
    const anim = kf && kf.animations["position.y"] ? kf.animations["position.y"] : null;
    const nodes = anim && anim.nodes ? anim.nodes : [];
    let amp = 14.0;
    if (nodes.length >= 2) amp = Math.abs(nodes[0][0] - nodes[1][0]);
    let speed = 2.2;
    if (anim && anim.length) speed = 2 * Math.PI / anim.length;
    const comp = obj.get_component(DE_GAME.FlyerEnemy);
    const hp = obj.get_component(DE.Health);
    return { "patrol_distance": comp ? comp.distance : 160.0, "speed": comp ? comp.speed : 55.0,
             "bob_amplitude": amp, "bob_speed": speed, "hp": hp ? hp.max_hp : 20 };
}

function _extract_hopper(obj) {
    const comp = obj.get_component(DE_GAME.HopperEnemy);
    const hp = obj.get_component(DE.Health);
    return { "hop_force": comp ? comp.hop_force : 430.0, "hop_interval": comp ? comp.hop_interval : 1.1,
             "speed": comp ? comp.speed : 40.0, "hp": hp ? hp.max_hp : 22 };
}

function _extract_turret(obj) {
    const comp = obj.get_component(DE_GAME.TurretEnemy);
    const hp = obj.get_component(DE.Health);
    return { "fire_interval": comp ? comp.fire_interval : 2.0, "bullet_speed": comp ? comp.bullet_speed : 240.0,
             "bullet_damage": comp ? comp.bullet_damage : 25, "range": comp ? comp.range : 600.0, "hp": hp ? hp.max_hp : 30 };
}

function _extract_sniper(obj) {
    const comp = obj.get_component(DE_GAME.SniperEnemy);
    const hp = obj.get_component(DE.Health);
    const spr = obj.get_component(DE.SpriteRenderer);
    return { "fire_interval": comp ? comp.fire_interval : 2.8, "hp": hp ? hp.max_hp : 30,
             "color": spr ? [].concat(spr.color) : [120, 200, 90] };
}

function _extract_boss(obj) {
    const comp = obj.get_component(DE_GAME.BossController);
    const bcomp = obj.get_component(DE_GAME.FlyingBoss) || obj.get_component(DE_GAME.SniperBoss)
        || obj.get_component(DE_GAME.ShieldBoss);
    const hp = obj.get_component(DE.Health);
    const data = { "hp": hp ? hp.max_hp : 100 };
    const boss_type = obj.boss_type;
    if (boss_type) data["boss_type"] = boss_type;
    if (comp) {
        data["patrol_distance"] = comp.distance;
        data["speed"] = comp.speed;
    }
    if (bcomp) {
        data["patrol_distance"] = (bcomp.distance !== undefined) ? bcomp.distance : 160.0;
        data["speed"] = (bcomp.speed !== undefined) ? bcomp.speed : 60.0;
    }
    return data;
}

function _finalize_goal_ui(scene) {
    const coin_count = scene.find_all_by_tag("Coin").length;
    const player = scene.find_by_tag("Player");
    if (!player) return;
    const ctrl = player.get_component(DE_GAME.PlayerController);
    if (ctrl && ctrl.goal_text_obj) {
        const txt = ctrl.goal_text_obj.get_component(DE.TextRenderer);
        if (txt) txt.text = DE.I18n.t("remaining_stars") + ": " + coin_count + " (" + DE.I18n.t("stars_goal_desc") + ")";
    }
}

function _register_level_builders() {
    DE.register_builder("Platform", _build_platform);
    DE.register_builder("Ground", _build_platform);
    DE.register_builder("Ramp", _build_ramp);
    DE.register_builder("Breakable", _build_breakable);
    DE.register_builder("Coin", _build_coin);
    DE.register_builder("Spring", _build_spring);
    DE.register_builder("Portal", _build_portal);
    DE.register_builder("Enemy", _build_enemy);
    DE.register_builder("Flyer", _build_flyer);
    DE.register_builder("Hopper", _build_hopper);
    DE.register_builder("Turret", _build_turret);
    DE.register_builder("SniperEnemy", _build_sniper);
    DE.register_builder("Spikes", _build_spikes);
    DE.register_builder("PowerUp", _build_powerup);
    DE.register_builder("Player", _build_player);
    DE.register_builder("Boss", _build_boss);

    DE.register_extractor("Enemy", _extract_enemy);
    DE.register_extractor("Flyer", _extract_flyer);
    DE.register_extractor("Hopper", _extract_hopper);
    DE.register_extractor("Turret", _extract_turret);
    DE.register_extractor("SniperEnemy", _extract_sniper);
    DE.register_extractor("Boss", _extract_boss);
    DE.register_extractor("Platform", _extract_platform);
    DE.register_extractor("Ground", _extract_platform);
    DE.register_extractor("Ramp", _extract_ramp);
    DE.register_extractor("Breakable", _extract_breakable);
    DE.register_extractor("Spring", _extract_spring);
    DE.register_extractor("PowerUp", _extract_powerup);
    DE.register_extractor("Portal", _extract_portal);
    // M2: register_extractor("Boss", _extract_boss)
}

// Modül yüklenirken kaydet (düzenleyici/yükleyici sonrası hazır olur).
_register_level_builders();
DE_GAME._builders = {
    _finalize_goal_ui,
    _register_level_builders,
    _build_boss,
    _extract_boss,
};