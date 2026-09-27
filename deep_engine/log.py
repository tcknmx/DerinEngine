"""
DerinEngine Engine Console (MotorLogger)
=========================================
A shared logging layer that reports possible issues, errors and conflicts while
the game runs, in the background (command window / browser console), as lines
tagged WARN / BUG / ERR. It is called with a single API from anywhere in the
engine (main.py, editor, components).

Levels by severity:
- DEBUG  : normal flow detail (not printed by default — only while coding).
- INFO   : informational (not printed by default).
- WARN   : the game continues but something needs attention (e.g. media could not
           be read, fallback behavior kicked in, possible conflict).
- BUG    : logical error / unexpected state (e.g. object missing when None was
           expected, invalid value). Usually disrupts the game flow but does not crash.
- ERR    : serious error / caught exception (e.g. file/asset could not be read,
           save data corrupted). Highest priority.

The default threshold is WARN → it prints, as the user asked, not the "normal logs"
but the ones that can be counted as errors/problems.

Usage:
    from deep_engine.log import log
    log.warn("MyImage.png okunamadi, yedek renk kullaniliyor")
    log.err("savegame bozuk: " + repr(e))
    log.bug("Portal None bulundu")
"""

import os
import sys
import time

DEBUG = 0
INFO = 1
WARN = 2
BUG = 3
ERR = 4

_LEVEL_NAMES = {
    DEBUG: "DEBUG",
    INFO: "INFO",
    WARN: "WARN",
    BUG: "BUG",
    ERR: "ERR",
}


def _now():
    return time.strftime("%H:%M:%S")


class MotorLogger:
    """A simple, leveled engine logger that writes to the console + an optional file."""

    def __init__(self):
        self.level = WARN  # default threshold: only errors/problems and above
        self.handlers = []  # callable(level, label, msg)
        self._console_handler = self._default_console
        self.handlers.append(self._console_handler)
        self._file_handle = None

    # ------------------------------------------------------------------ API
    def set_level(self, level):
        """Set the threshold level (DEBUG/INFO/WARN/BUG/ERR)."""
        self.level = level

    def add_handler(self, fn):
        if fn not in self.handlers:
            self.handlers.append(fn)

    def remove_handler(self, fn):
        if fn in self.handlers:
            self.handlers.remove(fn)

    def clear_handlers(self):
        self.handlers = []

    def set_file(self, path):
        """Also write to the given file (append). If path=None, disable file writing."""
        self.close_file()
        if path:
            try:
                os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
                self._file_handle = open(path, "a", encoding="utf-8")
            except Exception:
                self._file_handle = None
                self.err("MotorLogger: log dosyasi acilamadi: " + repr(path))

    def close_file(self):
        if self._file_handle:
            try:
                self._file_handle.close()
            except Exception:
                self._file_handle = None  # kapatma hatasi: referansi temizle, sessiz gecer
            self._file_handle = None

    # ----------------------------------------------------------------- emit
    def _emit(self, level, msg):
        if level < self.level:
            return
        label = _LEVEL_NAMES.get(level, "?")
        for h in list(self.handlers):
            try:
                h(level, label, str(msg))
            except Exception:
                continue  # bozuk handler'i atla; diger hanlervercalismaya devam etsin
        if self._file_handle:
            try:
                self._file_handle.write("[%s] %s %s\n" % (_now(), label, str(msg)))
                self._file_handle.flush()
            except Exception:
                self._file_handle = None  # dosya yazilamiyor: kapat, geri kalan satirlari atla

    def _default_console(self, level, label, msg):
        line = "[%s] %s %s" % (label, self._context(), msg)
        try:
            print(line, flush=True)
        except Exception:
            return  # konsol kullanilamiyor: web yansimasini denemeden gec
        # Also mirror it to the browser (emscripten) console
        if sys.platform == "emscripten":
            try:
                from platform import window as _w
                _w.console.log(line)
            except Exception:
                return  # tarayici konsolu da yok: bu mesaj loglnamiyor (zararsiz)

    def _context(self):
        """Roughly stamp where it came from (top of the caller's stack)."""
        try:
            import traceback
            st = traceback.extract_stack(limit=3)
            if len(st) >= 2:
                fr = st[-2]
                base = os.path.basename(fr.filename)
                return "%s:%s" % (base, fr.lineno)
        except Exception:
            return "?"  # hata olursa bilinmeyen isaretci dondur (zararsiz)
        return "?"  # baglam cikarilamadi ise bilinmeyen isaretci

    # --------------------------------------------------- level helpers
    def debug(self, msg):
        self._emit(DEBUG, msg)

    def info(self, msg):
        self._emit(INFO, msg)

    def warn(self, msg):
        self._emit(WARN, msg)

    def bug(self, msg):
        self._emit(BUG, msg)

    def err(self, msg):
        self._emit(ERR, msg)

    def exception(self, tp, val, tb):
        """Writes a caught exception as [ERR] together with its traceback."""
        try:
            import traceback
            lines = "".join(traceback.format_exception(tp, val, tb)).strip()
        except Exception:
            lines = "%s: %s" % (getattr(tp, "__name__", tp), val)
        self.err("EXCEPTION: " + lines)


# Singleton engine logger
log = MotorLogger()