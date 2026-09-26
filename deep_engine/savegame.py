"""
================================================================================
DerinEngine - Save Profile / Savegame
================================================================================
A simple but robust profile system that saves/reads the player's persistent
data (high score, unlocked levels, language preference, etc.) to a JSON file
on disk.

Usage:
    save = SaveGame("profile.json")     # opens the file (starts clean if missing)
    save.set("high_score", 1200)        # write a value
    save.set("lang", "en")
    save.save()                          # write to disk
    hs = save.get("high_score", 0)       # read (uses default if missing)
================================================================================
"""

import json
import os
import sys

# Persistence in the browser (pygbag/emscripten): the MEMFS filesystem resets
# on page refresh. So save data is also mirrored to the browser's persistent
# localStorage API (pygbag's documented approach).
# On desktop/EXE (not emscripten) this layer never kicks in -> behavior is
# unchanged; only the file is used.
_EMSCRIPTEN = sys.platform == "emscripten"


def _local_storage():
    """Returns the `window.localStorage` object on emscripten, or None.

    Availability is probed with try/except at access time, so the game
    silently falls back to the file when localStorage is disabled/restricted.
    """
    if not _EMSCRIPTEN:
        return None
    try:
        from platform import window
        if hasattr(window, "localStorage"):
            return window.localStorage
    except Exception:
        pass  # noqa: bilinçli
    return None


# Key used in localStorage (fixed, independent of the file name).
_WS_KEY = "derinengine_save_v1"


def _storage_to_file(local, data):
    """Also update localStorage (so it survives a page refresh)."""
    if local is None:
        return
    try:
        local.setItem(_WS_KEY, json.dumps(data, ensure_ascii=False))
    except Exception:
        pass  # noqa: bilinçli


def _storage_from_file(local):
    """Reads the data stored in localStorage, or None if absent/corrupt."""
    if local is None:
        return None
    try:
        raw = local.getItem(_WS_KEY)
        if not raw:
            return None
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else None
    except Exception:
        return None


class SaveGame:
    """Profile class that keeps persistent game data in a JSON file."""

    def __init__(self, path: str = "savegame.json"):
        self.path = path
        self._local = _local_storage()
        self.data = {}
        self.load()

    def load(self):
        """Reads data from the file; starts clean if the file is missing or corrupt.

        On emscripten it first tries localStorage (the previous session's
        persistent record); otherwise it falls back to the fresh save embedded
        in the package / stored in the file.
        """
        # 1) Browser persistent record (if any) -> newest, survives page refresh
        persisted = _storage_from_file(self._local)
        if persisted is not None:
            self.data = persisted
            return

        # 2) File-based (desktop / EXE or the web's first run)
        try:
            if os.path.exists(self.path):
                # utf-8-sig: also reads a leading UTF-8 BOM (ï»¿) if present
                # (leftover metadata / tools like PowerShell Set-Content -Encoding UTF8)
                with open(self.path, "r", encoding="utf-8-sig") as f:
                    self.data = json.load(f)
        except Exception as e:
            print(f"[DerinEngine] Kayit okunamadi, temiz baslanacak: {e}")
            self.data = {}
        if not isinstance(self.data, dict):
            self.data = {}

    def save(self):
        """Writes the current data to disk (creates the directory if missing)."""
        directory = os.path.dirname(os.path.abspath(self.path))
        if directory and not os.path.exists(directory):
            os.makedirs(directory, exist_ok=True)
        try:
            with open(self.path, "w", encoding="utf-8") as f:
                json.dump(self.data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[DerinEngine] Kayit yazilamadi: {e}")
        # Also mirror localStorage alongside writing to disk in the browser
        _storage_to_file(self._local, self.data)

    # --- Convenience access helpers ---
    def set(self, key, value):
        """Updates a value in memory (does not write to disk yet)."""
        self.data[key] = value

    def get(self, key, default=None):
        """Reads a value; returns the default if absent."""
        return self.data.get(key, default)

    def has(self, key) -> bool:
        """Whether the key is stored."""
        return key in self.data

    def update_high_score(self, key: str, value) -> bool:
        """Updates the 'record' for the given metric.

        If value is bigger than the current record, it saves it as the new
        record, writes to disk and returns True. Otherwise it does nothing and
        returns False.
        """
        current = self.get(key, 0)
        if value > current:
            self.set(key, value)
            self.save()
            return True
        return False

    def delete(self):
        """Deletes the save file (useful for tests)."""
        try:
            if os.path.exists(self.path):
                os.remove(self.path)
            self.data = {}
        except Exception as e:
            print(f"[DerinEngine] Kayit silinemedi: {e}")