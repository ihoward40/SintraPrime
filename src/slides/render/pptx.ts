import path from "node:path";
import { writeFile } from "node:fs/promises";

import PptxGenJS from "pptxgenjs";

import type { Deck, Card } from "../outline/compile.js";
import type { BrandKit } from "../brandkit/load.js";
import { autoColumnWidths, paginateTable, parseMarkdownTable, renderTableGrid } from "./table-grid.js";
import { renderCodeBlock } from "./code-block.js";

export async function renderPptx(opts: { deck: Deck; brand: BrandKit; outPath: string }): Promise<{ outPath: string }> {
  const pptx: any = new (PptxGenJS as any)();
  pptx.layout = "LAYOUT_WIDE";

  for (const card of opts.deck.cards) {
    if (card.kind === "table" && card.table?.markdown) {
      const handled = addTableSlides(pptx, card, opts.deck, opts.brand);
      if (handled) continue;
    }

    addSlide(pptx, card, opts.deck, opts.brand);
  }

  const buf = await pptx.write("nodebuffer");
  await writeFile(path.resolve(process.cwd(), opts.outPath), buf);
  return { outPath: opts.outPath };
}

function addSlide(pptx: any, card: Card, deck: Deck, brand: BrandKit) {
  // Section divider slides are intentionally a different layout.
  if (card.kind === "section") {
    const slide = pptx.addSlide();
    const W = brand.layout.slide_w;
    const H = brand.layout.slide_h;
    const m = brand.layout.margin;

    slide.background = { color: stripHash(brand.colors.background) };

    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0.5,
      w: W,
      h: H - 0.5,
      fill: { color: stripHash(brand.colors.background) },
      line: { color: stripHash(brand.colors.background) },
    });

    const sectionLabel = card.section_no ? `${card.section_no}. ${card.title}` : card.title;

    slide.addText(sectionLabel, {
      x: m,
      y: 2.7,
      w: W - 2 * m,
      h: 1.2,
      fontFace: brand.typography.font_family,
      fontSize: 44,
      color: stripHash(brand.colors.text),
      bold: true,
      align: "center",
      valign: "mid",
    });

    slide.addShape(pptx.ShapeType.rect, {
      x: W / 2 - 2.2,
      y: 4.1,
      w: 4.4,
      h: 0.08,
      fill: { color: stripHash(brand.colors.accent) },
      line: { color: stripHash(brand.colors.accent) },
    });

    applySpeakerNotes(slide, card.notes);
    return;
  }

  const chrome = createStandardSlideChrome(pptx, card, deck, brand);
  const { slide, bodyX, bodyY, bodyW, bodyH } = chrome;

  if (card.kind === "title") {
    if (deck.subtitle) {
      slide.addText(deck.subtitle, {
        x: bodyX,
        y: bodyY,
        w: bodyW,
        h: 1.0,
        fontFace: brand.typography.font_family,
        fontSize: 28,
        color: stripHash(brand.colors.text),
      });
    }
    applySpeakerNotes(slide, card.notes);
    return;
  }

  if (card.kind === "agenda" && card.agenda?.sections?.length) {
    const lines: string[] = [];
    for (const s of card.agenda.sections) {
      const label =
        s.section_no && s.section_title
          ? `${s.section_no}. ${s.section_title}`
          : String(s.section_title ?? s.title ?? "Section");
      lines.push(label);
      for (const t of s.topics ?? []) lines.push(`  • ${t}`);
      lines.push("");
    }

    slide.addText(lines.join("\n").trim(), {
      x: bodyX,
      y: bodyY,
      w: bodyW,
      h: bodyH,
      fontFace: brand.typography.font_family,
      fontSize: 20,
      color: stripHash(brand.colors.text),
      valign: "top",
    });

    applySpeakerNotes(slide, card.notes);
    return;
  }

  if (card.kind === "quote" && card.quote) {
    slide.addText(`“${card.quote}”`, {
      x: bodyX,
      y: bodyY,
      w: bodyW,
      h: bodyH,
      fontFace: brand.typography.font_family,
      fontSize: 24,
      italic: true,
      color: stripHash(brand.colors.text),
    });

    if (card.attribution) {
      slide.addText(`— ${card.attribution}`, {
        x: bodyX,
        y: bodyY + 3.2,
        w: bodyW,
        h: 0.6,
        fontFace: brand.typography.font_family,
        fontSize: 16,
        color: stripHash(brand.colors.muted ?? brand.colors.text),
      });
    }

    applySpeakerNotes(slide, card.notes);
    return;
  }

  if (card.kind === "bullets" && card.bullets?.length) {
    const max = brand.layout.max_bullets ?? 6;
    const bullets = card.bullets.slice(0, max);
    const lines = bullets.map((b) => `• ${b}`).join("\n");
    slide.addText(lines, {
      x: bodyX,
      y: bodyY,
      w: bodyW,
      h: bodyH,
      fontFace: brand.typography.font_family,
      fontSize: 20,
      color: stripHash(brand.colors.text),
      valign: "top",
    });

    applySpeakerNotes(slide, card.notes);
    return;
  }

  if (card.kind === "code" && card.code?.text) {
    renderCodeBlock({
      pptx,
      slide,
      brand,
      x: bodyX,
      y: bodyY,
      w: bodyW,
      h: bodyH,
      code: card.code.text,
      language: card.code.language,
    });

    applySpeakerNotes(slide, card.notes);
    return;
  }

  if (card.kind === "table" && card.table?.markdown) {
    const parsed = parseMarkdownTable(card.table.markdown);
    if (parsed) {
      renderTableGrid({
        pptx,
        slide,
        headers: parsed.headers,
        rows: parsed.rows,
        rowHeights: new Array(parsed.rows.length).fill((bodyH - Math.min(0.6, bodyH * 0.18)) / Math.max(1, parsed.rows.length)),
        brand,
        x: bodyX,
        y: bodyY,
        w: bodyW,
        h: bodyH,
      });
    } else {
      const mono = brand.typography.mono_family ?? brand.typography.font_family;
      slide.addText(card.table.markdown, {
        x: bodyX,
        y: bodyY,
        w: bodyW,
        h: bodyH,
        fontFace: mono,
        fontSize: 14,
        color: stripHash(brand.colors.text),
        valign: "top",
      });
    }

    applySpeakerNotes(slide, card.notes);
    return;
  }

  slide.addText(card.notes ?? "", {
    x: bodyX,
    y: bodyY,
    w: bodyW,
    h: bodyH,
    fontFace: brand.typography.font_family,
    fontSize: 18,
    color: stripHash(brand.colors.text),
  });
  applySpeakerNotes(slide, card.notes);
}

function createStandardSlideChrome(
  pptx: any,
  card: Card,
  deck: Deck,
  brand: BrandKit,
  headerOverride?: { main?: string }
): {
  slide: any;
  W: number;
  H: number;
  m: number;
  bodyX: number;
  bodyY: number;
  bodyW: number;
  bodyH: number;
} {
  const slide = pptx.addSlide();

  const W = brand.layout.slide_w;
  const H = brand.layout.slide_h;
  const m = brand.layout.margin;

  slide.background = { color: stripHash(brand.colors.background) };

  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: W,
    h: 0.5,
    fill: { color: stripHash(brand.colors.card_bg ?? "#151520") },
    line: { color: stripHash(brand.colors.card_bg ?? "#151520") },
  });

  const headerMain = headerOverride?.main ?? (card.kind === "title" ? deck.title : card.title);
  const headerRight = sectionLabel(card);

  // Main header text
  slide.addText(headerMain, {
    x: m,
    y: 0.12,
    w: headerRight ? W - 2 * m - 3.0 : W - 2 * m,
    h: 0.35,
    fontFace: brand.typography.font_family,
    fontSize: 20,
    color: stripHash(brand.colors.text),
    bold: true,
  });

  if (headerRight) {
    slide.addText(headerRight, {
      x: W - m - 3.0,
      y: 0.16,
      w: 3.0,
      h: 0.28,
      fontFace: brand.typography.font_family,
      fontSize: 12,
      color: stripHash(brand.colors.muted ?? brand.colors.text),
      align: "right",
    });
  }

  slide.addShape(pptx.ShapeType.rect, {
    x: m,
    y: 0.55,
    w: W - 2 * m,
    h: 0.05,
    fill: { color: stripHash(brand.colors.accent) },
    line: { color: stripHash(brand.colors.accent) },
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: m,
    y: 0.75,
    w: W - 2 * m,
    h: H - 1.2,
    fill: { color: stripHash(brand.colors.card_bg ?? "#151520") },
    line: { color: stripHash(brand.colors.card_bg ?? "#151520") },
    radius: 0.15,
  });

  const bodyX = m + 0.4;
  const bodyY = 1.05;
  const bodyW = W - 2 * m - 0.8;
  const bodyH = H - 1.6;

  return { slide, W, H, m, bodyX, bodyY, bodyW, bodyH };
}

function sectionLabel(card: Card): string | null {
  if (card.kind === "title" || card.kind === "section") return null;
  if (card.section_no && card.section_title) return `${card.section_no}. ${card.section_title}`;
  return null;
}

function addTableSlides(pptx: any, card: Card, deck: Deck, brand: BrandKit): boolean {
  if (card.kind !== "table" || !card.table?.markdown) return false;
  const parsed = parseMarkdownTable(card.table.markdown);
  if (!parsed) return false;

  const W = brand.layout.slide_w;
  const H = brand.layout.slide_h;
  const m = brand.layout.margin;
  const bodyX = m + 0.4;
  const bodyY = 1.05;
  const bodyW = W - 2 * m - 0.8;
  const bodyH = H - 1.6;

  const fontSize = 13;
  const headerH = Math.min(0.6, bodyH * 0.18);
  const colWs = autoColumnWidths({
    headers: parsed.headers,
    rows: parsed.rows,
    totalWidth: bodyW,
    minFrac: 0.12,
    maxFrac: 0.55,
  });

  const pages = paginateTable({
    headers: parsed.headers,
    rows: parsed.rows,
    colWs,
    headerH,
    bodyH: bodyH - headerH,
    fontSize,
  });

  for (let p = 0; p < pages.length; p++) {
    const page = pages[p];
    if (!page) continue;

    const pageTitle = page.pageCount > 1 ? `${card.title} (${p + 1}/${page.pageCount})` : card.title;
    const chrome = createStandardSlideChrome(pptx, card, deck, brand, { main: pageTitle });

    renderTableGrid({
      pptx,
      slide: chrome.slide,
      headers: parsed.headers,
      rows: page.rows,
      rowHeights: page.rowHeights,
      brand,
      x: chrome.bodyX,
      y: chrome.bodyY,
      w: chrome.bodyW,
      h: chrome.bodyH,
    });

    if (page.continued) {
      addTableContinuedFooter(chrome.slide, brand, {
        x: chrome.bodyX,
        y: chrome.bodyY + chrome.bodyH + 0.05,
        w: chrome.bodyW,
        text: page.pageCount > 1 ? `Table continued… (${p + 1}/${page.pageCount})` : "Table continued…",
      });
    }

    applySpeakerNotes(chrome.slide, card.notes);
  }

  return true;
}

function addTableContinuedFooter(slide: any, brand: BrandKit, opts: { x: number; y: number; w: number; text: string }) {
  const muted = stripHash(brand.colors.muted ?? brand.colors.text);
  slide.addText(opts.text, {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: 0.25,
    fontFace: brand.typography.font_family,
    fontSize: 12,
    color: muted,
    italic: true,
    align: "right",
    valign: "mid",
  });
}

function stripHash(hex: string): string {
  return String(hex || "").replace(/^#/, "");
}

function applySpeakerNotes(slide: any, notes?: string) {
  const text = String(notes ?? "").trim();
  if (!text) return;

  if (typeof slide.addNotes === "function") {
    slide.addNotes(text);
    return;
  }

  slide.notes = text;
}
