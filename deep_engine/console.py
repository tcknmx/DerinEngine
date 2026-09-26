"""console.py — in-game developer command line (toggled with the ` key).

The DevConsole is engine-level: it owns the input line,
command history and on-screen rendering. Game-specific commands (hp, coins,
god, ...) are registered from game/commands.py so the engine never imports the
game layer. The console pauses the scene while it is open.
"""

from collections import deque

import pygame

from .input import Input

# Commands: name -> (help_text, fn). fn(scene, args_list) -> optional result str.
_COMMANDS = {}


def register_command(name, help_text, fn):
    """Registers a console command (used by the game layer at startup)."""
    _COMMANDS[name.lower()] = (help_text, fn)


def _cmd_help(scene, args):
    lines = ["Komutlar:"]
    for name in sorted(_COMMANDS):
        lines.append("  %s  ->  %s" % (name, _COMMANDS[name][0]))
    return "\n".join(lines)


def _cmd_clear(scene, args):
    return "__CLEAR__"


def _cmd_version(scene, args):
    from . import __version__ as ver
    return "DerinEngine motor surumu: %s" % ver


register_command("help", "komut listesini goster", _cmd_help)
register_command("clear", "konsolu temizle", _cmd_clear)
register_command("version", "motor surumunu goster", _cmd_version)


class DevConsole:
    """A small in-game command prompt rendered as a top panel."""

    def __init__(self, width, height):
        if not pygame.font.get_init():
            pygame.font.init()
        self.active = False
        self.width = width
        self.height = height
        self.input_line = ""
        self.history = []
        self.history_index = 0
        self.output = deque(maxlen=64)
        self.font = pygame.font.SysFont("Consolas", 16, bold=False)
        self._cursor_timer = 0.0
        self._cmd_count = 0

    # --- control ---

    def _print(self, text):
        for line in str(text).split("\n"):
            self.output.append(line)

    def toggle(self):
        self.active = not self.active
        if self.active:
            # The key that just opened the console must not land in the input line.
            Input._typed_chars.clear()
            self.input_line = ""
            self.history_index = len(self.history)
            self._print("Konsol acik. 'help' yazip ENTER'a bas.")
        return self.active

    def close(self):
        self.active = False

    # --- per-frame update (called only while active) ---

    def update(self, dt):
        # Text typing: characters arriving this frame are consumed here.
        typed = Input.get_typed_text()
        if typed:
            self.input_line += typed

        # Backspace
        if Input.get_key_down("BACKSPACE"):
            self.input_line = self.input_line[:-1]

        # History navigation (UP / DOWN)
        if Input.get_key_down("UP") and self.history:
            self.history_index = max(0, self.history_index - 1)
            self.input_line = self.history[self.history_index]
        if Input.get_key_down("DOWN"):
            self.history_index = min(len(self.history), self.history_index + 1)
            self.input_line = self.history[self.history_index] if self.history_index < len(self.history) else ""

        # Enter -> run the command
        if Input.get_key_down("ENTER") or Input.get_key_down("KPENTER"):
            line = self.input_line.strip()
            self.input_line = ""
            self._run(line)

        # ESC -> close the console (the backquote/quote key closes it via the
        # engine-level toggle, NOT here - otherwise the same keypress that opened
        # the console this frame would immediately close it again).
        if Input.get_key_down("ESCAPE"):
            self.close()

        self._cursor_timer += dt

    def _run(self, line):
        if not line:
            return
        self.history.append(line)
        self.history_index = len(self.history)
        self._print("> " + line)
        parts = line.split()
        name = parts[0].lower()
        args = parts[1:]
        if name not in _COMMANDS:
            self._print("Bilinmeyen komut: '%s' (help yaz)" % name)
            return
        try:
            from .core import Engine
            scene = Engine.instance.active_scene if Engine.instance else None
            result = _COMMANDS[name][1](scene, args)
        except Exception as exc:  # noqa: BLE001 - a command must never crash the game
            self._print("HATA: %r" % (exc,))
            return
        if result == "__CLEAR__":
            self.output.clear()
        elif result:
            self._print(result)

    # --- rendering ---

    def draw(self, surface):
        if not self.active:
            return
        w = surface.get_width()
        h = surface.get_height()

        # Panel: top half of the screen
        panel_h = int(h * 0.42)
        panel = pygame.Surface((w, panel_h), pygame.SRCALPHA)
        panel.fill((12, 14, 20, 235))
        surface.blit(panel, (0, 0))
        pygame.draw.line(surface, (70, 100, 150), (0, panel_h), (w, panel_h), 2)

        # Output lines (newest on the bottom)
        line_h = 20
        y = panel_h - 34
        for line in reversed(list(self.output)):
            if y < 18:
                break
            surf = self.font.render(line, True, (210, 220, 235))
            surface.blit(surf, (12, y - line_h))
            y -= line_h

        # Input line (bottom of the panel)
        prompt = "> " + self.input_line
        if int(self._cursor_timer * 2) % 2 == 0:
            prompt += "_"
        inp = self.font.render(prompt, True, (120, 230, 120))
        surface.blit(inp, (12, panel_h - 30))

        hint = self.font.render("` veya ESC ile kapat - help ile komutlari gor", True, (120, 130, 150))
        surface.blit(hint, (12, panel_h - 54))