"""game.commands — in-game developer console commands.

Registered into the engine's DevConsole (backquote ` key) from the game layer.
The console itself lives in deep_engine/console.py; this module only provides
the game-specific commands (player health, coins, speed, teleport, objects, ...).
"""

import json
import os

from deep_engine import Health, Rigidbody2D, user_data_dir
from deep_engine.console import register_command as _reg

from .entities import PlayerController
from .scenes import export_scene_tilemap as _export
from .scenes import import_scene_tilemap as _import
from .scenes import _tilemap_summary as _summary

_SAFE_CHARS = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-.")


def _safe_name(raw):
    """Filesystem-safe level name for a saved tilemap (console input -> path)."""
    cleaned = "".join(c if c in _SAFE_CHARS else "_" for c in str(raw))[:48].strip("._")
    return cleaned or "level"


def ensure_dir():
    """Creates the user data directory (where savegame.json + tilemaps live)."""
    path = user_data_dir()
    os.makedirs(path, exist_ok=True)
    return path


def _player(ctx):
    """Returns (player_go, PlayerController) or (None, None) when absent."""
    if not ctx:
        return None, None
    go = ctx.find_by_tag("Player")
    if not go:
        return None, None
    return go, go.get_component(PlayerController)


def cmd_hp(ctx, args):
    """Sets the player's health to a value (0 = death)."""
    go, pc = _player(ctx)
    if go is None:
        return "Oyuncu yok (o siste sahnesinde degilsin)."
    hp = go.get_component(Health)
    if hp is None:
        return "Oyuncuda Health bileseni yok."
    try:
        value = max(0, min(999, int(args[0])))
    except (IndexError, ValueError):
        return "Kullanim: hp <sayi>  (mevcut: %d/%d)" % (hp.current_hp, hp.max_hp)
    hp.current_hp = value
    return "can -> %d/%d" % (hp.current_hp, hp.max_hp)


def cmd_heal(ctx, args):
    """Restores the player to full health."""
    go, pc = _player(ctx)
    if go is None:
        return "Oyuncu yok."
    hp = go.get_component(Health)
    if hp is None:
        return "Oyuncuda Health bileseni yok."
    hp.current_hp = hp.max_hp
    hp.invulnerable_timer = max(hp.invulnerable_timer, 1.2)
    return "sifa tamam." if pc else "sifa tamam."


def cmd_god(ctx, args):
    """Toggles invulnerability (god mode)."""
    go, pc = _player(ctx)
    if go is None:
        return "Oyuncu yok."
    hp = go.get_component(Health)
    if hp is None:
        return "Oyuncuda Health bileseni yok."
    if hp.invulnerable_timer > 0:
        hp.invulnerable_timer = 0.0
        return "god mode KAPALI."
    hp.invulnerable_timer = 1.0e12
    return "god mode ACIK (olumsuz)."


def cmd_coins(ctx, args):
    """Adds coins to the current score (negative = remove)."""
    go, pc = _player(ctx)
    if go is None or pc is None:
        return "Oyuncu yok (koin eklemek icin oyun sahnesinde ol)."
    try:
        amount = int(args[0])
    except (IndexError, ValueError):
        return "Kullanim: coins <sayi>  (mevcut skor: %d)" % pc.score
    pc._add_score(amount)
    return "skor -> %d" % pc.score


def cmd_speed(ctx, args):
    """Sets the player's horizontal speed."""
    go, pc = _player(ctx)
    if go is None or pc is None:
        return "Oyuncu yok."
    try:
        value = max(20.0, min(2000.0, float(args[0])))
    except (IndexError, ValueError):
        return "Kullanim: speed <deger>  (mevcut: %.0f)" % pc.speed
    pc.speed = value
    return "hiz -> %.0f" % pc.speed


def cmd_jump(ctx, args):
    """Sets the player's jump power."""
    go, pc = _player(ctx)
    if go is None or pc is None:
        return "Oyuncu yok."
    try:
        value = max(100.0, min(4000.0, float(args[0])))
    except (IndexError, ValueError):
        return "Kullanim: jump <deger>  (mevcut: %.0f)" % pc.jump_force
    pc.jump_force = value
    return "ziplama -> %.0f" % pc.jump_force


def cmd_tp(ctx, args):
    """Teleports the player to (x, y) world coordinates."""
    go, pc = _player(ctx)
    if go is None or pc is None:
        return "Oyuncu yok."
    try:
        x = float(args[0])
        y = float(args[1])
    except (IndexError, ValueError):
        return "Kullanim: tp <x> <y>"
    go.position.x = x
    go.position.y = y
    rb = go.get_component(Rigidbody2D)
    if rb:
        rb.velocity.x = 0.0
        rb.velocity.y = 0.0
    return "isinlandi -> (%.0f, %.0f)" % (x, y)


def cmd_respawn(ctx, args):
    """Respawns the player at the level's spawn point."""
    go, pc = _player(ctx)
    if go is None or pc is None:
        return "Oyuncu yok."
    pc.respawn(recover=True)
    return "spawn noktasina donuldu."


def cmd_tilemap_save(ctx, args):
    """Writes the current level's tilemap ground to <user_data>/<name>.tilemap.json."""
    if not ctx:
        return "Sahne yok."
    name = _safe_name(args[0] if args else "level")
    data = _export(ctx)
    if data is None:
        return "Bu sahnede tilemap yok (prosedurel/boss seviyesi gerekli)."
    try:
        ensure_dir()
        path = os.path.join(user_data_dir(), name + ".tilemap.json")
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False)
    except OSError as exc:
        return "Yazilamadi: %s" % exc
    return "tilemap kaydedildi: %s (%s)" % (name + ".tilemap.json", _summary(ctx))


def cmd_tilemap_load(ctx, args):
    """Loads a saved tilemap ground back into the current level."""
    if not ctx:
        return "Sahne yok."
    name = _safe_name(args[0] if args else "level")
    path = os.path.join(user_data_dir(), name + ".tilemap.json")
    try:
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, ValueError) as exc:
        return "Okunamadi (%s): %s" % (name + ".tilemap.json", exc)
    if not _import(ctx, data):
        return "Veri gecersiz (tilemap katmani yok)."
    return "tilemap yuklendi: %s (%s)" % (name + ".tilemap.json", _summary(ctx))


def cmd_list(ctx, args):
    """Lists the objects currently in the scene."""
    if not ctx:
        return "Sahne yok."
    names = {}
    for obj in ctx.game_objects:
        tag = obj.tag or "?"
        names[tag] = names.get(tag, 0) + 1
    return ", ".join("%s x%d" % (t, n) for t, n in sorted(names.items())) or "(bos sahne)"


_reg("hp", "oyuncu canini ayarla (hp 5)", cmd_hp)
_reg("heal", "can doldur", cmd_heal)
_reg("god", "olumsuzluk ac/kapa", cmd_god)
_reg("coins", "skora coins ekle (coins 100)", cmd_coins)
_reg("speed", "oyuncu hizini ayarla (speed 300)", cmd_speed)
_reg("jump", "ziplama gucunu ayarla (jump 600)", cmd_jump)
_reg("tp", "isinla (tp x y)", cmd_tp)
_reg("respawn", "spawn noktasina don", cmd_respawn)
_reg("tilemap_save", "seviye tilemap'ini kaydet (tilemap_save seviye1)", cmd_tilemap_save)
_reg("tilemap_load", "tilemap'i geri yukle (tilemap_load seviye1)", cmd_tilemap_load)
_reg("list", "sahnedeki nesneleri say", cmd_list)