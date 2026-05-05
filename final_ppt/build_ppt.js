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
    "Pac-Man — Search vs Reinforcement Learning",
    COLORS.gold
  );

  addSummaryBand(
    slide,
    "CS 520 Final Project — how do search and reinforcement-learning agents play Pac-Man?",
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
    "What's in this deck",
    [
      "Problem setup and how we measure agents.",
      "Four agent families: static A*, replanning A*, risk-aware A*, and tabular Q-learning.",
      "Score, survival, and risk-vs-reward results across 11 agents and 50 paired seeds.",
      "Cognitive-science angle: planning vs habit-learning.",
      "Takeaways and future work."
    ],
    {
      x: 0.7,
      y: 3.6,
      w: 11.95,
      h: 2.6,
      fillColor: COLORS.panel,
      lineColor: COLORS.teal,
      titleFontSize: 17,
      fontSize: 14,
      paraSpaceAfterPt: 8,
    }
  );

  addStandardFooter(
    slide,
    "Code · github.com/RichardFeng000/cs520-project"
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
    "Pac-Man with 4 ghosts on a fixed maze. Eat every pellet before losing all 3 lives.",
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
    "How the maze maps to our problem",
    [
      "Open / blocked tiles   →   walkable / wall tiles",
      "Goal                              →   eat every pellet to clear the level",
      "Hazard tiles                  →   ghost tiles + the 4 squares around them",
      "Random spread          →   ghosts move uniformly over legal directions",
      "Risk weight λ                →   cost = path length + λ × expected ghost risk"
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
    "How we score the agents",
    [
      "Episode ends on the 3rd life lost, a level clear, or 900 steps.",
      "Score = highest score the agent reached.",
      "Time-to-failure = steps before the first death.",
      "Hazard exposure = total steps spent within 2 tiles of a ghost.",
      "Clear rate = fraction of episodes that ate every pellet."
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
    "Every agent runs on the same 50 seeds {1000…1049}, so all comparisons are on identical starting conditions."
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
    "Static A*",
    [
      "Plans a path once at the start of the episode.",
      "Only replans if the path becomes blocked or the target is eaten.",
      "Doesn't react to ghosts. Our baseline search agent."
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
    "Replanning A*",
    [
      "Recomputes the path every step.",
      "Treats ghost tiles and the 4 squares around them as walls.",
      "Falls back to a greedy step toward the nearest pellet if no path exists."
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
    "Risk-Aware A*",
    [
      "Like Replanning A*, but each tile pays an extra cost for expected ghost risk.",
      "Risk is estimated from one step of random ghost movement.",
      "We swept λ over {0.5, 1, 2, 5}."
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
      "10-feature state. α = 0.18, γ = 0.95, ε from 0.12 with decay.",
      "Trained for many episodes per model.",
      "Three death penalties: Model 1 keep score · Model 2 zero on death · Model 3 ratcheting penalty."
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
    "Two extra baselines (random and a hand-coded heuristic) run alongside the four families above."
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
      "qlearning_model1 (3,265) narrowly tops the field; planners cluster just behind at ≈3,150.",
      "qlearning_model2 (2,871) and model3 (2,349) trail — death penalty trades score for safety.",
      "Heuristic (1,695) and astar_static (1,479) form the middle pack.",
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
    "Take-away — Q-learning matches the planners on score, and the model 1→model 3 spread (3,265→2,349) shows what the death policy controls.",
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
    "Best single run: astar_replan / astar_risk = 7,800 (cleared the level on 14% of seeds out of 50)."
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
    "Three views across all 11 agents (50 paired seeds each).",
    { x: 0.7, y: 4.48, w: 11.95, h: 0.24 }
  );

  addSectionCard(
    slide,
    "Clear rate",
    [
      "Q-learning model 1 leads at 18%.",
      "Replan / Risk-aware: 14% · model 2: 12%.",
      "Static A* and model 3: 6%.",
      "Heuristic and Random never clear."
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
      "Static A* and Random lose all 3 lives every episode.",
      "Planners + Heuristic ≈ 2.8 · model 1: 2.50 · model 2: 2.40.",
      "Q-learning model 3 has the fewest deaths (2.20)."
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
      "Q-learning model 3 survives longest (235 steps), then model 2 (195) and model 1 (165).",
      "Heuristic ≈ 156 · Replan / Risk-aware ≈ 119.",
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
    "Take-away — high score and long survival aren't the same goal. Planners chase score, the heuristic chases survival, and Q-learning's death policy is the knob between them."
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
    "Top-left = high score with low risk (the best place to be). Bold X = each agent's mean.",
    { x: 0.7, y: 5.95, w: 7.6, h: 0.26 }
  );

  addSectionCard(
    slide,
    "Three clusters",
    [
      "Q-learners → upper-left, hazard 22–92, score 2,349–3,265.",
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
      "Q-learning has learned to stay away from ghosts.",
      "Model 1 matches planner score and spends 1.2× less time near ghosts.",
      "Model 3 gives up 26% of its score for 5× less time near ghosts.",
      "This sets up the cognitive-science slide next."
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
    "Hazard exposure = total steps with a ghost within 2 tiles."
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
    "Mean score · clear rate · avg deaths · avg time-to-failure for the three death-penalty variants.",
    { x: 0.7, y: 4.48, w: 11.95, h: 0.24 }
  );

  addSectionCard(
    slide,
    "Model 1 — keep score on death",
    [
      "Top score in the field (3,265 mean).",
      "Hazard 92 · time-to-failure 165 · 18% level clears.",
      "Death barely costs the agent, so it grabs every pellet — but still learns to dodge."
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
      "Middle score (2,871), hazard cut to 52.",
      "Time-to-failure 195 steps · 12% level clears.",
      "A balanced spot: still chases score, but really tries not to die."
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
      "Lowest score of the three (2,349) but the safest agent in the field.",
      "Hazard 22 (about 1/5 of the planners) · time-to-failure 235 · 6% level clears.",
      "Strong death penalty teaches survival first; score is the trade-off."
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
    "Take-away — the death penalty is a cautiousness dial: harsher penalty ⇒ less score, but less time near ghosts."
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
    "Cognitive Science: Planning vs Habit-Learning",
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
    "Their idea ↔ Our agents",
    [
      "Habit-style learning (no simulation)   →   qlearning_model{1,2,3}",
      "Planning (simulate, then act)                →   astar_replan & astar_risk_l*",
      "Planning that uses risk estimates       →   risk-aware A*",
      "Two-stage MDP probe                              →   50-seed Monte Carlo on the maze"
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
    "Echo 1 — Planning earns more on average",
    [
      "Decker et al.: more planning → more reward.",
      "Our run: planners ≈ 3,150 vs Q-learning 2,349–3,265 — a small but consistent edge for planning.",
      "Everyone clears the level sometimes: planners 14%, model 1 18%, model 2 12%, model 3 6%."
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
    "Echo 2 — Habits and planning live side by side",
    [
      "Their data: habits never disappear — they blend with planning.",
      "Our run: model 1 matches planner score with 1.2× less time near ghosts; model 3 gives up 26% score for 5× less time near ghosts.",
      "Q-learning has its own niche: cautious play that still scores.",
      "Fig. 5 shows the same trade-off."
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
    "Risk-aware A* and Q-learning are complementary, not redundant. doi: 10.1177/0956797616639301."
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
    "11 agents · 50 paired seeds · 28×36 Pac-Man — what we learned.",
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
    "1. Replanning is what makes A* work",
    [
      "Static A* loses to every replanning agent on every metric.",
      "5× longer survival and ~2× higher score, just by replanning every step."
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
    "2. Risk-Aware A* ≈ Replanning A* here",
    [
      "Treating ghost squares as walls already removes most of the risk, so the λ·E[risk] term has little extra to do.",
      "Risk-aware A* would shine in a sparser maze with fewer escape routes."
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
    "3. Q-learning matches planning, with less risk",
    [
      "Model 1 ties the planners on score (3,265) and spends 1.2× less time near ghosts.",
      "Death policy is a cautiousness dial: model 1 (3,265 / haz 92) → model 3 (2,349 / haz 22)."
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
    "4. The heuristic survives longest but takes the most risk",
    [
      "Survives 156 steps (longest of all agents) but hazard 201 (highest of all).",
      "Useful contrast for the planner-vs-learner trade-off."
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
    "Future work — soften the ghost obstacles · plan further ahead · DQN from raw maze · learn the ghost movement model.",
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
    "Code · github.com/RichardFeng000/cs520-project"
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
