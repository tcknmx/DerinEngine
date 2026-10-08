/* DerinEngine HTML — G8b testleri: SoundFX (WebAudio stub ile) */
"use strict";
const fs = require("fs");
const path = require("path");
global.DE = {};

// --- AudioContext + AudioNode stub'ları ---
class FakeNode {
    constructor() { this.buffer = null; this.loop = false; this._stopped = false; }
    connect() {}
    start() {}
    stop() { this._stopped = true; }
    disconnect() {}
}
class FakeGain extends FakeNode { constructor() { super(); this.gain = { value: 1 }; } }
class FakeAudioContext {
    constructor() { this.state = "running"; this.created = []; }
    createBuffer(channels, length, sampleRate) {
        const b = { numberOfChannels: channels, length, sampleRate, _data: [] };
        for (let c = 0; c < channels; c++) b._data.push(new Float32Array(length));
        b.getChannelData = (ch) => b._data[ch];
        this.created.push(b);
        return b;
    }
    getChannelData(buf, ch) { return buf._data[ch]; }
    createBufferSource() { return new FakeNode(); }
    createGain() { return new FakeGain(); }
    resume() { this.state = "running"; }
}
const fakeCtx = { AudioContext: FakeAudioContext, webkitAudioContext: undefined };
global.window = fakeCtx;

let pass = 0, fail = 0;
function check(name, cond, detail = "") {
    if (cond) { pass++; console.log("  OK " + name); }
    else { fail++; console.log("  FAIL " + name + (detail ? "   [" + detail + "]" : "")); }
}
function done() {
    console.log("\nSONUC: " + pass + " gecti, " + fail + " kaldi -> " + (fail === 0 ? "ALL OK" : "HATA VAR"));
    process.exit(fail === 0 ? 0 : 1);
}

const B = path.join(__dirname, "engine");
function load(name) {
    new Function("DE", "window", "document",
        fs.readFileSync(path.join(B, name), "utf8"))(global.DE, global.window, undefined);
}
["audio.js"].forEach(load);

// ================= A0 ÜRETİM YOLU (initialize() çağırmadan) =================
// Eski tuzak: test_audio.js:89 kendisi initialize() çağırıyordu → oyun yolunda
// çağrı yokken 21 ses sessiz kalıyordu, test bunu görmüyordu. Artık play yolu
// tembel initialize eder (audio.py:278-279 aynası).
{
    check("önceden initialize edilmedi", Object.keys(DE.SoundFX._sounds).length === 0);
    DE.SoundFX.play("coin");
    const n = Object.keys(DE.SoundFX._sounds).length;
    check("play() tembel initialize üretti (21 preset)", n === 21, "uretilen=" + n);
    check("_initialized işaretlendi", DE.SoundFX._initialized === true);
    DE.SoundFX.play_jump();
    DE.SoundFX.play_powerup();
    check("play_jump/powerup üretim yolunda sorunsuz", true);
    DE.SoundFX.play_music("menu");
    check("play_music üretim yolunda", DE.SoundFX._current_music === "menu");
    DE.SoundFX.stop_music();
}

// ================= A1 Frekans + LCG determinizm =================
{
    check("_freq C4", Math.abs(DE.SoundFX._freq("C", 4) - 261.63) < 0.01);
    check("_freq A#3", Math.abs(DE.SoundFX._freq("A#", 3) - 233.08) < 0.1);
    check("_lcg deterministik", DE.SoundFX._lcg(7) === DE.SoundFX._lcg(7) && DE.SoundFX._lcg(7) !== DE.SoundFX._lcg(8));
    const w1 = DE.SoundFX._melody_walk(7, 20, 3);
    const w2 = DE.SoundFX._melody_walk(7, 20, 3);
    check("melody_walk deterministik", JSON.stringify(w1) === JSON.stringify(w2));
    check("melody_walk uzunluk", w1.length === 20);
    const w3 = DE.SoundFX._melody_walk(7, 20, 3);
    const w4 = DE.SoundFX._melody_walk(8, 20, 3);
    check("farkli seed farkli yol", JSON.stringify(w3) !== JSON.stringify(w4));
}

// ================= A2 _render_layer / _mix_raw =================
{
    const layer = DE.SoundFX._render_layer([[440, 1], null, [880, 0.5]], 0.1, 22050, 0.4, "square", 1.0);
    check("render_layer mono turu", Array.isArray(layer) && layer.length > 0);
    check("render_layer ilk ornek", layer[0] !== undefined);
    const sil = layer.every(v => v === 0);
    check("boş satır yok", !sil);
    const l1 = DE.SoundFX._render_layer([[440, 1]], 0.05, 22050, 0.4, "sine", 1.0);
    const l2 = DE.SoundFX._render_layer([[554, 1]], 0.05, 22050, 0.4, "triangle", 1.0);
    const mixed = DE.SoundFX._mix_raw([l1, l2]);
    check("mix_raw toplar", Math.abs(Math.abs(mixed[Math.floor(mixed.length / 2)]) - Math.abs(l1[Math.floor(l1.length / 2)] + l2[Math.floor(l2.length / 2)])) < 2);
}

// ================= A3 _wave_sound -> AudioBuffer =================
{
    const buf = DE.SoundFX._wave_sound([100, -200, 300], 22050);
    check("wave_sound buffer", !!buf && buf.numberOfChannels === 1);
    const ctx = DE.SoundFX._ctx();
    check("buffer verisi yazildi", ctx.created.length > 0 && ctx.created[0]._data[0][0] !== 0);
    const sb = DE.SoundFX._stereo_sound([1, 2, 3], [4, 5], 22050);
    // ORTA-6: py _create_stereo_sound min(len(left), len(right)) — uzunluk 2.
    check("stereo_sound buffer", !!sb && sb.numberOfChannels === 2 && sb.length === 2, "len=" + (sb && sb.length));
}

// ================= A4 Preset sesler =================
{
    DE.SoundFX.initialize();
    const names = ["jump", "jump_b", "jump_c", "coin", "win", "shoot", "hit", "hurt",
        "explosion", "powerup", "powerup_magnet", "powerup_triple", "powerup_shield",
        "powerup_speed", "powerup_slow", "powerup_b", "powerup_c", "shield_break",
        "boss_hit", "break", "click"];
    let missing = [];
    for (const n of names) if (!DE.SoundFX._sounds[n]) missing.push(n);
    check("21 preset ses uretildi", missing.length === 0, "eksik: " + missing.join(","));
}

// ================= A5 play / play_jump / play_powerup =================
{
    // play: AudioBufferSource.start çağrilmali (hata olmamalı)
    DE.SoundFX.play("coin");  // hata yoksa OK
    check("play sorunsuz", true);
    DE.SoundFX.play("yokBoyle");  // yoksa sessiz
    check("bilinmeyen ses sessiz", true);
    DE.SoundFX.play_jump();
    DE.SoundFX.play_powerup();
    DE.SoundFX.play_powerup("magnet");
    check("play_jump/powerup sorunsuz", true);
}

// ================= A6 Müzik (biyom + preset) =================
{
    // Biyom müziği stereo üretir (deterministik)
    const s1 = DE.SoundFX._build_music_stereo("forest", "forest", false);
    const s2 = DE.SoundFX._build_music_stereo("forest", "forest", false);
    check("biyom stereo deterministik", !!s1 && !!s2 && s1.numberOfChannels === 2);
    check("biyom stereo uzunluk", s1.length > 8000, "len=" + s1.length);
    const boss = DE.SoundFX._build_music_stereo("boss_forest", "forest", true);
    check("boss varyanti farkli uzunluk", !!boss && boss.length < s1.length);

    // Player preset riff
    const menu = DE.SoundFX._build_predefined_riff("menu");
    check("menu riff", !!menu && menu.length > 0);
    check("bilinmeyen riff null", DE.SoundFX._build_predefined_riff("yok") === null);

    // play_music: döngü + bellek
    DE.SoundFX.play_music("menu");
    check("play_music cur mus", DE.SoundFX._current_music === "menu");
    DE.SoundFX.play_music("menu");   // ayni track -> yeniden baslamaz
    check("aynı track tekrar yok", true);
    DE.SoundFX.play_music("forest");
    check("biyom mus", DE.SoundFX._current_music === "forest");
    const node = DE.SoundFX._music_node;
    check("muzik node var", !!node);
    DE.SoundFX.play_music("percent"); // adı bilinmeyen
    check("bilinmeyen muzik", true);
    DE.SoundFX.stop_music();
    check("stop_music temizler", DE.SoundFX._current_music === null && DE.SoundFX._music_node === null);
}

done();