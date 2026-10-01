/* DerinEngine HTML — game/commands.js (Python game/commands.py birebir portu)
 * Oyun içi geliştirici konsol komutları (backquote ` tuşuyla açılır).
 * Konsol motor katmanında (engine/console.js, DE DevConsole); bu dosya sadece
 * oyuna özgü komutları DE.register_command ile motor konsoluna bağlar.
 */
var DE_GAME = DE_GAME || {};

function _commands_player(ctx) {
    if (!ctx) return [null, null];
    const go = ctx.find_by_tag("Player");
    if (!go) return [null, null];
    return [go, go.get_component(DE_GAME.PlayerController)];
}

function _cmd_hp(ctx, args) {
    const [go] = _commands_player(ctx);
    if (!go) return "Oyuncu yok (o siste sahnesinde degilsin).";
    const hp = go.get_component(DE.Health);
    if (!hp) return "Oyuncuda Health bileseni yok.";
    let value;
    try {
        value = Math.max(0, Math.min(999, parseInt(args[0], 10)));
        if (isNaN(value)) throw new Error("nan");
    } catch (e) {
        return "Kullanim: hp <sayi>  (mevcut: " + hp.current_hp + "/" + hp.max_hp + ")";
    }
    hp.current_hp = value;
    return "can -> " + hp.current_hp + "/" + hp.max_hp;
}

function _cmd_heal(ctx, args) {
    const [go, pc] = _commands_player(ctx);
    if (!go) return "Oyuncu yok.";
    const hp = go.get_component(DE.Health);
    if (!hp) return "Oyuncuda Health bileseni yok.";
    hp.current_hp = hp.max_hp;
    hp.invulnerable_timer = Math.max(hp.invulnerable_timer, 1.2);
    return "sifa tamam.";
}

function _cmd_god(ctx, args) {
    const [go] = _commands_player(ctx);
    if (!go) return "Oyuncu yok.";
    const hp = go.get_component(DE.Health);
    if (!hp) return "Oyuncuda Health bileseni yok.";
    if (hp.invulnerable_timer > 0) {
        hp.invulnerable_timer = 0.0;
        return "god mode KAPALI.";
    }
    hp.invulnerable_timer = 1.0e12;
    return "god mode ACIK (olumsuz).";
}

function _cmd_coins(ctx, args) {
    const [go, pc] = _commands_player(ctx);
    if (!go || !pc) return "Oyuncu yok (koin eklemek icin oyun sahnesinde ol).";
    let amount;
    try {
        amount = parseInt(args[0], 10);
        if (isNaN(amount)) throw new Error("nan");
    } catch (e) {
        return "Kullanim: coins <sayi>  (mevcut skor: " + pc.score + ")";
    }
    pc._add_score(amount);
    return "skor -> " + pc.score;
}

function _cmd_speed(ctx, args) {
    const [go, pc] = _commands_player(ctx);
    if (!go || !pc) return "Oyuncu yok.";
    let value;
    try {
        value = Math.max(20.0, Math.min(2000.0, parseFloat(args[0])));
        if (isNaN(value)) throw new Error("nan");
    } catch (e) {
        return "Kullanim: speed <deger>  (mevcut: " + pc.speed.toFixed(0) + ")";
    }
    pc.speed = value;
    return "hiz -> " + pc.speed.toFixed(0);
}

function _cmd_jump(ctx, args) {
    const [go, pc] = _commands_player(ctx);
    if (!go || !pc) return "Oyuncu yok.";
    let value;
    try {
        value = Math.max(100.0, Math.min(4000.0, parseFloat(args[0])));
        if (isNaN(value)) throw new Error("nan");
    } catch (e) {
        return "Kullanim: jump <deger>  (mevcut: " + pc.jump_force.toFixed(0) + ")";
    }
    pc.jump_force = value;
    return "ziplama -> " + pc.jump_force.toFixed(0);
}

function _cmd_tp(ctx, args) {
    const [go, pc] = _commands_player(ctx);
    if (!go || !pc) return "Oyuncu yok.";
    let x, y;
    try {
        x = parseFloat(args[0]);
        y = parseFloat(args[1]);
        if (isNaN(x) || isNaN(y)) throw new Error("nan");
    } catch (e) {
        return "Kullanim: tp <x> <y>";
    }
    go.position.x = x;
    go.position.y = y;
    const rb = go.get_component(DE.Rigidbody2D);
    if (rb) {
        rb.velocity.x = 0.0;
        rb.velocity.y = 0.0;
    }
    return "isinlandi -> (" + x.toFixed(0) + ", " + y.toFixed(0) + ")";
}

function _cmd_respawn(ctx, args) {
    const [go, pc] = _commands_player(ctx);
    if (!go || !pc) return "Oyuncu yok.";
    pc.respawn(true);
    return "spawn noktasina donuldu.";
}

function _cmd_list(ctx, args) {
    if (!ctx) return "Sahne yok.";
    const names = {};
    for (const obj of ctx.game_objects) {
        const tag = obj.tag || "?";
        names[tag] = (names[tag] || 0) + 1;
    }
    const parts = Object.keys(names).sort().map(t => t + " x" + names[t]);
    return parts.join(", ") || "(bos sahne)";
}

// --- tilemap veri katmani (data <-> runtime, tarayicida localStorage) ---
// Python game/commands.py eşi: tarayıcıda dosya yazılamadığı için tilemap
// kayıtları kendi localStorage anahtarında tutulur (oyuncu profili kirletmez).
// localStorage yoksa (Node/test) modul ici bellek deposuna düşer.
const _TILEMAP_KEY = "tilemap_data.";
const _TILEMAP_STORE = "derinengine_tilemaps_v1";
const _TILEMAP_SAFE = /[^A-Za-z0-9_\-.]/g;
let _tilemap_mem = null;

function _safe_name(raw) {
    const cleaned = String(raw).replace(_TILEMAP_SAFE, "_").slice(0, 48).replace(/^[._]+|[._]+$/g, "");
    return cleaned || "level";
}

function _tilemap_all() {
    try {
        if (typeof window !== "undefined" && window.localStorage) {
            const raw = window.localStorage.getItem(_TILEMAP_STORE);
            return raw ? (JSON.parse(raw) || {}) : {};
        }
    } catch (e) { /* bozuk/engelli depoya sessizce düş */ }
    return _tilemap_mem || (_tilemap_mem = {});
}

function _tilemap_put_all(obj) {
    if (typeof window !== "undefined" && window.localStorage) {
        try {
            window.localStorage.setItem(_TILEMAP_STORE, JSON.stringify(obj));
            return;
        } catch (e) { /* kota dolu -> belleğe düş */ }
    }
    _tilemap_mem = obj;
}

function _tilemap_summary(scene) {
    const data = DE_GAME.export_scene_tilemap(scene);
    if (!data) return null;
    const grid = data.layers[0].grid;
    return (grid[0] ? grid[0].length : 0) + "x" + grid.length + " hucre, "
        + data.layers.length + " katman, "
        + ((scene._tilemap_segments || []).length) + " kenar cizgisi";
}

function _cmd_tilemap_save(ctx, args) {
    if (!ctx) return "Sahne yok.";
    const name = _safe_name(args.length ? args[0] : "level");
    const data = DE_GAME.export_scene_tilemap(ctx);
    if (!data) return "Bu sahnede tilemap yok (prosedurel/boss seviyesi gerekli).";
    const all = _tilemap_all();
    all[_TILEMAP_KEY + name] = data;
    _tilemap_put_all(all);
    return "tilemap kaydedildi: " + name + " (" + _tilemap_summary(ctx) + ")";
}

function _cmd_tilemap_load(ctx, args) {
    if (!ctx) return "Sahne yok.";
    const name = _safe_name(args.length ? args[0] : "level");
    const data = _tilemap_all()[_TILEMAP_KEY + name];
    if (!data) return "Okunamadi (" + name + "): kayit yok.";
    if (!DE_GAME.import_scene_tilemap(ctx, data)) return "Veri gecersiz (tilemap katmani yok).";
    return "tilemap yuklendi: " + name + " (" + _tilemap_summary(ctx) + ")";
}

DE.register_command("hp", "oyuncu canini ayarla (hp 5)", _cmd_hp);
DE.register_command("heal", "can doldur", _cmd_heal);
DE.register_command("god", "olumsuzluk ac/kapa", _cmd_god);
DE.register_command("coins", "skora coins ekle (coins 100)", _cmd_coins);
DE.register_command("speed", "oyuncu hizini ayarla (speed 300)", _cmd_speed);
DE.register_command("jump", "ziplama gucunu ayarla (jump 600)", _cmd_jump);
DE.register_command("tp", "isinla (tp x y)", _cmd_tp);
DE.register_command("respawn", "spawn noktasina don", _cmd_respawn);
DE.register_command("tilemap_save", "seviye tilemap'ini kaydet (tilemap_save seviye1)", _cmd_tilemap_save);
DE.register_command("tilemap_load", "tilemap'i geri yukle (tilemap_load seviye1)", _cmd_tilemap_load);
DE.register_command("list", "sahnedeki nesneleri say", _cmd_list);