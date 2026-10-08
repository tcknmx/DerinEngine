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
    if (!go) return "No player (you are not in a game scene).";
    const hp = go.get_component(DE.Health);
    if (!hp) return "Player has no Health component.";
    let value;
    try {
        value = Math.max(0, Math.min(999, parseInt(args[0], 10)));
        if (isNaN(value)) throw new Error("nan");
    } catch (e) {
        return "Usage: hp <number>  (current: " + hp.current_hp + "/" + hp.max_hp + ")";
    }
    hp.current_hp = value;
    return "hp -> " + hp.current_hp + "/" + hp.max_hp;
}

function _cmd_heal(ctx, args) {
    const [go, pc] = _commands_player(ctx);
    if (!go) return "No player.";
    const hp = go.get_component(DE.Health);
    if (!hp) return "Player has no Health component.";
    hp.current_hp = hp.max_hp;
    hp.invulnerable_timer = Math.max(hp.invulnerable_timer, 1.2);
    return "Health restored.";
}

function _cmd_god(ctx, args) {
    const [go] = _commands_player(ctx);
    if (!go) return "No player.";
    const hp = go.get_component(DE.Health);
    if (!hp) return "Player has no Health component.";
    if (hp.invulnerable_timer > 0) {
        hp.invulnerable_timer = 0.0;
        return "god mode OFF.";
    }
    hp.invulnerable_timer = 1.0e12;
    return "god mode ON (invincible).";
}

function _cmd_coins(ctx, args) {
    const [go, pc] = _commands_player(ctx);
    if (!go || !pc) return "No player (be in a game scene to add coins).";
    let amount;
    try {
        amount = parseInt(args[0], 10);
        if (isNaN(amount)) throw new Error("nan");
    } catch (e) {
        return "Usage: coins <number>  (current score: " + pc.score + ")";
    }
    pc._add_score(amount);
    return "score -> " + pc.score;
}

function _cmd_speed(ctx, args) {
    const [go, pc] = _commands_player(ctx);
    if (!go || !pc) return "No player.";
    let value;
    try {
        value = Math.max(20.0, Math.min(2000.0, parseFloat(args[0])));
        if (isNaN(value)) throw new Error("nan");
    } catch (e) {
        return "Usage: speed <value>  (current: " + pc.speed.toFixed(0) + ")";
    }
    pc.speed = value;
    return "speed -> " + pc.speed.toFixed(0);
}

function _cmd_jump(ctx, args) {
    const [go, pc] = _commands_player(ctx);
    if (!go || !pc) return "No player.";
    let value;
    try {
        value = Math.max(100.0, Math.min(4000.0, parseFloat(args[0])));
        if (isNaN(value)) throw new Error("nan");
    } catch (e) {
        return "Usage: jump <value>  (current: " + pc.jump_force.toFixed(0) + ")";
    }
    pc.jump_force = value;
    return "jump -> " + pc.jump_force.toFixed(0);
}

function _cmd_tp(ctx, args) {
    const [go, pc] = _commands_player(ctx);
    if (!go || !pc) return "No player.";
    let x, y;
    try {
        x = parseFloat(args[0]);
        y = parseFloat(args[1]);
        if (isNaN(x) || isNaN(y)) throw new Error("nan");
    } catch (e) {
        return "Usage: tp <x> <y>";
    }
    go.position.x = x;
    go.position.y = y;
    const rb = go.get_component(DE.Rigidbody2D);
    if (rb) {
        rb.velocity.x = 0.0;
        rb.velocity.y = 0.0;
    }
    return "teleported -> (" + x.toFixed(0) + ", " + y.toFixed(0) + ")";
}

function _cmd_respawn(ctx, args) {
    const [go, pc] = _commands_player(ctx);
    if (!go || !pc) return "No player.";
    pc.respawn(true);
    return "returned to spawn point.";
}

function _cmd_list(ctx, args) {
    if (!ctx) return "No scene.";
    const names = {};
    for (const obj of ctx.game_objects) {
        const tag = obj.tag || "?";
        names[tag] = (names[tag] || 0) + 1;
    }
    const parts = Object.keys(names).sort().map(t => t + " x" + names[t]);
    return parts.join(", ") || "(empty scene)";
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
    return (grid[0] ? grid[0].length : 0) + "x" + grid.length + " cells, "
        + data.layers.length + " layers, "
        + ((scene._tilemap_segments || []).length) + " edge lines";
}

function _cmd_tilemap_save(ctx, args) {
    if (!ctx) return "No scene.";
    const name = _safe_name(args.length ? args[0] : "level");
    const data = DE_GAME.export_scene_tilemap(ctx);
    if (!data) return "No tilemap in this scene (procedural/boss level required).";
    const all = _tilemap_all();
    all[_TILEMAP_KEY + name] = data;
    _tilemap_put_all(all);
    return "tilemap saved: " + name + " (" + _tilemap_summary(ctx) + ")";
}

function _cmd_tilemap_load(ctx, args) {
    if (!ctx) return "No scene.";
    const name = _safe_name(args.length ? args[0] : "level");
    const data = _tilemap_all()[_TILEMAP_KEY + name];
    if (!data) return "Cannot read (" + name + "): no record.";
    if (!DE_GAME.import_scene_tilemap(ctx, data)) return "Invalid data (no tilemap layer).";
    return "tilemap loaded: " + name + " (" + _tilemap_summary(ctx) + ")";
}

DE.register_command("hp", "set player health (hp 5)", _cmd_hp);
DE.register_command("heal", "restore health", _cmd_heal);
DE.register_command("god", "toggle invincibility", _cmd_god);
DE.register_command("coins", "add coins to score (coins 100)", _cmd_coins);
DE.register_command("speed", "set player speed (speed 300)", _cmd_speed);
DE.register_command("jump", "set jump force (jump 600)", _cmd_jump);
DE.register_command("tp", "teleport (tp x y)", _cmd_tp);
DE.register_command("respawn", "return to spawn point", _cmd_respawn);
DE.register_command("tilemap_save", "save level tilemap (tilemap_save level1)", _cmd_tilemap_save);
DE.register_command("tilemap_load", "load tilemap (tilemap_load level1)", _cmd_tilemap_load);
DE.register_command("list", "count objects in scene", _cmd_list);
/* --- Python game/commands.py ile ayni adlarla disa ac (parite) ---------
 * Python'da komutlar `def cmd_hp(...)` + dekoratör; burada `_cmd_hp` (yerel
 * kural: alt cizgili = dosya ici) idi. Takma adlar hem Python adini hem de
 * konsolun cagirdigi davranisi erisilebilir kilar. */
DE_GAME.cmd_hp = _cmd_hp;
DE_GAME.cmd_heal = _cmd_heal;
DE_GAME.cmd_god = _cmd_god;
DE_GAME.cmd_coins = _cmd_coins;
DE_GAME.cmd_speed = _cmd_speed;
DE_GAME.cmd_jump = _cmd_jump;
DE_GAME.cmd_tp = _cmd_tp;
DE_GAME.cmd_respawn = _cmd_respawn;
DE_GAME.cmd_tilemap_save = _cmd_tilemap_save;
DE_GAME.cmd_tilemap_load = _cmd_tilemap_load;
DE_GAME.cmd_list = _cmd_list;