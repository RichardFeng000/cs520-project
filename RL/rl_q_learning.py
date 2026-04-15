#!/usr/bin/env python3
"""
External high-score RL trainer for Pac-Man.

This trainer is intentionally outside `pacman/`. It learns on an approximation
of the original Pac-Man level-1 scoring rules, exports a JSON Q-table, and can
also emit a browser-consumable JS model file that the game can embed.
"""

from __future__ import annotations

import argparse
import json
import math
import random
from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import Deque, Dict, Iterable, List, Optional, Sequence, Set, Tuple

Action = str
Point = Tuple[int, int]
State = Tuple[int, int, int, int, int, int, int, int, int, int]

ACTIONS: Sequence[Action] = ("UP", "LEFT", "DOWN", "RIGHT")
DELTAS: Dict[Action, Point] = {
    "UP": (0, -1),
    "LEFT": (-1, 0),
    "DOWN": (0, 1),
    "RIGHT": (1, 0),
}
ABOUT_FACE: Dict[Action, Action] = {
    "UP": "DOWN",
    "DOWN": "UP",
    "LEFT": "RIGHT",
    "RIGHT": "LEFT",
}

FEATURE_ORDER = [
    "dir_enum",
    "danger_bucket",
    "edible_bucket",
    "pellet_bucket",
    "energizer_bucket",
    "fruit_bucket",
    "scared_bucket",
    "open_count",
    "corridor_bucket",
    "phase_bucket",
]

PACMAN_ROWS: Sequence[str] = (
    "____________________________",
    "____________________________",
    "____________________________",
    "||||||||||||||||||||||||||||",
    "|............||............|",
    "|.||||.|||||.||.|||||.||||.|",
    "|o||||.|||||.||.|||||.||||o|",
    "|.||||.|||||.||.|||||.||||.|",
    "|..........................|",
    "|.||||.||.||||||||.||.||||.|",
    "|.||||.||.||||||||.||.||||.|",
    "|......||....||....||......|",
    "||||||.||||| || |||||.||||||",
    "_____|.||||| || |||||.|_____",
    "_____|.||          ||.|_____",
    "_____|.|| |||--||| ||.|_____",
    "||||||.|| |______| ||.||||||",
    "      .   |______|   .      ",
    "||||||.|| |______| ||.||||||",
    "_____|.|| |||||||| ||.|_____",
    "_____|.||          ||.|_____",
    "_____|.|| |||||||| ||.|_____",
    "||||||.|| |||||||| ||.||||||",
    "|............||............|",
    "|.||||.|||||.||.|||||.||||.|",
    "|.||||.|||||.||.|||||.||||.|",
    "|o..||.......  .......||..o|",
    "|||.||.||.||||||||.||.||.|||",
    "|||.||.||.||||||||.||.||.|||",
    "|......||....||....||......|",
    "|.||||||||||.||.||||||||||.|",
    "|.||||||||||.||.||||||||||.|",
    "|..........................|",
    "||||||||||||||||||||||||||||",
    "____________________________",
    "____________________________",
)

PACMAN_START: Point = (13, 26)
FRUIT_TILE: Point = (13, 20)
GHOST_SPAWNS: Sequence[Point] = (
    (12, 14),
    (13, 14),
    (14, 14),
    (15, 14),
)
GHOST_START_DIRS: Sequence[Action] = ("LEFT", "LEFT", "RIGHT", "RIGHT")
ENERGIZER_DURATION = 36
FRUIT_DURATION = 40
FRUIT_THRESHOLDS = (70, 170)
START_LIVES = 3
DEATH_RESET_EXTRA_PENALTY = 300
MODEL3_DEATH_RATIOS = (0.30, 0.60, 1.00)
MODEL3_DEATH_FLOORS = (200, 600, 1200)
MODEL3_PREVIOUS_RESET_MULTIPLIER = 1.25
FRUIT_POINTS_BY_LEVEL = {
    1: 100,
    2: 300,
    3: 500,
    4: 500,
    5: 700,
    6: 700,
    7: 1000,
    8: 1000,
    9: 2000,
    10: 2000,
    11: 3000,
    12: 3000,
}


def dir_to_enum(action: Action) -> int:
    return {"UP": 0, "LEFT": 1, "DOWN": 2, "RIGHT": 3}[action]


def add_points(a: Point, b: Point) -> Point:
    return (a[0] + b[0], a[1] + b[1])


def manhattan(a: Point, b: Point) -> int:
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


def bucket_distance(distance: float, max_bucket: int) -> int:
    if math.isinf(distance):
        return max_bucket
    return min(max_bucket, max(0, int(distance)))


@dataclass
class Ghost:
    pos: Point
    direction: Action
    scared_timer: int = 0
    respawn_timer: int = 0

    @property
    def scared(self) -> bool:
        return self.scared_timer > 0 and self.respawn_timer == 0

    @property
    def active(self) -> bool:
        return self.respawn_timer == 0


@dataclass
class StepResult:
    reward: float
    done: bool
    score_delta: int
    life_lost: bool = False


class HighScorePacmanEnv:
    def __init__(self, level: int = 1, seed: int = 7, death_policy: str = "model2") -> None:
        self.level = level
        self.random = random.Random(seed)
        self.death_policy = death_policy
        self.width = len(PACMAN_ROWS[0])
        self.height = len(PACMAN_ROWS)
        self.floor_tiles: Set[Point] = set()
        self.wall_tiles: Set[Point] = set()
        self.initial_pellets: Set[Point] = set()
        self.initial_energizers: Set[Point] = set()
        self.neighbors: Dict[Point, List[Action]] = {}
        self.shortest_paths: Dict[Point, Dict[Point, int]] = {}
        self._parse_layout()
        self._precompute_shortest_paths()
        self.reset()

    def _parse_layout(self) -> None:
        for y, row in enumerate(PACMAN_ROWS):
            for x, char in enumerate(row):
                pos = (x, y)
                if char in (".", "o", " "):
                    self.floor_tiles.add(pos)
                else:
                    self.wall_tiles.add(pos)
                if char == ".":
                    self.initial_pellets.add(pos)
                elif char == "o":
                    self.initial_energizers.add(pos)
        for pos in self.floor_tiles:
            actions = []
            for action, delta in DELTAS.items():
                nxt = add_points(pos, delta)
                if nxt in self.floor_tiles:
                    actions.append(action)
            self.neighbors[pos] = actions

    def _precompute_shortest_paths(self) -> None:
        for origin in self.floor_tiles:
            distances: Dict[Point, int] = {origin: 0}
            queue: Deque[Point] = deque([origin])
            while queue:
                current = queue.popleft()
                for action in self.neighbors[current]:
                    nxt = add_points(current, DELTAS[action])
                    if nxt not in distances:
                        distances[nxt] = distances[current] + 1
                        queue.append(nxt)
            self.shortest_paths[origin] = distances

    def reset(self) -> State:
        self.pellets = set(self.initial_pellets)
        self.energizers = set(self.initial_energizers)
        self.score = 0
        self.peak_score = 0
        self.last_death_reset_score: Optional[int] = None
        self.lives_left = START_LIVES
        self.deaths = 0
        self.dots_eaten = 0
        self.ghost_combo = 0
        self.fruit_present = False
        self.fruit_timer = 0
        self.spawned_fruit_thresholds: Set[int] = set()
        self.captured_fruit_thresholds: Set[int] = set()
        self.steps = 0
        self.reset_positions()
        return self.observe()

    def reset_positions(self) -> None:
        self.pacman = PACMAN_START
        self.pacman_dir = "LEFT"
        self.ghosts = [
            Ghost(pos=spawn, direction=direction)
            for spawn, direction in zip(GHOST_SPAWNS, GHOST_START_DIRS)
        ]
        self.ghost_combo = 0
        self.fruit_present = False
        self.fruit_timer = 0

    def fruit_points(self) -> int:
        if self.level > 12:
            return 5000
        return FRUIT_POINTS_BY_LEVEL.get(self.level, 5000)

    def sync_peak_score(self) -> None:
        if self.score > self.peak_score:
            self.peak_score = self.score

    def legal_actions(self, pos: Optional[Point] = None) -> List[Action]:
        return list(self.neighbors[pos or self.pacman])

    def shortest_distance(self, origin: Point, targets: Iterable[Point]) -> float:
        targets = list(targets)
        if not targets:
            return math.inf
        distances = self.shortest_paths[origin]
        best = math.inf
        for target in targets:
            dist = distances.get(target)
            if dist is not None and dist < best:
                best = dist
        return float(best)

    def open_count(self, pos: Point) -> int:
        return len(self.neighbors[pos])

    def corridor_depth(self, pos: Point, action: Action, limit: int = 6) -> int:
        depth = 0
        current = pos
        current_action = action
        while depth < limit:
            nxt = add_points(current, DELTAS[current_action])
            if nxt not in self.floor_tiles:
                return depth
            choices = [
                candidate
                for candidate in self.neighbors[nxt]
                if candidate != ABOUT_FACE[current_action]
            ]
            current = nxt
            depth += 1
            if len(choices) != 1:
                return depth
            current_action = choices[0]
        return depth

    def nearest_threat(self) -> float:
        threat_positions = [ghost.pos for ghost in self.ghosts if ghost.active and not ghost.scared]
        if not threat_positions:
            return math.inf
        return min(manhattan(self.pacman, pos) for pos in threat_positions)

    def threat_pressure(self) -> float:
        pressure = 0.0
        for ghost in self.ghosts:
            if not ghost.active or ghost.scared:
                continue
            dist = float(manhattan(self.pacman, ghost.pos))
            if self.pacman[0] == ghost.pos[0] or self.pacman[1] == ghost.pos[1]:
                dist -= 0.5
            pressure += 1.0 / max(1.0, dist + 1.0)
        return pressure

    def nearest_edible(self) -> float:
        edible_positions = [ghost.pos for ghost in self.ghosts if ghost.active and ghost.scared]
        if not edible_positions:
            return math.inf
        return min(manhattan(self.pacman, pos) for pos in edible_positions)

    def fruit_bucket(self) -> int:
        if not self.fruit_present:
            return 9
        return bucket_distance(self.shortest_distance(self.pacman, [FRUIT_TILE]), 8)

    def phase_bucket(self) -> int:
        dots_left = len(self.pellets) + len(self.energizers)
        if self.dots_eaten < 70:
            return 0
        if self.dots_eaten < 170:
            return 1
        if dots_left > 20:
            return 2
        return 3

    def observe(self) -> State:
        current_dir = self.pacman_dir if self.pacman_dir in ACTIONS else "LEFT"
        scared_bucket = min(5, max((ghost.scared_timer for ghost in self.ghosts), default=0) // 6)
        pellet_dist = self.shortest_distance(self.pacman, self.pellets | self.energizers)
        energizer_dist = self.shortest_distance(self.pacman, self.energizers)
        corridor = self.corridor_depth(self.pacman, current_dir) if current_dir in self.legal_actions() else 0
        return (
            dir_to_enum(current_dir),
            bucket_distance(self.nearest_threat(), 6),
            bucket_distance(self.nearest_edible(), 6),
            bucket_distance(pellet_dist, 8),
            bucket_distance(energizer_dist, 8),
            self.fruit_bucket(),
            scared_bucket,
            self.open_count(self.pacman),
            min(3, corridor),
            self.phase_bucket(),
        )

    def state_key(self, state: State) -> str:
        return "|".join(str(value) for value in state)

    def move_ghost(self, ghost: Ghost) -> None:
        if ghost.respawn_timer > 0:
            ghost.respawn_timer -= 1
            if ghost.respawn_timer == 0:
                ghost.pos = GHOST_SPAWNS[0]
                ghost.direction = "LEFT"
            return

        legal = self.neighbors[ghost.pos]
        if not legal:
            return

        choices = legal
        if len(legal) > 1 and ABOUT_FACE[ghost.direction] in legal:
            choices = [action for action in legal if action != ABOUT_FACE[ghost.direction]]

        if ghost.scared:
            best_score = -math.inf
            best_actions: List[Action] = []
            for action in choices:
                nxt = add_points(ghost.pos, DELTAS[action])
                score = float(manhattan(nxt, self.pacman))
                if score > best_score:
                    best_score = score
                    best_actions = [action]
                elif score == best_score:
                    best_actions.append(action)
        else:
            best_score = math.inf
            best_actions = []
            for action in choices:
                nxt = add_points(ghost.pos, DELTAS[action])
                score = float(manhattan(nxt, self.pacman))
                if score < best_score:
                    best_score = score
                    best_actions = [action]
                elif score == best_score:
                    best_actions.append(action)

        action = self.random.choice(best_actions)
        ghost.pos = add_points(ghost.pos, DELTAS[action])
        ghost.direction = action

    def maybe_spawn_fruit(self) -> None:
        for threshold in FRUIT_THRESHOLDS:
            if self.dots_eaten == threshold and threshold not in self.spawned_fruit_thresholds:
                self.fruit_present = True
                self.fruit_timer = FRUIT_DURATION
                self.spawned_fruit_thresholds.add(threshold)

    def check_ghost_collision(self) -> Tuple[bool, int]:
        score_delta = 0
        for ghost in self.ghosts:
            if not ghost.active:
                continue
            if ghost.pos != self.pacman:
                continue
            if ghost.scared:
                points = 200 * (2 ** self.ghost_combo)
                score_delta += points
                self.score += points
                self.sync_peak_score()
                self.ghost_combo += 1
                ghost.scared_timer = 0
                ghost.respawn_timer = 8
                ghost.pos = GHOST_SPAWNS[0]
                ghost.direction = "LEFT"
            else:
                return True, score_delta
        return False, score_delta

    def step(self, action: Action) -> StepResult:
        previous_threat = self.nearest_threat()
        previous_edible = self.nearest_edible()
        previous_fruit_distance = self.shortest_distance(self.pacman, [FRUIT_TILE]) if self.fruit_present else math.inf

        legal = self.legal_actions()
        if action not in legal:
            action = self.pacman_dir if self.pacman_dir in legal else legal[0]

        self.steps += 1
        self.pacman_dir = action
        self.pacman = add_points(self.pacman, DELTAS[action])

        score_delta = 0
        if self.pacman in self.pellets:
            self.pellets.remove(self.pacman)
            self.score += 10
            self.sync_peak_score()
            score_delta += 10
            self.dots_eaten += 1
        elif self.pacman in self.energizers:
            self.energizers.remove(self.pacman)
            self.score += 50
            self.sync_peak_score()
            score_delta += 50
            self.dots_eaten += 1
            self.ghost_combo = 0
            for ghost in self.ghosts:
                if ghost.active:
                    ghost.scared_timer = ENERGIZER_DURATION

        self.maybe_spawn_fruit()

        if self.fruit_present and self.pacman == FRUIT_TILE:
            fruit_points = self.fruit_points()
            self.score += fruit_points
            self.sync_peak_score()
            score_delta += fruit_points
            self.fruit_present = False
            self.fruit_timer = 0
            self.captured_fruit_thresholds.add(self.dots_eaten)

        dead, eaten_points = self.check_ghost_collision()
        score_delta += eaten_points
        if dead:
            return self.handle_death(score_delta)

        for ghost in self.ghosts:
            self.move_ghost(ghost)

        dead, eaten_points = self.check_ghost_collision()
        score_delta += eaten_points
        if dead:
            return self.handle_death(score_delta)

        for ghost in self.ghosts:
            if ghost.scared_timer > 0:
                ghost.scared_timer -= 1

        if self.fruit_present:
            self.fruit_timer -= 1
            if self.fruit_timer <= 0:
                self.fruit_present = False
                self.fruit_timer = 0

        reward = float(score_delta) - 1.0
        current_threat = self.nearest_threat()
        current_edible = self.nearest_edible()
        current_fruit_distance = self.shortest_distance(self.pacman, [FRUIT_TILE]) if self.fruit_present else math.inf

        if previous_threat < 6 and current_threat > previous_threat:
            reward += 1.5
        if previous_edible < math.inf and current_edible < previous_edible:
            reward += 3.0
        if previous_fruit_distance < math.inf and current_fruit_distance < previous_fruit_distance:
            reward += 2.0
        reward -= self.threat_pressure() * 0.5

        if not self.pellets and not self.energizers:
            reward += 500.0
            return StepResult(reward=reward, done=True, score_delta=score_delta)

        if self.steps >= 900:
            reward -= 250.0
            return StepResult(reward=reward, done=True, score_delta=score_delta)

        return StepResult(reward=reward, done=False, score_delta=score_delta)

    def handle_death(self, score_delta: int) -> StepResult:
        score_before_reset = self.score
        self.deaths += 1
        self.lives_left -= 1
        self.score = self.compute_death_reset_score()
        reward = float(score_delta) - 1200.0 - float(score_before_reset - self.score) - DEATH_RESET_EXTRA_PENALTY
        if self.lives_left <= 0:
            return StepResult(reward=reward, done=True, score_delta=score_delta, life_lost=True)

        self.reset_positions()
        return StepResult(reward=reward, done=False, score_delta=score_delta, life_lost=True)

    def compute_death_reset_score(self) -> int:
        if self.death_policy == "model1":
            self.last_death_reset_score = self.score
            return self.score

        if self.death_policy == "model2":
            self.last_death_reset_score = 0
            return 0

        if self.death_policy == "model3":
            death_index = min(self.deaths - 1, len(MODEL3_DEATH_RATIOS) - 1)
            ratio = MODEL3_DEATH_RATIOS[death_index]
            floor_value = MODEL3_DEATH_FLOORS[death_index]
            candidate = -int(math.ceil(max(floor_value, ratio * float(self.peak_score))))
            if self.last_death_reset_score is not None and self.last_death_reset_score < 0:
                previous_bound = int(math.floor(self.last_death_reset_score * MODEL3_PREVIOUS_RESET_MULTIPLIER))
                candidate = min(candidate, previous_bound)
            candidate = min(candidate, -1)
            self.last_death_reset_score = candidate
            return candidate

        raise ValueError(f"unknown death policy: {self.death_policy}")


class QLearner:
    def __init__(self, alpha: float, gamma: float, epsilon: float) -> None:
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon
        self.q: Dict[str, Dict[Action, float]] = {}

    @staticmethod
    def state_key(state: State) -> str:
        return "|".join(str(value) for value in state)

    def ensure_state(self, state: State) -> Dict[Action, float]:
        key = self.state_key(state)
        if key not in self.q:
            self.q[key] = {action: 0.0 for action in ACTIONS}
        return self.q[key]

    def choose_action(self, state: State, legal_actions: Sequence[Action]) -> Action:
        values = self.ensure_state(state)
        if random.random() < self.epsilon:
            return random.choice(list(legal_actions))
        return max(legal_actions, key=lambda action: values[action])

    def greedy_action(self, state: State, legal_actions: Sequence[Action]) -> Action:
        values = self.ensure_state(state)
        return max(legal_actions, key=lambda action: values[action])

    def update(
        self,
        state: State,
        action: Action,
        reward: float,
        next_state: State,
        next_legal_actions: Sequence[Action],
        done: bool,
    ) -> None:
        state_values = self.ensure_state(state)
        target = reward
        if not done:
            next_values = self.ensure_state(next_state)
            target += self.gamma * max(next_values[action_name] for action_name in next_legal_actions)
        state_values[action] += self.alpha * (target - state_values[action])

    def export_json(self, path: Path, level: int, stats: Dict[str, float]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "algorithm": "tabular-q-learning",
            "objective": "maximize_score_before_level_clear",
            "level": level,
            "actions": list(ACTIONS),
            "feature_order": FEATURE_ORDER,
            "stats": stats,
            "q_table": self.q,
        }
        path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")

    def export_js(self, path: Path, level: int, stats: Dict[str, float]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "algorithm": "tabular-q-learning",
            "objective": "maximize_score_before_level_clear",
            "level": level,
            "actions": list(ACTIONS),
            "feature_order": FEATURE_ORDER,
            "stats": stats,
            "q_table": self.q,
        }
        path.write_text(
            "window.__PACMAN_RL_MODEL__ = " + json.dumps(payload, sort_keys=True) + ";\n",
            encoding="utf-8",
        )


def run_training_episode(env: HighScorePacmanEnv, learner: QLearner) -> Tuple[int, int]:
    state = env.reset()
    done = False
    total_reward = 0
    while not done:
        legal = env.legal_actions()
        action = learner.choose_action(state, legal)
        result = env.step(action)
        next_state = env.observe()
        learner.update(state, action, result.reward, next_state, env.legal_actions(), result.done)
        total_reward += int(result.reward)
        state = next_state
        done = result.done
    return env.score, total_reward


def evaluate(env: HighScorePacmanEnv, learner: QLearner, episodes: int) -> Dict[str, float]:
    scores: List[int] = []
    deaths: List[int] = []
    clears = 0
    for _ in range(episodes):
        state = env.reset()
        done = False
        while not done:
            action = learner.greedy_action(state, env.legal_actions())
            result = env.step(action)
            state = env.observe()
            done = result.done
        scores.append(env.score)
        deaths.append(env.deaths)
        if not env.pellets and not env.energizers:
            clears += 1
    return {
        "eval_episodes": float(episodes),
        "avg_score": sum(scores) / max(1, len(scores)),
        "avg_deaths": sum(deaths) / max(1, len(deaths)),
        "max_score": float(max(scores) if scores else 0),
        "clear_rate": clears / max(1, episodes),
    }


def train(
    episodes: int,
    alpha: float,
    gamma: float,
    epsilon: float,
    seed: int,
    level: int,
    eval_episodes: int,
    death_policy: str,
) -> Tuple[QLearner, Dict[str, float]]:
    random.seed(seed)
    env = HighScorePacmanEnv(level=level, seed=seed, death_policy=death_policy)
    learner = QLearner(alpha=alpha, gamma=gamma, epsilon=epsilon)
    best_score = 0
    for episode in range(episodes):
        score, _ = run_training_episode(env, learner)
        if score > best_score:
            best_score = score
        if episode and episode % max(1, episodes // 5) == 0:
            learner.epsilon *= 0.92
    stats = evaluate(env, learner, eval_episodes)
    stats["best_training_score"] = float(best_score)
    stats["death_policy"] = death_policy
    stats["episodes"] = float(episodes)
    return learner, stats


def main() -> None:
    parser = argparse.ArgumentParser(description="Train an external Pac-Man RL high-score model.")
    parser.add_argument("--episodes", type=int, default=12000)
    parser.add_argument("--alpha", type=float, default=0.18)
    parser.add_argument("--gamma", type=float, default=0.95)
    parser.add_argument("--epsilon", type=float, default=0.12)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--level", type=int, default=1)
    parser.add_argument("--eval-episodes", type=int, default=60)
    parser.add_argument("--death-policy", choices=("model1", "model2", "model3"), default="model2")
    parser.add_argument("--output", default="RL/rl_q_table.json")
    parser.add_argument("--js-output", default="RL/rl_model.generated.js")
    args = parser.parse_args()

    learner, stats = train(
        episodes=args.episodes,
        alpha=args.alpha,
        gamma=args.gamma,
        epsilon=args.epsilon,
        seed=args.seed,
        level=args.level,
        eval_episodes=args.eval_episodes,
        death_policy=args.death_policy,
    )

    json_path = Path(args.output)
    js_path = Path(args.js_output)
    learner.export_json(json_path, level=args.level, stats=stats)
    learner.export_js(js_path, level=args.level, stats=stats)

    print(f"saved q-table to {json_path}")
    print(f"saved browser model to {js_path}")
    print(json.dumps(stats, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
