from __future__ import annotations

import heapq
import math
from collections import defaultdict, deque
from typing import Callable, Dict, Iterable, List, Mapping, Optional, Set, Tuple

from .observation import ACTIONS, DELTAS, Action, GhostState, Observation, Point

CostFn = Callable[[Point, Point, int], float]
GoalTest = Callable[[Point], bool]
WalkableTest = Callable[[Point], bool]


def manhattan(a: Point, b: Point) -> int:
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


def next_pos(pos: Point, action: Action) -> Point:
    dx, dy = DELTAS[action]
    return (pos[0] + dx, pos[1] + dy)


def ordered_neighbors(pos: Point) -> Iterable[Tuple[Action, Point]]:
    for action in ACTIONS:
        yield action, next_pos(pos, action)


def legal_neighbors(pos: Point, is_walkable: WalkableTest) -> Iterable[Tuple[Action, Point]]:
    for action, neighbor in ordered_neighbors(pos):
        if is_walkable(neighbor):
            yield action, neighbor


def nearest_target(
    start: Point,
    targets: Set[Point],
    is_walkable: WalkableTest,
) -> Optional[Point]:
    if not targets:
        return None

    queue = deque([start])
    visited = {start}
    while queue:
        current = queue.popleft()
        if current in targets and current != start:
            return current
        for _, neighbor in legal_neighbors(current, is_walkable):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    return None


def bfs_distance(
    start: Point,
    goal_test: GoalTest,
    is_walkable: WalkableTest,
    limit: Optional[int] = None,
) -> float:
    queue = deque([(start, 0)])
    visited = {start}
    while queue:
        current, dist = queue.popleft()
        if goal_test(current) and dist > 0:
            return float(dist)
        if limit is not None and dist >= limit:
            continue
        for _, neighbor in legal_neighbors(current, is_walkable):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, dist + 1))
    return math.inf


def astar_first_step(
    start: Point,
    goal_test: GoalTest,
    is_walkable: WalkableTest,
    heuristic: Callable[[Point], float],
    cost_fn: Optional[CostFn] = None,
    max_nodes: int = 2000,
) -> Optional[Action]:
    path = astar_path(
        start=start,
        goal_test=goal_test,
        is_walkable=is_walkable,
        heuristic=heuristic,
        cost_fn=cost_fn,
        max_nodes=max_nodes,
    )
    return path[0] if path else None


def astar_path(
    start: Point,
    goal_test: GoalTest,
    is_walkable: WalkableTest,
    heuristic: Callable[[Point], float],
    cost_fn: Optional[CostFn] = None,
    max_nodes: int = 2000,
) -> List[Action]:
    if goal_test(start):
        return []

    if cost_fn is None:
        cost_fn = lambda _current, _neighbor, _arrival: 1.0

    counter = 0
    open_heap: List[Tuple[float, float, int, Point]] = [(heuristic(start), 0.0, counter, start)]
    came_from: Dict[Point, Tuple[Point, Action]] = {}
    g_score: Dict[Point, float] = {start: 0.0}
    step_count: Dict[Point, int] = {start: 0}
    expanded = 0

    while open_heap and expanded < max_nodes:
        _, current_cost, _, current = heapq.heappop(open_heap)
        if current_cost > g_score.get(current, math.inf):
            continue

        if goal_test(current):
            path: List[Action] = []
            while current != start:
                previous, action = came_from[current]
                path.append(action)
                current = previous
            path.reverse()
            return path

        expanded += 1
        for action, neighbor in legal_neighbors(current, is_walkable):
            arrival_step = step_count[current] + 1
            tentative = g_score[current] + cost_fn(current, neighbor, arrival_step)
            if tentative >= g_score.get(neighbor, math.inf):
                continue
            came_from[neighbor] = (current, action)
            g_score[neighbor] = tentative
            step_count[neighbor] = arrival_step
            counter += 1
            heapq.heappush(
                open_heap,
                (tentative + heuristic(neighbor), tentative, counter, neighbor),
            )

    return []


def greedy_legal_action(obs: Observation, preferred_targets: Optional[Set[Point]] = None) -> Action:
    targets = preferred_targets or obs.targets
    best_action = obs.legal_actions[0]
    best_score = math.inf
    for action in obs.legal_actions:
        candidate = obs.next_pos(obs.pacman, action)
        if not obs.is_walkable(candidate):
            continue
        score = min((manhattan(candidate, target) for target in targets), default=0)
        if score < best_score:
            best_score = score
            best_action = action
    return best_action


def ghost_obstacle_cells(obs: Observation) -> Set[Point]:
    obstacles: Set[Point] = set()
    for ghost in obs.ghosts:
        if not ghost.active or ghost.scared:
            continue
        obstacles.add(ghost.pos)
        if ghost.direction:
            obstacles.add(next_pos(ghost.pos, ghost.direction))
        else:
            for _, neighbor in legal_neighbors(ghost.pos, obs.is_walkable):
                obstacles.add(neighbor)
    return obstacles


def scared_ghost_targets(obs: Observation) -> Set[Point]:
    return {ghost.pos for ghost in obs.ghosts if ghost.active and ghost.scared}


def transition_distribution(
    start: Point,
    steps: int,
    is_walkable: WalkableTest,
) -> Mapping[Point, float]:
    current: Mapping[Point, float] = {start: 1.0}
    for _ in range(steps):
        next_dist: Dict[Point, float] = defaultdict(float)
        for pos, prob in current.items():
            neighbors = [neighbor for _, neighbor in legal_neighbors(pos, is_walkable)]
            if not neighbors:
                next_dist[pos] += prob
                continue
            share = prob / len(neighbors)
            for neighbor in neighbors:
                next_dist[neighbor] += share
        current = next_dist
    return current


def expected_ghost_risk(
    tile: Point,
    arrival_step: int,
    ghosts: Iterable[GhostState],
    is_walkable: WalkableTest,
) -> float:
    risk = 0.0
    for ghost in ghosts:
        if not ghost.active or ghost.scared:
            continue
        risk += transition_distribution(ghost.pos, arrival_step, is_walkable).get(tile, 0.0)
    return risk
