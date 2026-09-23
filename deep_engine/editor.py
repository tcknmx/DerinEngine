import os
import pygame
from .input import Input
from .audio import SoundFX
from .components import SpriteRenderer
from . import levelfile
from . import user_data_dir

# Object types we can use in the editor
TOOL_PLATFORM = "Platform"
TOOL_COIN = "Coin"
TOOL_ENEMY = "Enemy"
TOOL_SPRING = "Trambolin"
TOOL_PORTAL = "Portal"
TOOL_PLAYER = "Oyuncu"
TOOL_POWERUP = "PowerUp"
TOOL_BOSS = "Boss"
TOOL_BREAKABLE = "Breakable"

TOOLS = [
    TOOL_PLATFORM,
    TOOL_COIN,
    TOOL_ENEMY,
    TOOL_SPRING,
    TOOL_PORTAL,
    TOOL_PLAYER,
    TOOL_POWERUP,
    TOOL_BOSS,
    TOOL_BREAKABLE
]

TOOL_COLORS = {
    TOOL_PLATFORM: (50, 80, 120),
    TOOL_COIN: (255, 215, 0),
    TOOL_ENEMY: (230, 60, 75),
    TOOL_SPRING: (50, 220, 120),
    TOOL_PORTAL: (160, 80, 240),
    TOOL_PLAYER: (60, 200, 245),
    TOOL_POWERUP: (180, 60, 255),
    TOOL_BOSS: (220, 40, 30),
    TOOL_BREAKABLE: (150, 120, 90)
}

class LevelEditor:
    """Live Level Designer: draw maps with the mouse, then save and load them."""
    def __init__(self, scene, grid_size=32):
        self.scene = scene
        self.grid_size = grid_size
        self.active = False
        self.current_tool_index = 0
        self.font = pygame.font.SysFont("Arial", 16, bold=True)
        self.title_font = pygame.font.SysFont("Arial", 20, bold=True)
        self.status_message = "Editör Modu Açık: Nesne seç ve tıkla!"
        self.status_timer = 0.0
        self.cam_drag_start = None
        self.save_file_path = os.path.join(user_data_dir(), "custom_level.json")

        #  Undo + copy/paste support
        # Action list: ("add", GameObject)  or  ("remove", data_dict)
        self.undo_stack = []
        self.clipboard = None   # JSON level data of the copied object
        self.selected_object = None   # selected object for the inspector panel

    def toggle(self):
        self.active = not self.active
        if self.active:
            self.set_status("🎨 EDITÖR: Sol=EkLe, Sağ=Sil, 1-9=araç, S=Kaydet, L=Yükle, P=Oyna, Z=GeriAl, C=Kopyala, V=Yapıştır")
        else:
            self.set_status("▶️ OYUN MODU BAŞLADI!")

    def set_status(self, msg, duration=3.0):
        self.status_message = msg
        self.status_timer = duration

    def update(self, dt: float):
        if self.status_timer > 0:
            self.status_timer -= dt

        # Quick tool selection with number keys (1, 2, 3, 4, 5, 6)
        for i in range(len(TOOLS)):
            key_name = str(i + 1)
            # Check the number keys through the Input class
            if Input.get_key_down(key_name) or Input.get_key_down(f"F{i+1}"):
                self.current_tool_index = i
                self.set_status(f"Seçilen Araç: {TOOLS[self.current_tool_index]}")

        # Support for switching tools with the mouse wheel
        if Input.get_key_down("TAB"):
            self.current_tool_index = (self.current_tool_index + 1) % len(TOOLS)
            self.set_status(f"Seçilen Araç: {TOOLS[self.current_tool_index]}")

        # S key: save the level
        if Input.get_key_down("S"):
            self.save_level_to_file()

        # L key: load the level
        if Input.get_key_down("L"):
            self.load_level_from_file()

        # Z key: undo
        if Input.get_key_down("Z"):
            self.undo()

        # Copy-paste (C = copy, V = paste)
        if Input.get_key_down("C"):
            self.copy_object_at(*self._mouse_world())
        if Input.get_key_down("V"):
            self.paste_at(*self._mouse_grid())

        # Camera panning (move freely around the editor with the arrows or I/J/K/L)
        # Note: these are used instead of WASD so there is no conflict with game
        # keys like 'S' (save) or 'W'. If an object is SELECTED, the arrows move it.
        cam_speed = 450.0 * dt
        if Input.get_key("RIGHT") or Input.get_key("L"):
            if self.selected_object is not None:
                self._nudge_selected(self.grid_size, 0)
            else:
                self.scene.camera_position.x += cam_speed
        if Input.get_key("LEFT") or Input.get_key("J"):
            if self.selected_object is not None:
                self._nudge_selected(-self.grid_size, 0)
            else:
                self.scene.camera_position.x -= cam_speed
        if Input.get_key("UP") or Input.get_key("I"):
            if self.selected_object is not None:
                self._nudge_selected(0, -self.grid_size)
            else:
                self.scene.camera_position.y -= cam_speed
        if Input.get_key("DOWN") or Input.get_key("K"):
            if self.selected_object is not None:
                self._nudge_selected(0, self.grid_size)
            else:
                self.scene.camera_position.y += cam_speed

        # Inspector: quick property-editing shortcuts for the selected object.
        # '[' = shrink, ']' = enlarge, 'R' = recolor, DEL = delete (undoable).
        sel = self.selected_object
        if sel is not None and sel in self.scene.game_objects:
            dx, dy = self.grid_size, self.grid_size
            if Input.get_key_down("["):
                self._resize_selected(-dx, -dy)
            if Input.get_key_down("]"):
                self._resize_selected(dx, dy)
            if Input.get_key_down("R"):
                self._reroll_selected_color()
            if Input.get_key_down("DELETE") or Input.get_key_down("BACKSPACE"):
                self._commit_delete(sel)
                self.selected_object = None

        # Mouse clicks
        mouse_pos = Input.get_mouse_position()
        world_x = mouse_pos[0] + self.scene.camera_position.x
        world_y = mouse_pos[1] + self.scene.camera_position.y

        # Snap to grid (grid snapping)
        grid_x = int(world_x // self.grid_size) * self.grid_size
        grid_y = int(world_y // self.grid_size) * self.grid_size

        # Left click: add object (if one is under the cursor, select/inspect it)
        if Input.get_mouse_button_down(0) and mouse_pos[1] > 60:  # only if not clicking the UI bar
            hit = self._find_object_at(world_x, world_y)
            if hit is not None:
                self.selected_object = hit
                self.set_status(f"🔍 Seçildi: {hit.name} ({hit.tag})")
            else:
                self.selected_object = None
                self._place_object(grid_x, grid_y)

        # Right click: delete object
        if Input.get_mouse_button_down(2):
            self._delete_object_at(world_x, world_y)

    def _place_object(self, gx, gy):
        tool = TOOLS[self.current_tool_index]

        # Prevent stacking several objects in the same spot
        for obj in self.scene.game_objects:
            if abs(obj.position.x - gx) < 10 and abs(obj.position.y - gy) < 10 and obj.name != "ScoreUI" and obj.name != "GoalUI" and obj.name != "InfoUI":
                return

        # Player: spawns no new object; moves the existing player onto the grid cell
        if tool == TOOL_PLAYER:
            player = self.scene.find_by_tag("Player")
            if player:
                player.position.x = gx
                player.position.y = gy
                for comp in player.components:
                    if hasattr(comp, "spawn_pos"):
                        comp.spawn_pos.x = gx
                        comp.spawn_pos.y = gy
                        break
            SoundFX.play("jump")
            return

        # All other types: generate JSON level data and hand it to the engine's builders.
        # (This way both placement and loading from file share a single source of truth.)
        data = {"tag": tool, "x": gx, "y": gy}
        if tool == TOOL_PLATFORM:
            data.update({"name": "Platform", "w": self.grid_size, "h": self.grid_size, "color": [50, 80, 120]})
        elif tool == TOOL_COIN:
            data.update({"name": "Coin", "x": gx + 8, "y": gy + 8, "w": 16, "h": 16, "color": [255, 215, 0]})
        elif tool == TOOL_ENEMY:
            data.update({"name": "Enemy", "x": gx + 2, "y": gy + 4, "w": 28, "h": 28, "color": [235, 55, 75],
                         "patrol_distance": 90.0, "speed": 65.0})
        elif tool == TOOL_SPRING:
            data.update({"tag": "Spring", "name": "Spring", "y": gy + 16, "w": self.grid_size, "h": 16, "color": [50, 220, 120],
                         "bounce": 850.0})
        elif tool == TOOL_PORTAL:
            data.update({"name": "Portal", "y": gy - 28, "w": 32, "h": 60, "color": [160, 80, 240], "next": "victory"})
        elif tool == TOOL_POWERUP:
            data.update({"name": "PowerUp_magnet", "w": 24, "h": 24, "color": [180, 60, 255],
                         "power_type": "magnet", "duration": 8.0})
        elif tool == TOOL_BOSS:
            data.update({"name": "Boss", "w": 64, "h": 64, "color": [220, 40, 30],
                         "patrol_distance": 160.0, "speed": 65.0, "hp": 100})
        elif tool == TOOL_BREAKABLE:
            # Level breakables are for PLATFORMS -> half block (thin strip)
            data.update({"name": "Breakable", "w": 64, "h": 20, "color": [150, 120, 90],
                         "hits": 1, "trigger": False})

        self._commit_place(data)
        SoundFX.play("jump")

    # ---  Undo / copy / paste helpers ---

    def _mouse_world(self):
        """Returns the mouse position in world coordinates."""
        mp = Input.get_mouse_position()
        return (mp[0] + self.scene.camera_position.x, mp[1] + self.scene.camera_position.y)

    def _mouse_grid(self):
        """Returns the mouse world position snapped to the grid."""
        wx, wy = self._mouse_world()
        return (int(wx // self.grid_size) * self.grid_size,
                int(wy // self.grid_size) * self.grid_size)

    def _find_object_at(self, wx, wy):
        """Returns the first (editable) object under the mouse, or None."""
        for obj in reversed(self.scene.game_objects):
            if obj.name in ["ScoreUI", "GoalUI", "InfoUI"] or obj.tag == "Player":
                continue
            if (obj.position.x <= wx <= obj.position.x + obj.size.x and
                obj.position.y <= wy <= obj.position.y + obj.size.y):
                return obj
        return None

    def _obj_to_data(self, obj):
        """Converts a GameObject into placeholder data (can be re-placed via place_object)."""
        data = {
            "tag": obj.tag, "name": obj.name,
            "x": obj.position.x, "y": obj.position.y,
            "w": obj.size.x, "h": obj.size.y,
        }
        spr = obj.get_component(SpriteRenderer)
        if spr:
            data["color"] = list(spr.color)
            data["shape"] = spr.shape
        return data

    def _commit_place(self, data, gx=None, gy=None):
        """Places an object and pushes it onto the undo stack so it can be undone."""
        if gx is None or gy is None:
            gx, gy = self._mouse_grid()
        place_x, place_y = data.get("x", gx), data.get("y", gy)
        obj = levelfile.place_object(self.scene, dict(data, **{"x": place_x, "y": place_y}))
        if obj is not None:
            self.selected_object = obj   # select/inspect the newly placed object
            self.undo_stack.append(("add", obj))
            self.set_status(f"✨ Eklendi: {data.get('name', data.get('tag'))} (Z ile geri al)")
        return obj

    def _commit_delete(self, obj):
        """Deletes an object and pushes it onto the undo stack so it can be undone."""
        if obj is None or obj.tag == "Player":
            return False
        backup = self._obj_to_data(obj)
        self.scene.destroy(obj)
        self.undo_stack.append(("remove", backup))
        SoundFX.play("coin")
        return True

    def _nudge_selected(self, dx, dy):
        """Nudges the selected object by one grid step (arrow keys)."""
        sel = self.selected_object
        if sel is None:
            return
        sel.position.x += dx
        sel.position.y += dy
        self.set_status(f"✨ Kaydirildi: {sel.name} ({int(sel.position.x)}, {int(sel.position.y)})")

    def _resize_selected(self, dx, dy):
        """Resizes the selected object with ['/] (lower/upper limits are kept)."""
        sel = self.selected_object
        if sel is None:
            return
        new_w = max(16.0, min(256.0, sel.size.x + dx))
        new_h = max(16.0, min(256.0, sel.size.y + dy))
        sel.size.x = new_w
        sel.size.y = new_h
        # Sync any component fields that mirror the size
        for c in sel.components:
            if hasattr(c, "width"):
                try:
                    c.width = new_w
                except Exception:
                    pass
            if hasattr(c, "height"):
                try:
                    c.height = new_h
                except Exception:
                    pass
        self.set_status(f"📐 Boyut: {int(new_w)}x{int(new_h)} ([ / ] ile ayarla)")

    def _reroll_selected_color(self):
        """Randomizes the selected object's SpriteRenderer color (vivid/bright)."""
        sel = self.selected_object
        if sel is None:
            return
        spr = sel.get_component(SpriteRenderer)
        if spr is None:
            self.set_status("SpriteRenderer yok - renk degistirilemez")
            return
        import random
        import colorsys
        h = random.random()
        r, g, b = colorsys.hsv_to_rgb(h, 0.65, 0.95)
        spr.color = (int(r * 255), int(g * 255), int(b * 255))
        self.set_status(f"🎨 Renk: {spr.color}")

    def undo(self):
        """Undoes the last action (place -> remove, delete -> restore)."""
        if not self.undo_stack:
            self.set_status("Geri alınacak işlem yok!")
            return
        action, payload = self.undo_stack.pop()
        if action == "add":
                # Remove the placed object from the scene
            if payload in self.scene.game_objects:
                self.scene.destroy(payload)
            self.set_status("↩️ Nesne kaldırıldı (geri alındı)")
        elif action == "remove":
            # Put the deleted object back
            levelfile.place_object(self.scene, payload)
            self.set_status("↩️ Silinen nesne geri getirildi")

    def copy_object_at(self, wx, wy):
        """Copies the object under the mouse to the clipboard."""
        obj = self._find_object_at(wx, wy)
        if obj is None:
            self.set_status("Kopyalanacak nesne bulunamadı!")
            return
        self.clipboard = self._obj_to_data(obj)
        self.set_status(f"📋 Kopyalandı: {obj.name} (V ile yapıştır)")

    def paste_at(self, gx, gy):
        """Places the clipboard object at the mouse's grid position."""
        if self.clipboard is None:
            self.set_status("Panoda kopyalanmış nesne yok (önce C ile kopyala)!")
            return
        # Prevent double-stacking in the same cell (for non-player objects)
        for obj in self.scene.game_objects:
            if abs(obj.position.x - gx) < 10 and abs(obj.position.y - gy) < 10 and obj.tag != "Player":
                self.set_status("Bu hücrede zaten nesne var!")
                return
        data = dict(self.clipboard)
        data["x"], data["y"] = gx, gy
        self._commit_place(data, gx, gy)

    def _delete_object_at(self, wx, wy):
        for obj in list(self.scene.game_objects):
            if obj.name in ["ScoreUI", "GoalUI", "InfoUI"]:
                continue
            if (obj.position.x <= wx <= obj.position.x + obj.size.x and
                obj.position.y <= wy <= obj.position.y + obj.size.y):
                if obj.tag != "Player":
                    self._commit_delete(obj)
                    break

    def save_level_to_file(self):
        """Saves the current scene to disk in the engine's level file format."""
        try:
            levelfile.save_level(self.scene, self.save_file_path)
            self.set_status(f"💾 SEVİYE BAŞARIYLA KAYDEDİLDİ: {os.path.basename(self.save_file_path)}", 4.0)
            SoundFX.play("win")
        except Exception as e:
            self.set_status(f"Hata: {e}", 4.0)

    def load_level_from_file(self):
        """Builds a fresh scene from a JSON level file using the engine's loader.

        The content of the built scene replaces the current scene in place
        (the Engine draws/updates on this same reference).
        """
        if not os.path.exists(self.save_file_path):
            self.set_status("Kayıtlı seviye dosyası bulunamadı!", 4.0)
            return

        try:
            fresh = levelfile.load_level(self.save_file_path)
            self.scene.game_objects = fresh.game_objects
            self.scene.camera_position = fresh.camera_position
            self.scene.camera_target = fresh.camera_target
            self.scene.parallax_background = fresh.parallax_background
            self.scene.background_color = fresh.background_color
            self.scene._objects_to_add = fresh._objects_to_add
            self.scene._objects_to_destroy = fresh._objects_to_destroy
            self.set_status("📂 SEVİYE YÜKLENDİ!", 3.0)
            SoundFX.play("win")
        except Exception as e:
            self.set_status(f"Yükleme hatası: {e}", 4.0)

    def draw(self, surface: pygame.Surface):
        if not self.active:
            return

        w = surface.get_width()
        h = surface.get_height()
        cam = self.scene.camera_position

        # 1. Draw the grid lines
        start_x = int(-cam.x % self.grid_size)
        start_y = int(-cam.y % self.grid_size)

        for x in range(start_x, w, self.grid_size):
            pygame.draw.line(surface, (40, 45, 65), (x, 0), (x, h))
        for y in range(start_y, h, self.grid_size):
            pygame.draw.line(surface, (40, 45, 65), (0, y), (w, y))

        # 2. Mouse preview box (ghost preview)
        mouse_pos = Input.get_mouse_position()
        world_x = mouse_pos[0] + cam.x
        world_y = mouse_pos[1] + cam.y
        grid_x = int(world_x // self.grid_size) * self.grid_size
        grid_y = int(world_y // self.grid_size) * self.grid_size

        screen_gx = int(grid_x - cam.x)
        screen_gy = int(grid_y - cam.y)

        tool = TOOLS[self.current_tool_index]
        color = TOOL_COLORS[tool]
        preview_surf = pygame.Surface((self.grid_size, self.grid_size), pygame.SRCALPHA)
        preview_surf.fill((*color, 120))
        surface.blit(preview_surf, (screen_gx, screen_gy))
        pygame.draw.rect(surface, (255, 255, 255), (screen_gx, screen_gy, self.grid_size, self.grid_size), 1)

        # 3. Top editor menu bar (toolbar UI)
        bar_height = 54
        pygame.draw.rect(surface, (18, 22, 34), (0, 0, w, bar_height))
        pygame.draw.line(surface, (60, 80, 110), (0, bar_height), (w, bar_height), 2)

        # Tool buttons
        x_offset = 12
        for i, t in enumerate(TOOLS):
            is_selected = (i == self.current_tool_index)
            btn_w = 95
            btn_h = 32
            btn_rect = pygame.Rect(x_offset, 11, btn_w, btn_h)

            bg_col = (45, 60, 90) if is_selected else (28, 35, 52)
            border_col = TOOL_COLORS[t] if is_selected else (50, 65, 85)
            
            pygame.draw.rect(surface, bg_col, btn_rect, border_radius=4)
            pygame.draw.rect(surface, border_col, btn_rect, width=2 if is_selected else 1, border_radius=4)

            # Tool icon/color
            pygame.draw.rect(surface, TOOL_COLORS[t], (x_offset + 6, 20, 12, 14), border_radius=2)

            # Tool name
            label = f"{i+1}:{t}"
            text_surf = self.font.render(label, True, (255, 255, 255) if is_selected else (170, 180, 200))
            surface.blit(text_surf, (x_offset + 22, 17))

            x_offset += btn_w + 8

        # 4. Status message bar (bottom)
        if self.status_message:
            msg_surf = self.font.render(self.status_message, True, (255, 230, 100))
            msg_bg = pygame.Rect(10, h - 36, msg_surf.get_width() + 16, 28)
            pygame.draw.rect(surface, (15, 20, 30, 220), msg_bg, border_radius=4)
            pygame.draw.rect(surface, (80, 100, 140), msg_bg, width=1, border_radius=4)
            surface.blit(msg_surf, (18, h - 32))

        # 5. Highlight the selected object + inspector panel
        sel = self.selected_object
        if sel is not None and sel in self.scene.game_objects:
            # Draw a selection box around it using the world->screen transform
            sx = int(sel.position.x - cam.x)
            sy = int(sel.position.y - cam.y)
            bx = int(sel.size.x)
            by = int(sel.size.y)
            rect = pygame.Rect(sx, sy, bx, by)
            pygame.draw.rect(surface, (80, 240, 255), rect, width=2, border_radius=3)

            # Inspector panel at the top right
            px = w - 220
            py = bar_height + 10
            pw, ph = 206, 150
            panel = pygame.Surface((pw, ph), pygame.SRCALPHA)
            panel.fill((20, 26, 40, 220))
            surface.blit(panel, (px, py))
            pygame.draw.rect(surface, (80, 140, 200), (px, py, pw, ph), width=1, border_radius=4)

            title = self.title_font.render(sel.name, True, (110, 240, 255))
            surface.blit(title, (px + 10, py + 8))
            tag_s = self.font.render(f"Tag: {sel.tag}", True, (200, 210, 230))
            surface.blit(tag_s, (px + 10, py + 34))
            pos_s = self.font.render(f"Konum: ({int(sel.position.x)}, {int(sel.position.y)})",
                                     True, (180, 190, 210))
            surface.blit(pos_s, (px + 10, py + 56))
            size_s = self.font.render(f"Boyut: {int(sel.size.x)}x{int(sel.size.y)}",
                                      True, (180, 190, 210))
            surface.blit(size_s, (px + 10, py + 76))
            spr = sel.get_component(SpriteRenderer)
            col_s = self.font.render(f"Renk: {tuple(spr.color) if spr else '—'}", True, (150, 170, 200))
            surface.blit(col_s, (px + 10, py + 96))
            lines = [c.__class__.__name__ for c in sel.components]
            comp_s = self.font.render(f"Bileşen: {', '.join(lines[:3])}", True, (150, 170, 200))
            surface.blit(comp_s, (px + 10, py + 116))

            hint_s = self.font.render("Ok=Kaydır  [ ]=Boyut  R=Renk  DEL=Sil", True, (120, 200, 255))
            surface.blit(hint_s, (px + 10, py + 134))
