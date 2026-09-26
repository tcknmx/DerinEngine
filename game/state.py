"""
game.state - Shared game state (global variables and constants).

This module does not depend on any other game.* module; it keeps the game's
global state (campaign, endless mode) in one place. It does not hold any
scene/function references to avoid circular imports.
"""

# Global campaign state: chain (biome list) + start info.
# Astro is always kept at the END of the list -> final boss.
campaign_state = {
    "chain": [],           # biome chain (last element is always "astro")
    "index": 0,            # active sector index
    "difficulty": 1,       # active difficulty (increments each sector)
    "score": 0,            # persistent base: score from previously completed sectors
    "sector_score": 0,     # active sector's (entrance + boss) cumulative total
}

# Active game mode: "campaign" (P) or "endless" (4).
# The same entrance map is shared; portal behavior changes with this mode:
#   campaign -> boss arena, endless -> new procedural map with rising difficulty.
game_mode = "campaign"

# Continuously accumulating score for Endless Mode (4). Unlike the campaign
# sector score, endless score CARRIES OVER across scene transitions (into the
# new difficulty map) so the player can build a high score without resets.
endless_state = {"score": 0}