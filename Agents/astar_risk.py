from __future__ import annotations

from typing import Dict, Mapping, Set

from ._search import (
    astar_first_step,
    ghost_obstacle_cells,
    greedy_legal_action,
    manhattan,
    nearest_target,
    scared_ghost_targets,
    transition_distribution,
)
from .observation import Action, Observation, Point, parse_observation


def _risk_cost_factory(obs: Observation, risk_lambda: float):
    distributions: Dict[tuple[Point, int], Mapping[Point, float]] = {}
    active_ghosts = [ghost for ghost in obs.ghosts if ghost.active and not ghost.scared]

    def risk_at(tile: Point, arrival_step: int) -> float:
        risk = 0.0
        for ghost in active_ghosts:
            key = (ghost.pos, arrival_step)
            if key not in distributions:
                distributions[key] = transition_distribution(
                    ghost.pos,
                    arrival_step,
                    obs.is_walkable,
                )
            risk += distributions[key].get(tile, 0.0)
        return risk

    def cost(_current: Point, neighbor: Point, arrival_step: int) -> float:
        return 1.0 + risk_lambda * risk_at(neighbor, arrival_step)

    return cost


def _search(obs: Observation, obstacles: Set[Point], risk_lambda: float) -> Action | None:
    scared_targets = scared_ghost_targets(obs)

    def is_walkable_for_target(pos: Point) -> bool:
        return obs.is_walkable(pos) and (
            pos not in obstacles or pos in scared_targets
        )

    target = nearest_target(obs.pacman, scared_targets or obs.targets, is_walkable_for_target)
    if target is None:
        return None

    def is_walkable(pos: Point) -> bool:
        return obs.is_walkable(pos) and (
            pos not in obstacles or (pos == target and target in scared_targets)
        )

    base_cost = _risk_cost_factory(obs, risk_lambda)

    def cost(current: Point, neighbor: Point, arrival_step: int) -> float:
        if neighbor == target and target in scared_targets:
            return 0.2
        return base_cost(current, neighbor, arrival_step)

    action = astar_first_step(
        start=obs.pacman,
        goal_test=lambda pos: pos == target,
        is_walkable=is_walkable,
        heuristic=lambda pos: manhattan(pos, target),
        cost_fn=cost,
    )
    if action in obs.legal_actions:
        return action
    return None


def select_action(observation: Dict[str, object], risk_lambda: float = 1.0) -> Action:
    obs = parse_observation(observation)
    action = _search(obs, ghost_obstacle_cells(obs), risk_lambda)
    if action is None:
        action = _search(obs, set(), risk_lambda)
    return action or greedy_legal_action(obs)
