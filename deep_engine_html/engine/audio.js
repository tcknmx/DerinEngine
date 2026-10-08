/* DerinEngine HTML — audio (SoundFX: WebAudio ile 8-bit ses + algoritmik müzik)
 * Python deep_engine/audio.py portu. Ses örnekleri hesaplanıp AudioBuffer'e yazilir;
 * WebAudio API tarayicida mevcuttur. Testte DE.SoundFX._audio_ctx stublanabilir.
 */
var DE = DE || {};

/* AudioBuffer builder: bir dizi örneği Float32Array'e dönüştürüp AudioBuffer yazar. */
DE._build_buffer = function (ctx, samples, sample_rate, channels, split) {
    // split: true ise samples [sol[], sag[]] dizisi (stereo); false ise mono dizi
        const n = channels === 2
            ? Math.min(split[0].length, split[1].length)   // ORTA-6: py _create_stereo_sound min() — max döngüyü uzatıp parçaya sessizlik ekliyordu
            : samples.length;
    const buf = ctx.createBuffer(channels, n, sample_rate);
    if (channels === 1) {
        const d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.max(-1, Math.min(1, samples[i] / 32768));
    } else {
        const l = buf.getChannelData(0), r = buf.getChannelData(1);
        for (let i = 0; i < n; i++) {
            l[i] = i < split[0].length ? Math.max(-1, Math.min(1, split[0][i] / 32768)) : 0;
            r[i] = i < split[1].length ? Math.max(-1, Math.min(1, split[1][i] / 32768)) : 0;
        }
    }
    return buf;
};

DE.SoundFX = class SoundFX {
    /* Python audio.py ile aynı sözleşmeyi izler: play / play_jump / play_powerup /
     * play_music _initialized değilse önce initialize() çağırır (tembel başlatma).
     * game/main.js açılışta initialize() + play_music("menu") çağırır (main.py:78,86).
     */
    static _audio_ctx = null;
    static _initialized = false;
    static _sounds = {};
    static _music_buffer = null;
    static _current_music = null;
    static _music_node = null;
    static _music_gain = null;
    static _sfx_gain = null;      // efekt sesleri için ortak gain düğümü (ses seviyesi)
    static _sfx_volume = 1.0;     // 0..1 efekt seviyesi
    static _music_volume = 1.0;   // 0..1 müzik seviyesi

    /* Ses seviyeleri (0..1). Python'da karşılığı yok, ama parity korunur:
     * JS'in fazladan API'si parite kapsamında zorunlu değildir. */
    static set_sfx_volume(v) {
        const val = Math.max(0.0, Math.min(1.0, Number(v) || 0.0));
        DE.SoundFX._sfx_volume = val;
        if (DE.SoundFX._sfx_gain) {
            try { DE.SoundFX._sfx_gain.gain.value = val; } catch (e) { /* sessiz */ }
        }
        return val;
    }
    static set_music_volume(v) {
        const val = Math.max(0.0, Math.min(1.0, Number(v) || 0.0));
        DE.SoundFX._music_volume = val;
        if (DE.SoundFX._music_gain) {
            try { DE.SoundFX._music_gain.gain.value = val; } catch (e) { /* sessiz */ }
        }
        return val;
    }
    static set_volume(kind, v) {
        if (kind === "sfx") return DE.SoundFX.set_sfx_volume(v);
        if (kind === "music") return DE.SoundFX.set_music_volume(v);
        return v;
    }
    static get_sfx_volume() { return DE.SoundFX._sfx_volume; }
    static get_music_volume() { return DE.SoundFX._music_volume; }
    static get_volume(kind) {
        if (kind === "sfx") return DE.SoundFX.get_sfx_volume();
        if (kind === "music") return DE.SoundFX.get_music_volume();
        return 1.0;
    }

    static _ctx() {
        if (DE.SoundFX._audio_ctx) return DE.SoundFX._audio_ctx;
        if (typeof window !== "undefined") {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) {
                try {
                    DE.SoundFX._audio_ctx = new AC();
                } catch (e) { DE.SoundFX._audio_ctx = null; }
            }
        }
        return DE.SoundFX._audio_ctx;
    }

    static _clamp16(v) {
        return Math.max(-32767, Math.min(32767, v));
    }

    static _wave_sound(samples, sample_rate) {
        const ctx = DE.SoundFX._ctx();
        if (!ctx) return null;
        try {
            return DE._build_buffer(ctx, samples, sample_rate, 1, null);
        } catch (e) { return null; }
    }

    static _stereo_sound(left, right, sample_rate) {
        const ctx = DE.SoundFX._ctx();
        if (!ctx) return null;
        const n = Math.min(left.length, right.length);
        try {
            return DE._build_buffer(ctx, null, sample_rate, 2, [left, right]);
        } catch (e) { return null; }
    }

    static initialize() {
        const ctx = DE.SoundFX._ctx();
        if (!ctx) return false;
        if (Object.keys(DE.SoundFX._sounds).length === 0) {
            DE.SoundFX._generate_preset_sounds();
        }
        DE.SoundFX._initialized = Object.keys(DE.SoundFX._sounds).length > 0;
        return DE.SoundFX._initialized;
    }

    /* Python play/play_jump/play_powerup/play_music'teki `if not _initialized:
     * initialize()` karşılaması. */
    static _ensure() {
        if (!DE.SoundFX._initialized) DE.SoundFX.initialize();
        return DE.SoundFX._initialized;
    }

    static play(sound_name) {
        if (!DE.SoundFX._ensure()) return;
        const snd = DE.SoundFX._sounds[sound_name];
        if (!snd) return;
        DE.SoundFX._play_buffer(snd);
    }

    static _play_buffer(buf) {
        const ctx = DE.SoundFX._ctx();
        if (!ctx || !buf) return;
        try {
            if (ctx.state === "suspended" && ctx.resume) ctx.resume();
            // Efekt sesleri ortak bir gain düğümüne bağlanır (set_sfx_volume).
            if (!DE.SoundFX._sfx_gain) {
                DE.SoundFX._sfx_gain = ctx.createGain();
                DE.SoundFX._sfx_gain.gain.value = DE.SoundFX._sfx_volume;
                DE.SoundFX._sfx_gain.connect(ctx.destination);
            }
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.connect(DE.SoundFX._sfx_gain);
            src.start(0);
        } catch (e) { /* sessiz */ }
    }

    static play_jump() {
        DE.SoundFX._ensure();
        const pick = ["jump", "jump_b", "jump_c"][Math.floor(Math.random() * 3)];
        DE.SoundFX.play(pick);
    }

    static play_powerup(power_type) {
        DE.SoundFX._ensure();
        let key = (power_type && DE.SoundFX._sounds["powerup_" + power_type]) ? "powerup_" + power_type : null;
        if (Math.random() < 0.3) {
            key = Math.random() < 0.5 ? "powerup_b" : "powerup_c";
        } else if (!key) {
            key = "powerup";
        }
        DE.SoundFX.play(key);
    }

    /* ------------------------------------------------------------------ */
    /* Preset 8-bit sesler (Python _generate_preset_sounds ile aynı) */
    /* ------------------------------------------------------------------ */
    static _generate_preset_sounds() {
        const SR = 22050;
        // 1. Jump: frekans kayar + varyasyonlar
        const jump = (pitch, dur) => {
            const samples = [];
            const total = Math.floor(SR * dur);
            for (let i = 0; i < total; i++) {
                const t = i / SR;
                const freq = (200 + (t / dur) * 450) * pitch;
                let val = Math.sin(2 * Math.PI * freq * t) > 0 ? 0.6 : -0.6;
                const volume = 1.0 - i / total;
                samples.push(Math.floor(val * volume * 16000));
            }
            return DE.SoundFX._wave_sound(samples, SR);
        };
        DE.SoundFX._sounds["jump"] = jump(1.0, 0.12);
        DE.SoundFX._sounds["jump_b"] = jump(1.12, 0.12);
        DE.SoundFX._sounds["jump_c"] = jump(0.92, 0.12);

        // 2. Coin
        {
            const samples = [];
            const dur = 0.18;
            const total = Math.floor(SR * dur);
            const half = Math.floor(total / 2);
            for (let i = 0; i < total; i++) {
                const t = i / SR;
                const freq = i < half ? 987 : 1318;
                const val = Math.sin(2 * Math.PI * freq * t);
                const volume = 1.0 - (i / total) * 0.8;
                samples.push(Math.floor(val * volume * 18000));
            }
            DE.SoundFX._sounds["coin"] = DE.SoundFX._wave_sound(samples, SR);
        }

        // 3. Win fanfare
        {
            const samples = [];
            const notes = [523, 659, 783, 1046];
            const note_dur = 0.1;
            for (const note of notes) {
                const nf = Math.floor(SR * note_dur);
                for (let i = 0; i < nf; i++) {
                    const t = i / SR;
                    let val = Math.sin(2 * Math.PI * note * t);
                    val = Math.asin(Math.max(-1, Math.min(1, val))) * (2 / Math.PI);
                    const volume = 1.0 - i / nf * 0.5;
                    samples.push(Math.floor(val * volume * 20000));
                }
            }
            DE.SoundFX._sounds["win"] = DE.SoundFX._wave_sound(samples, SR);
        }

        // 4. Shoot
        {
            const samples = [];
            const dur = 0.1;
            const total = Math.floor(SR * dur);
            for (let i = 0; i < total; i++) {
                const t = i / SR;
                const freq = 950 - (t / dur) * 650;
                let val = Math.sin(2 * Math.PI * freq * t) > 0 ? 0.5 : -0.5;
                const volume = 1.0 - i / total;
                samples.push(Math.floor(val * volume * 15000));
            }
            DE.SoundFX._sounds["shoot"] = DE.SoundFX._wave_sound(samples, SR);
        }

        // 5. Hit
        {
            const samples = [];
            const dur = 0.08;
            const total = Math.floor(SR * dur);
            for (let i = 0; i < total; i++) {
                const t = i / SR;
                const freq = 320 - (t / dur) * 180;
                const val = Math.sin(2 * Math.PI * freq * t);
                const volume = 1.0 - i / total;
                samples.push(Math.floor(val * volume * 17000));
            }
            DE.SoundFX._sounds["hit"] = DE.SoundFX._wave_sound(samples, SR);
        }

        // 6. Hurt
        {
            const samples = [];
            const dur = 0.15;
            const total = Math.floor(SR * dur);
            for (let i = 0; i < total; i++) {
                const t = i / SR;
                const freq = 180 - (t / dur) * 90;
                let val = Math.sin(2 * Math.PI * freq * t) > 0 ? 0.6 : -0.6;
                const volume = 1.0 - i / total;
                samples.push(Math.floor(val * volume * 19000));
            }
            DE.SoundFX._sounds["hurt"] = DE.SoundFX._wave_sound(samples, SR);
        }

        // 7. Explosion
        {
            const samples = [];
            const dur = 0.35;
            const total = Math.floor(SR * dur);
            for (let i = 0; i < total; i++) {
                const noise = Math.random() * 2 - 1;
                const volume = (1.0 - i / total) ** 2;
                samples.push(Math.floor(noise * volume * 18000));
            }
            DE.SoundFX._sounds["explosion"] = DE.SoundFX._wave_sound(samples, SR);
        }

        // 8. Power-up tune
        const pu = (notes) => {
            const s = [];
            for (const note of notes) {
                const nd = 0.06;
                const nf = Math.floor(SR * nd);
                for (let i = 0; i < nf; i++) {
                    const t = i / SR;
                    const val = Math.sin(2 * Math.PI * note * t);
                    const vol = 1.0 - i / nf * 0.4;
                    s.push(Math.floor(val * vol * 18000));
                }
            }
            return DE.SoundFX._wave_sound(s, SR);
        };
        DE.SoundFX._sounds["powerup"] = pu([440, 554, 659, 880]);
        DE.SoundFX._sounds["powerup_magnet"] = pu([330, 392, 494, 659]);
        DE.SoundFX._sounds["powerup_triple"] = pu([392, 494, 587, 784]);
        DE.SoundFX._sounds["powerup_shield"] = pu([392, 523, 659, 784]);
        DE.SoundFX._sounds["powerup_speed"] = pu([494, 659, 784, 988]);
        DE.SoundFX._sounds["powerup_slow"] = pu([196, 233, 277, 330]);
        DE.SoundFX._sounds["powerup_b"] = pu([466, 587, 698, 932]);
        DE.SoundFX._sounds["powerup_c"] = pu([413, 520, 620, 827]);

        // 9. Shield break
        {
            const samples = [];
            const dur = 0.18;
            const total = Math.floor(SR * dur);
            for (let i = 0; i < total; i++) {
                const t = i / SR;
                const freq = 600 - (t / dur) * 400;
                const val = Math.sin(2 * Math.PI * freq * t);
                const volume = 1.0 - i / total;
                samples.push(Math.floor(val * volume * 16000));
            }
            DE.SoundFX._sounds["shield_break"] = DE.SoundFX._wave_sound(samples, SR);
        }

        // 10. Boss hit
        {
            const samples = [];
            const dur = 0.22;
            const total = Math.floor(SR * dur);
            for (let i = 0; i < total; i++) {
                const t = i / SR;
                const freq = 240 - (t / dur) * 170;
                let val = Math.sin(2 * Math.PI * freq * t) * 0.7 + (Math.random() * 0.8 - 0.4);
                val = val > 0 ? 0.5 : (Math.random() < 0.5 ? 0.5 : -0.5);
                const volume = (1.0 - i / total) ** 1.4;
                samples.push(Math.floor(val * volume * 20000));
            }
            DE.SoundFX._sounds["boss_hit"] = DE.SoundFX._wave_sound(samples, SR);
        }

        // 11. Breakable
        {
            const samples = [];
            const dur = 0.22;
            const total = Math.floor(SR * dur);
            for (let i = 0; i < total; i++) {
                const t = i / SR;
                const freq = 900 - (t / dur) * 700;
                const noise = (Math.random() * 2 - 1) * 0.5 * (1.0 - t / dur);
                const val = Math.sin(2 * Math.PI * freq * t) * 0.5 + noise;
                const volume = (1.0 - i / total) ** 1.3;
                samples.push(Math.floor(val * volume * 18000));
            }
            DE.SoundFX._sounds["break"] = DE.SoundFX._wave_sound(samples, SR);
        }

        // 12. Click
        {
            const samples = [];
            const dur = 0.06;
            const total = Math.floor(SR * dur);
            for (let i = 0; i < total; i++) {
                const t = i / SR;
                const freq = 1300 - (t / dur) * 500;
                const val = Math.sin(2 * Math.PI * freq * t) * 0.6;
                const volume = (1.0 - i / total) ** 2.0;
                samples.push(Math.floor(val * volume * 14000));
            }
            DE.SoundFX._sounds["click"] = DE.SoundFX._wave_sound(samples, SR);
        }
    }

    /* ------------------------------------------------------------------ */
    /* Algoritmik biyom müziği (Python ile aynı LCG determinizmi) */
    /* ------------------------------------------------------------------ */
    static BIOME_MODES = {
        "forest": { "intervals": [0, 2, 4, 7, 9], "root_oct": 4, "seed": 7, "tempo": 0.17, "mode": "calm" },
        "cave": { "intervals": [0, 2, 3, 5, 7, 8], "root_oct": 3, "seed": 13, "tempo": 0.23, "mode": "dark" },
        "ice": { "intervals": [0, 2, 3, 5, 7, 8, 10], "root_oct": 5, "seed": 21, "tempo": 0.10, "mode": "bright" },
        "desert": { "intervals": [0, 1, 4, 5, 7, 9], "root_oct": 4, "seed": 34, "tempo": 0.16, "mode": "walk" },
        "astro": { "intervals": [0, 2, 4, 5, 7, 9, 11, 12], "root_oct": 3, "seed": 55, "tempo": 0.22, "mode": "space" },
    };

    static _NOTE = {
        "C": 261.63, "C#": 277.18, "D": 293.66, "D#": 311.13, "E": 329.63,
        "F": 349.23, "F#": 369.99, "G": 392.00, "G#": 415.30, "A": 440.00,
        "A#": 466.16, "B": 493.88,
    };

    static _freq(name, octave = 4) {
        const base = DE.SoundFX._NOTE[name];
        return base * (2 ** (octave - 4));
    }

    static _lcg(state) {
        // ORTA-6: JS sayılar float64 — `state * 1103515245` 2^61'e kadar
        // büyüyüp tam sayı hassasiyetini kaybederdi. Math.imul tam 32-bit
        // çarpar; Python'un keyfi hassasiyetli `& 0x7fffffff` ile aynı sonucu verir.
        return (Math.imul(state, 1103515245) + 12345) & 0x7fffffff;
    }

    static _melody_walk(seed, length, sigma, rng = null) {
        let idx = 0;
        let state = seed;
        const out = [];
        for (let i = 0; i < length; i++) {
            state = DE.SoundFX._lcg(state);
            const delta = (state % (2 * sigma + 1)) - sigma;
            idx += delta;
            out.push(idx);
        }
        return out;
    }

    /* Python _render_layer / _mix_layers eşleniği — Sound yerine Float32 dizi. */
    static _render_layer(notes, note_dur, sample_rate, volume, wave, gain = 1.0) {
        const out = [];
        for (const entry of notes) {
            let note = entry, mult = 1.0;
            if (Array.isArray(entry)) { note = entry[0]; mult = entry[1]; }
            const n = Math.floor(sample_rate * note_dur * mult);
            if (note === null || note === undefined) { for (let k = 0; k < n; k++) out.push(0); continue; }
            const freq = note;
            const amp = Math.floor(volume * gain * 16000);
            for (let i = 0; i < n; i++) {
                const t = i / sample_rate;
                const angle = 2 * Math.PI * freq * t;
                const s = Math.sin(angle);
                let val;
                if (wave === "sine") val = s;
                else if (wave === "triangle") val = Math.asin(Math.max(-1, Math.min(1, s))) * (2 / Math.PI);
                else val = s >= 0 ? 1 : -1;
                const env = Math.min(1.0, i / 200.0, (n - i) / 200.0, 1.0);
                out.push(Math.floor(val * env * amp));
            }
        }
        return out;
    }

    static _mix_raw(layers) {
        let total = 0;
        for (const l of layers) total = Math.max(total, l.length);
        const summed = new Array(total).fill(0);
        for (const layer of layers) {
            for (let i = 0; i < layer.length; i++) summed[i] += layer[i];
        }
        return summed.map(v => Math.max(-32767, Math.min(32767, v)));
    }

    static _mix_layers(layers, sample_rate) {
        const total = layers.reduce((m, l) => Math.max(m, l.length), 0);
        if (!total) return null;
        const clipped = DE.SoundFX._mix_raw(layers);
        return DE.SoundFX._wave_sound(clipped, sample_rate);
    }

    static _generate_track_samples(biome, boss, stereo) {
        const cfg = DE.SoundFX.BIOME_MODES[biome];
        if (!cfg) return null;
        const intervals = cfg["intervals"];
        const root_oct = cfg["root_oct"] - (boss ? 1 : 0);
        const root = DE.SoundFX._freq("C", root_oct);
        const tempo = cfg["tempo"] * (boss ? 0.60 : 1.0);
        const sigma = boss ? 6 : 3;
        const seed = cfg["seed"] + (boss ? 1000 : 0);
        const length = boss ? 40 : 48;
        const SR = 22050;
        const walk = DE.SoundFX._melody_walk(seed, length, sigma);

        const mel = [];
        for (let i = 0; i < walk.length; i++) {
            const mi = ((walk[i] % intervals.length) + intervals.length) % intervals.length;
            const freq = root * (2 ** (intervals[mi] / 12.0));
            let state = DE.SoundFX._lcg(seed + 1 + i * 7);
            const is_rest = (state % 100) < (boss ? 4 : 14);
            if (is_rest) mel.push(null);
            else {
                const state2 = DE.SoundFX._lcg(seed + 2 + i * 13);
                const mult = (state2 % 100) < (boss ? 26 : 10) ? 3.0 : 1.0;
                mel.push([freq, mult]);
            }
        }

        const bass = [];
        const bass_root = DE.SoundFX._freq("C", Math.max(1, root_oct - 1));
        for (let i = 0; i < length; i++) {
            const bstate = DE.SoundFX._lcg(seed + 3 + i * 11);
            if ((bstate % 100) < (boss ? 72 : 48)) {
                const bi = i % 2 === 0 ? 0 : Math.min(2, intervals.length - 1);
                bass.push([bass_root * (2 ** (intervals[bi] / 12.0)), 1.0]);
            } else bass.push(null);
        }

        const harm = [];
        for (let i = 0; i < length; i++) {
            if (i % 3 !== 0) { harm.push(null); continue; }
            const mi = ((walk[i] + 2) % intervals.length + intervals.length) % intervals.length;
            harm.push([root * (2 ** (intervals[mi] / 12.0)), 2.0]);
        }

        const tick = [];
        for (let i = 0; i < length; i++) {
            const tstate = DE.SoundFX._lcg(seed + 5 + i * 17);
            if ((tstate % 100) < (boss ? 78 : 46)) tick.push([root * 2.0, 0.3]);
            else tick.push(null);
        }

        const mel_l = DE.SoundFX._render_layer(mel, tempo, SR, 0.42, "square", stereo ? 0.9 : 1.0);
        const bass_l = DE.SoundFX._render_layer(bass, tempo, SR, 0.30, "sine", stereo ? 0.7 : 1.0);
        const harm_l = DE.SoundFX._render_layer(harm, tempo, SR, 0.28, "triangle", stereo ? 0.9 : 1.0);
        const tick_l = DE.SoundFX._render_layer(tick, tempo, SR, 0.22, "square", stereo ? 0.9 : 1.0);
        return { mel: mel_l, bass: bass_l, harm: harm_l, tick: tick_l };
    }

    static _build_music_stereo(name, biome, boss) {
        const L = DE.SoundFX._generate_track_samples(biome, boss, true);
        if (!L) return null;
        const left = DE.SoundFX._mix_raw([L.mel, L.bass, L.tick]);
        const right = DE.SoundFX._mix_raw([L.mel, L.bass, L.harm]);
        return DE.SoundFX._stereo_sound(left, right, 22050);
    }

    static _build_predefined_riff(name) {
        const f = DE.SoundFX._freq;
        const C4 = f("C", 4), E4 = f("E", 4), G4 = f("G", 4), A4 = f("A", 4), F4 = f("F", 4);
        const D4 = f("D", 4), B3 = f("B", 3), G3 = f("G", 3), C5 = f("C", 5), E5 = f("E", 5);
        const G5 = f("G", 5), D5 = f("D", 5), F5 = f("F", 5), A5 = f("A", 5), B4 = f("B", 4), A3 = f("A", 3);
        const E3 = f("E", 3), F3 = f("F", 3), D3 = f("D", 3);

        let riff;
        if (name === "menu") {
            riff = [C4, E4, G4, C5, G4, E4, D4, F4, A4, C5, A4, F4, E4, G4, B4, D5, B4, G4, F4, A4, C5, E5, C5, A4, C5, G4, E4, D4, C4, E4, G4, C5];
        } else if (name === "level") {
            riff = [A3, C4, E4, A4, E4, C4, F3, A3, C4, F4, C4, A3, G3, B3, D4, G4, D4, B3, E3, G3, C4, E4, C4, G3, A3, C4, E4, A4, E4, C4, B3, D4, G4, B3, A3, E3];
        } else if (name === "boss") {
            riff = [G3, G3, B3, D4, B3, G3, F3, F3, A3, C4, A3, F3, E3, E3, G3, B3, G3, E3, D3, D3, F3, A3, F3, G3];
        } else if (name === "victory") {
            riff = [C4, E4, G4, C5, E5, G5, C5, G5, E5, C5, G4, E4, C4];
        } else {
            return null;
        }
        const dur = name === "menu" ? 0.16 : name === "level" ? 0.13 : name === "boss" ? 0.2 : 0.18;
        const vol = name === "menu" ? 0.42 : name === "level" ? 0.5 : name === "boss" ? 0.55 : 0.5;
        return DE.SoundFX._build_melody(riff, dur, 22050, vol, "square");
    }

    static _build_melody(notes, note_dur = 0.16, sample_rate = 22050, volume = 0.5, wave = "square") {
        const layer = DE.SoundFX._render_layer(notes.map(n => Array.isArray(n) ? n : [n, 1.0]),
            note_dur, sample_rate, volume, wave, 1.0);
        return DE.SoundFX._wave_sound(layer, sample_rate);
    }

    static play_music(name = "menu") {
        DE.SoundFX._ensure();
        const ctx0 = DE.SoundFX._ctx();
        if (!ctx0) return;
        // Tarayıcı autoplay kilidi: açılışta suspended gelen context'i uyandır
        // (kullanıcı etkileşiminden sonra geçerli olur; python karşılığı yok).
        if (ctx0.state === "suspended" && ctx0.resume) { try { ctx0.resume(); } catch (e) { /* sessiz */ } }
        if (DE.SoundFX._current_music === name && DE.SoundFX._music_node) return;
        let snd = null;
        let boss = false;
        let target = name;
        if (name.startsWith("boss_")) { boss = true; target = name.slice(5); }
        if (DE.SoundFX.BIOME_MODES[target]) {
            snd = DE.SoundFX._build_music_stereo(name, target, boss);
        } else {
            snd = DE.SoundFX._build_predefined_riff(name);
            if (!snd) return;
        }
        if (!snd) { DE.SoundFX._current_music = null; return; }
        DE.SoundFX._current_music = name;
        try {
            if (DE.SoundFX._music_node) DE.SoundFX._music_node.stop();
        } catch (e) { /* sessiz */ }
        const ctx = DE.SoundFX._ctx();
        const src = ctx.createBufferSource();
        src.buffer = snd;
        src.loop = true;
        const gain = ctx.createGain();
        // Python'da mixer kanalı ek kazanç uygulamaz (1.0); örnek sesleri kendi
        // seviyelerini taşır (menu 0.42, level 0.5 ...). Kullanıcı müzik seviyesi
        // bu gain'e uygulanır (medya/ses paneli), müzik döngüsü olduğu gibi kalır.
        gain.gain.value = DE.SoundFX._music_volume;
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start(0);
        DE.SoundFX._music_node = src;
        DE.SoundFX._music_gain = gain;
    }

    static stop_music() {
        DE.SoundFX._current_music = null;
        if (DE.SoundFX._music_node) {
            try { DE.SoundFX._music_node.stop(); } catch (e) { /* sessiz */ }
            DE.SoundFX._music_node = null;
        }
        if (DE.SoundFX._music_gain) {
            try { DE.SoundFX._music_gain.disconnect(); } catch (e) { /* sessiz */ }
            DE.SoundFX._music_gain = null;
        }
    }
}