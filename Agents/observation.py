from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, List, Sequence, Set, Tuple

Action = str
Point = Tuple[int, int]

ACTIONS: Sequence[Action] = ("UP", "LEFT", "DOWN", "RIGHT")
DELTAS: Dict[Action, Point] = {
    "UP": (0, -1),
    "LEFT": (-1, 0),
    "DOWN": (0, 1),
    "RIGHT": (1, 0),
}


def point_key(item: Dict[str, object]) -> Point:
    return (int(item["x"]), int(item["y"]))


def points_from_pairs(raw_points: Iterable[Iterable[int]]) -> Set[Point]:
    return {(int(x), int(y)) for x, y in raw_points}


@dataclass(frozen=True)
class GhostState:
    pos: Point
    direction: Action | None
    scared: bool
    active: bool


@dataclass(frozen=True)
class Observation:
    pacman: Point
    pacman_dir: Action | None
    ghosts: Tuple[GhostState, ...]
    pellets: Set[Point]
    energizers: Set[Point]
    walls: Set[Point]
    width: int
    height: int
    legal_actions: Tuple[Action, ...]

    @property
    def targets(self) -> Set[Point]:
        return self.pellets | self.energizers

    def in_bounds(self, pos: Point) -> bool:
        return 0 <= pos[0] < self.width and 0 <= pos[1] < self.height

    def is_walkable(self, pos: Point) -> bool:
        return self.in_bounds(pos) and pos not in self.walls

    def next_pos(self, pos: Point, action: Action) -> Point:
        dx, dy = DELTAS[action]
        return (pos[0] + dx, pos[1] + dy)


def parse_observation(raw: Dict[str, object]) -> Observation:
    pacman = raw["pacman"]
    if not isinstance(pacman, dict):
        raise ValueError("observation['pacman'] must be an object")

    legal_actions = tuple(
        action for action in raw.get("legal_actions", ACTIONS) if action in ACTIONS
    )
    if not legal_actions:
        legal_actions = tuple(ACTIONS)

    ghosts: List[GhostState] = []
    for ghost in raw.get("ghosts", []):
        if not isinstance(ghost, dict):
            continue
        raw_dir = ghost.get("dir")
        direction = str(raw_dir).upper() if raw_dir is not None else None
        ghosts.append(
            GhostState(
                pos=point_key(ghost),
                direction=direction if direction in ACTIONS else None,
                scared=bool(ghost.get("scared", False)),
                active=bool(ghost.get("active", True)),
            )
        )

    return Observation(
        pacman=point_key(pacman),
        pacman_dir=str(pacman.get("dir")).upper() if pacman.get("dir") else None,
        ghosts=tuple(ghosts),
        pellets={point_key(item) for item in raw.get("pellets", [])},
        energizers={point_key(item) for item in raw.get("energizers", [])},
        walls=points_from_pairs(raw.get("walls", [])),
        width=int(raw["width"]),
        height=int(raw["height"]),
        legal_actions=legal_actions,
    )
