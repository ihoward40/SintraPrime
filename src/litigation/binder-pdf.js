// src/litigation/binder-pdf.js

import fs from "node:fs/promises";
import { PDFDocument, StandardFonts } from "pdf-lib";

const FIXED_DATE = new Date("2000-01-01T00:00:00.000Z");

function wrapLine(font, text, fontSize, maxWidth) {
  const out = [];
  const words = String(text).split(/\s+/g);
  let line = "";

  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    const width = font.widthOfTextAtSize(candidate, fontSize);
    if (width <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) out.push(line);
    line = w;
  }
  if (line) out.push(line);
  return out;
}

async function addTextSection(pdf, sectionTitle, text) {
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontMono = await pdf.embedFont(StandardFonts.Courier);

  const pageMargin = 48;
  const titleSize = 14;
  const bodySize = 10;
  const lineHeight = 12;

  const pageSize = { width: 612, height: 792 }; // Letter

  let page = pdf.addPage([pageSize.width, pageSize.height]);
  let y = pageSize.height - pageMargin;

  page.drawText(String(sectionTitle || ""), { x: pageMargin, y: y - titleSize, size: titleSize, font });
  y -= titleSize + 18;

  const maxWidth = pageSize.width - pageMargin * 2;
  const lines = String(text || "").split("\n");

  for (const rawLine of lines) {
    const wrapped = rawLine.trim() === "" ? [""] : wrapLine(fontMono, rawLine, bodySize, maxWidth);
    for (const line of wrapped) {
      if (y - lineHeight < pageMargin) {
        page = pdf.addPage([pageSize.width, pageSize.height]);
        y = pageSize.height - pageMargin;
      }
      page.drawText(line, { x: pageMargin, y, size: bodySize, font: fontMono });
      y -= lineHeight;
    }
  }
}

/**
 * Builds a deterministic BINDER_PACKET.pdf from ordered sections.
 * @param {{ sections: Array<{title: string, text: string}>, outPath: string }} input
 */
export async function buildBinderPacketPdf({ sections, outPath }) {
  const pdf = await PDFDocument.create();

  pdf.setTitle("BINDER_PACKET");
  pdf.setCreator("SintraPrime");
  pdf.setProducer("SintraPrime");
  pdf.setCreationDate(FIXED_DATE);
  pdf.setModificationDate(FIXED_DATE);

  for (const s of sections || []) {
    await addTextSection(pdf, s.title, s.text);
  }

  const bytes = await pdf.save({ useObjectStreams: false });
  await fs.writeFile(outPath, bytes);
}
