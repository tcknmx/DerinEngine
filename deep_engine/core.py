import os
import pygame
import sys
import asyncio
from .input import Input
from .scene import Scene
from . import __version__ as ENGINE_VERSION
from . import user_data_dir
from .log import log

class Engine:
    """Main core of the DerinEngine game engine."""
    instance = None

    def __init__(self, title="DerinEngine Game", width=800, height=600, target_fps=60):
        Engine.instance = self
        pygame.init()
        pygame.font.init()
        Input._init_joystick()
        
        self.width = width
        self.height = height
        self.target_fps = target_fps
        self.title = title
        
        self.screen = pygame.display.set_mode((self.width, self.height))
        pygame.display.set_caption(self.title)
        
        self.clock = pygame.time.Clock()
        self.is_running = False
        self.active_scene = None
        self._next_scene = None
        # Time-slow powerup: non-player entities (enemies/bosses/enemy bullets)
        # slow down by this duration and factor; the player and player bullets are unaffected.
        self._time_slow_remaining = 0.0
        self._time_slow_factor = 0.4
        self.show_debug_info = True  # can be toggled with the F3 key
        self.debug_font = pygame.font.SysFont("Consolas", 14)
        from .lighting import LightingEngine
        self.lighting = LightingEngine(ambient_darkness=130)
        from .console import DevConsole
        self.console = DevConsole(self.width, self.height)
        from .scenemanager import SceneManager
        self.scene_manager = SceneManager(self)

    def set_scene(self, scene: Scene):
        """Changes and starts the active scene."""
        self.active_scene = scene
        self.active_scene.screen_width = self.width
        self.active_scene.screen_height = self.height
        self.active_scene.start()

    @classmethod
    def switch_scene(cls, new_scene: Scene):
        """Allows a scene switch from any script."""
        if cls.instance:
            cls.instance._next_scene = new_scene

    def _frame(self, dt: float):
        """Processes a single game frame (scene switch, events, input, update, draw)."""
        # Scene switch check
        if self._next_scene:
            self.set_scene(self._next_scene)
            self._next_scene = None

        # --- ⏳ Time layer: burn off the slow powerup at the engine level ---
        # Even when the player is not on the scene (menu / death) the timer runs out
        # on its own, so _slow_dt never freezes permanently and the "slow world" feel clears up.
        if self._time_slow_remaining > 0:
            self._time_slow_remaining = max(0.0, self._time_slow_remaining - dt)

        # 2. Event handling
        events = pygame.event.get()
        for event in events:
            if event.type == pygame.QUIT:
                self.is_running = False

        # Update the input system
        Input._update_events(events)

        # Developer console toggle (backquote ` / Turkish keyboard ")
        if Input.get_key_down("BACKQUOTE") or Input.get_key_down("QUOTEDBL"):
            self.console.toggle()

        # While the console is open: pause the scene, only draw + console on top.
        if self.console.active:
            self.console.update(dt)
            if self.active_scene:
                self.active_scene.draw(self.screen)
            self.console.draw(self.screen)
            pygame.display.flip()
            return

        # Language switch (T key)
        if Input.get_key_down("T"):
            from .i18n import I18n
            new_lang = I18n.toggle_language()
            try:
                from .savegame import SaveGame
                prof = SaveGame(os.path.join(user_data_dir(), "savegame.json"))
                prof.set("lang", I18n.current_lang)
                prof.save()
            except Exception as e:
                log.debug("dil tercihi savegame'e yazilamadi: %r" % (e,))
            from .audio import SoundFX
            SoundFX.play("coin")

        # Debug key (F3)
        if Input.get_key_down("F3"):
            self.show_debug_info = not self.show_debug_info

        # Quit with ESC (unless the active scene takes over ESC, e.g. a pause overlay)
        if Input.get_key_down("ESCAPE"):
            handled = False
            if self.active_scene is not None:
                _hook = getattr(self.active_scene, "on_escape", None)
                if callable(_hook):
                    try:
                        handled = bool(_hook())
                    except Exception as e:
                        log.debug("sahne ESC hooku hata verdi: %r" % (e,))
            if not handled:
                self.is_running = False

        # 3. Update & Draw
        # An overlay scene (transparent, e.g. Pause) still shows the frozen scene below it.
        if self.active_scene.transparent and self.scene_manager is not None:
            below = self.scene_manager.below_scene
            if below is not None and below is not self.active_scene:
                below.draw(self.screen)
        self.active_scene.update(dt)
        self.active_scene.draw(self.screen)
        # Apply 2D dynamic lighting
        if self.lighting and self.active_scene.name not in ["Main Menu", "Pause", "Zafer Ekrani", "Game Over"]:
            self.lighting.render_lights(self.screen, self.active_scene, self.active_scene.render_camera)

        # 4. Debug info overlay (FPS, object count, etc.)
        if self.show_debug_info:
            self._draw_debug_overlay(dt)

        # 5. Flip the screen
        pygame.display.flip()

    def run(self):
        """Starts the game loop. (Desktop / packaged EXE)"""
        if not self.active_scene:
            raise RuntimeError("Hata: Motoru çalıştırmadan önce bir Sahne (Scene) belirlemelisiniz! engine.set_scene(...)")

        self.is_running = True
        print(f"[DerinEngine v{ENGINE_VERSION}] Baslatildi: '{self.title}' ({self.width}x{self.height} @ {self.target_fps} FPS)")

        while self.is_running:
            # 1. Delta time (time elapsed between two frames)
            dt_ms = self.clock.tick(self.target_fps)
            dt = dt_ms / 1000.0  # convert to seconds
            if dt > 0.05:  # cap it to prevent physics blowups on sudden hitches (max 50ms)
                dt = 0.05
            self._frame(dt)

        print("[DerinEngine] Kapatiliyor...")
        pygame.quit()
        sys.exit(0)

    async def run_async(self):
        """Async game loop for the browser (pygbag/emscripten)."""
        if not self.active_scene:
            raise RuntimeError("Hata: Motoru çalıştırmadan önce bir Sahne (Scene) belirlemelisiniz! engine.set_scene(...)")

        def _jlog(msg):
            try:
                from platform import window as _w
                _w.console.log("[ENGINE] " + str(msg))
            except Exception:
                log.debug("web konsol mesaji gonderilemedi")  # print yedeği asagida
            print("[ENGINE] " + str(msg), flush=True)

        self.is_running = True
        _jlog(f"[DerinEngine v{ENGINE_VERSION}] Baslatildi (WEB): '{self.title}' ({self.width}x{self.height} @ {self.target_fps} FPS)")

        frame_count = 0
        while self.is_running:
            dt_ms = self.clock.tick(self.target_fps)
            dt = dt_ms / 1000.0
            if dt > 0.05:
                dt = 0.05
            self._frame(dt)
            frame_count += 1
            if frame_count <= 5 or frame_count % 60 == 0:
                _jlog(f"frame={frame_count} dt={dt:.4f} scene={self.active_scene.name if self.active_scene else 'None'} objs={len(self.active_scene.game_objects) if self.active_scene else 0}")
            # Give the browser some breathing room (don't block the render window)
            await asyncio.sleep(0)

        print("[DerinEngine] Kapatiliyor (WEB)...")
        pygame.quit()

    def _draw_debug_overlay(self, dt: float):
        fps = int(self.clock.get_fps())
        obj_count = len(self.active_scene.game_objects) if self.active_scene else 0
        cam_x = int(self.active_scene.camera_position.x) if self.active_scene else 0
        cam_y = int(self.active_scene.camera_position.y) if self.active_scene else 0

        # Player debug (grounded / coyote / double / wall / vy / slow)
        p_dbg = ""
        try:
            pl = self.active_scene.find_by_tag("Player") if self.active_scene else None
            if pl:
                from deep_engine.components import Rigidbody2D
                rb = pl.get_component(Rigidbody2D)
                pc = None
                for c in pl.components:
                    if hasattr(c, "coyote_timer"):
                        pc = c
                        break
                if rb and pc:
                    p_dbg = f"P: grounded={rb.is_grounded} coy={pc.coyote_timer:.2f} buf={pc.jump_buffer_timer:.2f} dbl={pc.can_double_jump} wall={pc.wall_sliding} vy={rb.velocity.y:.0f} slow={self._time_slow_remaining:.2f}"
        except Exception:
            log.debug("debug katmani oyuncu bilgisini toplayamadi")
        debug_texts = [
            f"[DerinEngine v{ENGINE_VERSION} Debug - F3 to Toggle]",
            f"FPS: {fps} (dt: {dt*1000:.1f}ms)",
            f"Aktif Nesne: {obj_count}",
            f"Kamera: ({cam_x}, {cam_y})",
            f"Kontroller: A/D veya Sol/Sag = Hareket, SPACE/W = Ziplama, F3 = Debug",
        ]
        if p_dbg:
            debug_texts.append(p_dbg)

        y_offset = 10
        for text in debug_texts:
            surf = self.debug_font.render(text, True, (0, 255, 128))
            # Draw a semi-transparent black box behind the text
            bg_rect = pygame.Rect(8, y_offset - 2, surf.get_width() + 4, surf.get_height() + 4)
            pygame.draw.rect(self.screen, (0, 0, 0, 180), bg_rect)
            self.screen.blit(surf, (10, y_offset))
            y_offset += 20