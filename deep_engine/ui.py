"""
===============================================================================
DerinEngine - UI Kit (reusable interface widgets)
===============================================================================
A small, engine-owned widget set: Panel, Button and ScrollContainer. It lives
in the engine so ANY game (or editor) can build menus/HUDs without re-writing
the interaction glue. All widgets are plain `Component`s with `is_ui = True`,
so the scene draws them in screen space (untouched by zoom/camera).

Interaction model (mirrors the engine's Input manager):
  - mouse: hover, press (held) and click (press transition) via
    `Input.get_mouse_position()` / `get_mouse_button()` / `get_mouse_button_down()`.
  - keyboard/gamepad: a button can be *focused*; ENTER or gamepad button 0
    (A) activates it. Games set `focused` explicitly.

Each widget reads colors from a `UITheme`. A default theme is provided; pass
your own dict with the same keys to restyle everything at once.

Typical usage:
    btn = Button(text="Start", x=300, y=200, on_click=my_callback, theme=dark)
    obj = GameObject("StartBtn", x=300, y=200, width=160, height=44)
    obj.add_component(btn)

Or use `UITheme.defaults` as a base and override a few entries.
===============================================================================
"""

import pygame
from .components import Component
from .input import Input


# -----------------------------------------------------------------------------
# Theme
# -----------------------------------------------------------------------------
class UITheme:
    """Central widget color/behavior palette.

    All colors are (r,g,b) tuples; `font_name`/`font_size` are the per-widget
    defaults (0 = pygame's bundled font). Nested widget states override the
    base entries (e.g. `button_hover` on top of `button_bg`).
    """
    defaults = {
        "font_name": None,          # None -> pygame default font
        "font_size": 22,
        "panel_bg": (28, 32, 44),
        "panel_border": (90, 100, 130),
        "panel_border_radius": 8,
        "button_bg": (50, 70, 110),
        "button_hover": (70, 95, 150),
        "button_press": (30, 46, 80),
        "button_focus": (220, 220, 235),
        "button_text": (235, 240, 250),
        "button_disabled": (70, 74, 86),
        "scroll_bg": (22, 26, 36),
        "scroll_border": (70, 80, 110),
        "scroll_handle": (120, 135, 175),
        "scroll_item": (200, 210, 230),
        "scroll_item_hover": (255, 235, 150),
        "text_color": (230, 235, 245),
        "item_padding": 10,
        "item_height": 30,
    }

    def __init__(self, **overrides):
        self.values = dict(self.defaults)
        self.values.update(overrides)

    def __getitem__(self, key):
        return self.values.get(key)


# -----------------------------------------------------------------------------
# Panel
# -----------------------------------------------------------------------------
class Panel(Component):
    """A simple rectangular container surface (background + border + radius).

    Draws a filled rounded rectangle using the widget's GameObject position and
    size. It is purely visual; children can be added as scene objects or drawn
    by other widgets above it (scene draw order by z_index).
    """
    is_ui = True

    def __init__(self, theme=None, color=None, border=None, radius=None, alpha=255):
        super().__init__()
        self.theme = theme or UITheme()
        self.color = color or self.theme["panel_bg"]
        self.border = border if border is not None else self.theme["panel_border"]
        self.radius = radius if radius is not None else self.theme["panel_border_radius"]
        self.alpha = alpha

    def draw(self, surface, camera_offset):
        if not self.game_object.active:
            return
        x = int(self.game_object.position.x)
        y = int(self.game_object.position.y)
        w = int(self.game_object.size.x)
        h = int(self.game_object.size.y)
        rect = pygame.Rect(x, y, max(1, w), max(1, h))
        if self.alpha < 255:
            try:
                layer = pygame.Surface((max(1, w + 4), max(1, h + 4)), pygame.SRCALPHA)
                pygame.draw.rect(layer, (*self.color, self.alpha), (2, 2, max(1, w), max(1, h)),
                                 border_radius=self.radius)
                surface.blit(layer, (x - 2, y - 2))
            except Exception:
                pygame.draw.rect(surface, self.color, rect, border_radius=self.radius)
        else:
            pygame.draw.rect(surface, self.color, rect, border_radius=self.radius)
            if self.border is not None:
                pygame.draw.rect(surface, self.border, rect, 2, border_radius=self.radius)


# -----------------------------------------------------------------------------
# Button
# -----------------------------------------------------------------------------
class Button(Component):
    """A clickable UI button (label + hover/press/focus states + callback).

    The rect comes from the GameObject's position/size. It reacts to:
      - mouse: hover (button_hover), held-left-press (button_press), and a
        proper click fires `on_click` (pressed while inside, released inside).
      - focus: when `focused` is True (or ENTER/gamepad-A is active) the button
        is highlighted AND can be activated with ENTER or the gamepad's A.
    `enabled=False` greys it out and blocks interaction.
    `pressed` stays True only during the current held state.
    """
    is_ui = True

    def __init__(self, text="", on_click=None, theme=None, font_size=None,
                 color=None):
        super().__init__()
        self.text = text
        self.on_click = on_click
        self.theme = theme or UITheme()
        self.font_size = font_size or self.theme["font_size"]
        self.color = color or self.theme["button_bg"]
        self.enabled = True
        self.focused = False
        self.hovered = False
        self.pressed = False
        self._was_pressed = False

    # --- helpers ------------------------------------------------------------
    def _font(self):
        return pygame.font.Font(self.theme["font_name"], self.font_size)

    def _rect(self):
        x = int(self.game_object.position.x)
        y = int(self.game_object.position.y)
        w = int(max(self.game_object.size.x, 8))
        h = int(max(self.game_object.size.y, 8))
        return pygame.Rect(x, y, w, h)

    def set_text(self, text):
        """Updates the label (also updates the GameObject size to fit)."""
        self.text = text
        font = self._font()
        self.game_object.size.x = font.size(text)[0] + 2 * self.theme["item_padding"]
        self.game_object.size.y = font.size(text)[1] + 2 * self.theme["item_padding"]

    def contains_point(self, pos) -> bool:
        return self._rect().collidepoint(pos[0], pos[1])

    def update(self, dt: float):
        if not self.game_object.active:
            return
        rect = self._rect()
        mx, my = Input.get_mouse_position()
        inside = rect.collidepoint(mx, my)
        self.hovered = inside and self.enabled

        click_fired = False
        # Keyboard / gamepad activation (focused target)
        if self.enabled and self.focused:
            if Input.get_key_down("ENTER") or (Input.is_controller_active()
                                               and self._gamepad_a_down()):
                click_fired = True

        # Mouse: click = pressed inside and released inside
        held = inside and Input.get_mouse_button(0)
        if held and self.enabled:
            self.pressed = True
            self._was_pressed = True
        else:
            was = self._was_pressed
            self.pressed = False
            self._was_pressed = False
            if was and self.enabled and self.contains_point((mx, my)):
                click_fired = True

        if click_fired and self.on_click is not None:
            self.on_click()

    @staticmethod
    def _gamepad_a_down():
        for i in range(32):
            if Input._joy_buttons_down and i in Input._joy_buttons_down:
                return True
        return False

    def draw(self, surface, camera_offset):
        if not self.game_object.active:
            return
        rect = self._rect()
        if not self.enabled:
            bg = self.theme["button_disabled"]
            text_col = self.theme["button_disabled"]
        elif self.pressed and self.enabled:
            bg = self.theme["button_press"]
            text_col = self.theme["button_text"]
        elif self.hovered:
            bg = self.theme["button_hover"]
            text_col = self.theme["button_text"]
        elif self.focused:
            bg = self.color
            text_col = self.theme["button_focus"]
        else:
            bg = self.color
            text_col = self.theme["button_text"]
        pygame.draw.rect(surface, bg, rect, border_radius=6)
        border_col = self.theme["button_focus"] if (self.focused or self.hovered) else None
        if border_col is not None:
            pygame.draw.rect(surface, border_col, rect, 2, border_radius=6)
        font = self._font()
        label = font.render(self.text, True, text_col)
        surface.blit(label, (rect.centerx - label.get_width() // 2,
                             rect.centery - label.get_height() // 2))


# -----------------------------------------------------------------------------
# ScrollContainer
# -----------------------------------------------------------------------------
class ScrollContainer(Component):
    """An item-list view with clipping and a draggable scrollbar.

    Holds a list of simple text `items` (strings). Rows are drawn inside the
    widget's rect; content taller than the widget is clipped, and the scroll
    range is exposed as `scroll` (0.0..1.0). Interaction:
      - mouse wheel (vertical) scrolls when hovering the widget,
      - the right-side handle can be dragged with the left button,
      - clicking a visible row fires `on_pick(row_index)`; the row keeps a
        `hovered_index` for games that want per-row states.

    This is the list/menu counterpart of Button (a small SelectionList).
    """
    is_ui = True

    def __init__(self, items=None, theme=None, on_pick=None, item_height=None,
                 font_size=None):
        super().__init__()
        self.items = list(items or [])
        self.on_pick = on_pick
        self.theme = theme or UITheme()
        self.item_height = item_height or self.theme["item_height"]
        self.font_size = font_size or (self.theme["font_size"] - 2)
        self.scroll = 0.0                      # 0.0 (top) .. 1.0 (bottom)
        self.hovered_index = -1                # row under the mouse (-1 = none)
        self._dragging = False
        self._drag_start_mouse = None

    # --- helpers ------------------------------------------------------------
    def _font(self):
        return pygame.font.Font(self.theme["font_name"], self.font_size)

    def _rect(self):
        x = int(self.game_object.position.x)
        y = int(self.game_object.position.y)
        w = int(max(self.game_object.size.x, 8))
        h = int(max(self.game_object.size.y, 8))
        return pygame.Rect(x, y, w, h)

    def content_height(self) -> int:
        return len(self.items) * self.item_height

    def row_rect(self, index: int) -> pygame.Rect:
        rect = self._rect()
        return pygame.Rect(rect.x, rect.y + index * self.item_height,
                           rect.width - 14, self.item_height)

    def visible_range(self):
        rect = self._rect()
        view_h = rect.height
        content = max(1, self.content_height())
        max_scroll = content - view_h
        top = int(self.scroll * max(0, len(self.items) * self.item_height - view_h))
        first = top // self.item_height
        count = (view_h // self.item_height) + 2
        return first, count

    # --- interaction --------------------------------------------------------
    def update(self, dt: float):
        if not self.game_object.active:
            return
        rect = self._rect()
        mx, my = Input.get_mouse_position()
        inside = rect.collidepoint(mx, my)

        # Mouse wheel / analog list scrolling
        if inside:
            _rel = pygame.mouse.get_rel()
            dx, dy = _rel
            if dy != 0:
                self.scroll = max(0.0, min(1.0, self.scroll + dy * 0.001 * self.item_height))

        # Scrollbar dragging: drag the handle (grab anywhere on the bar too)
        handle = self._handle_rect()
        if Input.get_mouse_button(0):
            if not self._dragging and inside:
                if handle.collidepoint(mx, my):
                    self._dragging = True
                    rect2 = self._rect()
                    span = max(1, rect2.height - handle.height)
                    ratio = (my - rect2.y - handle.height / 2) / span
                    self.scroll = max(0.0, min(1.0, ratio))
                    self._drag_start_mouse = my
            if self._dragging:
                rect2 = self._rect()
                handle2 = self._handle_rect()
                span = max(1, rect2.height - handle2.height)
                ratio = (my - rect2.y - handle2.height / 2) / span
                self.scroll = max(0.0, min(1.0, ratio))
        else:
            self._dragging = False

        # Hovered row + picking
        first, count = self.visible_range()
        self.hovered_index = -1
        for i in range(first, min(first + count, len(self.items))):
            if self.row_rect(i).collidepoint(mx, my):
                self.hovered_index = i
                if Input.get_mouse_button_down(0):
                    if self.on_pick is not None:
                        self.on_pick(i)
                break

    def _handle_rect(self) -> pygame.Rect:
        rect = self._rect()
        content = max(1, self.content_height())
        view = rect.height
        if content <= view:
            return pygame.Rect(rect.right - 10, rect.y, 8, rect.height)
        ratio = view / content
        handle_h = max(24, int(ratio * view))
        max_travel = view - handle_h
        hx = rect.right - 10
        hy = rect.y + int(self.scroll * max_travel)
        return pygame.Rect(hx, hy, 8, handle_h)

    # --- drawing ------------------------------------------------------------
    def draw(self, surface, camera_offset):
        if not self.game_object.active:
            return
        rect = self._rect()
        # Clip the list to the widget area
        old_clip = surface.get_clip()
        surface.set_clip(rect)
        font = self._font()
        first, count = self.visible_range()
        for i in range(first, min(first + count, len(self.items))):
            r = self.row_rect(i)
            if not rect.colliderect(r):
                continue
            color = self.theme["scroll_item_hover"] if i == self.hovered_index else self.theme["scroll_item"]
            label = font.render(self.items[i], True, color)
            surface.blit(label, (r.x + self.theme["item_padding"],
                                 r.y + (self.item_height - label.get_height()) // 2))
        surface.set_clip(old_clip)

        # Frame + scrollbar
        pygame.draw.rect(surface, self.theme["scroll_bg"], rect, border_radius=8)
        pygame.draw.rect(surface, self.theme["scroll_border"], rect, 1, border_radius=8)
        if self.content_height() > rect.height:
            handle = self._handle_rect()
            pygame.draw.rect(surface, self.theme["scroll_handle"], handle, border_radius=4)