#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Dict

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from Agents import astar_replan, astar_risk, astar_static  # noqa: E402


def load_observation(path: str | None) -> Dict[str, object]:
    if not path or path == "-":
        return json.load(sys.stdin)
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def main() -> None:
    parser = argparse.ArgumentParser(description="Choose an action with a search-based Pac-Man agent.")
    parser.add_argument("observation", nargs="?", help="Path to observation JSON, or stdin when omitted.")
    parser.add_argument(
        "--agent",
        choices=("static", "replan", "risk", "astar_static", "astar_replan", "astar_risk"),
        default="static",
        help="Search agent to run.",
    )
    parser.add_argument(
        "--lambda",
        dest="risk_lambda",
        type=float,
        default=1.0,
        help="Risk multiplier for the risk-aware A* agent.",
    )
    args = parser.parse_args()

    observation = load_observation(args.observation)
    agent = args.agent.replace("astar_", "")
    if agent == "static":
        action = astar_static.select_action(observation)
    elif agent == "replan":
        action = astar_replan.select_action(observation)
    else:
        action = astar_risk.select_action(observation, risk_lambda=args.risk_lambda)
    print(action)


if __name__ == "__main__":
    main()
