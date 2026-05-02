from __future__ import annotations

from typing import Dict, Set

from ._search import (
    astar_first_step,
    greedy_legal_action,
    scared_ghost_targets,
    ghost_obstacle_cells,
    manhattan,
    nearest_target,
)
from .observation import Action, Observation, Point, parse_observation


def _search(obs: Observation, obstacles: Set[Point]) -> Action | None:
    scared_targets = scared_ghost_targets(obs)

    def is_walkable_for_target(pos: Point) -> bool:
        return obs.is_walkable(pos) and (
            pos not in obstacles or pos in scared_targets
        )

    target_pool = scared_targets or obs.targets
    target = nearest_target(obs.pacman, target_pool, is_walkable_for_target)
    if target is None:
        return None

    def is_walkable(pos: Point) -> bool:
        return obs.is_walkable(pos) and (
            pos not in obstacles or (pos == target and target in scared_targets)
        )

    action = astar_first_step(
        start=obs.pacman,
        goal_test=lambda pos: pos == target,
        is_walkable=is_walkable,
        heuristic=lambda pos: manhattan(pos, target),
        cost_fn=lambda _current, neighbor, _arrival: (
            0.2 if neighbor == target and target in scared_targets else 1.0
        ),
    )
    if action in obs.legal_actions:
        return action
    return None


def select_action(observation: Dict[str, object]) -> Action:
    obs = parse_observation(observation)
    action = _search(obs, ghost_obstacle_cells(obs))
    if action is None:
        action = _search(obs, set())
    return action or greedy_legal_action(obs)
