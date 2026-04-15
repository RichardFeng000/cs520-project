#!/usr/bin/env python3
"""
Traditional baseline controller for Pac-Man avoidance.

This file intentionally lives outside `pacman/` so algorithm code is separated
from the browser game implementation.

Input observation format:
{
  "pacman": {"x": 10, "y": 12, "dir": "LEFT"},
  "ghosts": [{"x": 8, "y": 12, "scared": false, "active": true}],
  "pellets": [{"x": 11, "y": 12}],
  "energizers": [{"x": 1, "y": 3}],
  "walls": [[1, 1], [1, 2]],
  "width": 28,
  "height": 31,
  "legal_actions": ["UP", "LEFT", "DOWN"]
}
"""

from __future__ import annotations

import argparse
import json
import math
from collections import deque
from typing import Dict, Iterable, List, Optional, Sequence, Set, Tuple

Action = str
Point = Tuple[int, int]

ACTIONS: Sequence[Action] = ("UP", "LEFT", "DOWN", "RIGHT")
DELTAS: Dict[Action, Point] = {
    "UP": (0, -1),
    "LEFT": (-1, 0),
    "DOWN": (0, 1),
    "RIGHT": (1, 0),
}


def point_key(item: Dict[str, int]) -> Point:
    return (int(item["x"]), int(item["y"]))


def to_wall_set(raw_walls: Iterable[Iterable[int]]) -> Set[Point]:
    return {(int(x), int(y)) for x, y in raw_walls}


def manhattan(a: Point, b: Point) -> int:
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


class TraditionalAvoidancePolicy:
    def __init__(self, width: int, height: int, walls: Set[Point]) -> None:
        self.width = width
        self.height = height
        self.walls = walls

    def in_bounds(self, pos: Point) -> bool:
        return 0 <= pos[0] < self.width and 0 <= pos[1] < self.height

    def is_open(self, pos: Point) -> bool:
        return self.in_bounds(pos) and pos not in self.walls

    def next_pos(self, pos: Point, action: Action) -> Point:
        dx, dy = DELTAS[action]
        return (pos[0] + dx, pos[1] + dy)

    def open_count(self, pos: Point) -> int:
        return sum(1 for action in ACTIONS if self.is_open(self.next_pos(pos, action)))

    def corridor_depth(self, pos: Point, action: Action, limit: int = 6) -> int:
        depth = 0
        current = pos
        current_action = action
        while depth < limit:
            next_tile = self.next_pos(current, current_action)
            if not self.is_open(next_tile):
                return depth
            choices = [
                candidate
                for candidate in ACTIONS
                if candidate != self.about_face(current_action)
                and self.is_open(self.next_pos(next_tile, candidate))
            ]
            current = next_tile
            depth += 1
            if len(choices) != 1:
                return depth
            current_action = choices[0]
        return depth

    @staticmethod
    def about_face(action: Action) -> Action:
        return {
            "UP": "DOWN",
            "DOWN": "UP",
            "LEFT": "RIGHT",
            "RIGHT": "LEFT",
        }[action]

    def nearest_distance(self, start: Point, targets: Set[Point], limit: int = 40) -> float:
        if not targets:
            return math.inf
        queue = deque([(start, 0)])
        seen = {start}
        while queue:
            pos, dist = queue.popleft()
            if pos in targets and dist > 0:
                return float(dist)
            if dist >= limit:
                continue
            for action in ACTIONS:
                nxt = self.next_pos(pos, action)
                if nxt not in seen and self.is_open(nxt):
                    seen.add(nxt)
                    queue.append((nxt, dist + 1))
        return math.inf

    def ghost_metrics(self, pos: Point, ghosts: Sequence[Dict[str, object]]) -> Tuple[float, float]:
        nearest = math.inf
        pressure = 0.0
        for ghost in ghosts:
            if not ghost.get("active", True) or ghost.get("scared", False):
                continue
            ghost_pos = point_key(ghost)
            dist = float(manhattan(pos, ghost_pos))
            if pos[0] == ghost_pos[0] or pos[1] == ghost_pos[1]:
                dist -= 0.5
            nearest = min(nearest, dist)
            pressure += 1.0 / max(1.0, dist + 1.0)
        return nearest, pressure

    def score_action(
        self,
        pacman_pos: Point,
        action: Action,
        ghosts: Sequence[Dict[str, object]],
        pellets: Set[Point],
        energizers: Set[Point],
    ) -> float:
        nxt = self.next_pos(pacman_pos, action)
        if not self.is_open(nxt):
            return -1e9

        nearest_ghost, pressure = self.ghost_metrics(nxt, ghosts)
        pellet_dist = self.nearest_distance(nxt, pellets | energizers)
        energizer_dist = self.nearest_distance(nxt, energizers)
        edible_ghosts = {point_key(g) for g in ghosts if g.get("active", True) and g.get("scared", False)}
        edible_dist = self.nearest_distance(nxt, edible_ghosts)
        open_count = self.open_count(nxt)
        corridor_depth = self.corridor_depth(pacman_pos, action)

        score = 0.0
        if nearest_ghost <= 0.5:
            score -= 8000
        elif nearest_ghost <= 1.5:
            score -= 2600
        elif nearest_ghost <= 2.5:
            score -= 900

        if nearest_ghost < math.inf:
            score += min(nearest_ghost, 8.0) * 28.0
        score -= pressure * 160.0

        if nxt in pellets:
            score += 75.0
        if nxt in energizers:
            score += 180.0 if nearest_ghost < 5 else 110.0

        if pellet_dist < math.inf:
            score += max(0.0, 40.0 - pellet_dist * 5.0)
        if energizer_dist < math.inf and nearest_ghost < 6:
            score += max(0.0, 30.0 - energizer_dist * 4.0)
        if edible_dist < math.inf:
            score += max(0.0, 24.0 - edible_dist * 5.0)

        if open_count >= 3:
            score += 18.0
        if open_count <= 1 and nearest_ghost < 6:
            score -= 260.0
        if corridor_depth >= 3 and nearest_ghost < 4:
            score -= corridor_depth * 70.0

        return score

    def choose_action(self, observation: Dict[str, object]) -> Action:
        pacman = observation["pacman"]
        pacman_pos = point_key(pacman)
        ghosts = observation.get("ghosts", [])
        pellets = {point_key(item) for item in observation.get("pellets", [])}
        energizers = {point_key(item) for item in observation.get("energizers", [])}
        legal_actions = observation.get("legal_actions") or list(ACTIONS)

        ranked = [
            (
                self.score_action(pacman_pos, action, ghosts, pellets, energizers),
                action,
            )
            for action in legal_actions
        ]
        ranked.sort(reverse=True)
        return ranked[0][1]


def load_observation(path: str) -> Dict[str, object]:
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def main() -> None:
    parser = argparse.ArgumentParser(description="Choose a traditional Pac-Man avoidance action.")
    parser.add_argument("observation", help="Path to an observation JSON file.")
    args = parser.parse_args()

    observation = load_observation(args.observation)
    policy = TraditionalAvoidancePolicy(
        width=int(observation["width"]),
        height=int(observation["height"]),
        walls=to_wall_set(observation.get("walls", [])),
    )
    action = policy.choose_action(observation)
    print(action)


if __name__ == "__main__":
    main()
