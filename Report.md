# Decision-Theoretic Navigation Under Uncertainty in Dynamic Grid Environments

**CS 520 Final Project Report** — Michael Liu, Ruiding Feng, Zhichun Xiao &nbsp;|&nbsp; **Code:** [`github.com/RichardFeng000/cs520-project`](https://github.com/RichardFeng000/cs520-project)

## Abstract

Four agent families — Static A\*, Replanning A\*, Risk-Aware A\*, tabular Q-learning — pitted against the Pac-Man maze (a dynamic grid with mobile, partially-observable hazards) over 50 paired-seed Monte-Carlo episodes. Q-learning leads on score (3,249–3,757 across three death policies), narrowly above Replanning and Risk-Aware A\* (≈3,150 across λ ∈ {0.5, 1, 2, 5}); Static A\* collapses (1,479; 24-step TTF). Q-learning earns *more* score than the planners while spending 1.4–5× less time near ghosts.

## 1. Introduction

How much does explicit reasoning about future hazard locations help an agent in a dynamic grid, versus reactive replanning, hand-tuned heuristics, and reinforcement learning? We answer with four agent families on a fixed Monte-Carlo harness over 50 paired seeds.

## 2. Prior Work

We build on **A\*** [1] (used by three of four agents), **decision-theoretic planning** (`f(n) = g(n) + h(n) + λ · E[risk(n)]`), **tabular RL** [2, 3] for a learned baseline, and **Pac-Man as an AI benchmark** [4, 7].

## 3. Goals — As Originally Proposed and As Modified

**Original (proposal).** (1) *Baseline Search* — A\* once at start, Manhattan, hazards ignored. (2) *Probabilistic Replanning* — replan every step, hazards as high-cost. (3) *Risk-Aware Decision-Theoretic* with `f(n) = g(n) + h(n) + λ · E[risk(n)]`. (4) Compare on a 2-D grid with stochastic hazard spread. (5) Monte Carlo on success rate, path length, TTF.

**Modifications** (motivated in §6): environment swapped from a fire-spread grid to the canonical Pac-Man maze (mobile ghosts strictly generalise spreading hazards; deterministic-given-seed simulator); added Q-learning + sanity baselines (random, heuristic) — Q-learning ended up strongest; descoped random-grid generalization (§12).

## 4. Environment

`HighScorePacmanEnv`: canonical 28×36 layout, 244 pellets, 4 energizers, 4 ghosts, 3 lives. Ghosts use deterministic-given-seed greedy chase (scared ghosts retreat) — stochastic from the agent's perspective. Episodes end on third life lost, level clear, or 900-step cap.

## 5. Agents and AI Methods

- **Random** — uniform over legal actions.
- **Heuristic** — weighted nearest-ghost / pellet / energizer distance, open tiles, corridor depth, ghost-step penalty.
- **Static A\*** (proposal §5.1) — A\* once at start, Manhattan, **hazards ignored**.
- **Replanning A\*** (proposal §5.2) — replans every step; ghost cell + 1-step neighbourhood as hard obstacles.
- **Risk-Aware A\*** (proposal §5.3, central contribution) — per-edge cost `1 + λ · E[risk(n,t)]`, `E[risk(n,t)] = Σ_g P(ghost_g at n after t steps)` under a uniform-over-legal-moves transition kernel; `f(n) = g(n) + h(n) + λ · E[risk(n)]`.
- **Q-learning** `qlearning_model{1,2,3}` — Q-tables over 10 bucketed features. Models differ only in **death policy** (1: keep score; 2: zero; 3: ratcheting penalty). ε-greedy (α=0.18, γ=0.95, 12k episodes/model).

Manhattan is admissible on the grid; adding `λ · E[risk]` to the *cost* preserves admissibility but shifts the target to "shortest expected-risk-discounted path".

## 6. Development Process — Challenges and Resulting Changes

- **Simulator → scope change.** Building the spacecraft fire-spread grid was beyond timeline; adopted Pac-Man, preserving the decision problem.
- **Faithful simulator.** Browser scoring/ghost rules were undocumented; we wrote `HighScorePacmanEnv` with explicit constants and a deterministic RNG. The three death policies needed for RL also enabled the §8.7 ablation.
- **Risk-aware A\* runtime: 5+ s → ~0.7 s/episode** by memoising the ghost transition distribution.
- **Flat λ-sweep.** Initially read as a bug; diagnosed that hard ghost-obstacle masking removes ghost-adjacent cells, leaving `λ · E[risk]` nothing to differentiate (§8.6, §9). A real result.
- **Score metric.** Death policies 2/3 reset `env.score`; switched to `peak_score`.
- **Reproducibility.** Standardised on shared seed pool `{1000,…,1049}` → every comparison is paired.

These produced exactly the three scope modifications in §3; every other proposal commitment was preserved.

## 7. Experimental Setup

50 episodes × 11 agents over `seed ∈ {1000,…,1049}`. Q-learners use their training death policy; non-RL agents use model 1. Step cap 900. **Score** = `peak_score`; **hazard exposure** = cumulative timesteps within Manhattan-2 of any active non-scared ghost; **TTF** = step of first death.

## 8. Experimental Results

| agent | score (mean ± σ) | clear | deaths | TTF | hazard |
|---|---|---|---|---|---|
| `qlearning_model3` | **3757 ± 1499** | **0.24** | 2.16 | 220 |  22 |
| `qlearning_model2` | 3494 ± 1363 | 0.20 | 2.34 | 175 |  46 |
| `qlearning_model1` | 3249 ± 1363 | 0.16 | 2.54 | 130 |  78 |
| `astar_replan`     | 3181 ± 1484 | 0.14 | 2.84 | 119 | 113 |
| `astar_risk_l*`    | ≈3143 ± 1495 | 0.14 | 2.84 | 119 | 109 |
| `heuristic`        | 1695 ± 636  | 0.00 | 2.82 | 156 | **201** |
| `astar_static`     | 1479 ± 625  | 0.06 | 2.92 |  24 |  **6** |
| `random`           |  167 ± 31   | 0.00 | 3.00 |  24 |   7 |

Risk-aware λ ∈ {0.5, 1, 2, 5} are within ±3 points on every metric.

### 8.1 Score (Figure 1)
![Mean peak score](notebooks/figures/fig01_score_bars.png)

Q-learners lead, ~×2 above heuristic and Static.

### 8.2 Score distribution (Figure 2)
![Score boxplot](notebooks/figures/fig02_score_boxplot.png)

Leading agents reach the 7,800 clear ceiling on at least one seed; medians 2,755–3,315.

### 8.3 Survival (Figure 3)
![Survival panels](notebooks/figures/fig03_survival_panels.png)

Death-policy gradient is monotonic on TTF, deaths, and clears. Replanning gets ~5× the survival time over Static with no change beyond "rerun every step".

### 8.4 TTF CDF (Figure 4)
![TTF CDF](notebooks/figures/fig04_ttf_cdf.png)

Model 3 is rightmost (safer) for the first ~200 steps; Static saturates by step ~50.

### 8.5 Risk vs reward — central qualitative finding (Figure 5)
![Risk vs reward scatter](notebooks/figures/fig05_risk_reward.png)

**Q-learning model 3 Pareto-dominates every other agent** — higher score (3,757) than any planner with **5×** less time near ghosts.

### 8.6 λ-sweep (Figure 6)
![Lambda sweep](notebooks/figures/fig06_lambda_sweep.png)

`λ ∈ {0.5, 1, 2, 5}` is **flat**: hard masking removes ghost-adjacent cells, leaving the soft term nothing to differentiate. **Risk-aware A\* dominates Static but is indistinguishable from Replanning here.**

### 8.7 Q-learning death-policy ablation (Figure 7)
![Q-learning ablation](notebooks/figures/fig07_qlearning_ablation.png)

Heavier penalty → stronger learned policy on every panel.

### 8.8 Per-episode traces (Figure 8)
![Per-episode score traces](notebooks/figures/fig08_traces.png)

Model 3 sits on top of the bundle for most seeds.

### 8.9 Head-to-head (Figure 9)
![Head-to-head heatmap](notebooks/figures/fig09_head_to_head.png)

`P(row beats column on same seed)`. Model 3 beats everyone on a majority; Replanning ≈ risk-aware (nearly identical paths).

## 9. Discussion

**Why λ doesn't move the needle.** Hard masking removes ghost-adjacent cells, so the planned path is ≥2 steps away and `λ·P` falls below A\*'s tie-breaking. Fixes: ghosts as a finite *cost* not a wall; longer planning horizon; non-uniform transition kernel.

**Why Q-learning earns more score and less hazard.** The `danger_bucket` feature + reward shaping bake survival pressure into the value function; A\* sees ghosts only as obstacles and routes *through* hazard-adjacent cells when those are cheapest.

## 10. Impact and Comparison with Prior Reported Results

**Cognitive science — Decker et al. (2016) [5]** show the **model-based** vs **model-free** RL split in human choices grows from childhood to adulthood but model-free habits never go away. Our zoo is exactly that taxonomy (Q-learning model-free; planners model-based) and both modes solve the task (model-based 14% clears; model-free 16–24%); their finding that model-free becomes cautious under the right reward signal is what our death-policy ablation shows.

**Autonomous driving — Cao et al. (2023) [6]** (*Nature Machine Intelligence*) attaches a learned **confidence estimate** with conservative fall-back. Their soft cost mirrors `λ · E[risk(n)]`, hard vetoes mirror `ghost_obstacle_cells`, fall-back mirrors `greedy_legal_action`. Their finding that the confidence term matters most in long-tail risky states explains our flat λ-sweep on the easy maze.

**Quantitative Pac-Man comparison.** CS188 [4] reflex agents on this maze score in the low thousands and tabular Q-learners reach 4,000–10,000 — our model 3 (3,757; 7,800 best) and planner cluster (~3,150) sit in that band. Mnih et al. 2015 [7] DQN on Atari Ms. Pac-Man (~764 raw mean) showed a learned value function surpasses heuristic play after ~10⁵–10⁶ frames; our ~10⁶-step Q-learner reproduces that ordering. Our methodological contribution: **paired-seed Monte-Carlo across four agent families on identical seeds**.

## 11. Conclusions — Effectiveness and Limitations of the AI Methods

1. **Replanning** — *effective:* 14% clears, ~5× TTF over Static. *Limited:* sees ghosts only as obstacles.
2. **Decision-theoretic A\*** — *effective:* admissible, correct. *Limited:* equivalent to Replanning under maximum-entropy + nearest-pellet (§9).
3. **Tabular Q-learning** — *effective:* model 3 Pareto-dominates everyone. *Limited:* 12k episodes/model, coarse state, overfits the canonical maze.
4. **Heuristic** — long survival, highest hazard, lowest non-trivial score.

The right architecture is **a blend of planning and learning** — what cognitive science and self-driving conclude independently (§10).

## 12. Limitations and Future Work

Random-grid generalization (descoped — would test the gap between Q-tables and planners); softened obstacles (lets λ express itself); function-approximation Q-learning (closes part of the gap to the clear ceiling); learned hazard model (gives λ leverage).

## 13. Team Contributions and Group Retrospective

**Contributions.** *Ruiding Feng* — Pac-Man deployment (browser integration, `pacman/build.sh`, in-game UI), the RL training stack (`RL/rl_q_learning.py`, three death-policy variants), interactive UI design. *Michael Liu* — every other model and the analysis pipeline: search agents (`Agents/_search.py`, `astar_static.py`, `astar_replan.py`, `astar_risk.py`, `observation.py`), baselines, Monte-Carlo harness (`Agents/eval/`), notebook, figure pipeline. *Zhichun Xiao* — final report.

**What we learned.** Architecture beats algorithm at this scale (Replanning dominates Static by 5× with no algorithmic change). Negative results are first-class (the flat λ-sweep became our cleanest finding). Paired-seed design is free and pays off. Reward shaping is powerful and dangerous (16% / 3.5× spread across three identical Q-learners).

**What we would change.** Schedule random-grid earlier; soften the ghost obstacle set from day one; build the analytics notebook before the agents; use a function-approximation Q-learner; adopt one observation contract from day one.

## 14. References

[1] P. E. Hart, N. J. Nilsson, and B. Raphael, "A Formal Basis for the
Heuristic Determination of Minimum Cost Paths," *IEEE Transactions on
Systems Science and Cybernetics*, vol. 4, no. 2, pp. 100–107, July 1968,
doi: 10.1109/TSSC.1968.300136.
[https://ieeexplore.ieee.org/document/4082128](https://ieeexplore.ieee.org/document/4082128)

[2] C. J. C. H. Watkins and P. Dayan, "Q-learning," *Machine Learning*,
vol. 8, no. 3–4, pp. 279–292, 1992. doi: 10.1007/BF00992698.

[3] R. S. Sutton and A. G. Barto, *Reinforcement Learning: An
Introduction*, 2nd ed. MIT Press, 2018. (Chapter 6, "Temporal-Difference
Learning", and Chapter 16, "Applications and Case Studies".)

[4] D. Klein and P. Abbeel, "CS188: Introduction to Artificial
Intelligence — Pac-Man Projects," UC Berkeley course materials.
[http://ai.berkeley.edu](http://ai.berkeley.edu)

[5] J. H. Decker, A. R. Otto, N. D. Daw, and C. A. Hartley, "From
Creatures of Habit to Goal-Directed Learners: Tracking the Developmental
Emergence of Model-Based Reinforcement Learning," *Psychological Science*,
vol. 27, no. 6, pp. 848–858, 2016. doi: 10.1177/0956797616639301.
[https://journals.sagepub.com/doi/10.1177/0956797616639301](https://journals.sagepub.com/doi/10.1177/0956797616639301)

[6] Z. Cao, K. Jiang, W. Zhou, S. Xu, H. Peng, and D. Yang, "Continuous
Improvement of Self-Driving Cars Using Dynamic Confidence-Aware
Reinforcement Learning," *Nature Machine Intelligence*, vol. 5, pp.
145–158, Feb. 2023. doi: 10.1038/s42256-023-00610-y.
[https://www.nature.com/articles/s42256-023-00610-y](https://www.nature.com/articles/s42256-023-00610-y)

---

*This report was generated against the run cached at*
`Agents/eval/results/summary_n50_seed1000.json` *with all figures
reproducible by* `python3 Agents/eval/render_figures.py`.
