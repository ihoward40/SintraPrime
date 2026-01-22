import type { BrandKit } from "../brandkit/load.js";

export function renderCodeBlock(opts: {
  pptx: any;
  slide: any;
  brand: BrandKit;
  x: number;
  y: number;
  w: number;
  h: number;
  code: string;
  language?: string;
}) {
  const { slide, brand } = opts;
  const mono = brand.typography.mono_family ?? brand.typography.font_family;

  const bg = stripHash(brand.colors.card_bg ?? "#151520");
  const border = stripHash(brand.colors.muted ?? "#666666");
  const text = stripHash(brand.colors.text);

  slide.addShape(opts.pptx.ShapeType.roundRect, {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    fill: { color: bg, transparency: 10 },
    line: { color: border, transparency: 40 },
    radius: 0.15,
  });

  let fontSize = 14;
  const minFont = 10;

  const padX = 0.18;
  const padY = 0.14;
  const gutterW = 0.52;
  const usableW = opts.w - padX * 2 - gutterW;
  const usableH = opts.h - padY * 2;

  const rawLines = String(opts.code ?? "").replace(/\r\n/g, "\n").split("\n");

  const wrap = (size: number) => wrapLines(rawLines, usableW, size);

  while (fontSize > minFont) {
    const lines = wrap(fontSize);
    const lineH = (fontSize / 14) * 0.24;
    const totalH = lines.length * lineH;
    if (totalH <= usableH) break;
    fontSize -= 1;
  }

  const lines = wrap(fontSize);
  const digits = String(lines.length).length;
  const ln = lines.map((_, i) => String(i + 1).padStart(digits, " "));

  // Optional language badge
  const lang = String(opts.language ?? "").trim();
  if (lang) {
    slide.addText(lang.toUpperCase().slice(0, 10), {
      x: opts.x + opts.w - 1.2,
      y: opts.y - 0.32,
      w: 1.1,
      h: 0.25,
      fontFace: brand.typography.font_family,
      fontSize: 10,
      color: border,
      align: "right",
    });
  }

  slide.addText(ln.join("\n"), {
    x: opts.x + padX,
    y: opts.y + padY,
    w: gutterW - 0.06,
    h: usableH,
    fontFace: mono,
    fontSize,
    color: border,
    valign: "top",
  });

  slide.addText(lines.join("\n"), {
    x: opts.x + padX + gutterW,
    y: opts.y + padY,
    w: usableW,
    h: usableH,
    fontFace: mono,
    fontSize,
    color: text,
    valign: "top",
  });
}

function wrapLines(lines: string[], widthIn: number, fontSize: number): string[] {
  const out: string[] = [];
  const charW = (fontSize / 14) * 0.11;
  const maxChars = Math.max(20, Math.floor(widthIn / charW));

  for (const line of lines) {
    const s = String(line ?? "");
    if (s.length <= maxChars) {
      out.push(s);
      continue;
    }
    for (let i = 0; i < s.length; i += maxChars) {
      out.push(s.slice(i, i + maxChars));
    }
  }

  return out.length ? out : [""];
}

function stripHash(hex: string): string {
  return String(hex || "").replace(/^#/, "");
}
