"use strict";

const pptxgen = require("pptxgenjs");
const {
  warnIfSlideHasOverlaps,
  warnIfSlideElementsOutOfBounds,
} = require("./pptxgenjs_helpers/layout");
const path = require("path");

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "OpenAI Codex";
pptx.company = "OpenAI";
pptx.subject = "Pac-Man RL Presentation";
pptx.title = "Pac-Man Reinforcement Learning";
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
};

const PACMAN_ICON = path.resolve(__dirname, "../pacman/public/icon/favicon.png");
const CHERRIES_ICON = path.resolve(__dirname, "images/ui_fruit_cherries.png");
const GHOST_BONUS_ICON = path.resolve(__dirname, "images/ui_ghost_blue.png");
const GAMEPLAY_SHOT = path.resolve(__dirname, "../pacman/shots/pac.png");
const PACMAN_BG_SOFT = path.resolve(__dirname, "images/pacman_neon_bg.png");

function addHeader(slide, _kicker, title, accent) {
  slide.addText(title, {
    x: 0.7,
    y: 0.54,
    w: 9.4,
    h: 0.7,
    fontFace: "Arial",
    fontSize: 24,
    bold: true,
    color: COLORS.white,
    margin: 0,
  });

  slide.addShape(pptx.ShapeType.line, {
    x: 0.7,
    y: 1.28,
    w: 11.9,
    h: 0,
    line: { color: accent, pt: 1.1, transparency: 28 },
  });
}

function addPanel(slide, opts = {}) {
  const lineColor = opts.lineColor ?? COLORS.line;
  const linePt = opts.linePt ?? 1.2;

  if ((opts.fillTransparency ?? 0) >= 100) {
    slide.addShape(pptx.ShapeType.line, {
      x: opts.x,
      y: opts.y,
      w: opts.w,
      h: 0,
      line: { color: lineColor, pt: linePt },
    });
    slide.addShape(pptx.ShapeType.line, {
      x: opts.x,
      y: opts.y + opts.h,
      w: opts.w,
      h: 0,
      line: { color: lineColor, pt: linePt },
    });
    slide.addShape(pptx.ShapeType.line, {
      x: opts.x,
      y: opts.y,
      w: 0,
      h: opts.h,
      line: { color: lineColor, pt: linePt },
    });
    slide.addShape(pptx.ShapeType.line, {
      x: opts.x + opts.w,
      y: opts.y,
      w: 0,
      h: opts.h,
      line: { color: lineColor, pt: linePt },
    });
    return;
  }

  slide.addShape(pptx.ShapeType.roundRect, {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    rectRadius: 0.08,
    line: { color: lineColor, pt: linePt },
    fill: {
      type: "solid",
      color: opts.fillColor ?? COLORS.white,
      transparency: opts.fillTransparency ?? 0,
    },
  });
}

function addPacmanBackground(slide) {
  slide.addImage({
    path: PACMAN_BG_SOFT,
    x: 0,
    y: 0,
    w: 13.333,
    h: 7.5,
  });
}

function addTag(slide, label, opts = {}) {
  addPanel(slide, {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    fillColor: opts.fillColor,
    lineColor: opts.lineColor,
    linePt: 1,
    fillTransparency: 100,
  });

  slide.addText(label, {
    x: opts.x + 0.16,
    y: opts.y + 0.08,
    w: opts.w - 0.32,
    h: opts.h - 0.12,
    align: "center",
    fontFace: "Arial",
    fontSize: opts.fontSize ?? 11,
    bold: true,
    color: opts.textColor ?? COLORS.white,
    margin: 0,
  });
}

function addMetricCard(slide, title, value, opts = {}) {
  addPanel(slide, {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    fillColor: opts.fillColor,
    lineColor: opts.lineColor,
    linePt: 1.4,
  });

  slide.addText(title, {
    x: opts.x + 0.2,
    y: opts.titleY ?? (opts.y + 0.18),
    w: opts.titleW ?? (opts.w - 0.4),
    h: opts.titleH ?? 0.22,
    fontFace: "Arial",
    fontSize: opts.titleFontSize ?? 10,
    bold: true,
    color: COLORS.textSoft,
    margin: 0,
    align: opts.titleAlign ?? "left",
  });

  slide.addText(value, {
    x: opts.valueX ?? (opts.x + 0.2),
    y: opts.valueY ?? (opts.y + 0.45),
    w: opts.valueW ?? (opts.w - 0.4),
    h: opts.valueH ?? 0.38,
    fontFace: "Arial",
    fontSize: opts.valueFontSize ?? 22,
    bold: true,
    color: opts.valueColor ?? COLORS.ink,
    margin: 0,
    align: opts.valueAlign ?? "left",
  });
}

function addInlineMetricCard(slide, label, value, opts = {}) {
  addPanel(slide, {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    fillColor: opts.fillColor,
    fillTransparency: opts.fillTransparency,
    lineColor: opts.lineColor,
    linePt: 1.4,
  });

  slide.addText(label, {
    x: opts.x + 0.15,
    y: opts.y + 0.12,
    w: opts.w - 0.3,
    h: 0.2,
    fontFace: "Arial",
    fontSize: opts.labelFontSize ?? 10,
    bold: true,
    color: COLORS.textSoft,
    margin: 0,
    align: "center",
  });

  slide.addText(value, {
    x: opts.x + 0.15,
    y: opts.y + 0.38,
    w: opts.w - 0.3,
    h: 0.24,
    fontFace: "Arial",
    fontSize: opts.valueFontSize ?? 14,
    bold: true,
    color: opts.valueColor ?? COLORS.white,
    margin: 0,
    align: "center",
  });
}

function addLivesCard(slide, opts = {}) {
  addPanel(slide, {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    fillColor: opts.fillColor,
    fillTransparency: opts.fillTransparency,
    lineColor: opts.lineColor,
    linePt: 1.4,
  });

  slide.addText("LIVES", {
    x: opts.x + 0.2,
    y: opts.y + 0.16,
    w: opts.w - 0.4,
    h: 0.22,
    fontFace: "Arial",
    fontSize: 10,
    bold: true,
    color: COLORS.textSoft,
    margin: 0,
  });

  const iconY = opts.y + 0.4;
  const iconSize = 0.27;
  const gap = 0.08;
  const totalWidth = 3 * iconSize + 2 * gap;
  const startX = opts.x + (opts.w - totalWidth) / 2;
  for (let i = 0; i < 3; i += 1) {
    slide.addImage({
      path: PACMAN_ICON,
      x: startX + i * (iconSize + gap),
      y: iconY,
      w: iconSize,
      h: iconSize,
    });
  }

  slide.addText("3 lives", {
    x: opts.x + 0.18,
    y: opts.y + 0.73,
    w: opts.w - 0.36,
    h: 0.2,
    fontFace: "Arial",
    fontSize: 11,
    bold: true,
    color: COLORS.white,
    margin: 0,
    align: "center",
  });
}

function addPelletCard(slide, opts = {}) {
  addPanel(slide, {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    fillColor: opts.fillColor,
    fillTransparency: opts.fillTransparency,
    lineColor: opts.lineColor,
    linePt: 1.4,
  });

  slide.addText("PELLET", {
    x: opts.x + 0.2,
    y: opts.y + 0.16,
    w: opts.w - 0.4,
    h: 0.2,
    fontFace: "Arial",
    fontSize: 10,
    bold: true,
    color: COLORS.textSoft,
    margin: 0,
  });

  const dotSize = 0.07;
  const dotGap = 0.15;
  const totalWidth = 6 * dotSize + 5 * dotGap;
  const startX = opts.x + (opts.w - totalWidth) / 2;
  for (let i = 0; i < 6; i += 1) {
    slide.addShape(pptx.ShapeType.ellipse, {
      x: startX + i * (dotSize + dotGap),
      y: opts.y + 0.47,
      w: dotSize,
      h: dotSize,
      line: { color: "F7C5C0", transparency: 100 },
      fill: { color: "F7C5C0" },
    });
  }

  slide.addText("＋10", {
    x: opts.x + 0.18,
    y: opts.y + 0.69,
    w: opts.w - 0.36,
    h: 0.2,
    fontFace: "Arial",
    fontSize: 21,
    bold: true,
    color: COLORS.white,
    margin: 0,
    align: "center",
  });
}

function addEnergizerCard(slide, opts = {}) {
  addPanel(slide, {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    fillColor: opts.fillColor,
    fillTransparency: opts.fillTransparency,
    lineColor: opts.lineColor,
    linePt: 1.4,
  });

  slide.addText("ENERGIZER", {
    x: opts.x + 0.2,
    y: opts.y + 0.16,
    w: opts.w - 0.4,
    h: 0.2,
    fontFace: "Arial",
    fontSize: 10,
    bold: true,
    color: COLORS.textSoft,
    margin: 0,
  });

  slide.addShape(pptx.ShapeType.ellipse, {
    x: opts.x + (opts.w - 0.22) / 2,
    y: opts.y + 0.39,
    w: 0.22,
    h: 0.22,
    line: { color: "F7C5C0", transparency: 100 },
    fill: { color: "F7C5C0" },
  });

  slide.addText("＋50", {
    x: opts.x + 0.18,
    y: opts.y + 0.69,
    w: opts.w - 0.36,
    h: 0.2,
    fontFace: "Arial",
    fontSize: 21,
    bold: true,
    color: COLORS.white,
    margin: 0,
    align: "center",
  });
}

function addGhostComboCard(slide, opts = {}) {
  addPanel(slide, {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    fillColor: opts.fillColor,
    fillTransparency: opts.fillTransparency,
    lineColor: opts.lineColor,
    linePt: 1.4,
  });

  slide.addText("GHOST BONUS", {
    x: opts.x + 0.2,
    y: opts.y + 0.16,
    w: opts.w - 0.4,
    h: 0.2,
    fontFace: "Arial",
    fontSize: 10,
    bold: true,
    color: COLORS.textSoft,
    margin: 0,
  });

  slide.addImage({
    path: GHOST_BONUS_ICON,
    x: opts.x + (opts.w - 0.28) / 2,
    y: opts.y + 0.39,
    w: 0.28,
    h: 0.28,
  });

  slide.addText("+200 / +400 / +800 / +1600", {
    x: opts.x + 0.16,
    y: opts.y + 0.71,
    w: opts.w - 0.32,
    h: 0.16,
    fontFace: "Arial",
    fontSize: 10,
    bold: true,
    color: COLORS.white,
    margin: 0,
    align: "center",
  });
}

function addFruitCard(slide, opts = {}) {
  addPanel(slide, {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    fillColor: opts.fillColor,
    fillTransparency: opts.fillTransparency,
    lineColor: opts.lineColor,
    linePt: 1.4,
  });

  slide.addText("FRUIT", {
    x: opts.x + 0.2,
    y: opts.y + 0.16,
    w: opts.w - 0.4,
    h: 0.2,
    fontFace: "Arial",
    fontSize: 10,
    bold: true,
    color: COLORS.textSoft,
    margin: 0,
  });

  slide.addImage({
    path: CHERRIES_ICON,
    x: opts.x + (opts.w - 0.42) / 2,
    y: opts.y + 0.36,
    w: 0.38,
    h: 0.31,
  });

  slide.addText("BONUS", {
    x: opts.x + 0.18,
    y: opts.y + 0.72,
    w: opts.w - 0.36,
    h: 0.2,
    fontFace: "Arial",
    fontSize: 16,
    bold: true,
    color: COLORS.white,
    margin: 0,
    align: "center",
  });
}

function addSectionCard(slide, title, items, opts = {}) {
  addPanel(slide, {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    fillColor: opts.fillColor ?? COLORS.white,
    fillTransparency: opts.fillTransparency,
    lineColor: opts.lineColor ?? COLORS.line,
    linePt: 1.3,
  });

  slide.addText(title, {
    x: opts.x + 0.25,
    y: opts.y + 0.22,
    w: opts.w - 0.5,
    h: 0.3,
    fontFace: "Arial",
    fontSize: 18,
    bold: true,
    color: COLORS.white,
    margin: 0,
  });

  slide.addShape(pptx.ShapeType.line, {
    x: opts.x + 0.25,
    y: opts.y + 0.62,
    w: opts.w - 0.5,
    h: 0,
    line: { color: opts.lineColor ?? COLORS.line, pt: 1, transparency: 18 },
  });

  const content = items.map((item) => `• ${item}`).join("\n");

  slide.addText(content, {
    x: opts.x + 0.25,
    y: opts.y + 0.82,
    w: opts.w - 0.5,
    h: opts.h - 1.02,
    fontFace: "Arial",
    fontSize: opts.fontSize ?? 16,
    color: opts.textColor ?? COLORS.white,
    margin: 0,
    paraSpaceAfterPt: opts.paraSpaceAfterPt ?? 9,
    valign: "top",
    breakLine: true,
  });
}

function addSummaryBand(slide, text, opts = {}) {
  addPanel(slide, {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    fillColor: opts.fillColor ?? COLORS.light,
    fillTransparency: opts.fillTransparency,
    lineColor: opts.lineColor ?? COLORS.line,
    linePt: 1.1,
  });

  slide.addText(text, {
    x: opts.x + 0.28,
    y: opts.y + 0.18,
    w: opts.w - 0.56,
    h: opts.h - 0.24,
    fontFace: "Arial",
    fontSize: opts.fontSize ?? 15,
    bold: opts.bold ?? false,
    color: opts.textColor ?? COLORS.white,
    margin: 0,
    valign: "mid",
  });
}

function addBulletParagraph(slide, items, opts = {}) {
  const content = items.map((item) => `• ${item}`).join("\n");
  slide.addText(content, {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    fontFace: "Arial",
    fontSize: opts.fontSize ?? 16,
    color: opts.textColor ?? COLORS.ink,
    margin: 0,
    paraSpaceAfterPt: opts.paraSpaceAfterPt ?? 8,
    valign: "top",
    breakLine: true,
  });
}

function addIntroSlide() {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.white };
  addPacmanBackground(slide);
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 7.5,
    line: { color: "000000", transparency: 100 },
    fill: { color: "000000", transparency: 58 },
  });
  addHeader(slide, "", "Project Overview", COLORS.gold);

  addSummaryBand(slide, "Decision-Theoretic Navigation Under Uncertainty in Dynamic Grids", {
    x: 0.7,
    y: 1.58,
    w: 11.95,
    h: 0.72,
    fillColor: "1A2030",
    lineColor: COLORS.gold,
    fontSize: 19,
    bold: true,
    fillTransparency: 20,
  });

  slide.addText("Participants", {
    x: 0.7,
    y: 2.58,
    w: 2.2,
    h: 0.24,
    fontFace: "Arial",
    fontSize: 12,
    bold: true,
    color: COLORS.textSoft,
    margin: 0,
  });

  const participantCards = [
    { name: "Michael Liu", x: 0.7, color: COLORS.blue },
    { name: "Ruiding Feng", x: 4.39, color: COLORS.teal },
    { name: "Zhichun Xiao", x: 8.08, color: COLORS.gold },
  ];

  for (const card of participantCards) {
    addPanel(slide, {
      x: card.x,
      y: 2.88,
      w: 3.2,
      h: 0.92,
      fillColor: "1A2030",
      lineColor: card.color,
      linePt: 1.3,
      fillTransparency: 20,
    });
    slide.addText(card.name, {
      x: card.x + 0.18,
      y: 3.18,
      w: 2.84,
      h: 0.24,
      fontFace: "Arial",
      fontSize: 17,
      bold: true,
      color: COLORS.white,
      align: "center",
      margin: 0,
    });
  }

  addSectionCard(
    slide,
    "Major Objective",
    [
      "Study decision-making under uncertainty through a stochastic navigation problem.",
      "Use a Pac-Man-style environment to model pursuit, risk, and long-horizon planning.",
      "Learn a policy that maximizes score while aiming for a no-death level clear."
    ],
    {
      x: 0.7,
      y: 4.12,
      w: 11.95,
      h: 1.64,
      fillColor: "1A2030",
      lineColor: COLORS.teal,
      fontSize: 16,
      paraSpaceAfterPt: 7,
      fillTransparency: 20,
    }
  );

  addSummaryBand(slide, "This progress update focuses on the current RL formulation, reward design, and optimization strategy.", {
    x: 0.7,
    y: 6.04,
    w: 11.95,
    h: 0.5,
    fillColor: "1A2030",
    lineColor: COLORS.line,
    fontSize: 14,
    fillTransparency: 20,
  });

  warnIfSlideHasOverlaps(slide, pptx);
  warnIfSlideElementsOutOfBounds(slide, pptx);
}

function addSlide1() {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.white };
  addPacmanBackground(slide);
  addHeader(slide, "Slide 1", "Game Rules and Scoring", COLORS.blue);

  addLivesCard(slide, {
    x: 0.7,
    y: 2.0,
    w: 1.95,
    h: 1.02,
    fillColor: "1A2030",
    lineColor: COLORS.red,
    valueColor: COLORS.darkRed,
    fillTransparency: 20,
  });
  addPelletCard(slide, {
    x: 2.85,
    y: 2.0,
    w: 1.95,
    h: 1.02,
    fillColor: "1A2030",
    lineColor: COLORS.blue,
    valueColor: COLORS.darkBlue,
    fillTransparency: 20,
  });
  addEnergizerCard(slide, {
    x: 5.0,
    y: 2.0,
    w: 2.15,
    h: 1.02,
    fillColor: "1A2030",
    lineColor: COLORS.teal,
    valueColor: COLORS.darkTeal,
    fillTransparency: 20,
  });
  addGhostComboCard(slide, {
    x: 7.35,
    y: 2.0,
    w: 2.65,
    h: 1.02,
    fillColor: "1A2030",
    lineColor: COLORS.gold,
    valueColor: "A66A00",
    fillTransparency: 20,
  });
  addFruitCard(slide, {
    x: 10.2,
    y: 2.0,
    w: 2.45,
    h: 1.02,
    fillColor: "1A2030",
    lineColor: COLORS.line,
    valueColor: COLORS.ink,
    fillTransparency: 20,
  });

  addSectionCard(
    slide,
    "Rules",
    [
      "The player controls Pac-Man and clears the maze by eating all pellets and energizers.",
      "Pac-Man starts the game with 3 lives.",
      "Colliding with a normal ghost costs 1 life.",
      "The game ends when all 3 lives are lost."
    ],
    {
      x: 0.7,
      y: 3.22,
      w: 5.95,
      h: 3.1,
      fillColor: "1A2030",
      lineColor: COLORS.blue,
      titleColor: COLORS.darkBlue,
      fontSize: 16,
      paraSpaceAfterPt: 9,
      fillTransparency: 20,
    }
  );

  addSectionCard(
    slide,
    "Scoring",
    [
      "Eating a regular pellet gives +10 points.",
      "Eating an energizer gives +50 points and makes ghosts vulnerable for a limited time.",
      "Eating vulnerable ghosts gives increasing bonus rewards: +200 / +400 / +800 / +1600.",
      "Fruit appears at specific stages and gives bonus points when collected."
    ],
    {
      x: 6.88,
      y: 3.22,
      w: 5.77,
      h: 3.1,
      fillColor: "1A2030",
      lineColor: COLORS.teal,
      titleColor: COLORS.darkTeal,
      fontSize: 15,
      paraSpaceAfterPt: 8,
      fillTransparency: 20,
    }
  );

  addSummaryBand(slide, "Core objective: score as much as possible while surviving long enough to clear the maze.", {
    x: 0.7,
    y: 6.5,
    w: 11.95,
    h: 0.46,
    fillColor: "1A2030",
    lineColor: COLORS.line,
    fontSize: 14,
    fillTransparency: 20,
  });

  warnIfSlideHasOverlaps(slide, pptx);
  warnIfSlideElementsOutOfBounds(slide, pptx);
}

function addSlide2() {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.white };
  addPacmanBackground(slide);
  addHeader(slide, "Slide 2", "Q-Learning Update Rule (RL)", COLORS.teal);

  slide.addText("Markov Decision Process (MDP)", {
    x: 0.7,
    y: 1.58,
    w: 3.7,
    h: 0.22,
    fontFace: "Arial",
    fontSize: 11,
    bold: true,
    color: COLORS.textSoft,
    margin: 0,
  });

  slide.addText("Q(s,a) ← Q(s,a) + α[r + γ max_a' Q(s',a') − Q(s,a)]", {
    x: 0.7,
    y: 1.82,
    w: 11.95,
    h: 0.34,
    fontFace: "Arial",
    fontSize: 17,
    bold: true,
    color: COLORS.white,
    margin: 0,
  });

  slide.addText("How the formula updates action values from reward and future return", {
    x: 0.7,
    y: 2.18,
    w: 7.2,
    h: 0.22,
    fontFace: "Arial",
    fontSize: 12,
    bold: true,
    color: COLORS.textSoft,
    margin: 0,
  });

  addInlineMetricCard(slide, "PELLET/E.", "+10/+50", {
    x: 0.7,
    y: 2.54,
    w: 1.9,
    h: 0.72,
    fillColor: "1A2030",
    lineColor: COLORS.blue,
    valueColor: COLORS.white,
    fillTransparency: 20,
    labelFontSize: 9,
    valueFontSize: 13,
  });
  addInlineMetricCard(slide, "FRUIT/GHOST", "Bns/+200~1600", {
    x: 2.71,
    y: 2.54,
    w: 1.9,
    h: 0.72,
    fillColor: "1A2030",
    lineColor: COLORS.gold,
    valueColor: COLORS.white,
    fillTransparency: 20,
    labelFontSize: 9,
    valueFontSize: 11,
  });
  addInlineMetricCard(slide, "ESCAPE/CHASE", "+1.5/+3", {
    x: 4.72,
    y: 2.54,
    w: 1.9,
    h: 0.72,
    fillColor: "1A2030",
    lineColor: COLORS.teal,
    valueColor: COLORS.white,
    fillTransparency: 20,
    labelFontSize: 9,
    valueFontSize: 13,
  });
  addInlineMetricCard(slide, "FRUIT/CLEAR", "+2/+500", {
    x: 6.73,
    y: 2.54,
    w: 1.9,
    h: 0.72,
    fillColor: "1A2030",
    lineColor: COLORS.teal,
    valueColor: COLORS.white,
    fillTransparency: 20,
    labelFontSize: 9,
    valueFontSize: 13,
  });
  addInlineMetricCard(slide, "STEP/PRESS.", "-1/-0.5×P", {
    x: 8.74,
    y: 2.54,
    w: 1.9,
    h: 0.72,
    fillColor: "1A2030",
    lineColor: COLORS.red,
    valueColor: COLORS.white,
    fillTransparency: 20,
    labelFontSize: 9,
    valueFontSize: 12,
  });
  addInlineMetricCard(slide, "TIMEOUT/DEATH", "-250/Large-", {
    x: 10.75,
    y: 2.54,
    w: 1.9,
    h: 0.72,
    fillColor: "1A2030",
    lineColor: COLORS.red,
    valueColor: COLORS.white,
    fillTransparency: 20,
    labelFontSize: 9,
    valueFontSize: 11,
  });

  addSectionCard(
    slide,
    "Score Rewards",
    [
      "Pellet: +10",
      "Energizer: +50",
      "Fruit collection: fruit bonus",
      "Vulnerable ghost combo: +200 / +400 / +800 / +1600"
    ],
    {
      x: 0.7,
      y: 3.56,
      w: 3.78,
      h: 2.48,
      fillColor: "1A2030",
      lineColor: COLORS.blue,
      titleColor: COLORS.darkTeal,
      fontSize: 12.5,
      paraSpaceAfterPt: 5,
      fillTransparency: 20,
    }
  );

  addSectionCard(
    slide,
    "Shaping Rewards",
    [
      "Escape a nearby dangerous ghost: +1.5",
      "Move closer to a vulnerable ghost: +3",
      "Move closer to fruit: +2",
      "Clear the level: +500"
    ],
    {
      x: 4.78,
      y: 3.56,
      w: 3.78,
      h: 2.48,
      fillColor: "1A2030",
      lineColor: COLORS.teal,
      titleColor: COLORS.darkRed,
      fontSize: 12.5,
      paraSpaceAfterPt: 5,
      fillTransparency: 20,
    }
  );

  addSectionCard(
    slide,
    "Penalties",
    [
      "Step cost: -1",
      "Danger pressure: -0.5 × threat pressure",
      "Timeout at 900 steps: -250",
      "Death: large negative reward including score reset loss"
    ],
    {
      x: 8.87,
      y: 3.56,
      w: 3.78,
      h: 2.48,
      fillColor: "1A2030",
      lineColor: COLORS.red,
      titleColor: COLORS.darkRed,
      fontSize: 12.5,
      paraSpaceAfterPt: 5,
      fillTransparency: 20,
    }
  );

  warnIfSlideHasOverlaps(slide, pptx);
  warnIfSlideElementsOutOfBounds(slide, pptx);
}

function addSlide3() {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.white };
  addPacmanBackground(slide);
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 7.5,
    line: { color: "000000", transparency: 100 },
    fill: { color: "000000", transparency: 55 },
  });
  addHeader(slide, "Slide 3", "Optimization", COLORS.gold);

  addSummaryBand(slide, "Goal: clear the level without losing a single life.", {
    x: 0.7,
    y: 1.7,
    w: 11.95,
    h: 0.56,
    fillColor: "1A2030",
    lineColor: COLORS.gold,
    fontSize: 18,
    bold: true,
    fillTransparency: 20,
  });

  slide.addText("Death Handling Mechanisms", {
    x: 0.7,
    y: 2.48,
    w: 5.2,
    h: 0.3,
    fontFace: "Arial",
    fontSize: 14,
    bold: true,
    color: COLORS.white,
    margin: 0,
  });

  slide.addShape(pptx.ShapeType.line, {
    x: 0.7,
    y: 2.8,
    w: 2.55,
    h: 0,
    line: { color: COLORS.gold, pt: 1.1, transparency: 18 },
  });

  addSectionCard(
    slide,
    "Model 1",
    [
      "Pac-Man has 3 lives.",
      "Rewards keep accumulating across lives.",
      "Dying does not reset the score."
    ],
    {
      x: 0.7,
      y: 3.0,
      w: 3.75,
      h: 2.5,
      fillColor: "1A2030",
      lineColor: COLORS.blue,
      fontSize: 13.5,
      paraSpaceAfterPt: 6,
      fillTransparency: 20,
    }
  );

  addSectionCard(
    slide,
    "Model 2",
    [
      "Pac-Man has 3 lives.",
      "If Pac-Man dies, the score resets to 0.",
      "This creates a much stronger penalty for death."
    ],
    {
      x: 4.79,
      y: 3.0,
      w: 3.75,
      h: 2.5,
      fillColor: "1A2030",
      lineColor: COLORS.teal,
      fontSize: 13.5,
      paraSpaceAfterPt: 6,
      fillTransparency: 20,
    }
  );

  addSectionCard(
    slide,
    "Model 3",
    [
      "Pac-Man has 3 lives.",
      "If Pac-Man dies, the next life starts from a score below 0.",
      "This is the harshest death penalty among the three models."
    ],
    {
      x: 8.88,
      y: 3.0,
      w: 3.75,
      h: 2.5,
      fillColor: "1A2030",
      lineColor: COLORS.red,
      fontSize: 13.5,
      paraSpaceAfterPt: 6,
      fillTransparency: 20,
    }
  );

  slide.addText("Example Start Values (if each death happens after reaching 1200 points)", {
    x: 0.7,
    y: 5.62,
    w: 7.6,
    h: 0.22,
    fontFace: "Arial",
    fontSize: 11,
    bold: true,
    color: COLORS.textSoft,
    margin: 0,
  });

  const lifeCards = [
    { title: "Model 1 Start Value", lines: ["Life 1: 0", "Life 2: 1200", "Life 3: 2400"], x: 0.7, lineColor: COLORS.blue },
    { title: "Model 2 Start Value", lines: ["Life 1: 0", "Life 2: 0", "Life 3: 0"], x: 4.79, lineColor: COLORS.teal },
    { title: "Model 3 Start Value", lines: ["Life 1: 0", "Life 2: -360", "Life 3: -720"], x: 8.88, lineColor: COLORS.red },
  ];

  for (const card of lifeCards) {
    addPanel(slide, {
      x: card.x,
      y: 5.88,
      w: 3.75,
      h: 1.12,
      fillColor: "1A2030",
      lineColor: card.lineColor,
      linePt: 1.3,
      fillTransparency: 20,
    });

    slide.addText(card.title, {
      x: card.x + 0.25,
      y: 6.03,
      w: 2.95,
      h: 0.22,
      fontFace: "Arial",
      fontSize: 11.5,
      bold: true,
      color: COLORS.white,
      margin: 0,
    });

    slide.addShape(pptx.ShapeType.line, {
      x: card.x + 0.25,
      y: 6.28,
      w: 3.15,
      h: 0,
      line: { color: card.lineColor, pt: 1, transparency: 18 },
    });

    slide.addText(card.lines.join("\n"), {
      x: card.x + 0.25,
      y: 6.44,
      w: 3.1,
      h: 0.42,
      fontFace: "Arial",
      fontSize: 10.5,
      color: COLORS.white,
      margin: 0,
      breakLine: true,
      paraSpaceAfterPt: 2,
    });
  }

  warnIfSlideHasOverlaps(slide, pptx);
  warnIfSlideElementsOutOfBounds(slide, pptx);
}

addIntroSlide();
addSlide1();
addSlide2();
addSlide3();

pptx.writeFile({ fileName: "pacman_rl_3slides.pptx" });
