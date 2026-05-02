"""Search-based Pac-Man agents."""

from .astar_replan import select_action as select_replan_action
from .astar_risk import select_action as select_risk_action
from .astar_static import select_action as select_static_action

__all__ = [
    "select_replan_action",
    "select_risk_action",
    "select_static_action",
]
