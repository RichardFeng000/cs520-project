"""Adapt :class:`HighScorePacmanEnv` state into the dict observation format.

The search-based agents in :mod:`Agents` consume the observation contract used
by the browser game (see :mod:`Agents.observation`). The trainer in
:mod:`RL.rl_q_learning` exposes a Python game state instead. This module
bridges the two so we can drive every agent against the same simulator.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from RL.rl_q_learning import HighScorePacmanEnv  # noqa: E402  (import after path tweak)


def env_to_observation_dict(env: HighScorePacmanEnv) -> Dict[str, Any]:
    """Render the live env state as the JSON-shaped observation dict."""
    pacman_x, pacman_y = env.pacman
    return {
        "pacman": {
            "x": pacman_x,
            "y": pacman_y,
            "dir": env.pacman_dir,
        },
        "ghosts": [
            {
                "x": ghost.pos[0],
                "y": ghost.pos[1],
                "dir": ghost.direction,
                "scared": bool(ghost.scared),
                "active": bool(ghost.active),
            }
            for ghost in env.ghosts
        ],
        "pellets": [{"x": x, "y": y} for (x, y) in env.pellets],
        "energizers": [{"x": x, "y": y} for (x, y) in env.energizers],
        "walls": [[x, y] for (x, y) in env.wall_tiles],
        "width": env.width,
        "height": env.height,
        "legal_actions": list(env.legal_actions()),
    }


def hazard_pressure(env: HighScorePacmanEnv, radius: int = 2) -> int:
    """Number of active non-scared ghosts within Manhattan ``radius`` of Pac-Man.

    Used as a cheap, deterministic stand-in for the cumulative ``E[risk]``
    metric called out in the master plan; we sum it across the trajectory to
    get a per-episode hazard exposure score.
    """
    px, py = env.pacman
    count = 0
    for ghost in env.ghosts:
        if not ghost.active or ghost.scared:
            continue
        gx, gy = ghost.pos
        if abs(px - gx) + abs(py - gy) <= radius:
            count += 1
    return count


def make_env(seed: int, death_policy: str = "model2", level: int = 1) -> HighScorePacmanEnv:
    """Construct a fresh simulator. Each episode should call this with its own seed."""
    return HighScorePacmanEnv(level=level, seed=seed, death_policy=death_policy)


__all__: List[str] = ["env_to_observation_dict", "hazard_pressure", "make_env"]
