"""Greedy policy that consumes a Q-table JSON exported by ``rl_q_learning.py``."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Sequence

from .env_adapter import HighScorePacmanEnv

Action = str


class QLearningAgent:
    """Loads a saved Q-table and acts greedily in the live simulator."""

    def __init__(self, qtable_path: Path | str) -> None:
        path = Path(qtable_path)
        with path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)

        self.actions: List[Action] = list(payload.get("actions", ["UP", "LEFT", "DOWN", "RIGHT"]))
        self.q: Dict[str, Dict[Action, float]] = payload.get("q_table", {})
        self.feature_order: List[str] = list(payload.get("feature_order", []))
        self.death_policy: str = payload.get("stats", {}).get("death_policy", "unknown")
        self.path = path

    @staticmethod
    def _state_key(state: Sequence[int]) -> str:
        return "|".join(str(value) for value in state)

    def select_action(self, env: HighScorePacmanEnv) -> Action:
        state = env.observe()
        legal = env.legal_actions()
        if not legal:
            return self.actions[0]
        values = self.q.get(self._state_key(state))
        if not values:
            return legal[0]
        return max(legal, key=lambda action: values.get(action, 0.0))


__all__ = ["QLearningAgent"]
