#!/usr/bin/env python3
"""Render every figure from the Monte Carlo notebook to standalone PNGs.

Reads cached per-episode CSVs from ``Agents/eval/results/`` and writes plots
to ``notebooks/figures/``. Used to embed analytics in the final report.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import List

os.environ.setdefault("MPLBACKEND", "Agg")

import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[2]
RESULTS_DIR = REPO_ROOT / "Agents" / "eval" / "results"
FIGURES_DIR = REPO_ROOT / "notebooks" / "figures"
FIGURES_DIR.mkdir(parents=True, exist_ok=True)

N_EPISODES = int(os.environ.get("MC_N_EPISODES", "50"))
BASE_SEED = int(os.environ.get("MC_BASE_SEED", "1000"))
DEATH_POLICY = os.environ.get("MC_DEATH_POLICY", "model2")

MAIN_AGENTS = [
    "random",
    "heuristic",
    "astar_static",
    "astar_replan",
    "astar_risk_l1",
    "qlearning_model1",
    "qlearning_model2",
    "qlearning_model3",
]

LAMBDA_AGENTS = [
    ("astar_risk_l05", 0.5),
    ("astar_risk_l1", 1.0),
    ("astar_risk_l2", 2.0),
    ("astar_risk_l5", 5.0),
]

PALETTE = {
    "random": "#9e9e9e",
    "heuristic": "#ffb300",
    "astar_static": "#1e88e5",
    "astar_replan": "#43a047",
    "astar_risk_l1": "#8e24aa",
    "astar_risk_l05": "#ce93d8",
    "astar_risk_l2": "#6a1b9a",
    "astar_risk_l5": "#4a148c",
    "qlearning_model1": "#e53935",
    "qlearning_model2": "#fb8c00",
    "qlearning_model3": "#6d4c41",
}


def csv_path(agent: str) -> Path:
    return RESULTS_DIR / f"{agent}__n{N_EPISODES}_seed{BASE_SEED}_{DEATH_POLICY}.csv"


def load_all() -> pd.DataFrame:
    frames: List[pd.DataFrame] = []
    needed = list(dict.fromkeys(MAIN_AGENTS + [name for name, _ in LAMBDA_AGENTS]))
    for agent in needed:
        path = csv_path(agent)
        if not path.exists():
            print(f"  warn: missing {path}; skipping {agent}", file=sys.stderr)
            continue
        frames.append(pd.read_csv(path))
    if not frames:
        raise SystemExit(f"no result CSVs found in {RESULTS_DIR} for n={N_EPISODES}")
    return pd.concat(frames, ignore_index=True)


def summarize(df: pd.DataFrame) -> pd.DataFrame:
    grouped = df.groupby("agent")
    summary = pd.DataFrame({
        "episodes": grouped.size(),
        "score_mean": grouped["score"].mean(),
        "score_std": grouped["score"].std(ddof=0),
        "score_median": grouped["score"].median(),
        "score_max": grouped["score"].max(),
        "clear_rate": grouped["cleared"].mean(),
        "avg_deaths": grouped["deaths"].mean(),
        "avg_steps": grouped["steps"].mean(),
        "avg_ttf": grouped["time_to_failure"].mean(),
        "avg_hazard": grouped["hazard_exposure"].mean(),
    }).round(2)
    return summary.sort_values("score_mean", ascending=False)


def colors_for(agents):
    return [PALETTE.get(a, "#607d8b") for a in agents]


def fig_score_bars(summary: pd.DataFrame, out: Path) -> None:
    main = summary.loc[[a for a in MAIN_AGENTS if a in summary.index]]
    ordered = main.sort_values("score_mean", ascending=True)
    fig, ax = plt.subplots(figsize=(10, 5))
    ypos = np.arange(len(ordered))
    ax.barh(
        ypos,
        ordered["score_mean"],
        xerr=ordered["score_std"],
        color=colors_for(ordered.index),
        edgecolor="black",
        linewidth=0.5,
        capsize=4,
    )
    ax.scatter(
        ordered["score_max"],
        ypos,
        marker="D",
        color="black",
        s=24,
        label="best of run",
        zorder=3,
    )
    ax.set_yticks(ypos)
    ax.set_yticklabels(ordered.index)
    ax.set_xlabel("Score (peak)")
    ax.set_title(f"Mean peak score per episode (n={N_EPISODES} each)")
    ax.legend(loc="lower right")
    ax.grid(axis="x", linestyle=":", alpha=0.5)
    plt.tight_layout()
    fig.savefig(out, dpi=140, bbox_inches="tight")
    plt.close(fig)


def fig_score_box(raw: pd.DataFrame, summary: pd.DataFrame, out: Path) -> None:
    main_raw = raw[raw["agent"].isin(MAIN_AGENTS)].copy()
    order = (
        summary.loc[[a for a in MAIN_AGENTS if a in summary.index]]
        .sort_values("score_mean", ascending=False)
        .index.tolist()
    )
    groups = [main_raw.loc[main_raw["agent"] == a, "score"].values for a in order]
    fig, ax = plt.subplots(figsize=(11, 5))
    bp = ax.boxplot(
        groups,
        labels=order,
        patch_artist=True,
        showfliers=True,
        widths=0.6,
    )
    for patch, agent in zip(bp["boxes"], order):
        patch.set_facecolor(PALETTE.get(agent, "#607d8b"))
        patch.set_alpha(0.85)
    for median in bp["medians"]:
        median.set_color("black")
        median.set_linewidth(1.5)
    ax.set_ylabel("Score (peak)")
    ax.set_title(f"Score distribution per agent (n={N_EPISODES})")
    plt.xticks(rotation=20, ha="right")
    ax.grid(axis="y", linestyle=":", alpha=0.5)
    plt.tight_layout()
    fig.savefig(out, dpi=140, bbox_inches="tight")
    plt.close(fig)


def fig_survival_panels(summary: pd.DataFrame, out: Path) -> None:
    main = summary.loc[[a for a in MAIN_AGENTS if a in summary.index]]
    fig, axes = plt.subplots(1, 3, figsize=(16, 4.5))

    ord_clear = main.sort_values("clear_rate", ascending=True)
    axes[0].barh(
        ord_clear.index,
        ord_clear["clear_rate"],
        color=colors_for(ord_clear.index),
        edgecolor="black",
        linewidth=0.5,
    )
    axes[0].set_xlabel("Level-clear rate")
    axes[0].set_xlim(0, 1)
    axes[0].set_title("Level clears (higher = better)")
    axes[0].grid(axis="x", linestyle=":", alpha=0.5)

    ord_d = main.sort_values("avg_deaths", ascending=False)
    axes[1].barh(
        ord_d.index,
        ord_d["avg_deaths"],
        color=colors_for(ord_d.index),
        edgecolor="black",
        linewidth=0.5,
    )
    axes[1].set_xlabel("Avg deaths per episode")
    axes[1].set_xlim(0, 3.05)
    axes[1].set_title("Deaths (lower = better)")
    axes[1].grid(axis="x", linestyle=":", alpha=0.5)

    ord_ttf = main.sort_values("avg_ttf", ascending=True)
    axes[2].barh(
        ord_ttf.index,
        ord_ttf["avg_ttf"],
        color=colors_for(ord_ttf.index),
        edgecolor="black",
        linewidth=0.5,
    )
    axes[2].set_xlabel("Steps before first death")
    axes[2].set_title("Time-to-failure (higher = better)")
    axes[2].grid(axis="x", linestyle=":", alpha=0.5)

    plt.tight_layout()
    fig.savefig(out, dpi=140, bbox_inches="tight")
    plt.close(fig)


def fig_ttf_cdf(raw: pd.DataFrame, out: Path) -> None:
    fig, ax = plt.subplots(figsize=(10, 5.5))
    for agent in MAIN_AGENTS:
        values = np.sort(raw.loc[raw["agent"] == agent, "time_to_failure"].values)
        if len(values) == 0:
            continue
        cdf = np.arange(1, len(values) + 1) / len(values)
        ax.step(
            values,
            cdf,
            where="post",
            color=PALETTE.get(agent, "#607d8b"),
            label=agent,
            linewidth=2,
        )
    ax.set_xlabel("Steps before first death")
    ax.set_ylabel("Cumulative fraction of episodes")
    ax.set_title("Time-to-failure CDF (right = safer)")
    ax.set_ylim(0, 1.02)
    ax.grid(linestyle=":", alpha=0.5)
    ax.legend(loc="lower right", ncol=2, frameon=True)
    plt.tight_layout()
    fig.savefig(out, dpi=140, bbox_inches="tight")
    plt.close(fig)


def fig_risk_reward(raw: pd.DataFrame, out: Path) -> None:
    fig, ax = plt.subplots(figsize=(10, 6))
    for agent in MAIN_AGENTS:
        sub = raw[raw["agent"] == agent]
        ax.scatter(
            sub["hazard_exposure"],
            sub["score"],
            s=28,
            color=PALETTE.get(agent, "#607d8b"),
            alpha=0.55,
            edgecolor="white",
            linewidth=0.5,
        )
        centroid = (sub["hazard_exposure"].mean(), sub["score"].mean())
        ax.scatter(
            [centroid[0]],
            [centroid[1]],
            marker="X",
            s=180,
            color=PALETTE.get(agent, "#607d8b"),
            edgecolor="black",
            linewidth=1.2,
            label=agent,
            zorder=5,
        )
    ax.set_xlabel("Hazard exposure (cumulative steps within ghost radius 2)")
    ax.set_ylabel("Score (peak)")
    ax.set_title("Risk vs reward (X = mean per agent)")
    ax.grid(linestyle=":", alpha=0.5)
    ax.legend(loc="best", ncol=2, frameon=True)
    plt.tight_layout()
    fig.savefig(out, dpi=140, bbox_inches="tight")
    plt.close(fig)


def fig_lambda_sweep(raw: pd.DataFrame, out: Path) -> None:
    rows = []
    for name, lam in LAMBDA_AGENTS:
        sub = raw[raw["agent"] == name]
        if sub.empty:
            continue
        rows.append({
            "lambda": lam,
            "score_mean": sub["score"].mean(),
            "score_std": sub["score"].std(ddof=0),
            "clear_rate": sub["cleared"].mean(),
            "avg_ttf": sub["time_to_failure"].mean(),
            "avg_hazard": sub["hazard_exposure"].mean(),
        })
    df = pd.DataFrame(rows).sort_values("lambda")
    if df.empty:
        return

    fig, axes = plt.subplots(1, 3, figsize=(15, 4.5))
    axes[0].errorbar(
        df["lambda"], df["score_mean"], yerr=df["score_std"],
        marker="o", color="#8e24aa", capsize=4, linewidth=2,
    )
    axes[0].set_xlabel("λ")
    axes[0].set_ylabel("Score (peak)")
    axes[0].set_title("Score vs λ")
    axes[0].grid(linestyle=":", alpha=0.5)

    axes[1].plot(df["lambda"], df["avg_ttf"], marker="o", color="#1e88e5",
                 linewidth=2, label="time-to-failure")
    axes[1].plot(df["lambda"], df["avg_hazard"], marker="s", color="#e53935",
                 linewidth=2, label="hazard exposure")
    axes[1].set_xlabel("λ")
    axes[1].set_title("Survival vs λ")
    axes[1].grid(linestyle=":", alpha=0.5)
    axes[1].legend()

    axes[2].plot(df["lambda"], df["clear_rate"], marker="o", color="#43a047", linewidth=2)
    axes[2].set_xlabel("λ")
    axes[2].set_ylabel("Level-clear rate")
    axes[2].set_title("Clear rate vs λ")
    axes[2].set_ylim(0, 1)
    axes[2].grid(linestyle=":", alpha=0.5)

    plt.tight_layout()
    fig.savefig(out, dpi=140, bbox_inches="tight")
    plt.close(fig)


def fig_qlearning_ablation(summary: pd.DataFrame, out: Path) -> None:
    ql_agents = [a for a in MAIN_AGENTS if a.startswith("qlearning") and a in summary.index]
    if not ql_agents:
        return
    sub = summary.loc[ql_agents]
    metrics = ["score_mean", "clear_rate", "avg_deaths", "avg_ttf"]
    titles = ["Mean score", "Clear rate", "Avg deaths", "Avg time-to-failure"]
    fig, axes = plt.subplots(1, 4, figsize=(15, 3.6))
    for ax, metric, title in zip(axes, metrics, titles):
        ax.bar(
            sub.index,
            sub[metric],
            color=[PALETTE[a] for a in sub.index],
            edgecolor="black",
            linewidth=0.5,
        )
        ax.set_title(title)
        ax.tick_params(axis="x", rotation=15)
        ax.grid(axis="y", linestyle=":", alpha=0.5)
    plt.tight_layout()
    fig.savefig(out, dpi=140, bbox_inches="tight")
    plt.close(fig)


def fig_traces(raw: pd.DataFrame, out: Path) -> None:
    fig, ax = plt.subplots(figsize=(11, 5))
    for agent in MAIN_AGENTS:
        sub = raw[raw["agent"] == agent].sort_values("episode")
        if sub.empty:
            continue
        ax.plot(
            sub["episode"],
            sub["score"],
            marker="o",
            markersize=3,
            linewidth=1.2,
            alpha=0.85,
            color=PALETTE.get(agent, "#607d8b"),
            label=agent,
        )
    ax.set_xlabel("Episode index")
    ax.set_ylabel("Score (peak)")
    ax.set_title(f"Per-episode score traces (n={N_EPISODES})")
    ax.grid(linestyle=":", alpha=0.5)
    ax.legend(loc="best", ncol=2, frameon=True)
    plt.tight_layout()
    fig.savefig(out, dpi=140, bbox_inches="tight")
    plt.close(fig)


def fig_head_to_head(raw: pd.DataFrame, out: Path) -> None:
    pivot = raw.pivot_table(index="seed", columns="agent", values="score", aggfunc="first")
    agents_present = [a for a in MAIN_AGENTS if a in pivot.columns]
    if len(agents_present) < 2:
        return
    pivot = pivot[agents_present]
    n = len(agents_present)
    matrix = np.full((n, n), 0.5)
    for i, a in enumerate(agents_present):
        for j, b in enumerate(agents_present):
            if i == j:
                continue
            diffs = pivot[a].values - pivot[b].values
            wins = np.sum(diffs > 0)
            ties = np.sum(diffs == 0)
            total = len(diffs)
            if total > 0:
                matrix[i, j] = (wins + 0.5 * ties) / total

    fig, ax = plt.subplots(figsize=(8.5, 7))
    im = ax.imshow(matrix, cmap="RdYlGn", vmin=0, vmax=1)
    ax.set_xticks(range(n))
    ax.set_yticks(range(n))
    ax.set_xticklabels(agents_present, rotation=35, ha="right")
    ax.set_yticklabels(agents_present)
    for i in range(n):
        for j in range(n):
            text_color = "white" if abs(matrix[i, j] - 0.5) > 0.3 else "black"
            ax.text(j, i, f"{matrix[i, j]:.2f}", ha="center", va="center",
                    color=text_color, fontsize=9)
    ax.set_title("P(row beats column on same seed)")
    fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    plt.tight_layout()
    fig.savefig(out, dpi=140, bbox_inches="tight")
    plt.close(fig)


def main() -> None:
    raw = load_all()
    summary = summarize(raw)
    summary_csv = FIGURES_DIR / "summary_table.csv"
    summary.to_csv(summary_csv)
    print(f"summary -> {summary_csv}")

    fig_score_bars(summary, FIGURES_DIR / "fig01_score_bars.png")
    fig_score_box(raw, summary, FIGURES_DIR / "fig02_score_boxplot.png")
    fig_survival_panels(summary, FIGURES_DIR / "fig03_survival_panels.png")
    fig_ttf_cdf(raw, FIGURES_DIR / "fig04_ttf_cdf.png")
    fig_risk_reward(raw, FIGURES_DIR / "fig05_risk_reward.png")
    fig_lambda_sweep(raw, FIGURES_DIR / "fig06_lambda_sweep.png")
    fig_qlearning_ablation(summary, FIGURES_DIR / "fig07_qlearning_ablation.png")
    fig_traces(raw, FIGURES_DIR / "fig08_traces.png")
    fig_head_to_head(raw, FIGURES_DIR / "fig09_head_to_head.png")
    print(f"figures -> {FIGURES_DIR}")


if __name__ == "__main__":
    main()
