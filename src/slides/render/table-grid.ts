import type { BrandKit } from "../brandkit/load.js";

export type ParsedTable = {
  headers: string[];
  rows: string[][];
};

export type TablePage = {
  rows: string[][];
  rowHeights: number[];
  pageIndex: number; // 0-based
  pageCount: number;
  continued: boolean; // true if pageIndex > 0
};

export function parseMarkdownTable(md: string): ParsedTable | null {
  const lines = md
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.includes("|"));

  if (lines.length < 2) return null;

  const sepIdx = lines.findIndex((l) => /\|?\s*:?-{3,}:?\s*\|/.test(l));
  if (sepIdx <= 0) return null;

  const headerLine = lines[sepIdx - 1];
  if (!headerLine) return null;
  const headers = splitRow(headerLine);
  if (headers.length === 0) return null;

  const bodyLines = lines.slice(sepIdx + 1);
  const rows = bodyLines.map(splitRow).filter((r) => r.length > 0);

  const cols = headers.length;
  const normRows = rows.map((r) => {
    const rr = r.slice(0, cols);
    while (rr.length < cols) rr.push("");
    return rr;
  });

  return { headers, rows: normRows };
}

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((x) => x.trim());
}

function clamp(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function stripHash(hex: string): string {
  return String(hex || "").replace(/^#/, "");
}

function clamp8(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function tweakHex(hex: string, delta: number): string {
  const h = stripHash(hex);
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return h;
  const r = clamp8(parseInt(h.slice(0, 2), 16) + delta);
  const g = clamp8(parseInt(h.slice(2, 4), 16) + delta);
  const b = clamp8(parseInt(h.slice(4, 6), 16) + delta);
  return [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function normalizeHeader(h: string): string {
  return (h ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 %$€£]/g, "");
}

function headerImpliesNumeric(header: string): boolean {
  const h = normalizeHeader(header);
  if (!h) return false;

  const strong = [
    "amount",
    "total",
    "subtotal",
    "sum",
    "price",
    "cost",
    "rate",
    "balance",
    "paid",
    "due",
    "fee",
    "tax",
    "taxes",
    "discount",
    "quantity",
    "qty",
    "count",
    "units",
    "percent",
    "percentage",
    "pct",
    "%",
    "number",
    "no",
    "id",
    "year",
    "month",
    "day",
  ];

  if (strong.some((k) => h === k || h.includes(k))) return true;

  if (h === "$" || h === "usd" || h === "eur" || h === "gbp") return true;
  return false;
}

function isNumericLike(s: string): boolean {
  const t = (s ?? "").toString().trim();
  if (!t) return false;
  return (
    /^[$€£]?\(?-?\d{1,3}(?:,\d{3})*(?:\.\d+)?\)?%?$/.test(t) ||
    /^-?\d+(?:\.\d+)?%?$/.test(t)
  );
}

function detectNumericColumns(headers: string[], rows: string[][]): boolean[] {
  const cols = Math.max(1, headers.length);
  const out = new Array(cols).fill(false);

  for (let c = 0; c < cols; c++) {
    const headerHint = headerImpliesNumeric(headers[c] ?? "");
    let seen = 0;
    let numeric = 0;
    for (const r of rows) {
      const v = (r?.[c] ?? "").toString().trim();
      if (!v) continue;
      seen += 1;
      if (isNumericLike(v)) numeric += 1;
    }

    const cellMajority = seen >= 2 && numeric / seen >= 0.6;
    out[c] = headerHint || cellMajority;
  }

  return out;
}

function estimateLines(text: string, colWIn: number, fontSize: number): number {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return 1;

  // V2 heuristic: proportional font, slightly more chars-per-inch than mono.
  const charW = (fontSize / 14) * 0.095;
  const maxChars = Math.max(10, Math.floor((colWIn - 0.24) / charW));

  const words = t.split(" ");
  let lines = 1;
  let cur = 0;

  for (const w of words) {
    const len = w.length;
    if (cur === 0) {
      cur = len;
      continue;
    }
    if (cur + 1 + len <= maxChars) {
      cur += 1 + len;
    } else {
      lines += 1;
      cur = len;
    }
  }

  return Math.min(lines, 6);
}

function computeRowHeights(opts: {
  rows: string[][];
  colWs: number[];
  fontSize: number;
  availableH: number;
  minRowH: number;
  maxRowH: number;
}): number[] {
  const lineH = (opts.fontSize / 14) * 0.22;
  const dense = opts.rows.length >= 10;
  const pad = dense ? 0.1 : 0.12;

  const raw = opts.rows.map((r) => {
    let maxLines = 1;
    for (let c = 0; c < opts.colWs.length; c++) {
      maxLines = Math.max(maxLines, estimateLines(r?.[c] ?? "", opts.colWs[c] ?? 1, opts.fontSize));
    }
    const h = Math.max(opts.minRowH, Math.min(opts.maxRowH, maxLines * lineH + pad));
    return h;
  });

  const sum = raw.reduce((a, b) => a + b, 0);
  if (sum <= opts.availableH + 1e-6) return raw;

  const scale = opts.availableH / sum;
  const scaled = raw.map((h) => Math.max(opts.minRowH, h * scale));
  const drift = opts.availableH - scaled.reduce((a, b) => a + b, 0);
  if (scaled.length) {
    const last = scaled.length - 1;
    scaled[last] = (scaled[last] ?? 0) + drift;
  }
  return scaled;
}

export function autoColumnWidths(opts: {
  headers: string[];
  rows: string[][];
  totalWidth: number;
  minFrac: number;
  maxFrac: number;
}): number[] {
  const cols = Math.max(1, opts.headers.length);
  const scores = new Array(cols).fill(1);

  for (let c = 0; c < cols; c++) {
    let maxLen = (opts.headers[c] ?? "").length;
    for (const r of opts.rows) maxLen = Math.max(maxLen, (r?.[c] ?? "").length);
    scores[c] = Math.max(1, Math.sqrt(maxLen));
  }

  const sum = scores.reduce((a, b) => a + b, 0);
  const minW = opts.totalWidth * opts.minFrac;
  const maxW = opts.totalWidth * opts.maxFrac;

  let widths = scores.map((s) => (s / sum) * opts.totalWidth);
  widths = widths.map((w) => Math.min(maxW, Math.max(minW, w)));

  const wSum = widths.reduce((a, b) => a + b, 0);
  const scale = wSum > 0 ? opts.totalWidth / wSum : 1;
  widths = widths.map((w) => w * scale);

  const drift = opts.totalWidth - widths.reduce((a, b) => a + b, 0);
  if (widths.length) {
    const last = widths.length - 1;
    widths[last] = (widths[last] ?? 0) + drift;
  }
  return widths;
}

export function paginateTable(opts: {
  headers: string[];
  rows: string[][];
  colWs: number[];
  headerH: number;
  bodyH: number;
  fontSize: number;
}): TablePage[] {
  const minRowH = 0.33;
  const maxRowH = 0.85;

  const pages: Array<{ rows: string[][]; rowHeights: number[] }> = [];
  let i = 0;

  while (i < opts.rows.length) {
    const remaining = opts.rows.length - i;
    let take = Math.max(1, Math.floor(opts.bodyH / minRowH));
    take = Math.min(take, remaining);

    let bestRows = opts.rows.slice(i, i + take);
    let bestHeights = computeRowHeights({
      rows: bestRows,
      colWs: opts.colWs,
      fontSize: opts.fontSize,
      availableH: opts.bodyH,
      minRowH,
      maxRowH,
    });

    while (i + take < opts.rows.length) {
      const candidate = opts.rows.slice(i, i + take + 1);
      const heights = computeRowHeights({
        rows: candidate,
        colWs: opts.colWs,
        fontSize: opts.fontSize,
        availableH: opts.bodyH,
        minRowH,
        maxRowH,
      });

      const used = heights.reduce((a, b) => a + b, 0);
      if (used <= opts.bodyH + 1e-6) {
        take += 1;
        bestRows = candidate;
        bestHeights = heights;
      } else {
        break;
      }
    }

    const bestUsed = bestHeights.reduce((a, b) => a + b, 0);
    if (bestUsed > opts.bodyH + 1e-6 && bestRows.length > 1) {
      bestRows = opts.rows.slice(i, i + 1);
      bestHeights = computeRowHeights({
        rows: bestRows,
        colWs: opts.colWs,
        fontSize: opts.fontSize,
        availableH: opts.bodyH,
        minRowH,
        maxRowH,
      });
      take = 1;
    }

    pages.push({ rows: bestRows, rowHeights: bestHeights });
    i += take;
  }

  const pageCount = pages.length;
  return pages.map((p, idx) => ({
    ...p,
    pageIndex: idx,
    pageCount,
    continued: idx > 0,
  }));
}

export function renderTableGrid(opts: {
  pptx: any;
  slide: any;
  headers: string[];
  rows: string[][];
  rowHeights: number[];
  brand: BrandKit;
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  const { slide, brand } = opts;

  const cols = Math.max(1, opts.headers.length);
  const rowCount = Math.max(1, opts.rows.length);

  const headerH = Math.min(0.6, opts.h * 0.18);
  const bodyH = opts.h - headerH;

  const colWs = autoColumnWidths({
    headers: opts.headers,
    rows: opts.rows,
    totalWidth: opts.w,
    minFrac: 0.12,
    maxFrac: 0.55,
  });

  const rowHeights =
    opts.rowHeights.length === rowCount
      ? opts.rowHeights
      : new Array(rowCount).fill(bodyH / Math.max(1, rowCount));

  const bg = stripHash(brand.colors.card_bg ?? "#151520");
  // zebra (branded): derive tint from accent rather than card_bg.
  const accentBase = stripHash(brand.colors.accent);
  const bgBase = stripHash(brand.colors.background ?? "000000");
  const accentSoft = tweakHex(accentBase, accentBase.toLowerCase() === bgBase.toLowerCase() ? 18 : 24);
  const bg2 = accentSoft;
  const text = stripHash(brand.colors.text);
  const muted = stripHash(brand.colors.muted ?? brand.colors.text);
  const accent = stripHash(brand.colors.accent);
  const mono = brand.typography.mono_family ?? brand.typography.font_family;
  const numericCols = detectNumericColumns(opts.headers, opts.rows);

  let xCursor = opts.x;
  for (let c = 0; c < cols; c++) {
    const colW = colWs[c] ?? opts.w / cols;
    const cx = xCursor;
    slide.addShape(opts.pptx.ShapeType.rect, {
      x: cx,
      y: opts.y,
      w: colW,
      h: headerH,
      fill: { color: accent },
      line: { color: accent },
    });

    slide.addText(clamp(opts.headers[c] ?? "", 80), {
      x: cx + 0.12,
      y: opts.y + 0.08,
      w: colW - 0.24,
      h: headerH - 0.16,
      fontFace: mono,
      fontSize: 14,
      color: stripHash(brand.colors.background),
      bold: true,
      valign: "mid",
    });

    xCursor += colW;
  }

  let yCursor = opts.y + headerH;
  for (let r = 0; r < rowCount; r++) {
    const rh = rowHeights[r] ?? bodyH / Math.max(1, rowCount);
    let xCur = opts.x;
    for (let c = 0; c < cols; c++) {
      const colW = colWs[c] ?? opts.w / cols;
      const cx = xCur;
      const cy = yCursor;

      slide.addShape(opts.pptx.ShapeType.rect, {
        x: cx,
        y: cy,
        w: colW,
        h: rh,
        fill: { color: r % 2 === 0 ? bg : bg2 },
        line: { color: muted },
      });

      const cellText = clamp(String(opts.rows[r]?.[c] ?? "").replace(/\s+/g, " ").trim(), 140);
      slide.addText(cellText, {
        x: cx + 0.12,
        y: cy + 0.08,
        w: colW - 0.24,
        h: Math.max(0.1, rh - 0.16),
        fontFace: brand.typography.font_family,
        fontSize: 13,
        color: text,
        align: numericCols[c] ? "right" : "left",
        valign: "top",
      });

      xCur += colW;
    }

    yCursor += rh;
  }
}
