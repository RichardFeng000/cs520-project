"""Monte Carlo evaluation harness.

Runs N independent episodes for a given agent factory and collects per-episode
metrics (score, level-clear, time-to-failure, hazard exposure, deaths, steps).
"""

from __future__ import annotations

import csv
import json
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Callable, Dict, Iterable, List, Optional, Sequence

from .agents import AGENT_FACTORIES, AgentCallable, AgentFactory, build_agent
from .env_adapter import HighScorePacmanEnv, hazard_pressure, make_env

DEFAULT_MAX_STEPS = 900


@dataclass
class EpisodeResult:
    agent: str
    episode: int
    seed: int
    score: int  # peak score reached during the episode (death-policy-independent)
    final_score: int  # raw env.score at termination (may be reset by death policy)
    deaths: int
    steps: int
    cleared: bool
    time_to_failure: int
    hazard_exposure: int
    pellets_remaining: int
    energizers_remaining: int
    wall_time_s: float = 0.0
    notes: str = ""


@dataclass
class RunSummary:
    agent: str
    episodes: int
    avg_score: float
    median_score: float
    max_score: float
    avg_deaths: float
    avg_steps: float
    clear_rate: float
    avg_time_to_failure: float
    avg_hazard_exposure: float
    score_std: float
    wall_time_s: float
    raw: List[EpisodeResult] = field(default_factory=list)

    def to_dict(self) -> Dict[str, object]:
        payload = asdict(self)
        payload["raw"] = [asdict(row) for row in self.raw]
        return payload


def _summarize(agent: str, rows: Sequence[EpisodeResult], wall_time_s: float) -> RunSummary:
    if not rows:
        return RunSummary(
            agent=agent,
            episodes=0,
            avg_score=0.0,
            median_score=0.0,
            max_score=0.0,
            avg_deaths=0.0,
            avg_steps=0.0,
            clear_rate=0.0,
            avg_time_to_failure=0.0,
            avg_hazard_exposure=0.0,
            score_std=0.0,
            wall_time_s=wall_time_s,
            raw=[],
        )

    scores = [r.score for r in rows]
    sorted_scores = sorted(scores)
    n = len(sorted_scores)
    median = (
        sorted_scores[n // 2]
        if n % 2 == 1
        else (sorted_scores[n // 2 - 1] + sorted_scores[n // 2]) / 2.0
    )
    mean = sum(scores) / n
    var = sum((s - mean) ** 2 for s in scores) / n
    return RunSummary(
        agent=agent,
        episodes=n,
        avg_score=mean,
        median_score=float(median),
        max_score=float(max(scores)),
        avg_deaths=sum(r.deaths for r in rows) / n,
        avg_steps=sum(r.steps for r in rows) / n,
        clear_rate=sum(1 for r in rows if r.cleared) / n,
        avg_time_to_failure=sum(r.time_to_failure for r in rows) / n,
        avg_hazard_exposure=sum(r.hazard_exposure for r in rows) / n,
        score_std=var ** 0.5,
        wall_time_s=wall_time_s,
        raw=list(rows),
    )


def run_episode(
    env: HighScorePacmanEnv,
    agent_fn: AgentCallable,
    max_steps: int = DEFAULT_MAX_STEPS,
    hazard_radius: int = 2,
) -> Dict[str, object]:
    """Run a single episode and return raw metric fields (no agent/seed yet)."""
    env.reset()
    hazard = 0
    time_to_failure: Optional[int] = None
    steps = 0

    while True:
        hazard += hazard_pressure(env, radius=hazard_radius)
        action = agent_fn(env)
        result = env.step(action)
        steps += 1
        if result.life_lost and time_to_failure is None:
            time_to_failure = steps
        if result.done or steps >= max_steps:
            break

    cleared = (not env.pellets) and (not env.energizers)
    if time_to_failure is None:
        time_to_failure = steps

    return {
        "score": int(env.peak_score),
        "final_score": int(env.score),
        "deaths": int(env.deaths),
        "steps": int(steps),
        "cleared": bool(cleared),
        "time_to_failure": int(time_to_failure),
        "hazard_exposure": int(hazard),
        "pellets_remaining": len(env.pellets),
        "energizers_remaining": len(env.energizers),
    }


def run_many(
    agent_name: str,
    n_episodes: int,
    base_seed: int = 1000,
    death_policy: str = "model2",
    level: int = 1,
    max_steps: int = DEFAULT_MAX_STEPS,
    progress: Optional[Callable[[str], None]] = None,
    factory_override: Optional[AgentFactory] = None,
) -> RunSummary:
    """Run ``n_episodes`` of ``agent_name`` and return a summary + raw rows."""
    factory = factory_override or AGENT_FACTORIES[agent_name]
    rows: List[EpisodeResult] = []
    started = time.time()

    for ep in range(n_episodes):
        seed = base_seed + ep
        env = make_env(seed=seed, death_policy=death_policy, level=level)
        agent_fn = factory()
        ep_started = time.time()
        metrics = run_episode(env, agent_fn, max_steps=max_steps)
        ep_wall = time.time() - ep_started
        rows.append(
            EpisodeResult(
                agent=agent_name,
                episode=ep,
                seed=seed,
                wall_time_s=ep_wall,
                **metrics,
            )
        )
        if progress and (ep + 1) % max(1, n_episodes // 5) == 0:
            done = ep + 1
            avg = sum(r.score for r in rows) / done
            progress(f"  {agent_name}: {done}/{n_episodes} eps  avg_score={avg:.1f}")

    return _summarize(agent_name, rows, time.time() - started)


def run_all(
    agent_names: Iterable[str],
    n_episodes: int,
    base_seed: int = 1000,
    death_policy: str = "model2",
    progress: Optional[Callable[[str], None]] = None,
) -> Dict[str, RunSummary]:
    out: Dict[str, RunSummary] = {}
    for name in agent_names:
        if progress:
            progress(f"Running {name} x {n_episodes}...")
        out[name] = run_many(
            name,
            n_episodes=n_episodes,
            base_seed=base_seed,
            death_policy=death_policy,
            progress=progress,
        )
    return out


def write_csv(rows: Sequence[EpisodeResult], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        path.write_text("", encoding="utf-8")
        return
    field_names = list(asdict(rows[0]).keys())
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=field_names)
        writer.writeheader()
        for row in rows:
            writer.writerow(asdict(row))


def write_summary_json(summaries: Dict[str, RunSummary], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        name: {k: v for k, v in summary.to_dict().items() if k != "raw"}
        for name, summary in summaries.items()
    }
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")


__all__ = [
    "EpisodeResult",
    "RunSummary",
    "build_agent",
    "run_all",
    "run_episode",
    "run_many",
    "write_csv",
    "write_summary_json",
]
