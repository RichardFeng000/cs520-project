"use strict";

const pptxgen = require("pptxgenjs");
const {
  warnIfSlideHasOverlaps,
  warnIfSlideElementsOutOfBounds,
} = require("./pptxgenjs_helpers/layout");
const path = require("path");

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "Michael Liu, Ruiding Feng, Zhichun Xiao";
pptx.company = "UMass Amherst — CS 520";
pptx.subject = "Pac-Man RL Final Presentation";
pptx.title = "Decision-Theoretic Navigation Under Uncertainty";
pptx.lang = "en-US";
pptx.theme = {
  headFontFace: "Arial",
  bodyFontFace: "Arial",
  lang: "en-US",
};

const COLORS = {
  navy: "0E1A2B",
  blue: "1E88E5",
  teal: "16A085",
  gold: "F4B400",
  red: "D93025",
  purple: "8E44AD",
  ink: "1C2430",
  muted: "5F6B7A",
  light: "F6F8FB",
  softBlue: "EEF6FF",
  softTeal: "EDF9F5",
  softGold: "FFF8E7",
  softRed: "FDEEEE",
  darkBlue: "124A8C",
  darkTeal: "0F7A69",
  darkRed: "B3261E",
  white: "FFFFFF",
  line: "D9E2EC",
  glass: "0D1520",
  textSoft: "D8E2EE",
  panel: "1A2030",
};

const PACMAN_BG_SOFT = path.resolve(__dirname, "images/pacman_neon_bg.png");
const FIG_SCORE_BARS = path.resolve(
  __dirname,
  "../notebooks/figures/fig01_score_bars.png"
);
const FIG_SURVIVAL = path.resolve(
  __dirname,
  "../notebooks/figures/fig03_survival_panels.png"
);
const FIG_RISK_REWARD = path.resolve(
  __dirname,
  "../notebooks/figures/fig05_risk_reward.png"
);
const FIG_QL_ABLATION = path.resolve(
  __dirname,
  "../notebooks/figures/fig07_qlearning_ablation.png"
);

// ============================================================
// Layout helpers
// ============================================================

function addPacmanBackground(slide) {
  slide.addImage({
    path: PACMAN_BG_SOFT,
    x: 0,
    y: 0,
    w: 13.333,
    h: 7.5,
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 7.5,
    line: { color: "000000", transparency: 100 },
    fill: { color: "000000", transparency: 55 },
  });
}

function addHeader(slide, title, accent) {
  slide.addText(title, {
    x: 0.7,
    y: 0.46,
    w: 11.95,
    h: 0.7,
    fontFace: "Arial",
    fontSize: 24,
    bold: true,
    color: COLORS.white,
    margin: 0,
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 0.7,
    y: 1.2,
    w: 11.95,
    h: 0,
    line: { color: accent, pt: 1.2, transparency: 22 },
  });
}

function addPanel(slide, opts = {}) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    rectRadius: 0.08,
    line: { color: opts.lineColor ?? COLORS.line, pt: opts.linePt ?? 1.2 },
    fill: {
      type: "solid",
      color: opts.fillColor ?? COLORS.panel,
      transparency: opts.fillTransparency ?? 20,
    },
  });
}

function addSummaryBand(slide, text, opts = {}) {
  addPanel(slide, {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    fillColor: opts.fillColor ?? COLORS.panel,
    fillTransparency: opts.fillTransparency ?? 20,
    lineColor: opts.lineColor ?? COLORS.line,
    linePt: 1.1,
  });
  slide.addText(text, {
    x: opts.x + 0.28,
    y: opts.y + 0.12,
    w: opts.w - 0.56,
    h: opts.h - 0.24,
    fontFace: "Arial",
    fontSize: opts.fontSize ?? 14,
    bold: opts.bold ?? false,
    color: opts.textColor ?? COLORS.white,
    margin: 0,
    valign: "mid",
  });
}

function addSectionCard(slide, title, items, opts = {}) {
  addPanel(slide, {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    fillColor: opts.fillColor ?? COLORS.panel,
    fillTransparency: opts.fillTransparency ?? 20,
    lineColor: opts.lineColor ?? COLORS.line,
    linePt: 1.3,
  });
  slide.addText(title, {
    x: opts.x + 0.25,
    y: opts.y + 0.18,
    w: opts.w - 0.5,
    h: 0.32,
    fontFace: "Arial",
    fontSize: opts.titleFontSize ?? 16,
    bold: true,
    color: COLORS.white,
    margin: 0,
  });
  slide.addShape(pptx.ShapeType.line, {
    x: opts.x + 0.25,
    y: opts.y + 0.55,
    w: opts.w - 0.5,
    h: 0,
    line: { color: opts.lineColor ?? COLORS.line, pt: 1, transparency: 22 },
  });
  const content = items.map((item) => `• ${item}`).join("\n");
  slide.addText(content, {
    x: opts.x + 0.25,
    y: opts.y + 0.7,
    w: opts.w - 0.5,
    h: opts.h - 0.85,
    fontFace: "Arial",
    fontSize: opts.fontSize ?? 13,
    color: opts.textColor ?? COLORS.white,
    margin: 0,
    paraSpaceAfterPt: opts.paraSpaceAfterPt ?? 6,
    valign: "top",
    breakLine: true,
  });
}

function addInlineMetricCard(slide, label, value, opts = {}) {
  addPanel(slide, {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    fillColor: opts.fillColor ?? COLORS.panel,
    fillTransparency: opts.fillTransparency ?? 20,
    lineColor: opts.lineColor,
    linePt: 1.4,
  });
  slide.addText(label, {
    x: opts.x + 0.15,
    y: opts.y + 0.12,
    w: opts.w - 0.3,
    h: 0.22,
    fontFace: "Arial",
    fontSize: opts.labelFontSize ?? 10,
    bold: true,
    color: COLORS.textSoft,
    margin: 0,
    align: "center",
  });
  slide.addText(value, {
    x: opts.x + 0.15,
    y: opts.y + 0.36,
    w: opts.w - 0.3,
    h: opts.h - 0.46,
    fontFace: "Arial",
    fontSize: opts.valueFontSize ?? 16,
    bold: true,
    color: opts.valueColor ?? COLORS.white,
    margin: 0,
    align: "center",
    valign: "mid",
  });
}

function addCaption(slide, text, opts) {
  slide.addText(text, {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h ?? 0.26,
    fontFace: "Arial",
    fontSize: opts.fontSize ?? 10,
    italic: opts.italic ?? true,
    color: opts.color ?? COLORS.textSoft,
    margin: 0,
    align: opts.align ?? "center",
    valign: "mid",
  });
}

function addFigure(slide, opts) {
  addPanel(slide, {
    x: opts.x - 0.06,
    y: opts.y - 0.06,
    w: opts.w + 0.12,
    h: opts.h + 0.12,
    fillColor: COLORS.white,
    fillTransparency: 8,
    lineColor: opts.lineColor ?? COLORS.line,
    linePt: 1.1,
  });
  slide.addImage({
    path: opts.path,
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
  });
}

function addStandardFooter(slide, text) {
  addSummaryBand(slide, text, {
    x: 0.7,
    y: 6.94,
    w: 11.95,
    h: 0.42,
    fillColor: COLORS.panel,
    lineColor: COLORS.line,
    fontSize: 11,
  });
}

// ============================================================
// Slide 1 — Project Overview
//   Topic: who/what/why and the headline takeaways
// ============================================================
function addOverviewSlide() {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.white };
  addPacmanBackground(slide);
  addHeader(
    slide,
    "Decision-Theoretic Navigation Under Uncertainty in Dynamic Grids",
    COLORS.gold
  );

  addSummaryBand(
    slide,
    "CS 520 Final Project — Pac-Man as a controlled instance of mobile, partially-observable hazards.",
    {
      x: 0.7,
      y: 1.4,
      w: 11.95,
      h: 0.62,
      fillColor: COLORS.panel,
      lineColor: COLORS.gold,
      fontSize: 15,
      bold: true,
    }
  );

  slide.addText("Team", {
    x: 0.7,
    y: 2.18,
    w: 4,
    h: 0.24,
    fontFace: "Arial",
    fontSize: 12,
    bold: true,
    color: COLORS.textSoft,
    margin: 0,
  });

  const participants = [
    {
      name: "Michael Liu",
      role: "Lead Designer / Project Guide",
      x: 0.7,
      color: COLORS.blue,
    },
    {
      name: "Ruiding Feng",
      role: "Principal Implementer / Eval Study",
      x: 4.79,
      color: COLORS.teal,
    },
    {
      name: "Zhichun Xiao",
      role: "Report Writer",
      x: 8.88,
      color: COLORS.gold,
    },
  ];
  for (const p of participants) {
    addPanel(slide, {
      x: p.x,
      y: 2.48,
      w: 3.75,
      h: 0.86,
      fillColor: COLORS.panel,
      lineColor: p.color,
      linePt: 1.3,
    });
    slide.addText(p.name, {
      x: p.x + 0.18,
      y: 2.58,
      w: 3.39,
      h: 0.32,
      fontFace: "Arial",
      fontSize: 16,
      bold: true,
      color: COLORS.white,
      align: "center",
      margin: 0,
    });
    slide.addText(p.role, {
      x: p.x + 0.18,
      y: 2.93,
      w: 3.39,
      h: 0.28,
      fontFace: "Arial",
      fontSize: 11,
      color: COLORS.textSoft,
      align: "center",
      margin: 0,
    });
  }

  addSectionCard(
    slide,
    "Research Question",
    [
      "How much does explicit reasoning about future hazard locations help an agent navigate a dynamic grid?",
      "How does it compare to (a) reactive replanning, (b) hand-tuned heuristic behaviour, and (c) reinforcement learning?",
      "Answered with 11 agent configurations × 50 paired-seed Monte-Carlo episodes on the canonical 28×36 Pac-Man maze."
    ],
    {
      x: 0.7,
      y: 3.5,
      w: 11.95,
      h: 1.7,
      fillColor: COLORS.panel,
      lineColor: COLORS.teal,
      titleFontSize: 16,
      fontSize: 13,
      paraSpaceAfterPt: 5,
    }
  );

  addSectionCard(
    slide,
    "Headline Findings",
    [
      "Replanning A* and Risk-Aware A* tie for top mean score (~3,150) and top clear rate (14% of seeds).",
      "Static A* (no replan) reaches 1,479 mean score but dies at step 24 — replanning is the load-bearing trick.",
      "Q-learning earns ~½ the score but ~6–12× lower hazard exposure — a fundamentally cautious learned policy.",
      "Hand-coded heuristic survives longest (156 steps) but spends the most time near ghosts (hazard 201)."
    ],
    {
      x: 0.7,
      y: 5.3,
      w: 11.95,
      h: 1.6,
      fillColor: COLORS.panel,
      lineColor: COLORS.gold,
      titleFontSize: 16,
      fontSize: 13,
      paraSpaceAfterPt: 5,
    }
  );

  addStandardFooter(
    slide,
    "Code · github.com/RichardFeng000/cs520-project       Figures reproducible via Agents/eval/render_figures.py"
  );

  warnIfSlideHasOverlaps(slide, pptx);
  warnIfSlideElementsOutOfBounds(slide, pptx);
}

// ============================================================
// Slide 2 — Problem Setup
//   Topic: what the environment looks like and what the agent must do
// ============================================================
function addSetupSlide() {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.white };
  addPacmanBackground(slide);
  addHeader(slide, "Problem Setup: Pac-Man as a Dynamic Grid", COLORS.blue);

  addSummaryBand(
    slide,
    "Mobile, partially-observable hazards (ghosts) on a fixed maze. Goal: clear all pellets before losing 3 lives.",
    {
      x: 0.7,
      y: 1.36,
      w: 11.95,
      h: 0.6,
      fillColor: COLORS.panel,
      lineColor: COLORS.blue,
      fontSize: 14,
      bold: true,
    }
  );

  const metrics = [
    { label: "MAZE", value: "28 × 36", color: COLORS.blue },
    { label: "PELLETS", value: "244 + 4 energizers", color: COLORS.teal },
    { label: "GHOSTS", value: "4 (mobile)", color: COLORS.red },
    { label: "LIVES / CAP", value: "3 / 900 steps", color: COLORS.gold },
    { label: "EPISODES", value: "50 paired seeds", color: COLORS.purple },
    { label: "AGENTS", value: "11 configs", color: COLORS.line },
  ];
  let mx = 0.7;
  for (const m of metrics) {
    addInlineMetricCard(slide, m.label, m.value, {
      x: mx,
      y: 2.1,
      w: 1.92,
      h: 0.86,
      lineColor: m.color,
      labelFontSize: 9,
      valueFontSize: 12,
    });
    mx += 2.0;
  }

  addSectionCard(
    slide,
    "Proposal concept ↔ Pac-Man instance",
    [
      "Open / blocked cells   →   walkable tiles / wall tiles",
      "Goal cell                       →   eat all pellets (clear the level)",
      "Hazardous cells          →   active non-scared ghost cells (+ 1-step neighbourhood)",
      "Stochastic spread       →   stochastic ghost movement (uniform-on-legal-moves model)",
      "Hazard sensitivity λ    →   λ in f(n) = g(n) + h(n) + λ · E[risk(n)]"
    ],
    {
      x: 0.7,
      y: 3.18,
      w: 5.95,
      h: 3.6,
      fillColor: COLORS.panel,
      lineColor: COLORS.teal,
      titleFontSize: 15,
      fontSize: 12,
      paraSpaceAfterPt: 5,
    }
  );

  addSectionCard(
    slide,
    "Termination & metrics",
    [
      "Episode ends on 3rd life lost, level cleared, or 900-step cap.",
      "Score = peak score reached during the episode.",
      "Time-to-failure = steps until first life lost.",
      "Hazard exposure = cumulative steps within Manhattan ≤ 2 of any non-scared ghost.",
      "Clear rate = fraction of episodes that finish all pellets + energizers."
    ],
    {
      x: 6.7,
      y: 3.18,
      w: 5.95,
      h: 3.6,
      fillColor: COLORS.panel,
      lineColor: COLORS.gold,
      titleFontSize: 15,
      fontSize: 12,
      paraSpaceAfterPt: 5,
    }
  );

  addStandardFooter(
    slide,
    "All agents share the same seed pool {1000…1049}, so every comparison is paired on identical initial conditions."
  );

  warnIfSlideHasOverlaps(slide, pptx);
  warnIfSlideElementsOutOfBounds(slide, pptx);
}

// ============================================================
// Slide 3 — Agent Lineup
//   Topic: the four agent families and what they actually do
// ============================================================
function addAgentLineupSlide() {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.white };
  addPacmanBackground(slide);
  addHeader(slide, "Agent Lineup — Four Families", COLORS.purple);

  addSummaryBand(
    slide,
    "f(n) = g(n) + h(n) + λ · E[risk(n)]      ·      Q(s,a) ← Q(s,a) + α · [r + γ · maxₐ' Q(s',a') − Q(s,a)]",
    {
      x: 0.7,
      y: 1.36,
      w: 11.95,
      h: 0.6,
      fillColor: COLORS.panel,
      lineColor: COLORS.gold,
      fontSize: 14,
      bold: true,
    }
  );

  addSectionCard(
    slide,
    "Static A* — proposal §5.1",
    [
      "Plans once at episode start, only replans on block / target consumed.",
      "Hazards ignored — proposal's baseline search agent.",
      "Faithful reproduction of the \"no-replan\" baseline."
    ],
    {
      x: 0.7,
      y: 2.18,
      w: 5.95,
      h: 2.25,
      fillColor: COLORS.panel,
      lineColor: COLORS.blue,
      titleFontSize: 15,
      fontSize: 12,
      paraSpaceAfterPt: 5,
    }
  );

  addSectionCard(
    slide,
    "Replanning A* — proposal §5.2",
    [
      "Replans every step.",
      "Treats current ghost cell + 1-step neighbours as hard walls.",
      "Falls back to greedy Manhattan when no path exists."
    ],
    {
      x: 6.7,
      y: 2.18,
      w: 5.95,
      h: 2.25,
      fillColor: COLORS.panel,
      lineColor: COLORS.teal,
      titleFontSize: 15,
      fontSize: 12,
      paraSpaceAfterPt: 5,
    }
  );

  addSectionCard(
    slide,
    "Risk-Aware A* — proposal §5.3 (decision-theoretic)",
    [
      "Same skeleton as Replanning A*, edge cost = 1 + λ · E[risk(n,t)].",
      "E[risk(n,t)] from uniform-on-legal-moves ghost transition kernel.",
      "λ ∈ {0.5, 1, 2, 5} swept; admissible heuristic preserved."
    ],
    {
      x: 0.7,
      y: 4.5,
      w: 5.95,
      h: 2.25,
      fillColor: COLORS.panel,
      lineColor: COLORS.purple,
      titleFontSize: 15,
      fontSize: 12,
      paraSpaceAfterPt: 5,
    }
  );

  addSectionCard(
    slide,
    "Tabular Q-learning — 3 death policies",
    [
      "10-feature bucketed state · α = 0.18, γ = 0.95, ε ↓ from 0.12.",
      "12,000 training episodes per model.",
      "Model 1 keep-score · Model 2 zero-on-death · Model 3 scaled penalty + ratchet."
    ],
    {
      x: 6.7,
      y: 4.5,
      w: 5.95,
      h: 2.25,
      fillColor: COLORS.panel,
      lineColor: COLORS.gold,
      titleFontSize: 15,
      fontSize: 12,
      paraSpaceAfterPt: 5,
    }
  );

  addStandardFooter(
    slide,
    "Two sanity baselines (random + hand-coded heuristic) accompany the four families above."
  );

  warnIfSlideHasOverlaps(slide, pptx);
  warnIfSlideElementsOutOfBounds(slide, pptx);
}

// ============================================================
// Slide 4 — Score Comparison
//   Topic: which agents score the most points
// ============================================================
function addScoreComparisonSlide() {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.white };
  addPacmanBackground(slide);
  addHeader(slide, "Score Comparison (Figure 1)", COLORS.teal);

  addFigure(slide, {
    x: 0.7,
    y: 1.45,
    w: 7.6,
    h: 4.0,
    path: FIG_SCORE_BARS,
  });
  addCaption(
    slide,
    "Mean peak score per episode (n=50). Black diamonds = single best run.",
    { x: 0.7, y: 5.55, w: 7.6, h: 0.26 }
  );

  addSectionCard(
    slide,
    "Read-outs",
    [
      "astar_replan (3181) and astar_risk_l* (≈3143) pile together — ~2× the next group.",
      "Heuristic (1695) now leads the middle pack ahead of astar_static (1479) and qlearning_model1 (1439).",
      "Q-learning models 2/3 sit lower (962, 656) — strong death penalty trades score for caution.",
      "Random sanity floor: 167 ± 31."
    ],
    {
      x: 8.4,
      y: 1.45,
      w: 4.25,
      h: 4.5,
      fillColor: COLORS.panel,
      lineColor: COLORS.teal,
      titleFontSize: 15,
      fontSize: 12,
      paraSpaceAfterPt: 6,
    }
  );

  addSummaryBand(
    slide,
    "Take-away — the ~2× gap between static A* and the replanning family is the largest architectural delta in the project.",
    {
      x: 0.7,
      y: 6.06,
      w: 11.95,
      h: 0.66,
      fillColor: COLORS.panel,
      lineColor: COLORS.gold,
      fontSize: 13,
      bold: true,
    }
  );

  addStandardFooter(
    slide,
    "Best single run: astar_replan / astar_risk = 7,800 (cleared the level on 14% of seeds in n=50)."
  );

  warnIfSlideHasOverlaps(slide, pptx);
  warnIfSlideElementsOutOfBounds(slide, pptx);
}

// ============================================================
// Slide 5 — Survival Metrics
//   Topic: how long agents stay alive and how often they clear
// ============================================================
function addSurvivalSlide() {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.white };
  addPacmanBackground(slide);
  addHeader(
    slide,
    "Survival: Clear Rate, Deaths, Time-to-Failure (Figure 3)",
    COLORS.red
  );

  addFigure(slide, {
    x: 0.7,
    y: 1.4,
    w: 11.95,
    h: 2.95,
    path: FIG_SURVIVAL,
  });
  addCaption(
    slide,
    "Three-panel comparison across all 11 agents (50 paired seeds each).",
    { x: 0.7, y: 4.48, w: 11.95, h: 0.24 }
  );

  addSectionCard(
    slide,
    "Clear rate",
    [
      "Only the search agents ever clear the level.",
      "Replan / Risk-aware: 14%.",
      "Static: 6%.",
      "No Q-learning model and no heuristic clears once."
    ],
    {
      x: 0.7,
      y: 4.85,
      w: 3.95,
      h: 2.05,
      fillColor: COLORS.panel,
      lineColor: COLORS.teal,
      titleFontSize: 13.5,
      fontSize: 11,
      paraSpaceAfterPt: 4,
    }
  );

  addSectionCard(
    slide,
    "Deaths per episode",
    [
      "Static A* and Q-learning models 2/3 lose all 3 lives every episode.",
      "Replan, Risk-aware and Heuristic ≈ 2.8 deaths.",
      "Random baseline always dies 3 times."
    ],
    {
      x: 4.8,
      y: 4.85,
      w: 3.78,
      h: 2.05,
      fillColor: COLORS.panel,
      lineColor: COLORS.red,
      titleFontSize: 13.5,
      fontSize: 11,
      paraSpaceAfterPt: 4,
    }
  );

  addSectionCard(
    slide,
    "Time-to-failure",
    [
      "Heuristic survives longest (156 steps) — sacrifices score for survival.",
      "Replan / Risk-aware ≈ 119 steps before first death.",
      "Static A* dies at step 24 — walks into the first ghost it sees."
    ],
    {
      x: 8.72,
      y: 4.85,
      w: 3.93,
      h: 2.05,
      fillColor: COLORS.panel,
      lineColor: COLORS.gold,
      titleFontSize: 13.5,
      fontSize: 11,
      paraSpaceAfterPt: 4,
    }
  );

  addStandardFooter(
    slide,
    "Take-away — high score and long survival are not the same thing; the heuristic optimises survival, the planners optimise score."
  );

  warnIfSlideHasOverlaps(slide, pptx);
  warnIfSlideElementsOutOfBounds(slide, pptx);
}

// ============================================================
// Slide 6 — Risk vs Reward (the central qualitative finding)
//   Topic: the Pareto trade-off between hazard exposure and score
// ============================================================
function addRiskRewardSlide() {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.white };
  addPacmanBackground(slide);
  addHeader(
    slide,
    "Risk vs Reward — The Central Finding (Figure 5)",
    COLORS.purple
  );

  addFigure(slide, {
    x: 0.7,
    y: 1.45,
    w: 7.6,
    h: 4.4,
    path: FIG_RISK_REWARD,
  });
  addCaption(
    slide,
    "Pareto-good region is upper-left (high score, low hazard). Bold X = per-agent centroid.",
    { x: 0.7, y: 5.95, w: 7.6, h: 0.26 }
  );

  addSectionCard(
    slide,
    "Three clusters",
    [
      "Q-learners → upper-left, hazard ≈ 9–19.",
      "Planners (replan / risk-aware) → middle, hazard ≈ 110, score ≈ 3,150.",
      "Heuristic → far right, hazard ≈ 201, score ≈ 1,695."
    ],
    {
      x: 8.4,
      y: 1.45,
      w: 4.25,
      h: 2.3,
      fillColor: COLORS.panel,
      lineColor: COLORS.purple,
      titleFontSize: 14.5,
      fontSize: 11.5,
      paraSpaceAfterPt: 5,
    }
  );

  addSectionCard(
    slide,
    "Why this is the central finding",
    [
      "Q-learning has learned a fundamentally more risk-averse policy.",
      "~½ the score for ~6–12× less time within ghost-radius 2.",
      "Planned vs cached-value control occupy different Pareto niches — neither dominates.",
      "Sets up the cognitive-science mapping in §10.1."
    ],
    {
      x: 8.4,
      y: 3.85,
      w: 4.25,
      h: 2.7,
      fillColor: COLORS.panel,
      lineColor: COLORS.gold,
      titleFontSize: 14.5,
      fontSize: 11.5,
      paraSpaceAfterPt: 5,
    }
  );

  addStandardFooter(
    slide,
    "Hazard exposure = cumulative steps within Manhattan distance 2 of any active non-scared ghost."
  );

  warnIfSlideHasOverlaps(slide, pptx);
  warnIfSlideElementsOutOfBounds(slide, pptx);
}

// ============================================================
// Slide 7 — Q-learning Death-Policy Ablation
//   Topic: how the death penalty changes the learned Q-policy
// ============================================================
function addQLAblationSlide() {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.white };
  addPacmanBackground(slide);
  addHeader(
    slide,
    "Q-learning: Death-Policy Ablation (Figure 7)",
    COLORS.gold
  );

  addFigure(slide, {
    x: 0.7,
    y: 1.4,
    w: 11.95,
    h: 2.95,
    path: FIG_QL_ABLATION,
  });
  addCaption(
    slide,
    "Mean score · clear rate · avg deaths · avg time-to-failure across the three death-penalty variants.",
    { x: 0.7, y: 4.48, w: 11.95, h: 0.24 }
  );

  addSectionCard(
    slide,
    "Model 1 — keep score on death",
    [
      "Most score-greedy (1439 mean).",
      "Longest TTF among the three (≈101 steps).",
      "Death-as-pause encourages risk-tolerant pellet grabs."
    ],
    {
      x: 0.7,
      y: 4.85,
      w: 3.95,
      h: 2.05,
      fillColor: COLORS.panel,
      lineColor: COLORS.red,
      titleFontSize: 13.5,
      fontSize: 11,
      paraSpaceAfterPt: 4,
    }
  );

  addSectionCard(
    slide,
    "Model 2 — zero score on death",
    [
      "Sits in the middle (962 mean, ≈87 step TTF).",
      "Heavily discourages dying without destabilising training.",
      "Lowest hazard exposure of the three (~15)."
    ],
    {
      x: 4.8,
      y: 4.85,
      w: 3.78,
      h: 2.05,
      fillColor: COLORS.panel,
      lineColor: COLORS.gold,
      titleFontSize: 13.5,
      fontSize: 11,
      paraSpaceAfterPt: 4,
    }
  );

  addSectionCard(
    slide,
    "Model 3 — scaled + ratcheting penalty",
    [
      "Lowest score (656 mean) but TTF ≈ 89 steps after extra training.",
      "Hazard ≈ 9 — the most cautious of the three.",
      "Strong penalty teaches survival; score-greed has to be re-learned."
    ],
    {
      x: 8.72,
      y: 4.85,
      w: 3.93,
      h: 2.05,
      fillColor: COLORS.panel,
      lineColor: COLORS.purple,
      titleFontSize: 13.5,
      fontSize: 11,
      paraSpaceAfterPt: 4,
    }
  );

  addStandardFooter(
    slide,
    "Take-away — the death penalty is a tunable cautiousness knob: stronger penalty ⇒ less score, but lower hazard exposure."
  );

  warnIfSlideHasOverlaps(slide, pptx);
  warnIfSlideElementsOutOfBounds(slide, pptx);
}

// ============================================================
// Slide 8 — §10.1 Cognitive-Science Mapping
//   Topic: model-based vs model-free as a real-world correlate
// ============================================================
function addCogSciSlide() {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.white };
  addPacmanBackground(slide);
  addHeader(
    slide,
    "§10.1 — Cognitive Science: Model-Based Control",
    COLORS.teal
  );

  addSummaryBand(
    slide,
    "Decker, Otto, Daw & Hartley (2016) — \"From Creatures of Habit to Goal-Directed Learners\", Psychological Science.",
    {
      x: 0.7,
      y: 1.36,
      w: 11.95,
      h: 0.6,
      fillColor: COLORS.panel,
      lineColor: COLORS.gold,
      fontSize: 13.5,
      bold: true,
    }
  );

  addSectionCard(
    slide,
    "Their construct ↔ Our instantiation",
    [
      "Model-free RL (cached value, no simulation)   →   qlearning_model{1,2,3}",
      "Model-based RL (simulate, plan response)       →   astar_replan & astar_risk_l*",
      "Working-memory-gated planning                       →   E[risk] via transition_distribution",
      "Two-stage MDP probe                                          →   50-seed Monte Carlo over the maze"
    ],
    {
      x: 0.7,
      y: 2.1,
      w: 11.95,
      h: 1.95,
      fillColor: COLORS.panel,
      lineColor: COLORS.teal,
      titleFontSize: 15,
      fontSize: 12,
      paraSpaceAfterPt: 4,
    }
  );

  addSectionCard(
    slide,
    "Echo 1 — Model-based wins on raw score",
    [
      "Decker et al.: adults with stronger model-based contributions earn significantly more reward.",
      "Our run: planners ≈ 3,150 vs Q-learning 656–1,439 mean score.",
      "Planners are the only family that ever clears the level (14%)."
    ],
    {
      x: 0.7,
      y: 4.15,
      w: 5.95,
      h: 2.35,
      fillColor: COLORS.panel,
      lineColor: COLORS.purple,
      titleFontSize: 14,
      fontSize: 11.5,
      paraSpaceAfterPt: 5,
    }
  );

  addSectionCard(
    slide,
    "Echo 2 — Model-free + model-based coexist",
    [
      "Their data: model-free habits don't vanish in adults — they are blended with planning.",
      "Our run: Q-learners earn less score but spend ~6–12× less time within ghost-radius 2.",
      "Cached-value strategy occupies a genuine niche: caution under uncertainty.",
      "Fig. 5 Pareto plot is the same coexistence claim in miniature."
    ],
    {
      x: 6.7,
      y: 4.15,
      w: 5.95,
      h: 2.35,
      fillColor: COLORS.panel,
      lineColor: COLORS.blue,
      titleFontSize: 14,
      fontSize: 11.5,
      paraSpaceAfterPt: 5,
    }
  );

  addStandardFooter(
    slide,
    "Justifies risk-aware A* + Q-learning as complementary, not redundant. doi: 10.1177/0956797616639301."
  );

  warnIfSlideHasOverlaps(slide, pptx);
  warnIfSlideElementsOutOfBounds(slide, pptx);
}

// ============================================================
// Slide 9 — Conclusions & Future Work
//   Topic: the four headline conclusions and what we'd do next
// ============================================================
function addConclusionsSlide() {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.white };
  addPacmanBackground(slide);
  addHeader(slide, "Conclusions & Future Work", COLORS.gold);

  addSummaryBand(
    slide,
    "11 agents · 50 paired seeds · canonical 28×36 Pac-Man — a clean answer to the proposal's research question.",
    {
      x: 0.7,
      y: 1.36,
      w: 11.95,
      h: 0.6,
      fillColor: COLORS.panel,
      lineColor: COLORS.gold,
      fontSize: 14,
      bold: true,
    }
  );

  addSectionCard(
    slide,
    "1. Replanning is the load-bearing innovation",
    [
      "Static A* is dominated on every metric by every replanning method.",
      "5× longer TTF and ~2× higher score with no algorithmic change beyond \"rerun every step\"."
    ],
    {
      x: 0.7,
      y: 2.1,
      w: 5.95,
      h: 2.0,
      fillColor: COLORS.panel,
      lineColor: COLORS.blue,
      titleFontSize: 13.5,
      fontSize: 11.5,
      paraSpaceAfterPt: 5,
    }
  );

  addSectionCard(
    slide,
    "2. Risk-Aware A* ≈ Replanning A* on this maze",
    [
      "Hard ghost masking covers most of the risk before the soft λ·E[risk] term can act.",
      "Predicted dominance window of proposal §7 sits outside max-entropy + nearest-pellet."
    ],
    {
      x: 6.7,
      y: 2.1,
      w: 5.95,
      h: 2.0,
      fillColor: COLORS.panel,
      lineColor: COLORS.purple,
      titleFontSize: 13.5,
      fontSize: 11.5,
      paraSpaceAfterPt: 5,
    }
  );

  addSectionCard(
    slide,
    "3. Q-learning is competitive and more cautious",
    [
      "~6–12× less hazard exposure for ~½ the score vs replanning.",
      "Death policy is a tunable cautiousness knob (model 1 ≫ model 2 ≫ model 3 in score)."
    ],
    {
      x: 0.7,
      y: 4.2,
      w: 5.95,
      h: 2.0,
      fillColor: COLORS.panel,
      lineColor: COLORS.teal,
      titleFontSize: 13.5,
      fontSize: 11.5,
      paraSpaceAfterPt: 5,
    }
  );

  addSectionCard(
    slide,
    "4. Heuristic is longest-surviving but highest-exposure",
    [
      "156-step TTF (longest of all agents) but hazard 201 (highest of all).",
      "Useful foil that makes the planner / learner trade-offs concrete."
    ],
    {
      x: 6.7,
      y: 4.2,
      w: 5.95,
      h: 2.0,
      fillColor: COLORS.panel,
      lineColor: COLORS.red,
      titleFontSize: 13.5,
      fontSize: 11.5,
      paraSpaceAfterPt: 5,
    }
  );

  addSummaryBand(
    slide,
    "Future work — soften ghost-cell obstacles for λ·E[risk] to act · longer-horizon planning · DQN over raw maze · learned ghost transition kernel.",
    {
      x: 0.7,
      y: 6.3,
      w: 11.95,
      h: 0.6,
      fillColor: COLORS.panel,
      lineColor: COLORS.line,
      fontSize: 12,
    }
  );

  addStandardFooter(
    slide,
    "Code · github.com/RichardFeng000/cs520-project       Figures reproducible via Agents/eval/render_figures.py"
  );

  warnIfSlideHasOverlaps(slide, pptx);
  warnIfSlideElementsOutOfBounds(slide, pptx);
}

// ============================================================
// Build order: linear narrative
// ============================================================
addOverviewSlide();        // 1. Project Overview
addSetupSlide();           // 2. Problem Setup
addAgentLineupSlide();     // 3. Agent Lineup
addScoreComparisonSlide(); // 4. Score Comparison (Fig 1)
addSurvivalSlide();        // 5. Survival Metrics (Fig 3)
addRiskRewardSlide();      // 6. Risk vs Reward — central finding (Fig 5)
addQLAblationSlide();      // 7. Q-learning Death-Policy Ablation (Fig 7)
addCogSciSlide();          // 8. §10.1 Cognitive Science Mapping
addConclusionsSlide();     // 9. Conclusions & Future Work

pptx.writeFile({ fileName: "pacman_rl_final.pptx" });
