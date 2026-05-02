from __future__ import annotations

from typing import Dict, List, Optional

from ._search import astar_path, greedy_legal_action, manhattan, nearest_target
from .observation import Action, Observation, parse_observation


class StaticAstarAgent:
    def __init__(self) -> None:
        self._plan: List[Action] = []
        self._target: Optional[tuple[int, int]] = None

    def _plan_is_valid(self, obs: Observation) -> bool:
        if not self._plan or self._target not in obs.targets:
            return False
        next_tile = obs.next_pos(obs.pacman, self._plan[0])
        return obs.is_walkable(next_tile) and self._plan[0] in obs.legal_actions

    def _replan(self, obs: Observation) -> None:
        self._plan = []
        self._target = nearest_target(obs.pacman, obs.targets, obs.is_walkable)
        if self._target is None:
            return
        self._plan = astar_path(
            start=obs.pacman,
            goal_test=lambda pos: pos == self._target,
            is_walkable=obs.is_walkable,
            heuristic=lambda pos: manhattan(pos, self._target),  # type: ignore[arg-type]
        )

    def select_action(self, observation: Dict[str, object]) -> Action:
        obs = parse_observation(observation)
        if not self._plan_is_valid(obs):
            self._replan(obs)
        if self._plan:
            return self._plan.pop(0)
        return greedy_legal_action(obs)


_DEFAULT_AGENT = StaticAstarAgent()


def select_action(observation: Dict[str, object]) -> Action:
    return _DEFAULT_AGENT.select_action(observation)
