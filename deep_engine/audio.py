import math
import struct
import io
import pygame

class SoundFX:
    """Audio engine that synthesizes retro 8-bit sounds in memory, with no external audio files."""
    _initialized = False
    _sounds = {}
    _music_channel = None
    _current_music = None

    @classmethod
    def initialize(cls):
        if cls._initialized:
            return
        try:
            # 2 channels (stereo) — for L/R spread in music (samples interleaved)
            pygame.mixer.init(frequency=22050, size=-16, channels=2, buffer=512)
            cls._initialized = True
            cls._generate_preset_sounds()
        except Exception as e:
            cls._initialized = False

    @classmethod
    def _sound_from_bytes(cls, raw: bytes, channels: int):
        """Creates a Sound from WAV bytes. In the browser (pygbag/emscripten) environment,
        if a Sound cannot be decoded from BytesIO, it writes a temporary file to the
        virtual filesystem and loads from there instead (Mixed mode fallback). If every
        attempt fails, returns None -> silent/safe mode.
        """
        try:
            return pygame.mixer.Sound(io.BytesIO(raw))
        except Exception:
            pass
        try:
            import os
            import hashlib
            digest = hashlib.md5(raw[:1024]).hexdigest()[:12]
            base = os.getcwd()
            candidates = []
            try:
                candidates.append(os.path.join(base, f"_snd_{digest}_{channels}ch.wav"))
            except Exception:
                pass
            candidates.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), f"_snd_{digest}_{channels}ch.wav"))
            last = None
            for fp in candidates:
                try:
                    dirn = os.path.dirname(fp)
                    if dirn and not os.path.exists(dirn):
                        os.makedirs(dirn, exist_ok=True)
                    with open(fp, "wb") as f:
                        f.write(raw)
                    return pygame.mixer.Sound(fp)
                except Exception as e:
                    last = e
            if last is not None:
                print(f"[DerinEngine] Ses uretilemedi: {last}")
            return None
        except Exception:
            return None

    @classmethod
    def _build_wav_bytes(cls, interleaved, n_channels, sample_rate=22050):
        """Manually packs WAV file bytes from an interleaved int16 sample array.

        Removes the dependency on the wave module (async indexing in pygbag/WASM = deadlock).
        """
        data = struct.pack(f"<{len(interleaved)}h", *interleaved)
        byte_rate = sample_rate * n_channels * 2
        block_align = n_channels * 2
        data_len = len(data)
        header = struct.pack(
            "<4sI4s4sIHHIIHH4sI",
            b"RIFF", 36 + data_len, b"WAVE",
            b"fmt ", 16, 1, n_channels, sample_rate, byte_rate, block_align, 16,
            b"data", data_len,
        )
        return header + data

    @classmethod
    def _create_wave_sound(cls, samples, sample_rate=22050):
        """Produces a pygame.mixer.Sound object from raw audio samples (mono)."""
        wav_bytes = cls._build_wav_bytes(list(samples), 1, sample_rate)
        return cls._sound_from_bytes(wav_bytes, 1)

    @classmethod
    def _create_stereo_sound(cls, left_samples, right_samples, sample_rate=22050):
        """Packs left/right sample arrays into a single stereo Sound (L/R interleaved)."""
        n = min(len(left_samples), len(right_samples))
        interleaved = []
        for i in range(n):
            interleaved.append(max(-32767, min(32767, left_samples[i])))
            interleaved.append(max(-32767, min(32767, right_samples[i])))
        wav_bytes = cls._build_wav_bytes(interleaved, 2, sample_rate)
        return cls._sound_from_bytes(wav_bytes, 2)

    @classmethod
    def _generate_preset_sounds(cls):
        sample_rate = 22050

        # 1. Jump sound (frequency slides up; a few pitch variations)
        # the variations keep the player's jumps from feeling monotonous.
        def _jump_variant(pitch=1.0, dur=0.12):
            samples = []
            total_frames = int(sample_rate * dur)
            for i in range(total_frames):
                t = i / sample_rate
                freq = (200 + (t / dur) * 450) * pitch  # pitch shift
                val = math.sin(2 * math.pi * freq * t)
                val = 0.6 if val > 0 else -0.6
                volume = 1.0 - (i / total_frames)
                samples.append(int(val * volume * 16000))
            return cls._create_wave_sound(samples, sample_rate)

        cls._sounds["jump"] = _jump_variant(1.0)
        cls._sounds["jump_b"] = _jump_variant(1.12)   # slightly higher (double jump etc.)
        cls._sounds["jump_c"] = _jump_variant(0.92)   # slightly lower (heavy/dash)

        # 2. Coin pickup sound (two-tone bright chime)
        coin_samples = []
        duration = 0.18
        total_frames = int(sample_rate * duration)
        half_frames = total_frames // 2
        for i in range(total_frames):
            t = i / sample_rate
            freq = 987 if i < half_frames else 1318  # B5 -> E6
            val = math.sin(2 * math.pi * freq * t)
            volume = 1.0 - (i / total_frames) * 0.8
            sample = int(val * volume * 18000)
            coin_samples.append(sample)
        cls._sounds["coin"] = cls._create_wave_sound(coin_samples, sample_rate)

        # 3. Level complete / victory sound (win fanfare)
        win_samples = []
        notes = [523, 659, 783, 1046]  # C5, E5, G5, C6
        note_dur = 0.1
        for note in notes:
            n_frames = int(sample_rate * note_dur)
            for i in range(n_frames):
                t = i / sample_rate
                val = math.sin(2 * math.pi * note * t)
                # Soften with a triangle wave
                val = math.asin(max(-1.0, min(1.0, val))) * (2 / math.pi)
                volume = 1.0 - (i / n_frames) * 0.5
                win_samples.append(int(val * volume * 20000))
        cls._sounds["win"] = cls._create_wave_sound(win_samples, sample_rate)

        # 4. Shoot sound (laser frequency drop)
        shoot_samples = []
        duration = 0.1
        total_frames = int(sample_rate * duration)
        for i in range(total_frames):
            t = i / sample_rate
            freq = 950 - (t / duration) * 650  # 950Hz -> 300Hz
            val = math.sin(2 * math.pi * freq * t)
            val = 0.5 if val > 0 else -0.5
            volume = 1.0 - (i / total_frames)
            shoot_samples.append(int(val * volume * 15000))
        cls._sounds["shoot"] = cls._create_wave_sound(shoot_samples, sample_rate)

        # 5. Enemy hit sound
        hit_samples = []
        duration = 0.08
        total_frames = int(sample_rate * duration)
        for i in range(total_frames):
            t = i / sample_rate
            freq = 320 - (t / duration) * 180
            val = math.sin(2 * math.pi * freq * t)
            volume = 1.0 - (i / total_frames)
            hit_samples.append(int(val * volume * 17000))
        cls._sounds["hit"] = cls._create_wave_sound(hit_samples, sample_rate)

        # 6. Player damage sound (hurt)
        hurt_samples = []
        duration = 0.15
        total_frames = int(sample_rate * duration)
        for i in range(total_frames):
            t = i / sample_rate
            freq = 180 - (t / duration) * 90
            val = math.sin(2 * math.pi * freq * t)
            val = 0.6 if val > 0 else -0.6
            volume = 1.0 - (i / total_frames)
            hurt_samples.append(int(val * volume * 19000))
        cls._sounds["hurt"] = cls._create_wave_sound(hurt_samples, sample_rate)

        # 7. Explosion sound
        exp_samples = []
        duration = 0.35
        total_frames = int(sample_rate * duration)
        import random
        for i in range(total_frames):
            t = i / sample_rate
            noise = random.uniform(-1.0, 1.0)
            volume = (1.0 - (i / total_frames)) ** 2
            exp_samples.append(int(noise * volume * 18000))
        cls._sounds["explosion"] = cls._create_wave_sound(exp_samples, sample_rate)

        # 8. Power-up pickup sounds — a different tone per power type (variety)
        def _pu_tune(notes, srate=sample_rate):
            s = []
            for note in notes:
                nd = 0.06
                nf = int(srate * nd)
                for i in range(nf):
                    t = i / srate
                    val = math.sin(2 * math.pi * note * t)
                    vol = 1.0 - (i / nf) * 0.4
                    s.append(int(val * vol * 18000))
            return cls._create_wave_sound(s, srate)
        cls._sounds["powerup"] = _pu_tune([440, 554, 659, 880])                        # generic pickup
        cls._sounds["powerup_magnet"] = _pu_tune([330, 392, 494, 659])                 # magnet (mid)
        cls._sounds["powerup_triple"] = _pu_tune([392, 494, 587, 784])                 # triple shot (high)
        cls._sounds["powerup_shield"] = _pu_tune([392, 523, 659, 784])                 # shield (full)
        cls._sounds["powerup_speed"] = _pu_tune([494, 659, 784, 988])                  # speed (bright)
        cls._sounds["powerup_slow"] = _pu_tune([196, 233, 277, 330])                   # time slowdown (low, hypnotic)
        cls._sounds["powerup_b"] = _pu_tune([466, 587, 698, 932])                      # high random variant
        cls._sounds["powerup_c"] = _pu_tune([413, 520, 620, 827])                      # low random variant

        # 9. Shield break sound
        sb_samples = []
        sb_dur = 0.18
        sb_frames = int(sample_rate * sb_dur)
        for i in range(sb_frames):
            t = i / sample_rate
            freq = 600 - (t / sb_dur) * 400
            val = math.sin(2 * math.pi * freq * t)
            volume = 1.0 - (i / sb_frames)
            sb_samples.append(int(val * volume * 16000))
        cls._sounds["shield_break"] = cls._create_wave_sound(sb_samples, sample_rate)

        # 10. Boss hit sound — low, deep, powerful strike
        bh_samples = []
        bh_dur = 0.22
        bh_frames = int(sample_rate * bh_dur)
        for i in range(bh_frames):
            t = i / sample_rate
            # 240Hz -> 70Hz drop (deep bass); a touch of noise makes it a "fat" hit
            freq = 240 - (t / bh_dur) * 170
            val = math.sin(2 * math.pi * freq * t) * 0.7 + random.uniform(-0.4, 0.4)
            val = 0.5 if val > 0 else (0.5 if random.uniform(0,1) < 0.5 else -0.5)
            volume = (1.0 - (i / bh_frames)) ** 1.4
            bh_samples.append(int(val * volume * 20000))
        cls._sounds["boss_hit"] = cls._create_wave_sound(bh_samples, sample_rate)

        # 11. Breakable platform break sound — stone crack
        br_samples = []
        br_dur = 0.22
        br_frames = int(sample_rate * br_dur)
        for i in range(br_frames):
            t = i / sample_rate
            # Short noise burst + a quick low "crack" drop
            freq = 900 - (t / br_dur) * 700
            noise = random.uniform(-0.5, 0.5) * (1.0 - t / br_dur)
            val = math.sin(2 * math.pi * freq * t) * 0.5 + noise
            volume = (1.0 - (i / br_frames)) ** 1.3
            br_samples.append(int(val * volume * 18000))
        cls._sounds["break"] = cls._create_wave_sound(br_samples, sample_rate)

        # Short, deep UI click sound (for menu selection)
        clk_dur = 0.06
        clk_frames = int(sample_rate * clk_dur)
        clk_samples = []
        for i in range(clk_frames):
            t = i / sample_rate
            freq = 1300 - (t / clk_dur) * 500
            val = math.sin(2 * math.pi * freq * t) * 0.6
            volume = (1.0 - (i / clk_frames)) ** 2.0
            clk_samples.append(int(val * volume * 14000))
        cls._sounds["click"] = cls._create_wave_sound(clk_samples, sample_rate)

    @classmethod
    def play(cls, sound_name: str):
        """Plays a pre-generated retro sound ('jump', 'coin', 'win')."""
        if not cls._initialized:
            cls.initialize()
        snd = cls._sounds.get(sound_name)
        if snd:
            try:
                snd.play()
            except Exception:
                pass

    @classmethod
    def play_jump(cls):
        """Plays the jump sound with a random pitch variation (breaks up repetition)."""
        if not cls._initialized:
            cls.initialize()
        import random
        pick = random.choice(["jump", "jump_b", "jump_c"])
        snd = cls._sounds.get(pick)
        if snd:
            try:
                snd.play()
            except Exception:
                pass

    @classmethod
    def play_powerup(cls, power_type=None):
        """Power-up sound: power-type-specific tone + a random variant mix (variety)."""
        if not cls._initialized:
            cls.initialize()
        import random
        key = f"powerup_{power_type}" if power_type and f"powerup_{power_type}" in cls._sounds else None
        if random.random() < 0.3:
            key = random.choice(["powerup_b", "powerup_c"])
        elif key is None:
            key = "powerup"
        snd = cls._sounds.get(key)
        if snd:
            try:
                snd.play()
            except Exception:
                pass

    # ---  8-bit chiptune music (mathematical background melody) ---
    _NOTE = {
        "C": 261.63, "C#": 277.18, "D": 293.66, "D#": 311.13, "E": 329.63,
        "F": 349.23, "F#": 369.99, "G": 392.00, "G#": 415.30, "A": 440.00,
        "A#": 466.16, "B": 493.88,
    }

    @classmethod
    def _freq(cls, name, octave=4):
        """Produces a frequency from note names like 'C4', 'A#3'."""
        base = cls._NOTE[name]
        return base * (2 ** (octave - 4))

    @classmethod
    def _build_melody(cls, notes, note_dur=0.16, sample_rate=22050, volume=0.5, wave="square"):
        """Note sequence -> loopable 8-bit melody (Sound).

        Each entry in 'notes' is either an actual frequency or one of the following:
          - None             -> rest (silence), lasts note_dur
          - (freq, factor)   -> note lasts note_dur*factor (legato/staccato feel)
        'wave': 'square' | 'sine' | 'triangle' — timbre choice.
        """
        samples = []
        for note in notes:
            dur_mult = 1.0
            if isinstance(note, tuple):
                note, dur_mult = note
            if note is None:  # rest / silence
                n = int(sample_rate * note_dur * dur_mult)
                samples.extend([0] * n)
                continue
            freq = note
            n = int(sample_rate * note_dur * dur_mult)
            for i in range(n):
                t = i / sample_rate
                angle = 2 * math.pi * freq * t
                s = math.sin(angle)
                if wave == "sine":
                    val = s
                elif wave == "triangle":
                    val = math.asin(max(-1.0, min(1.0, s))) * (2 / math.pi)
                else:  # square -> classic 8-bit timbre
                    val = 1.0 if s >= 0 else -1.0
                # gentle envelope: reduce the click at the start/end of each note
                env = min(1.0, i / 200.0, (n - i) / 200.0, 1.0)
                samples.append(int(val * volume * env * 16000))
        return cls._create_wave_sound(samples, sample_rate)

    @classmethod
    def _render_layer(cls, notes, note_dur, sample_rate, volume, wave, gain=1.0):
        """Produces the integer sample array of a single layer (NOT a Sound object).

        'gain': 0..1 sets how strong the layer is in the mix. Zero samples (a rest)
        mean silence. Used for multi-channel mixing.
        """
        out = []
        for note in notes:
            dur_mult = 1.0
            if isinstance(note, tuple):
                note, dur_mult = note
            n = int(sample_rate * note_dur * dur_mult)
            if note is None:
                out.extend([0] * n)
                continue
            freq = note
            amp = int(volume * gain * 16000)
            for i in range(n):
                t = i / sample_rate
                angle = 2 * math.pi * freq * t
                s = math.sin(angle)
                if wave == "sine":
                    val = s
                elif wave == "triangle":
                    val = math.asin(max(-1.0, min(1.0, s))) * (2 / math.pi)
                else:
                    val = 1.0 if s >= 0 else -1.0
                env = min(1.0, i / 200.0, (n - i) / 200.0, 1.0)
                out.append(int(val * env * amp))
        return out

    @classmethod
    def _mix_layers(cls, layers, sample_rate):
        """Adds the sample arrays of multiple layers and mixes them into a single Sound.

        All layers align at the same start; the mix lasts as long as the longest
        layer. If the total exceeds the int16 limit, it is clipped.
        """
        total_len = max(len(l) for l in layers) if layers else 0
        if total_len == 0:
            return None
        summed = [0] * total_len
        for layer in layers:
            for i, v in enumerate(layer):
                summed[i] += v
        # int16 clipping: clamp on overflow
        clipped = [max(-32767, min(32767, v)) for v in summed]
        return cls._create_wave_sound(clipped, sample_rate)

    # ---  Algorithmic (mathematical) biome music generation ---
    # Each biome carries its own musical 'identity': a mode (a set of semitone
    # intervals), a root note octave, a seed and a tempo. The melody is never
    # written by hand; the LCG-based deterministic 'contour walk' below builds it
    # by wandering through the mode. Same seed = same track (deterministic), but
    # the track itself is born from the formula.
    BIOME_MODES = {
        # intervals: the mode's semitone intervals (0=root). root_oct: octave of the root C.
        "forest": {"intervals": [0, 2, 4, 7, 9],      "root_oct": 4, "seed": 7,  "tempo": 0.17, "mode": "calm"},
        "cave":   {"intervals": [0, 2, 3, 5, 7, 8],   "root_oct": 3, "seed": 13, "tempo": 0.23, "mode": "dark"},
        "ice":    {"intervals": [0, 2, 3, 5, 7, 8, 10], "root_oct": 5, "seed": 21, "tempo": 0.10, "mode": "bright"},
        "desert": {"intervals": [0, 1, 4, 5, 7, 9],   "root_oct": 4, "seed": 34, "tempo": 0.16, "mode": "walk"},
        "astro":  {"intervals": [0, 2, 4, 5, 7, 9, 11, 12], "root_oct": 3, "seed": 55, "tempo": 0.22, "mode": "space"},
    }

    @classmethod
    def _lcg(cls, state):
        """Pseudo-random number generator: deterministic, pure integer math."""
        return (state * 1103515245 + 12345) & 0x7fffffff

    @classmethod
    def _melody_walk(cls, seed, length, sigma):
        """Deterministic 'contour walk': the notes' step positions within the mode.

        Each step adds a deterministic jump in the -sigma..+sigma range to the
        previous position. The melody thus draws a flowing (walking) line, yet it
        comes entirely from the rule.
        """
        idx = 0
        state = seed
        out = []
        for _ in range(length):
            state = cls._lcg(state)
            delta = (state % (2 * sigma + 1)) - sigma
            idx += delta
            out.append(idx)
        return out

    @classmethod
    def _generate_track(cls, biome, boss=False):
        """Generates the algorithmic theme of a biome (or its boss variant).

        Multi-channel: main melody (square) + bass line (sine) + harmony (triangle)
        + rhythmic hits (short ticks) are all generated deterministically from the
        same mode and mixed into a single 8-bit loop via _mix_layers.
        """
        cfg = cls.BIOME_MODES[biome]
        intervals = cfg["intervals"]
        root_oct = cfg["root_oct"] - (1 if boss else 0)
        root = cls._freq("C", root_oct)
        # Boss: lower octave (weight/fear) + faster tempo + wider leaps for tension
        tempo = cfg["tempo"] * (1.0 if not boss else 0.60)
        sigma = 3 if not boss else 6
        seed = cfg["seed"] + (1000 if boss else 0)
        length = 48 if not boss else 40
        sample_rate = 22050

        walk = cls._melody_walk(seed, length, sigma)

        # --- MAIN MELODY (square) ---
        mel = []
        for i, w in enumerate(walk):
            mi = w % len(intervals)
            freq = root * (2.0 ** (intervals[mi] / 12.0))
            state = cls._lcg(seed + 1 + i * 7)
            is_rest = (state % 100) < (14 if not boss else 4)
            if is_rest:
                mel.append(None)
            else:
                state2 = cls._lcg(seed + 2 + i * 13)
                mult = 3.0 if (state2 % 100) < (26 if boss else 10) else 1.0
                mel.append((freq, mult))
        mel_layer = cls._render_layer(mel, tempo, sample_rate, 0.42, "square", 1.0)

        # --- BASS LINE (sine) — root note in a lower octave, rhythmic hits ---
        bass = []
        bass_oct = root_oct - 1
        bass_root = cls._freq("C", max(1, bass_oct)) if root else root
        for i in range(length):
            bstate = cls._lcg(seed + 3 + i * 11)
            play = (bstate % 100) < (72 if boss else 48)
            if not play:
                bass.append(None)
            else:
                # Oscillate between the root and the fourth/fifth (harmonic bass)
                bi = 0 if (i % 2 == 0) else min(2, len(intervals) - 1)
                bfreq = bass_root * (2.0 ** (intervals[bi] / 12.0))
                bass.append((bfreq, 1.0))
        bass_layer = cls._render_layer(bass, tempo, sample_rate, 0.30, "sine", 1.0)

        # --- HARMONY (triangle) — a chord texture rising gently through the mode's notes ---
        harm = []
        for i in range(length):
            if i % 3 != 0:
                harm.append(None)
                continue
            mi = (walk[i] + 2) % len(intervals)
            hfreq = root * (2.0 ** (intervals[mi] / 12.0))
            harm.append((hfreq, 2.0))
        harm_layer = cls._render_layer(harm, tempo, sample_rate, 0.28, "triangle", 0.7)

        # --- RHYTHMIC HITS (short ticks, upper octave) — temporal energy ---
        tick = []
        for i in range(length):
            # More frequent and higher-pitched in the boss version
            tstate = cls._lcg(seed + 5 + i * 17)
            play = (tstate % 100) < (78 if boss else 46)
            if not play:
                tick.append(None)
            else:
                tfreq = root * 2.0  # one octave up
                tick.append((tfreq, 0.3))
        tick_layer = cls._render_layer(tick, tempo, sample_rate, 0.22, "square", 0.5)

        snd = cls._mix_layers([mel_layer, bass_layer, harm_layer, tick_layer], sample_rate)
        return snd

    @classmethod
    def _build_music_stereo(cls, name, biome=None, boss=False):
        """Generates a track split across the left/right channels as STEREO.

        A simple but effective spatial spread: melody in the center (both sides),
        harmony on the right, rhythmic hits on the left, bass lightly in both.
        """
        if biome in cls.BIOME_MODES:
            cfg = cls.BIOME_MODES[biome]
            intervals = cfg["intervals"]
            root_oct = cfg["root_oct"] - (1 if boss else 0)
            root = cls._freq("C", root_oct)
            tempo = cfg["tempo"] * (1.0 if not boss else 0.60)
            sigma = 3 if not boss else 6
            seed = cfg["seed"] + (1000 if boss else 0)
            length = 48 if not boss else 40
            sample_rate = 22050
            walk = cls._melody_walk(seed, length, sigma)

            mel = []
            for i, w in enumerate(walk):
                mi = w % len(intervals)
                freq = root * (2.0 ** (intervals[mi] / 12.0))
                state = cls._lcg(seed + 1 + i * 7)
                is_rest = (state % 100) < (14 if not boss else 4)
                if is_rest:
                    mel.append(None)
                else:
                    state2 = cls._lcg(seed + 2 + i * 13)
                    mult = 3.0 if (state2 % 100) < (26 if boss else 10) else 1.0
                    mel.append((freq, mult))
            mel_layer = cls._render_layer(mel, tempo, sample_rate, 0.42, "square", 0.9)

            bass_root = cls._freq("C", max(1, root_oct - 1))
            bass = []
            for i in range(length):
                bstate = cls._lcg(seed + 3 + i * 11)
                if (bstate % 100) < (72 if boss else 48):
                    bi = 0 if (i % 2 == 0) else min(2, len(intervals) - 1)
                    bass.append((bass_root * (2.0 ** (intervals[bi] / 12.0)), 1.0))
                else:
                    bass.append(None)
            bass_layer = cls._render_layer(bass, tempo, sample_rate, 0.30, "sine", 0.7)

            harm = []
            for i in range(length):
                if i % 3 != 0:
                    harm.append(None)
                    continue
                mi = (walk[i] + 2) % len(intervals)
                harm.append((root * (2.0 ** (intervals[mi] / 12.0)), 2.0))
            harm_layer = cls._render_layer(harm, tempo, sample_rate, 0.28, "triangle", 0.9)

            tick = []
            for i in range(length):
                tstate = cls._lcg(seed + 5 + i * 17)
                if (tstate % 100) < (78 if boss else 46):
                    tick.append((root * 2.0, 0.3))
                else:
                    tick.append(None)
            tick_layer = cls._render_layer(tick, tempo, sample_rate, 0.22, "square", 0.9)

            # Spatial spread (stereo field):
            # - Left: melody + ticks (+ light bass)
            # - Right: melody + harmony (+ light bass)
            left = cls._mix_raw([mel_layer, bass_layer, tick_layer])
            right = cls._mix_raw([mel_layer, bass_layer, harm_layer])
            return cls._create_stereo_sound(left, right, sample_rate)

        # Non-algorithmic riffs (menu/level/boss/victory) are mono, the same in both channels
        mono = cls._build_predefined_riff(name)
        if mono is None:
            return None
        return mono

    @classmethod
    def _mix_raw(cls, layers):
        """Adds multiple sample arrays and clips them to the int16 limit (NOT a Sound)."""
        total_len = max(len(l) for l in layers) if layers else 0
        summed = [0] * total_len
        for layer in layers:
            for i, v in enumerate(layer):
                summed[i] += v
        return [max(-32767, min(32767, v)) for v in summed]

    @classmethod
    def _build_predefined_riff(cls, name):
        """Generates the legacy preset riffs (menu/level/boss/victory) as mono Sounds."""
        C4 = cls._freq("C", 4); E4 = cls._freq("E", 4); G4 = cls._freq("G", 4)
        A4 = cls._freq("A", 4); F4 = cls._freq("F", 4); D4 = cls._freq("D", 4)
        B3 = cls._freq("B", 3); G3 = cls._freq("G", 3); C5 = cls._freq("C", 5)
        E5 = cls._freq("E", 5); G5 = cls._freq("G", 5); D5 = cls._freq("D", 5)
        F5 = cls._freq("F", 5); A5 = cls._freq("A", 5); B4 = cls._freq("B", 4)
        A3 = cls._freq("A", 3); E3 = cls._freq("E", 3); F3 = cls._freq("F", 3)
        D3 = cls._freq("D", 3)

        if name == "menu":
            riff = [C4, E4, G4, C5, G4, E4] + [D4, F4, A4, C5, A4, F4] \
                 + [E4, G4, B4, D5, B4, G4] + [F4, A4, C5, E5, C5, A4] \
                 + [C5, G4, E4, D4, C4, E4, G4, C5]
            return cls._build_melody(riff, note_dur=0.16, volume=0.42)
        if name == "level":
            riff = [A3, C4, E4, A4, E4, C4] + [F3, A3, C4, F4, C4, A3] \
                 + [G3, B3, D4, G4, D4, B3] + [E3, G3, C4, E4, C4, G3] \
                 + [A3, C4, E4, A4, E4, C4, B3, D4, G4, B3, A3, E3]
            return cls._build_melody(riff, note_dur=0.13, volume=0.5)
        if name == "boss":
            riff = [G3, G3, B3, D4, B3, G3] + [F3, F3, A3, C4, A3, F3] \
                 + [E3, E3, G3, B3, G3, E3] + [D3, D3, F3, A3, F3, G3]
            return cls._build_melody(riff, note_dur=0.2, volume=0.55)
        if name == "victory":
            riff = [C4, E4, G4, C5, E5, G5, C5, G5, E5, C5, G4, E4, C4]
            return cls._build_melody(riff, note_dur=0.18, volume=0.5)
        return None

    @classmethod
    def play_music(cls, name="menu"):
        """Plays a predefined 8-bit melody on loop (over and over).

        name:
          - 'menu' | 'level' | 'boss'   -> general preset riffs (legacy)
          - '<biome>' (forest/cave/ice/desert/astro) -> that biome's algorithmic intro theme
          - 'boss_<biome>'              -> that biome's boss (combat) theme
          - 'victory'                   -> victory melody
        Does not restart if the same track is already playing.
        """
        if not cls._initialized:
            cls.initialize()
        if cls._current_music == name and cls._music_channel and cls._music_channel.get_busy():
            return

        # Detect biome themes: '<biome>' or 'boss_<biome>'
        boss = False
        target = name
        if name.startswith("boss_"):
            boss = True
            target = name[len("boss_"):]
        if target in cls.BIOME_MODES:
            # Algorithmic biome/boss themes: generate as STEREO (L/R channel spread)
            snd = cls._build_music_stereo(name, biome=target, boss=boss)
        else:
            # Legacy preset riffs (menu/level/boss/victory) — mono
            snd = cls._build_predefined_riff(name)
            if snd is None:
                return

        if snd is None:
            cls._current_music = None
            return
        cls._current_music = name
        try:
            if cls._music_channel is None:
                from pygame import mixer
                cls._music_channel = mixer.Channel(1)
            cls._music_channel.stop()
            cls._music_channel.play(snd, loops=-1)
        except Exception as e:
            print(f"[DerinEngine] Muzik oynatma hatasi: {e}")

    @classmethod
    def stop_music(cls):
        """Stops the currently playing melody."""
        cls._current_music = None
        if cls._music_channel is not None:
            cls._music_channel.stop()
