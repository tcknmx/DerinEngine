"""
================================================================================
DerinEngine - Level File System
================================================================================
The engine's standard layer for saving levels to and rebuilding them from a
JSON file on disk. Levels no longer live embedded in code; they exist as
independent, portable *.json files.

Architecture principle (engine <-> game separation):
  - This module is part of the engine ("deep_engine") and does NOT know
    game-specific components.
  - How each object type is placed into a scene is registered by the game
    through "builder" functions:  register_builder(tag, fn).
  - So the engine can read and build any level (even one defined in code, by
    serializing it to JSON and replaying it), while the game only provides its
    own components and behavior.
================================================================================
"""

import json

# -----------------------------------------------------------------------------
# Builder Registry
#   tag (str)           -> object tag (e.g. "Platform", "Enemy", "PowerUp")
#   builder(scene, data) -> adds that object to the scene (data is a dict)
# -----------------------------------------------------------------------------
_BUILDERS = {}

# Keys in the scene metadata (background, theme) dictionary
_SCENE_META_DEFAULTS = {
    "name": "Unnamed Level",
    "background_color": [30, 30, 40],
    "parallax_theme": None,        # "forest" or "lava" (None = none)
    "camera_target": "Player",     # first tag the camera will follow
}


def register_builder(tag: str, builder):
    """Registers how a new object type is added to a scene.

    builder must be a function with a (scene, data) signature; the data dict
    contains these common keys: tag, name, x, y, w, h plus type-specific extras.
    """
    _BUILDERS[tag] = builder


def get_builder(tag: str):
    """Returns a registered builder, or None."""
    return _BUILDERS.get(tag)


def registered_tags():
    """Lists all registered tags."""
    return list(_BUILDERS.keys())


def place_object(scene, data: dict):
    """Adds an object to the scene with the registered builder for the given data dict.

    Both the level loader (load_level) and the editor use it, providing a
    single source of truth. Unknown types are silently skipped.
    """
    tag = data.get("tag")
    builder = _BUILDERS.get(tag)
    if builder is None:
        print(f"[DerinEngine] Uyari: '{tag}' icin builder bulunamadi, atlandi.")
        return None
    return builder(scene, data)


# -----------------------------------------------------------------------------
# Saving
# -----------------------------------------------------------------------------
def save_level(scene, path: str, extra_meta: dict = None):
    """Writes a scene, together with all its game data, to disk as a JSON file.

    For each object in 'game_objects', common geometry (x, y, w, h, tag, name)
    and basic appearance info such as color are extracted; type-specific extra
    data is produced through the 'extract_custom' call in this module. The game
    can provide its own extra data by registering package (extractor) functions.
    """
    # Per-tag extractors for extra data (the game can add more)
    extractors = getattr(save_level, "extractors", {})

    data = {
        "meta": {
            "name": scene.name,
            "background_color": list(scene.background_color),
            "parallax_theme": _theme_of(scene),
            "format": "derinengine-level",          # format signature (for validation)
            "version": 1,
        },
        "objects": [],
    }
    if extra_meta:
        data["meta"].update(extra_meta)

    for obj in scene.game_objects:
        # Write only objects the engine can rebuild (has a builder) or the
        # game stored extra data for (has an extractor).
        # Objects tagged "Default" that are unrelated to gameplay, such as UI
        # elements (ScoreUI etc.), are skipped so they don't clutter the file.
        if obj.tag not in _BUILDERS and obj.tag not in extractors:
            continue

        entry = {
            "tag": obj.tag,
            "name": obj.name,
            "x": round(obj.position.x, 2),
            "y": round(obj.position.y, 2),
            "w": round(obj.size.x, 2),
            "h": round(obj.size.y, 2),
        }
        # Common color / shape info (appearance)
        from .components import SpriteRenderer
        spr = obj.get_component(SpriteRenderer)
        if spr:
            entry["color"] = list(spr.color)
            entry["shape"] = spr.shape

        # Type-specific extra data (if the game registered an extractor)
        ext = extractors.get(obj.tag)
        if ext:
            entry.update(ext(obj) or {})

        data["objects"].append(entry)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return data


def register_extractor(tag: str, extractor):
    """Registers a function that produces extra data for an object type when saving.

    extractor(game_object) -> dict  (must be JSON-serializable)
    e.g. for PowerUp it returns {'power_type': ..., 'duration': ...}.
    """
    extractors = getattr(save_level, "extractors", {})
    extractors[tag] = extractor
    save_level.extractors = extractors


def _theme_of(scene):
    """Reads the scene's parallax background theme (or None if absent)."""
    pb = getattr(scene, "parallax_background", None)
    if pb is not None:
        theme = getattr(pb, "theme", None)
        if theme:
            return theme
    return None


# -----------------------------------------------------------------------------
# Loading
# -----------------------------------------------------------------------------
def load_level(path: str, extra_builder_data: dict = None, finalize=None):
    """Reads a JSON level file and returns a complete Scene object.

    The scene metadata (name, background color, parallax theme) and all
    objects are rebuilt with the corresponding builder functions.

    - extra_builder_data: common fields added to every object's data (e.g. a
      bool flag that builders can read while placing objects).
    - finalize: a function that applies final touches to the scene after
      loading (e.g. writing the star count to the UI). signature: finalize(scene)
    """
    from .scene import Scene

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    meta = data.get("meta", {})
    scene = Scene(
        name=meta.get("name", "Unnamed Level"),
        background_color=tuple(meta.get("background_color", [30, 30, 40])),
    )

    # Parallax background
    theme = meta.get("parallax_theme")
    if theme:
        try:
            from .parallax import ParallaxBackground
            scene.parallax_background = ParallaxBackground(theme=theme)
        except Exception as e:
            print(f"[DerinEngine] Parallax tema uyarisi: {e}")

    # Build the objects
    for entry in data.get("objects", []):
        item = dict(entry)
        if extra_builder_data:
            # The object's own fields must not be overridden by same-named extras
            for k, v in extra_builder_data.items():
                item.setdefault(k, v)
        place_object(scene, item)

    # Camera target (default: "Player")
    cam_target = meta.get("camera_target", "Player")
    target = scene.find_by_tag(cam_target)
    if target:
        scene.set_camera_target(target)

    # Flush pending objects into the scene (ready to save/play even without start)
    scene.start()

    # Game-specific final touches
    if finalize:
        finalize(scene)

    return scene
