/* DerinEngine HTML — procedural (Procedural Level Generator)
 * Python deep_engine/procedural.py portu. Motor katmanında; sahne kurmaz,
 * yalnızca levelfile.place_object'un anladığı JSON-uyumlu seviye verisi üretir.
 * Deterministik: aynı seed = aynı seviye.
 */
var DE = DE || {};

DE.CHUNK_W = 300;
DE.GROUND_H = 40;
DE.WORLD_H = 620;

DE.PR_BIOMES = {
    "forest": {
        "name_tr": "Orman Vadisi",
        "name_en": "Forest Valley",
        "background": [16, 24, 34],
        "parallax": "forest",
        "platform": [60, 90, 130],
        "platform_alt": [40, 70, 110],
        "fog": [120, 255, 170],
        "coin": [255, 215, 0],
        "enemy_pool": ["Enemy", "Hopper", "Flyer", "Spikes"],
    },
    "cave": {
        "name_tr": "Karanlık Mağara",
        "name_en": "Dark Cave",
        "background": [12, 10, 20],
        "parallax": "cave",
        "platform": [70, 60, 80],
        "platform_alt": [55, 46, 66],
        "fog": [180, 180, 190],
        "coin": [255, 190, 60],
        "enemy_pool": ["Enemy", "Hopper", "Turret", "Spikes"],
    },
    "ice": {
        "name_tr": "Buz Diyarı",
        "name_en": "Frozen Realm",
        "background": [150, 200, 235],
        "parallax": "ice",
        "platform": [90, 170, 220],
        "platform_alt": [120, 200, 245],
        "fog": [220, 250, 255],
        "coin": [150, 240, 255],
        "enemy_pool": ["Enemy", "Flyer", "Hopper", "Spikes"],
    },
    "desert": {
        "name_tr": "Çöl Fırtınası",
        "name_en": "Desert Storm",
        "background": [60, 45, 30],
        "parallax": "desert",
        "platform": [190, 140, 70],
        "platform_alt": [160, 110, 55],
        "fog": [255, 220, 150],
        "coin": [255, 200, 90],
        "enemy_pool": ["Enemy", "Hopper", "Flyer", "Turret"],
    },
    "astro": {
        "name_tr": "Yıldız Boşluğu",
        "name_en": "Astral Void",
        "background": [12, 10, 28],
        "parallax": "astro",
        "platform": [60, 60, 110],
        "platform_alt": [45, 45, 95],
        "fog": [160, 170, 255],
        "coin": [200, 190, 255],
        "enemy_pool": ["Flyer", "Turret", "Hopper", "Spikes"],
    },
};
DE.PR_BIOME_NAMES = Object.keys(DE.PR_BIOMES);

/* MT19937 — CPython 3.14 random.Random ile birebir (M7 parite):
 * init_by_array iki geçiş + taşıma hilesi + mt[0]=0x80000000 (3.14 kaynak),
 * random() = (genrand>>5)*2^26+(genrand>>6))/2^53, getrandbits k<=32 = genrand>>(32-k),
 * _randbelow = bit_length + ret ederek çekme. Aynı sabit seed = Python ile aynı seviye.
 * 32-bit karma Math.imul ile (float64 tam sayı tuzağı yok). */
DE._pr_rng = function (seed) {
    const N = 624, M = 397;
    const MATRIX_A = 0x9908B0DF;
    const UPPER = 0x80000000, LOWER = 0x7FFFFFFF;
    const mt = new Array(N).fill(0);
    let idx = N;

    const initGenrand = function (s) {
        mt[0] = s >>> 0;
        for (let i = 1; i < N; i++) {
            const t = mt[i - 1] ^ (mt[i - 1] >>> 30);
            mt[i] = (Math.imul(t, 1812433253) + i) >>> 0;
        }
        idx = N;
    };
    const initByKey = function (key) {
        initGenrand(19650218);
        let i = 1, j = 0;
        let k = Math.max(N, key.length);
        for (; k; k--) {
            mt[i] = ((mt[i] ^ Math.imul(mt[i - 1] ^ (mt[i - 1] >>> 30), 1664525)) + key[j] + j) >>> 0;
            i++; j++;
            if (i >= N) { mt[0] = mt[N - 1]; i = 1; }
            if (j >= key.length) j = 0;
        }
        for (k = N - 1; k; k--) {
            mt[i] = ((mt[i] ^ Math.imul(mt[i - 1] ^ (mt[i - 1] >>> 30), 1566083941)) - i) >>> 0;
            i++;
            if (i >= N) { mt[0] = mt[N - 1]; i = 1; }
        }
        mt[0] = 0x80000000;
        idx = N;
    };
    const genrand = function () {
        if (idx >= N) {
            for (let kk = 0; kk < N - M; kk++) {
                const y = (mt[kk] & UPPER) | (mt[kk + 1] & LOWER);
                mt[kk] = (mt[kk + M] ^ (y >>> 1) ^ ((y & 1) ? MATRIX_A : 0)) >>> 0;
            }
            for (let kk = N - M; kk < N - 1; kk++) {
                const y = (mt[kk] & UPPER) | (mt[kk + 1] & LOWER);
                mt[kk] = (mt[kk + (M - N)] ^ (y >>> 1) ^ ((y & 1) ? MATRIX_A : 0)) >>> 0;
            }
            const y = (mt[N - 1] & UPPER) | (mt[0] & LOWER);
            mt[N - 1] = (mt[M - 1] ^ (y >>> 1) ^ ((y & 1) ? MATRIX_A : 0)) >>> 0;
            idx = 0;
        }
        let y = mt[idx++];
        y = y ^ (y >>> 11);
        y = (y ^ ((y << 7) & 0x9D2C5680)) >>> 0;
        y = (y ^ ((y << 15) & 0xEFC60000)) >>> 0;
        y = (y ^ (y >>> 18)) >>> 0;
        return y >>> 0;
    };
    const getrandbits = function (k) {
        if (k <= 0) return 0;
        if (k <= 32) return genrand() >>> (32 - k);
        let r = 0, shift = 0, rem = k;
        while (rem > 0) {
            let word = genrand();
            if (rem < 32) word = word >>> (32 - rem);
            r += word * Math.pow(2, shift);
            shift += 32;
            rem -= 32;
        }
        return r;
    };
    const randbelow = function (n) {
        const k = 32 - Math.clz32(n);
        let r = getrandbits(k);
        while (r >= n) r = getrandbits(k);
        return r;
    };

    // Python: abs(n) → küçük-sondan 32-bit kelimeler; 0 → tek kelime [0].
    let n = Math.floor(Math.abs(seed));
    const key = [];
    if (n === 0) key.push(0);
    else while (n > 0) { key.push(n % 4294967296); n = Math.floor(n / 4294967296); }
    initByKey(key);

    return {
        random() {
            const a = genrand() >>> 5, b = genrand() >>> 6;
            return (a * 67108864 + b) / 9007199254740992;
        },
        randint(a0, b0) { return a0 + randbelow(b0 - a0 + 1); },
        choice(arr) { return arr[randbelow(arr.length)]; },
    };
};

DE.procedural_pick_biome = function (biome, rng) {
    if (biome && DE.PR_BIOMES[biome]) return biome;
    if (rng) return rng.choice(DE.PR_BIOME_NAMES);
    return DE.PR_BIOME_NAMES[Math.floor(Math.random() * DE.PR_BIOME_NAMES.length)];
};

DE._pr_push = function (objects, tag, x, y, w, h, color, extra) {
    const entry = { tag: tag, name: tag, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    if (w !== null && w !== undefined) entry["w"] = Math.round(w * 10) / 10;
    if (h !== null && h !== undefined) entry["h"] = Math.round(h * 10) / 10;
    if (color) entry["color"] = [].concat(color);
    if (extra) Object.assign(entry, extra);
    objects.push(entry);
    return entry;
};

DE._pr_place_chunk_enemies = function (objects, rng, cx0, cx1, ground_y, b, difficulty, safe_max_x) {
    let pool = b["enemy_pool"].slice();
    if (difficulty <= 1) {
        pool = pool.filter(t => t !== "Turret");
    } else if (difficulty === 2) {
        pool = pool.filter(t => t !== "Turret");
        if (rng.random() < 0.40) pool.push("Turret");
    }
    const count = rng.randint(1, 1 + difficulty);
    const speed_bonus = difficulty * 25.0;
    const fire_penalty = Math.max(0.5, 2.0 - difficulty * 0.25);
    const bullet_bonus = difficulty * 30.0;
    const hp_bonus = difficulty * 10;
    for (let k = 0; k < count; k++) {
        const tag = rng.choice(pool);
        const ex = rng.randint(cx0 + 40, cx1 - 40);
        if (safe_max_x && ex < safe_max_x) continue;
        const R = (v) => Math.round(v * 10) / 10;
        if (tag === "Flyer") {
            DE._pr_push(objects, "Flyer", ex, ground_y - rng.randint(100, 160), 26, 22, [90, 220, 200],
                { speed: 55.0 + speed_bonus, hp: 25 + hp_bonus });
        } else if (tag === "Hopper") {
            DE._pr_push(objects, "Hopper", ex, ground_y - 34, 28, 28, [250, 170, 60],
                { speed: 40.0 + speed_bonus * 0.8, hp: 25 + hp_bonus });
        } else if (tag === "Turret") {
            DE._pr_push(objects, "Turret", ex, ground_y - 34, 30, 30, [170, 60, 220],
                { fire_interval: fire_penalty, bullet_speed: 240.0 + bullet_bonus, hp: 25 + hp_bonus });
        } else if (tag === "Spikes") {
            const spring_near = objects.some(o => o["tag"] === "Spring" &&
                Math.abs(ex - (o["x"] + (o["w"] !== undefined ? o["w"] : 16) / 2.0)) < 55);
            if (spring_near) continue;
            DE._pr_push(objects, "Spikes", ex, ground_y - 16, 32, 16, [150, 150, 160]);
        } else {
            DE._pr_push(objects, "Enemy", ex, ground_y - 34, 28, 28, [235, 55, 75],
                { speed: 65.0 + speed_bonus, hp: 25 + hp_bonus });
        }
    }
};

DE._pr_place_chunk_coins = function (objects, rng, cx0, cx1, ground_y, b, difficulty) {
    const base = rng.randint(2, 4) - difficulty;
    const count = Math.max(1, base);
    const spikes = objects
        .filter(o => o["tag"] === "Spikes" && cx0 <= o["x"] && o["x"] < cx1)
        .map(o => [o["x"], o["x"] + (o["w"] !== undefined ? o["w"] : 32)]);
    for (let k = 0; k < count; k++) {
        const cx = rng.randint(cx0 + 30, cx1 - 30);
        let height = rng.choice([-60, -90, -120, -30]);
        const coin_w = 18;
        if (spikes.some(sp => cx < sp[1] && cx + coin_w > sp[0])) height = -75;
        DE._pr_push(objects, "Coin", cx, ground_y + height, 18, 18, b["coin"]);
    }
};

DE._pr_maybe_powerup = function (objects, rng, cx0, cx1, ground_y, difficulty, safe_max_x) {
    const prob = Math.max(0.10, 0.35 - difficulty * 0.06);
    if (rng.random() < prob) {
        const ptype = rng.choice(["magnet", "triple", "shield", "speed", "slow"]);
        const px = rng.randint(cx0 + 40, cx1 - 40);
        if (safe_max_x && px < safe_max_x) return;
        DE._pr_push(objects, "PowerUp", px, ground_y - 70, 24, 24, [180, 60, 255],
            { power_type: ptype, duration: 8.0 });
    }
};

DE._pr_maybe_island = function (objects, rng, cx0, cx1, ground_y, b, difficulty, safe_max_x) {
    if (safe_max_x && cx0 < safe_max_x) return;
    const has_spring = objects.some(o => o["tag"] === "Spring" && cx0 <= o["x"] && o["x"] < cx1 + 150);
    if (has_spring) return;
    if (rng.random() < 0.4) {
        const ix = rng.randint(cx0 + 60, cx1 - 60);
        const iy = ground_y - rng.randint(140, 200);
        DE._pr_push(objects, "Ground", ix, iy, rng.choice([96, 128, 160]), 24, b["platform"], { one_way: true });
        for (let k = 0; k < 3; k++) {
            DE._pr_push(objects, "Coin", ix + 12 + k * 30, iy - 30, 18, 18, b["coin"]);
        }
        if (difficulty >= 3) {
            DE._pr_push(objects, "SniperEnemy", ix + 24, iy - 40, 24, 26, [120, 200, 90]);
        }
    }
};

DE._pr_maybe_breakable = function (objects, rng, cx0, cx1, ground_y, safe_max_x, is_last_chunk) {
    if (safe_max_x && cx0 < safe_max_x && !is_last_chunk) return;
    if (rng.random() < 0.28) {
        const bx = rng.randint(cx0 + 60, cx1 - 60);
        const by = ground_y - rng.randint(120, 170);
        const bw = rng.choice([56, 64, 72]);
        const bh = 20;
        DE._pr_push(objects, "Breakable", bx, by, bw, bh, [150, 120, 90]);
        DE._pr_push(objects, "Coin", bx + Math.floor(bw / 2) - 9, by + bh + 8, 18, 18, [255, 215, 0]);
    }
};

DE.procedural_generate = function (biome = null, seed = null, chunks = 8, difficulty = 0, viewport_width = 900) {
    if (seed === null) seed = Math.floor(Math.random() * 100000000);
    seed = Math.floor(seed);
    const rng = DE._pr_rng(seed);
    const bname = DE.procedural_pick_biome(biome, rng);
    const b = DE.PR_BIOMES[bname];

    const objects = [];
    const ground_level = 480;
    const player_start_x = 60;
    const safe_zone_width = Math.max(260, Math.floor(viewport_width));
    const safe_max_x = player_start_x + safe_zone_width;
    const world_end_x = chunks * DE.CHUNK_W;

    let prev_y = ground_level;
    const seg_heights = [];
    for (let c = 0; c < chunks; c++) {
        const cx0 = c * DE.CHUNK_W;
        const cx1 = (c + 1) * DE.CHUNK_W;
        let step = rng.randint(-2, 2);
        if ((cx0 + safe_zone_width) < DE.CHUNK_W * 2) step = 0;
        const new_y = Math.max(320, Math.min(540, prev_y + step * 32));
        seg_heights.push(new_y);
        DE._pr_push(objects, "Ground", cx0, new_y, DE.CHUNK_W, DE.GROUND_H, b["platform"]);
        DE._pr_push(objects, "Ground", cx0, new_y + DE.GROUND_H, DE.CHUNK_W,
            DE.WORLD_H - new_y - DE.GROUND_H, b["platform_alt"]);
        if ((cx0 >= safe_max_x) && new_y < prev_y && (prev_y - new_y) >= 64) {
            DE._pr_push(objects, "Spring", cx0 + 60, new_y - 16, null, null, [50, 220, 120]);
        }
        DE._pr_place_chunk_enemies(objects, rng, cx0, cx1, new_y, b, difficulty, safe_max_x);
        DE._pr_place_chunk_coins(objects, rng, cx0, cx1, new_y, b, difficulty);
        DE._pr_maybe_powerup(objects, rng, cx0, cx1, new_y, difficulty, safe_max_x);
        prev_y = new_y;
    }
    for (let c = 0; c < chunks; c++) {
        const cx0 = c * DE.CHUNK_W;
        const cx1 = (c + 1) * DE.CHUNK_W;
        DE._pr_maybe_island(objects, rng, cx0, cx1, seg_heights[c], b, difficulty, safe_max_x);
        // Not: üçgen rampalar kullanıcı kararıyla üretilmiyor (bkz. 03_game.md "ÜÇGEN RAMPALAR").
        DE._pr_maybe_breakable(objects, rng, cx0, cx1, seg_heights[c], safe_max_x, c === chunks - 1);
    }

    objects.push({
        "tag": "Player", "name": "Player",
        "x": 60, "y": ground_level - 70, "w": 32, "h": 32,
        "color": [60, 200, 245],
    });
    objects.push({
        "tag": "Portal", "name": "Portal",
        "x": world_end_x - 120, "y": prev_y - 70, "w": 40, "h": 60,
        "color": [160, 80, 240], "next": "campaign_boss",
    });

    return {
        "name": "Procedural " + bname + " (#" + seed + ")",
        "name_tr": "Prosedürel " + b["name_tr"],
        "name_en": "Procedural " + b["name_en"],
        "background_color": [].concat(b["background"]),
        "parallax_theme": b["parallax"],
        "biome": bname,
        "seed": seed,
        "difficulty": difficulty,
        "objects": objects,
    };
};

/* --- Bölüm sonu boss arenası --- */
DE.PR_BOSSES = {
    "forest": { "name_tr": "Orman Devi", "name_en": "Forest Titan", "color": [90, 200, 80], "hp": 120, "fire_interval": 2.2, "bullet_speed": 300, "shoot_count": 1, "light": [90, 220, 90] },
    "cave": { "name_tr": "Karanlık Kolüssüs", "name_en": "Dark Colossus", "color": [150, 70, 210], "hp": 150, "fire_interval": 1.9, "bullet_speed": 330, "shoot_count": 1, "light": [170, 80, 240] },
    "ice": { "name_tr": "Buz Devi", "name_en": "Frost Titan", "color": [120, 210, 255], "hp": 160, "fire_interval": 1.7, "bullet_speed": 350, "shoot_count": 2, "light": [130, 220, 255] },
    "desert": { "name_tr": "Kum Devriyesi", "name_en": "Sand Warden", "color": [235, 150, 60], "hp": 180, "fire_interval": 1.5, "bullet_speed": 380, "shoot_count": 2, "light": [235, 160, 80] },
    "astro": { "name_tr": "Yıldız Yok Edici", "name_en": "Star Annihilator", "color": [190, 130, 255], "hp": 260, "fire_interval": 1.2, "bullet_speed": 420, "shoot_count": 3, "light": [200, 150, 255] },
};
DE.PR_BOSS_TYPES = ["archer", "flying", "sniper", "shield"];

DE._pr_boss_design = function (biome, difficulty, rng) {
    rng = rng || DE._pr_rng(0);
    const b = DE.PR_BOSSES[biome];
    const scale = 1.0 + difficulty * 0.15;
    let boss_type;
    if (biome === "astro") boss_type = "cosmic";
    else boss_type = rng.choice(DE.PR_BOSS_TYPES);
    return {
        "boss_key": biome,
        "boss_type": boss_type,
        "color": [].concat(b["color"]),
        "light": [].concat(b["light"]),
        "hp": Math.floor(b["hp"] * scale),
        "fire_interval": Math.max(0.6, b["fire_interval"] - difficulty * 0.15),
        "bullet_speed": Math.floor(b["bullet_speed"] * scale),
        "shoot_count": b["shoot_count"] + Math.floor(difficulty / 2),
        "patrol_distance": 200.0,
        "speed": 65.0 + difficulty * 10,
    };
};

DE.procedural_generate_boss_arena = function (biome = null, seed = null, difficulty = 0, next_target = "victory") {
    if (seed === null) seed = Math.floor(Math.random() * 100000000);
    seed = Math.floor(seed);
    const rng = DE._pr_rng(seed);
    const bname = DE.procedural_pick_biome(biome, rng);
    const b = DE.PR_BIOMES[bname];

    const objects = [];
    const ground_level = 480;
    const arena_w = Math.floor(6 * DE.CHUNK_W);
    DE._pr_push(objects, "Ground", 0, ground_level, arena_w, DE.GROUND_H, b["platform"]);
    DE._pr_push(objects, "Ground", 0, ground_level + DE.GROUND_H, arena_w,
        DE.WORLD_H - ground_level - DE.GROUND_H, b["platform_alt"]);
    objects.push({
        "tag": "Player", "name": "Player",
        "x": 80, "y": ground_level - 70, "w": 32, "h": 32,
        "color": [60, 200, 245],
    });

    const boss = DE._pr_boss_design(bname, difficulty, rng);
    objects.push({
        "tag": "Boss", "name": "Boss",
        "x": Math.floor(arena_w / 2) - 32, "y": ground_level - 84, "w": 64, "h": 64,
        "color": boss["color"],
        "boss_key": boss["boss_key"],
        "boss_type": boss["boss_type"],
        "light": boss["light"],
        "hp": boss["hp"],
        "fire_interval": boss["fire_interval"],
        "bullet_speed": boss["bullet_speed"],
        "shoot_count": boss["shoot_count"],
        "patrol_distance": boss["patrol_distance"],
        "speed": boss["speed"],
        "next": next_target,
    });

    if (boss["boss_type"] === "shield") {
        const bcx = Math.floor(arena_w / 2);
        const bcy = ground_level - 60;
        DE._pr_push(objects, "Breakable", bcx - 74, bcy, 44, 44, [150, 120, 90], { hits: 2, trigger: true });
        DE._pr_push(objects, "Breakable", bcx + 30, bcy, 44, 44, [150, 120, 90], { hits: 2, trigger: true });
        DE._pr_push(objects, "Breakable", bcx - 22, bcy - 58, 44, 44, [150, 120, 90], { hits: 2, trigger: true });
    }

    objects.push({
        "tag": "Portal", "name": "Portal",
        "x": arena_w - 160, "y": ground_level - 70, "w": 40, "h": 60,
        "color": [160, 80, 240], "next": next_target, "boss_arena": true,
    });

    return {
        "name": "Boss " + bname + " (#" + seed + ")",
        "name_tr": b["name_tr"] + " - Amiral",
        "name_en": b["name_en"] + " - Stronghold",
        "background_color": [].concat(b["background"]),
        "parallax_theme": b["parallax"],
        "biome": bname,
        "seed": seed,
        "difficulty": difficulty,
        "is_boss_arena": true,
        "objects": objects,
    };
}
/* --- Python procedural.py modul adiyla birebir ayni API (parite) ---------
 * Python: procedural.generate / pick_biome / generate_boss_arena,
 *         BIOMES / BIOME_NAMES / BOSSES / BOSS_TYPES
 * JS bunlari `procedural_` onekiyle disa veriyor; oyun kodu bunlari kullaniyor.
 * Bu takma adlar Python'daki kisa adlari da erisilebilir kilar (denklik). */
DE.generate = DE.procedural_generate;
DE.pick_biome = DE.procedural_pick_biome;
DE.generate_boss_arena = DE.procedural_generate_boss_arena;
DE.BIOMES = DE.PR_BIOMES;
DE.BIOME_NAMES = DE.PR_BIOME_NAMES;
DE.BOSSES = DE.PR_BOSSES;
DE.BOSS_TYPES = DE.PR_BOSS_TYPES;