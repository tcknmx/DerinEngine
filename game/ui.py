import random
import os
import pygame
from deep_engine import (
    Engine,
    Scene,
    GameObject,
    Input,
    Component,
    TextRenderer,
    ParticleEmitter,
    SoundFX,
    I18n,
    ParallaxBackground,
    SaveGame,
    __version__ as DERINENGINE_VERSION,
    user_data_dir,
)


from . import state
from .entities import PlayerController

class LocalizedLabel(Component):
    """Component that updates a UI text with the I18n translation every frame.

    This way, when the language is switched with the 'T' key the text refreshes
    instantly (menus etc.). Applied to a TextRenderer with is_ui=True; text is set
    via I18n.t(key).
    """
    def __init__(self, key="", format_args=None):
        super().__init__()
        self.key = key
        self.format_args = format_args or {}

    def start(self):
        self._text = self.game_object.get_component(TextRenderer)

    def update(self, dt: float):
        if not hasattr(self, "_text") or self._text is None:
            self._text = self.game_object.get_component(TextRenderer)
            if self._text is None:
                return
        if self.format_args:
            self._text.text = I18n.localize(self.key, **self.format_args)
        else:
            self._text.text = I18n.t(self.key)


class LockIcon(Component):
    """Draws a small padlock in place of '4' on a locked menu option (e.g. Endless Mode).

    Since is_ui=True it is unaffected by zoom. To avoid depending on emoji fonts,
    the lock is drawn with polygons (square body + arch on top + keyhole); it looks
    the same on every machine (or in a PyInstaller bundle).
    """
    is_ui = True

    def __init__(self, color=(220, 210, 180), size=14):
        super().__init__()
        self.color = color
        self.size = size

    def draw(self, surface, camera_offset):
        if not self.game_object.active:
            return
        x, y = int(self.game_object.position.x), int(self.game_object.position.y)
        s = self.size
        # Padlock body (square)
        body = pygame.Rect(x, y + s // 3, s, int(s * 0.8))
        pygame.draw.rect(surface, self.color, body, border_radius=s // 6)
        # Padlock arch on top
        arch = pygame.Rect(x + s // 6, y, int(s * 0.66), s // 2)
        pygame.draw.arc(surface, self.color, arch, 0.2, 3.0, width=max(2, s // 6))
        # Keyhole (dark dot)
        cx = x + s // 2
        cy = y + s - s // 5
        pygame.draw.circle(surface, (15, 15, 20), (cx, cy - s // 6), max(2, s // 7))
        pygame.draw.rect(surface, (15, 15, 20), (cx - 1, cy - s // 5, 3, s // 5))


# V2.0: The menu camera's 'close-up' zoom value (1.0 = normal in-game size;
# >1.0 = closer/bigger). In the menu the player is seen up close; it returns to
# 1.0 once a level is selected.
MENU_ZOOM = 1.8


class FadeOverlay(Component):
    """Fades the full-screen darkness from 255 to 0 (opening) when added to a new scene.

    Used for the smooth crossfade from menu to another mode: the menu darkens to 255
    -> the scene switches -> this component opens the new scene from black. It removes
    itself once the transition ends.
    """
    is_ui = True  # drawn as UI -> unaffected by zoom

    def __init__(self, fade_speed=500.0):
        super().__init__()
        self._alpha = 255.0
        self.fade_speed = fade_speed

    def update(self, dt):
        self._alpha = max(0.0, self._alpha - self.fade_speed * dt)
        if self._alpha <= 0.0:
            # Opening done: remove itself and its holder from the scene
            scene = getattr(Engine.instance, "active_scene", None)
            if scene:
                scene.destroy(self.game_object)

    def draw(self, surface, camera_offset):
        if self._alpha <= 0:
            return
        a = int(max(0.0, min(255.0, self._alpha)))
        overlay = pygame.Surface((surface.get_width(), surface.get_height()))
        overlay.set_alpha(a)
        overlay.fill((0, 0, 0))
        surface.blit(overlay, (0, 0))


class MenuController(Component):
    """V2.0 main menu: built on a live campaign entrance level in the background.

    The player in the menu is a still figure looking at the sky with the drifting
    stars (square body, round glowing eyes). The screen starts with a CLOSE-UP of
    the player; once an option is chosen the camera returns to the normal in-game
    size (zoom 1.0) and the game begins.
    """

    is_ui = True  # drawn as UI -> the fade layer is unaffected by zoom

    def start(self):
        self.done = False
        #  Smooth transition: a brief fade-out (crossfade) happens when an option is picked.
        self._fade = 0.0            # 0..255 fade alpha value
        self._fading_out = False
        self._fade_dir = 0
        self._pending_factory = None
        scene = Engine.instance.active_scene
        self.scene = scene
        self.player = scene.find_by_tag("Player")

        # Camera: close-up (player large, left-center)
        scene.camera_manual = True
        scene.camera_zoom = MENU_ZOOM
        scene.camera_zoom_target = MENU_ZOOM
        # Stronger edge vignette in the menu (cinematic, keeps readability)
        scene.set_vignette(0.5)
        if self.player:
            pc = self.player.get_component(PlayerController)
            if pc:
                pc.menu_idle = True

        # Hide the player HUD (score/health/goal) during the menu; show it when the game starts.
        self._hud_ui = getattr(scene, "_hud_ui", [])
        for o in self._hud_ui:
            o.active = False

        # Collect the mouse-clickable menu options
        self._click_zones = []
        for o in getattr(scene, "_menu_ui", []):
            rect = getattr(o, "_click_rect", None)
            action = getattr(o, "_click_action", None)
            if rect is not None and action is not None:
                self._click_zones.append((rect, action))

    def _place_menu_camera(self):
        """Position the camera so the player stays in close-up at the left-center of the screen."""
        scene = self.scene
        player = self.player
        if not player:
            return
        cx = player.position.x + player.size.x / 2
        cy = player.position.y + player.size.y / 2
        fx, fy = 0.30, 0.55  # desired on-screen (close-up) anchor ratios for the player
        scene.camera_position.x = cx - (0.5 + (fx - 0.5) / scene.camera_zoom) * scene.screen_width
        scene.camera_position.y = cy - (0.5 + (fy - 0.5) / scene.camera_zoom) * scene.screen_height

    def _hide_menu_ui(self):
        for o in getattr(self.scene, "_menu_ui", []):
            o.active = False

    def _restore_hud(self):
        for o in self._hud_ui:
            o.active = True

    def _start_campaign(self):
        """Campaign = starts from the background (already live) level."""
        SoundFX.play("win")
        # Restore the real scene name so lighting (except Main Menu) is active
        self.scene.name = getattr(self.scene, "_orig_name", self.scene.name)
        self.scene.camera_manual = False   # auto follow -> focus on the player
        self.scene.zoom_to(1.0)            # close-up -> normal in-game size
        self.scene.set_vignette(0.22)      # from the menu's strong vignette to the lighter in-game one
        if self.player:
            pc = self.player.get_component(PlayerController)
            if pc:
                pc.menu_idle = False       # return to the normal player model
        self._restore_hud()
        self._hide_menu_ui()
        self.done = True

    def update(self, dt: float):
        if self.done:
            return
        self._place_menu_camera()

        if self._fading_out:
            # Fade-out: switch scenes once it hits 255; done when back to 0.
            FADE_SPEED = 420.0
            self._fade = max(0.0, min(255.0, self._fade + self._fade_dir * FADE_SPEED * dt))
            if self._fade >= 255.0:
                if self._pending_factory is not None:
                    new_scene = self._pending_factory()
                    # Smooth crossfade: start the new scene with the fade opening from black
                    fo = GameObject(name="FadeIn", x=0, y=0)
                    fo.add_component(FadeOverlay())
                    new_scene.add_object(fo)
                    Engine.switch_scene(new_scene)
                    self._pending_factory = None
                self._fade_dir = -1    # lighten (255 -> 0)
            elif self._fade <= 0.0 and self._fade_dir < 0:
                self.done = True
            return

        # Mouse selection: left-click on an option
        if Input.get_mouse_button_down(0):
            mx, my = Input.get_mouse_position()
            for rect, action in self._click_zones:
                if rect.collidepoint(mx, my):
                    self._dispatch_action(action)
                    break

        if Input.get_key_down("4"):  #  Endless Mode (may be locked)
            if self._endless_unlocked():
                state.game_mode = "endless"
                state.endless_state["score"] = 0  # new endless run: counter starts from zero
                self._start_campaign()
            else:
                SoundFX.play("click")
                print(I18n.t("endless_locked_warn"))
        elif (Input.get_key_down("P") or Input.get_key_down("SPACE")
              or Input.get_key_down("ENTER")):  # ▶ Campaign
            state.game_mode = "campaign"
            self._start_campaign()

    def _endless_unlocked(self) -> bool:
        try:
            _p = SaveGame(os.path.join(user_data_dir(), "savegame.json"))
            return bool(_p.get("endless_unlocked", False))
        except Exception:
            return False

    def _dispatch_action(self, action: str):
        """Executes a menu action coming from a mouse click."""
        if action == "campaign":
            state.game_mode = "campaign"
            self._start_campaign()
        elif action == "endless":
            if self._endless_unlocked():
                state.game_mode = "endless"
                state.endless_state["score"] = 0  # new endless run: counter starts from zero
                self._start_campaign()
            else:
                SoundFX.play("click")
                print(I18n.t("endless_locked_warn"))
        elif action == "lang":
            I18n.toggle_language()
            SoundFX.play("click")

    def draw(self, surface, camera_offset):
        # Full-screen fade layer (crossfade transition)
        if self._fade > 0:
            a = int(max(0.0, min(255.0, self._fade)))
            overlay = pygame.Surface((surface.get_width(), surface.get_height()))
            overlay.set_alpha(a)
            overlay.fill((0, 0, 0))
            surface.blit(overlay, (0, 0))



def build_main_menu_scene() -> Scene:
    """V2.0 main menu: builds the campaign's FIRST entrance level as a live scene.

    The player appears LEFT-CENTER in close-up as a figure with a SQUARE body and
    round glowing eyes; the menu options are overlaid on the right as UI unaffected
    by zoom. When P/SPACE/ENTER (Campaign) is pressed the camera returns to the
    normal in-game size (zoom 1.0) and the game starts from the same level.
    """
    from .scenes import start_campaign

    # The campaign chain is prepared; the first entrance level is returned (live background).
    scene = start_campaign()
    scene._orig_name = scene.name  # real name to restore when the campaign starts
    scene.name = "Main Menu"

    # Drifting stars (instead of fireworks) via parallax on the background level.
    if scene.parallax_background is None:
        try:
            scene.parallax_background = ParallaxBackground(theme="forest")
        except Exception:
            pass  # noqa: bilinçli

    _profile = SaveGame(os.path.join(user_data_dir(), "savegame.json"))
    _menu_ui = []

    # Title & subtitle (top-center, single line) — language aware
    t1 = GameObject(name="T1", x=450, y=18)
    t1.add_component(TextRenderer(text=I18n.t("menu_title"), font_size=42, color=(255, 215, 50), is_ui=True,
                                  shadow=(0, 0, 0), center_x=True))
    t1.add_component(LocalizedLabel("menu_title"))
    scene.add_object(t1)
    _menu_ui.append(t1)

    t2 = GameObject(name="T2", x=450, y=74)
    t2.add_component(TextRenderer(text=I18n.t("menu_subtitle"), font_size=18, color=(180, 220, 255), is_ui=True,
                                  shadow=(0, 0, 0), center_x=True))
    t2.add_component(LocalizedLabel("menu_subtitle"))
    scene.add_object(t2)
    _menu_ui.append(t2)

    # Menu Options — one vertical panel on the right, same x and consistent font sizes
    def _menu_item(name, key, x, y, font_size, color, action=None, locked=False, lock_key=None):
        # Locked option text: because we show a lock icon instead of '4', the
        # number prefix is supplied by an optional separate key (e.g. menu_random_locked).
        use_key = lock_key if (locked and lock_key) else key
        o = GameObject(name=name, x=x, y=y)
        o.add_component(TextRenderer(text=I18n.t(use_key), font_size=font_size, color=color if not locked
                                     else (110, 115, 130), is_ui=True, shadow=(0, 0, 0)))
        o.add_component(LocalizedLabel(use_key))
        # Mouse support: clickable rect + action. Since the layout is
        # left-aligned, a simple fixed-width tap area (610..900) is assigned.
        o._click_rect = pygame.Rect(x, y - 10, 900 - x, font_size + 20)
        o._click_action = action
        scene.add_object(o)
        _menu_ui.append(o)
        if locked:
            # Lock icon: draw a small padlock on the left of the row instead of the '4'.
            icon = GameObject(name=name + "_icon", x=x - 30, y=y - 6)
            icon.add_component(LockIcon(size=16))
            scene.add_object(icon)
            _menu_ui.append(icon)
            # Locked Endless Mode notice: to avoid overflow, a small, dim text is
            # added BELOW the row at the same x alignment (left-aligned).
            lock = GameObject(name=name + "_lock", x=x, y=y + font_size + 4)
            lock.add_component(TextRenderer(text=I18n.t("menu_endless_locked"),
                                            font_size=12, color=(125, 120, 135), is_ui=True,
                                            shadow=(0, 0, 0)))
            lock.add_component(LocalizedLabel("menu_endless_locked"))
            scene.add_object(lock)
            _menu_ui.append(lock)

    _menu_item("M_KAMP", "menu_campaign", 610, 180, 28, (120, 255, 120), action="campaign")
    _endless_locked = not bool(_profile.get("endless_unlocked", False))
    _menu_item("M_RND", "menu_random", 610, 236, 23, (100, 255, 180),
               action=None if _endless_locked else "endless", locked=_endless_locked,
               lock_key="menu_random_locked")
    _menu_item("M4", "menu_lang", 610, 292, 23, (255, 230, 120), action="lang")

    # Controls info + High Score — bottom-center, aligned
    cinfo = GameObject(name="M5", x=450, y=520)
    cinfo.add_component(TextRenderer(text=I18n.t("controls_info"), font_size=15, color=(165, 180, 205),
                                     is_ui=True, shadow=(0, 0, 0), center_x=True))
    cinfo.add_component(LocalizedLabel("controls_info"))
    scene.add_object(cinfo)
    _menu_ui.append(cinfo)

    hs_obj = GameObject(name="HighScore", x=450, y=555)
    hs_obj.add_component(TextRenderer(text=I18n.localize("menu_highscore", score=_profile.get("high_score", 0)),
                                      font_size=18, color=(255, 215, 100), is_ui=True, shadow=(0, 0, 0),
                                      center_x=True))
    hs_obj.add_component(LocalizedLabel("menu_highscore", {"score": _profile.get("high_score", 0)}))
    scene.add_object(hs_obj)
    _menu_ui.append(hs_obj)

    ver = GameObject(name="Version", x=15, y=575)
    ver.add_component(TextRenderer(text=f"DerinEngine v{DERINENGINE_VERSION}", font_size=13, color=(110, 140, 180), is_ui=True, shadow=(0, 0, 0)))
    scene.add_object(ver)
    _menu_ui.append(ver)

    # Add MenuController to the MenuFX holder (stars in parallax instead of fireworks)
    bg_fx = GameObject(name="MenuFX", x=0, y=0)
    bg_fx.add_component(MenuController())
    scene.add_object(bg_fx)

    # Collect the game HUD (score/health/goal) as a list to hide during the menu
    scene._menu_ui = _menu_ui
    scene._hud_ui = [o for o in scene.game_objects
                     if any(getattr(c, "is_ui", False) for c in o.components)
                     and o not in _menu_ui]

    # The background (campaign entrance) has already played its biome music; the menu theme stays.
    return scene


class FireworksController(Component):
    """Fireworks particle show (used on the victory screen + main menu)."""
    def __init__(self):
        super().__init__()
        self.particles = None
        self.timer = 0.0

    def start(self):
        self.particles = self.game_object.get_component(ParticleEmitter)

    def update(self, dt: float):
        self.timer += dt
        if self.timer > 0.25 and self.particles:
            self.timer = 0.0
            colors = [(255, 215, 0), (255, 80, 80), (80, 200, 255), (100, 255, 120), (255, 120, 220)]
            rx = random.uniform(100, 700)
            ry = random.uniform(80, 300)
            self.particles.burst(count=30, color=random.choice(colors), speed_range=(80, 240), size_range=(3, 7), lifespan_range=(0.8, 1.6), gravity=140.0, origin_offset=(rx, ry))


class VictoryController(FireworksController):
    def update(self, dt: float):
        super().update(dt)
        if Input.get_key_down("R") or Input.get_key_down("SPACE") or Input.get_key_down("ENTER"):
            Engine.switch_scene(build_main_menu_scene())


class GameOverController(Component):
    def __init__(self, restart_factory):
        super().__init__()
        self.restart_factory = restart_factory

    def update(self, dt: float):
        if Input.get_key_down("R") or Input.get_key_down("SPACE") or Input.get_key_down("ENTER"):
            Engine.switch_scene(self.restart_factory())
        elif Input.get_key_down("M"):
            Engine.switch_scene(build_main_menu_scene())


def build_game_over_scene(restart_factory) -> Scene:
    scene = Scene(name="Game Over", background_color=(20, 10, 15))

    t1 = GameObject(name="T1", x=280, y=160)
    t1.add_component(TextRenderer(text=I18n.t("game_over_title"), font_size=46, color=(255, 60, 60), is_ui=True))
    scene.add_object(t1)

    t2 = GameObject(name="T2", x=310, y=240)
    t2.add_component(TextRenderer(text=I18n.t("game_over_subtitle"), font_size=24, color=(220, 180, 180), is_ui=True))
    scene.add_object(t2)

    t3 = GameObject(name="T3", x=240, y=340)
    t3.add_component(TextRenderer(text=I18n.t("game_over_restart"), font_size=20, color=(255, 220, 100), is_ui=True))
    scene.add_object(t3)

    t4 = GameObject(name="T4", x=270, y=390)
    t4.add_component(TextRenderer(text=I18n.t("game_over_menu"), font_size=18, color=(160, 190, 230), is_ui=True))
    scene.add_object(t4)

    ctrl_obj = GameObject(name="GameOverCtrl", x=0, y=0)
    ctrl_obj.add_component(GameOverController(restart_factory))
    scene.add_object(ctrl_obj)

    return scene


def build_victory_scene() -> Scene:
    scene = Scene(name="Zafer Ekrani", background_color=(15, 20, 35))

    # Campaign completed -> Endless Mode (4) is permanently unlocked.
    try:
        _vp = SaveGame(os.path.join(user_data_dir(), "savegame.json"))
        _vp.set("endless_unlocked", True)
        _vp.save()
    except Exception:
        pass  # noqa: bilinçli

    fw_obj = GameObject(name="Fireworks", x=0, y=0)
    fw_obj.add_component(ParticleEmitter())
    fw_obj.add_component(VictoryController())
    scene.add_object(fw_obj)

    t1 = GameObject(name="Title1", x=180, y=130)
    t1.add_component(TextRenderer(text=I18n.t("victory_title"), font_size=36, color=(255, 220, 50), is_ui=True))
    scene.add_object(t1)

    t2 = GameObject(name="Title2", x=240, y=210)
    t2.add_component(TextRenderer(text=I18n.t("victory_subtitle"), font_size=23, color=(200, 240, 255), is_ui=True))
    scene.add_object(t2)

    t3 = GameObject(name="Title3", x=290, y=290)
    t3.add_component(TextRenderer(text=I18n.t("victory_praise"), font_size=26, color=(100, 255, 160), is_ui=True))
    scene.add_object(t3)

    t4 = GameObject(name="Title4", x=250, y=410)
    t4.add_component(TextRenderer(text=I18n.t("victory_restart"), font_size=20, color=(180, 180, 210), is_ui=True))
    scene.add_object(t4)

    SoundFX.play_music("victory")
    return scene