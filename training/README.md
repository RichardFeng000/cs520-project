# External Training Code

This directory is outside `pacman/` on purpose.

Files:

- `traditional_baseline.py`: heuristic baseline controller. This is the traditional rule-based method.
- `rl_q_learning.py`: high-score Q-learning trainer that exports both JSON and a browser JS model.

Examples:

```bash
python3 training/traditional_baseline.py path/to/observation.json
python3 training/rl_q_learning.py --episodes 12000 --output training/rl_q_table.json --js-output training/rl_model.generated.js
cd pacman && bash build.sh
```

Notes:

- The traditional baseline is not a learned model. It is the classic hand-designed controller.
- The RL script now optimizes for score before level clear, not just survival.
- `training/rl_model.generated.js` is automatically embedded into `pacman.js` by `pacman/build.sh` when the file exists.
- The in-game `RL` button will use the external trained model when available, and fall back to the internal heuristic otherwise.
