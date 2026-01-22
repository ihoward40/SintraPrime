import path from "node:path";
import { readFile } from "node:fs/promises";

export class PdfRendererUnavailable extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "PdfRendererUnavailable";
  }
}

export async function renderPdfFromHtml(opts: { htmlPath: string; outPath: string }): Promise<{ outPath: string }> {
  let chromium: any;
  try {
    const pw = await import("playwright");
    chromium = (pw as any).chromium;
  } catch {
    throw new PdfRendererUnavailable("Playwright not installed. Cannot render PDF.");
  }

  const absHtml = path.resolve(process.cwd(), opts.htmlPath);
  const absOut = path.resolve(process.cwd(), opts.outPath);
  const html = await readFile(absHtml, "utf8");

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle" });

  await page.pdf({
    path: absOut,
    format: "Letter",
    printBackground: true,
    margin: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" },
  });

  await browser.close();
  return { outPath: opts.outPath };
}
