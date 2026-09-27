"""DerinEngine - Educational, Modular 2D Game Engine"""

__version__ = "0.1.19"

import os
import sys


def user_data_dir():
    """Returns the folder where game data (savegame, level files) is written and read.

    - Packaged EXE: next to the exe (persistent, portable) -> sys.executable's dir.
    - Normal Python run: the code dir -> __file__'s dir.
    In a PyInstaller onefile build, __file__ points to the temporary _MEIPASS dir;
    sys.executable always gives the exe's real location (so savegame/level files
    are written next to the exe and not lost).
    """
    if getattr(sys, "frozen", False):
        base = os.path.dirname(os.path.abspath(sys.executable))
    elif sys.platform == "emscripten":
        # Browser (pygbag/emscripten) environment: the working directory is the virtual FS root.
        base = os.getcwd()
    else:
        base = os.path.dirname(os.path.abspath(__file__))
        base = os.path.dirname(base)  # above deep_engine/ -> project root
    return base

from .math2d import Vector2
from .core import Engine
from .scene import Scene
from .game_object import GameObject
from .input import Input
from .particles import ParticleEmitter, Particle
from .audio import SoundFX
from .console import DevConsole
from .i18n import I18n
from .lighting import LightingEngine, LightSource
from .parallax import ParallaxBackground, ParallaxLayer
from .savegame import SaveGame
from . import procedural
from .levelfile import (
    register_builder,
    get_builder,
    registered_tags,
    place_object,
    save_level,
    load_level,
    register_extractor,
)
from .components import (
    Component,
    SpriteRenderer,
    Animator,
    KeyframeAnimator,
    BoxCollider,
    CircleCollider,
    PolygonCollider,
    Rigidbody2D,
    TextRenderer,
    BouncePad,
    Health,
    Projectile,
    PowerUp,
    BreakablePlatform,
    SpawnIn,
)
from .tween import (
    Tween,
    TweenComponent,
    Tweener,
    EASING,
)
from .scenemanager import SceneManager
from .tilemap import Tilemap
from .ui import UITheme, Panel, Button, ScrollContainer
from .log import log, MotorLogger, WARN, BUG, ERR, INFO, DEBUG

__all__ = [
    "Vector2",
    "Engine",
    "Scene",
    "GameObject",
    "Input",
    "Component",
    "SpriteRenderer",
    "Animator",
    "KeyframeAnimator",
    "BoxCollider",
    "CircleCollider",
    "PolygonCollider",
    "Tilemap",
    "Rigidbody2D",
    "TextRenderer",
    "BouncePad",
    "Health",
    "Projectile",
    "PowerUp",
    "BreakablePlatform",
    "SpawnIn",
    "Tween",
    "TweenComponent",
    "Tweener",
    "EASING",
    "SceneManager",
    "ParticleEmitter",
    "Particle",
    "SoundFX",
    "DevConsole",
    "I18n",
    "LightingEngine",
    "LightSource",
    "ParallaxBackground",
    "ParallaxLayer",
    "SaveGame",
    "register_builder",
    "get_builder",
    "registered_tags",
    "place_object",
    "save_level",
    "load_level",
    "register_extractor",
    "log",
    "MotorLogger",
    "WARN",
    "BUG",
    "ERR",
    "INFO",
    "DEBUG",
    "UITheme",
    "Panel",
    "Button",
    "ScrollContainer",
]
