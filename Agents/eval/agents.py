"""Registry of agent factories that all expose ``(env) -> action``.

Every entry returns a *callable* whose state is fresh per episode (important
for the static A* agent which caches a plan internally).
"""

from __future__ import annotations

import random
import sys
from pathlib import Path
from typing import Any, Callable, Dict, List

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from Agents import astar_replan, astar_risk  # noqa: E402
from Agents.astar_static import StaticAstarAgent  # noqa: E402
from RL.traditional_baseline import TraditionalAvoidancePolicy, to_wall_set  # noqa: E402

from .env_adapter import HighScorePacmanEnv, env_to_observation_dict
from .qlearning_agent import QLearningAgent

AgentCallable = Callable[[HighScorePacmanEnv], str]
AgentFactory = Callable[[], AgentCallable]

QTABLE_PATHS: Dict[str, Path] = {
    "qlearning_model1": REPO_ROOT / "RL" / "models" / "rl_model1_q_table.json",
    "qlearning_model2": REPO_ROOT / "RL" / "models" / "rl_model2_q_table.json",
    "qlearning_model3": REPO_ROOT / "RL" / "models" / "rl_model3_q_table.json",
}


def _wrap_observation_agent(select_fn: Callable[[Dict[str, Any]], str]) -> AgentCallable:
    def runner(env: HighScorePacmanEnv) -> str:
        return select_fn(env_to_observation_dict(env))

    return runner


def _make_static() -> AgentCallable:
    agent = StaticAstarAgent()
    return _wrap_observation_agent(agent.select_action)


def _make_replan() -> AgentCallable:
    return _wrap_observation_agent(astar_replan.select_action)


def _make_risk(risk_lambda: float = 1.0) -> AgentFactory:
    def factory() -> AgentCallable:
        def runner(env: HighScorePacmanEnv) -> str:
            return astar_risk.select_action(
                env_to_observation_dict(env),
                risk_lambda=risk_lambda,
            )

        return runner

    return factory


def _make_heuristic() -> AgentCallable:
    policy_holder: Dict[str, TraditionalAvoidancePolicy] = {}

    def runner(env: HighScorePacmanEnv) -> str:
        if "p" not in policy_holder:
            policy_holder["p"] = TraditionalAvoidancePolicy(
                width=env.width,
                height=env.height,
                walls=to_wall_set([[x, y] for (x, y) in env.wall_tiles]),
            )
        return policy_holder["p"].choose_action(env_to_observation_dict(env))

    return runner


def _make_random(seed: int = 0) -> AgentFactory:
    def factory() -> AgentCallable:
        rng = random.Random(seed)

        def runner(env: HighScorePacmanEnv) -> str:
            legal = env.legal_actions()
            return rng.choice(list(legal)) if legal else "LEFT"

        return runner

    return factory


def _make_qlearning(model_path: Path) -> AgentFactory:
    cached: Dict[str, QLearningAgent] = {}

    def factory() -> AgentCallable:
        if "agent" not in cached:
            cached["agent"] = QLearningAgent(model_path)
        agent = cached["agent"]
        return agent.select_action

    return factory


AGENT_FACTORIES: Dict[str, AgentFactory] = {
    "astar_static": _make_static,
    "astar_replan": _make_replan,
    "astar_risk_l1": _make_risk(1.0),
    "astar_risk_l05": _make_risk(0.5),
    "astar_risk_l2": _make_risk(2.0),
    "astar_risk_l5": _make_risk(5.0),
    "heuristic": _make_heuristic,
    "random": _make_random(seed=0),
    "qlearning_model1": _make_qlearning(QTABLE_PATHS["qlearning_model1"]),
    "qlearning_model2": _make_qlearning(QTABLE_PATHS["qlearning_model2"]),
    "qlearning_model3": _make_qlearning(QTABLE_PATHS["qlearning_model3"]),
}


def list_agents() -> List[str]:
    return list(AGENT_FACTORIES.keys())


def build_agent(name: str) -> AgentCallable:
    if name not in AGENT_FACTORIES:
        raise KeyError(f"unknown agent: {name!r}; available: {list(AGENT_FACTORIES)}")
    return AGENT_FACTORIES[name]()


__all__ = ["AGENT_FACTORIES", "AgentCallable", "AgentFactory", "build_agent", "list_agents"]
