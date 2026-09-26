"""DerinEngine - Game layer (game/).

All of the game logic from main.py's former single file has been split into
this package:
    - state:     global state (campaign, endless mode)
    - entities:  player, enemies, goal portal, small helpers
    - bosses:    boss classes
    - ui:        menu, victory, game over, UI components
    - builders:  JSON level builder/extractor functions
    - scenes:    procedural + campaign + endless + level builders

Names that need to be exposed are re-exported below.
"""

from . import state
from .state import campaign_state, game_mode, endless_state

from . import entities, bosses, ui, builders, scenes, commands

# --- entities ---
from .entities import (
    PlayerController,
    GoalPortal,
    PatrolEnemy,
    FlyerEnemy,
    HopperEnemy,
    TurretEnemy,
    SniperEnemy,
    BobbingAnimation,
    PatrolPlatform,
    FloatingScore,
    _spawn_float_score,
    _wake_up,
)

# --- bosses ---
from .bosses import (
    BossController,
    FlyingBoss,
    SniperBoss,
    CosmicBoss,
    ShieldBoss,
)

# --- ui ---
from .ui import (
    LocalizedLabel,
    LockIcon,
    FadeOverlay,
    MenuController,
    FireworksController,
    VictoryController,
    GameOverController,
    build_main_menu_scene,
    build_game_over_scene,
    build_victory_scene,
)

# --- builders ---
from .builders import (
    _register_level_builders,
)

# --- scenes ---
from .scenes import (
    build_procedural_level,
    start_campaign,
    build_campaign_entrance,
    build_campaign_boss,
    build_endless_level,
)
