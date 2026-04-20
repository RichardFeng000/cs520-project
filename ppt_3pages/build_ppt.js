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
const CHERRIES_ICON = path.resolve(__dirname, "ui_fruit_cherries.png");
const GHOST_BONUS_ICON = path.resolve(__dirname, "ui_ghost_blue.png");
const GAMEPLAY_SHOT = path.resolve(__dirname, "../pacman/shots/pac.png");
const PACMAN_BG_SOFT = path.resolve(__dirname, "pacman_neon_bg.png");

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
    y: opts.y + 0.18,
    w: opts.w - 0.4,
    h: 0.22,
    fontFace: "Arial",
    fontSize: 10,
    bold: true,
    color: COLORS.textSoft,
    margin: 0,
  });

  slide.addText(value, {
    x: opts.x + 0.2,
    y: opts.y + 0.45,
    w: opts.w - 0.4,
    h: 0.38,
    fontFace: "Arial",
    fontSize: 22,
    bold: true,
    color: opts.valueColor ?? COLORS.ink,
    margin: 0,
  });
}

function addLivesCard(slide, opts = {}) {
  addPanel(slide, {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    fillColor: opts.fillColor,
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
    fillColor: COLORS.glass,
    lineColor: COLORS.red,
    valueColor: COLORS.darkRed,
    fillTransparency: 100,
  });
  addPelletCard(slide, {
    x: 2.85,
    y: 2.0,
    w: 1.95,
    h: 1.02,
    fillColor: COLORS.glass,
    lineColor: COLORS.blue,
    valueColor: COLORS.darkBlue,
    fillTransparency: 100,
  });
  addEnergizerCard(slide, {
    x: 5.0,
    y: 2.0,
    w: 2.15,
    h: 1.02,
    fillColor: COLORS.glass,
    lineColor: COLORS.teal,
    valueColor: COLORS.darkTeal,
    fillTransparency: 100,
  });
  addGhostComboCard(slide, {
    x: 7.35,
    y: 2.0,
    w: 2.65,
    h: 1.02,
    fillColor: COLORS.glass,
    lineColor: COLORS.gold,
    valueColor: "A66A00",
    fillTransparency: 100,
  });
  addFruitCard(slide, {
    x: 10.2,
    y: 2.0,
    w: 2.45,
    h: 1.02,
    fillColor: COLORS.glass,
    lineColor: COLORS.line,
    valueColor: COLORS.ink,
    fillTransparency: 100,
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
      fillColor: COLORS.glass,
      lineColor: COLORS.blue,
      titleColor: COLORS.darkBlue,
      fontSize: 16,
      paraSpaceAfterPt: 9,
      fillTransparency: 100,
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
      fillColor: COLORS.glass,
      lineColor: COLORS.teal,
      titleColor: COLORS.darkTeal,
      fontSize: 15,
      paraSpaceAfterPt: 8,
      fillTransparency: 100,
    }
  );

  addSummaryBand(slide, "Core objective: score as much as possible while surviving long enough to clear the maze.", {
    x: 0.7,
    y: 6.5,
    w: 11.95,
    h: 0.46,
    fillColor: COLORS.glass,
    lineColor: COLORS.line,
    fontSize: 14,
    fillTransparency: 100,
  });

  warnIfSlideHasOverlaps(slide, pptx);
  warnIfSlideElementsOutOfBounds(slide, pptx);
}

function addSlide2() {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.white };
  addPacmanBackground(slide);
  addHeader(slide, "Slide 2", "Reward and Penalty Design", COLORS.teal);

  addTag(slide, "Efficiency", {
    x: 0.7,
    y: 1.98,
    w: 1.45,
    h: 0.46,
    fillColor: COLORS.softBlue,
    lineColor: COLORS.blue,
    textColor: COLORS.darkBlue,
  });
  addTag(slide, "Survival", {
    x: 2.3,
    y: 1.98,
    w: 1.45,
    h: 0.46,
    fillColor: COLORS.softRed,
    lineColor: COLORS.red,
    textColor: COLORS.darkRed,
  });
  addTag(slide, "Opportunity", {
    x: 3.9,
    y: 1.98,
    w: 1.65,
    h: 0.46,
    fillColor: COLORS.softGold,
    lineColor: COLORS.gold,
    textColor: "A66A00",
  });
  addTag(slide, "Long-term Return", {
    x: 5.7,
    y: 1.98,
    w: 2.15,
    h: 0.46,
    fillColor: COLORS.softTeal,
    lineColor: COLORS.teal,
    textColor: COLORS.darkTeal,
  });

  addSectionCard(
    slide,
    "Rewards",
    [
      "Positive rewards are given for collecting pellets, energizers, fruit, and vulnerable ghosts.",
      "Moving away from nearby dangerous ghosts gives an extra reward.",
      "Moving closer to vulnerable ghosts gives an extra reward.",
      "Moving closer to fruit also gives an extra reward.",
      "Clearing the level gives a large terminal reward of +500."
    ],
    {
    x: 0.7,
    y: 2.72,
    w: 5.98,
    h: 3.82,
      fillColor: COLORS.glass,
      lineColor: COLORS.teal,
      titleColor: COLORS.darkTeal,
      fontSize: 15,
      paraSpaceAfterPt: 8,
      fillTransparency: 100,
    }
  );

  addSectionCard(
    slide,
    "Penalties",
    [
      "A step penalty of -1 discourages wandering without progress.",
      "Additional penalty is applied when the danger level around Pac-Man is high.",
      "Exceeding the step limit causes a timeout penalty of -250.",
      "Dying causes a large negative reward to strongly discourage losing lives."
    ],
    {
      x: 6.9,
      y: 2.72,
      w: 5.75,
      h: 3.82,
      fillColor: COLORS.glass,
      lineColor: COLORS.red,
      titleColor: COLORS.darkRed,
      fontSize: 15,
      paraSpaceAfterPt: 8,
      fillTransparency: 100,
    }
  );

  addMetricCard(slide, "STEP COST", "-1", {
    x: 0.7,
    y: 6.58,
    w: 1.95,
    h: 0.72,
    fillColor: COLORS.glass,
    lineColor: COLORS.blue,
    valueColor: COLORS.darkBlue,
    fillTransparency: 100,
  });
  addMetricCard(slide, "CLEAR BONUS", "+500", {
    x: 2.88,
    y: 6.58,
    w: 2.2,
    h: 0.72,
    fillColor: COLORS.glass,
    lineColor: COLORS.teal,
    valueColor: COLORS.darkTeal,
    fillTransparency: 100,
  });
  addMetricCard(slide, "TIMEOUT", "-250", {
    x: 5.32,
    y: 6.58,
    w: 2.1,
    h: 0.72,
    fillColor: COLORS.glass,
    lineColor: COLORS.gold,
    valueColor: "A66A00",
    fillTransparency: 100,
  });
  addMetricCard(slide, "DEATH", "LARGE -", {
    x: 7.64,
    y: 6.58,
    w: 2.1,
    h: 0.72,
    fillColor: COLORS.glass,
    lineColor: COLORS.red,
    valueColor: COLORS.darkRed,
    fillTransparency: 100,
  });
  addSummaryBand(slide, "The reward function is shaped to balance score, safety, and efficiency instead of only maximizing immediate points.", {
    x: 9.98,
    y: 6.58,
    w: 2.67,
    h: 0.72,
    fillColor: COLORS.glass,
    lineColor: COLORS.line,
    fontSize: 10,
    fillTransparency: 100,
  });

  warnIfSlideHasOverlaps(slide, pptx);
  warnIfSlideElementsOutOfBounds(slide, pptx);
}

function addSlide3() {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.white };
  addHeader(slide, "Slide 3", "Discussion Placeholder", COLORS.gold);

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 1.05,
    y: 2.2,
    w: 11.2,
    h: 3.6,
    rectRadius: 0.1,
    line: { color: COLORS.gold, pt: 2, dash: "dash" },
    fill: { color: "FFF9E8" },
  });

  slide.addText("Content to be added later", {
    x: 3.45,
    y: 3.05,
    w: 6.4,
    h: 0.55,
    align: "center",
    fontFace: "Arial",
    fontSize: 26,
    bold: true,
    color: COLORS.ink,
    margin: 0,
  });

  slide.addText("Reserved for the final discussion point.", {
    x: 3.25,
    y: 3.82,
    w: 6.8,
    h: 0.35,
    align: "center",
    fontFace: "Arial",
    fontSize: 16,
    color: COLORS.muted,
    margin: 0,
  });

  warnIfSlideHasOverlaps(slide, pptx);
  warnIfSlideElementsOutOfBounds(slide, pptx);
}

addSlide1();
addSlide2();
addSlide3();

pptx.writeFile({ fileName: "pacman_rl_3slides.pptx" });
