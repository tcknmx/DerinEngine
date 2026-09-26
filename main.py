"""Star Collector Hero  (game entry point)

main.py is now a THIN entry point; the game logic lives in the game/ package
(entities, bosses, ui, builders, scenes) and the engine in the deep_engine/ package.

Run:  python main.py
Change this:  https://example.com  (none)
"""

import os
import sys

from deep_engine import (
    Engine,
    SoundFX,
    I18n,
    SaveGame,
    user_data_dir,
)

from game import build_main_menu_scene


if __name__ == "__main__":
    _web_console = None
    try:
        from platform import window as _w
        _web_console = getattr(_w, "console", None)
    except Exception:
        _web_console = None

    # --- DerinEngine Engine Console (bug detector / log console) ---
    from deep_engine.log import log as _motor_log, WARN as _L_WARN
    try:
        _motor_log.set_file(os.path.join(user_data_dir(), "motor.log"))
    except Exception:
        pass
    _motor_log.set_level(_L_WARN)
    _motor_log.info("DerinEngine Motor Konsolu aktif ([WARN/+] komut penceresinde)")
    print("[DERINENGINE-KONSOLE] aktif - olasi sorunlar [WARN]/[BUG]/[ERR] burada gorunecek", flush=True)

    def _jlog(msg):
        try:
            if _web_console is not None:
                _web_console.log("[BOOT] " + str(msg))
        except Exception:
            pass
        print("[BOOT] " + str(msg), flush=True)

    def _boot_excepthook(tp, val, tb):
        try:
            _motor_log.exception(tp, val, tb)
        except Exception:
            pass
        try:
            if _web_console is not None:
                import traceback as _tb
                _web_console.log("[PY-EXCEPTION] " + "".join(_tb.format_exception(tp, val, tb)))
        except Exception:
            pass
        sys.__excepthook__(tp, val, tb)

    sys.excepthook = _boot_excepthook

    _jlog("__main__ basladi")
    try:
        _saved = SaveGame(os.path.join(user_data_dir(), "savegame.json"))
        I18n.set_language(_saved.get("lang", "tr"))
        _jlog("dil yuklendi: " + str(I18n.current_lang))
    except Exception as e:
        _jlog("dil hatasi: " + repr(e))
        try:
            _motor_log.err("savegame okunamadi, varsayilan dil kullaniliyor: %r" % (e,))
        except Exception:
            pass

    _jlog("SoundFX.initialize...")
    SoundFX.initialize()
    _jlog("Engine olusturuluyor...")
    engine = Engine(title="Star Collector Hero", width=900, height=600, target_fps=60)

    _jlog("Ana menu kuruluyor...")
    main_menu = build_main_menu_scene()
    engine.set_scene(main_menu)
    _jlog("play_music menu...")
    SoundFX.play_music("menu")  # 8-bit retro starting music

    if sys.platform == "emscripten":
        _jlog("emscripten -> oyun dongusu basliyor")
        import asyncio
        try:
            asyncio.get_running_loop()
            _has_loop = True
        except RuntimeError:
            _has_loop = False
        if _has_loop:
            _jlog("zaten calisan loop var -> task olarak baslat")
            asyncio.ensure_future(engine.run_async())
            _jlog("task baslatildi (ensure_future)")
        else:
            _jlog("loop yok -> asyncio.run")
            asyncio.run(engine.run_async())
            _jlog("asyncio.run DONDU (beklenmeyen)")
    else:
        engine.run()
