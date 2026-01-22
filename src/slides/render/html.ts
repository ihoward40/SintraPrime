import { writeFile } from "node:fs/promises";
import path from "node:path";

import type { Deck } from "../outline/compile.js";
import type { BrandKit } from "../brandkit/load.js";
import { parseMarkdownTable } from "./table-grid.js";
import { escapeHtml, highlightCodeToHtml } from "./highlight.js";

export async function renderHtml(opts: { deck: Deck; brand: BrandKit; outPath: string }): Promise<{ outPath: string }> {
  const html = buildHtml(opts.deck, opts.brand);
  await writeFile(path.resolve(process.cwd(), opts.outPath), html, "utf8");
  return { outPath: opts.outPath };
}

function buildHtml(deck: Deck, brand: BrandKit): string {
  const c = brand.colors;
  const t = brand.typography;
  const css = `
    :root{
      --bg:${c.background}; --text:${c.text}; --accent:${c.accent};
      --muted:${c.muted ?? c.text}; --card:${c.card_bg ?? "#151520"};
      --font:${t.font_family};
    }
    body{ margin:0; background:var(--bg); color:var(--text); font-family:var(--font); }
    .deck{ padding:24px; display:flex; flex-direction:column; gap:18px; }
    .card{ background:var(--card); border-radius:18px; padding:18px 20px; }
    .top{ display:flex; justify-content:space-between; align-items:center; gap:12px; }
    .title{ font-size:22px; font-weight:700; margin:0; }
    .sectionLabel{ color:var(--muted); font-size:14px; white-space:nowrap; }
    .accent{ height:4px; width:100%; background:var(--accent); border-radius:99px; margin:10px 0 14px; }
    ul{ margin:0; padding-left:22px; }
    li{ margin:10px 0; font-size:18px; }
    .subtitle{ color:var(--muted); font-size:18px; margin-top:8px; }
    .quote{ font-style:italic; font-size:20px; line-height:1.4; }
    .section{
      padding:40px 20px;
      text-align:center;
      background:transparent;
      border:1px solid rgba(255,255,255,0.08);
    }
    .sectionTitle{ font-size:42px; font-weight:800; margin:0; }
    .sectionBar{ height:6px; width:220px; background:var(--accent); border-radius:99px; margin:18px auto 0; }
    table{ width:100%; border-collapse:collapse; }
    th, td{ border:1px solid rgba(255,255,255,0.12); padding:10px 12px; font-size:14px; }
    th{ background:rgba(255,255,255,0.08); text-align:left; }
    pre{ margin:0; white-space:pre-wrap; }
    pre code{ display:block; padding:12px 14px; border-radius:12px; background:rgba(255,255,255,0.06); }
    /* Minimal highlight.js token styles (works even if not used) */
    .hljs{ color:var(--text); }
    .hljs-keyword{ color: #c792ea; }
    .hljs-string{ color: #c3e88d; }
    .hljs-comment{ color: rgba(255,255,255,0.45); }
    .hljs-number{ color: #f78c6c; }
    .hljs-title{ color: #82aaff; }
  `.trim();

  const mono = brand.typography.mono_family ?? "monospace";

  const cards = deck.cards
    .map((card) => {
      const sectionLabel =
        (card as any).section_no && (card as any).section_title
          ? `${(card as any).section_no}. ${(card as any).section_title}`
          : "";

      if (card.kind === "title") {
        return `
        <section class="card">
          <div class="top"><h1 class="title">${escapeHtml(deck.title)}</h1></div>
          <div class="accent"></div>
          ${deck.subtitle ? `<div class="subtitle">${escapeHtml(deck.subtitle)}</div>` : ""}
        </section>
      `.trim();
      }

      if (card.kind === "section") {
        return `
      <section class="card section">
        <h2 class="sectionTitle">${escapeHtml(card.title)}</h2>
        <div class="sectionBar"></div>
      </section>
    `.trim();
      }

      if (card.kind === "quote" && card.quote) {
        return `
        <section class="card">
          <div class="top"><h2 class="title">${escapeHtml(card.title)}</h2>${sectionLabel ? `<div class="sectionLabel">${escapeHtml(sectionLabel)}</div>` : ""}</div>
          <div class="accent"></div>
          <div class="quote">“${escapeHtml(card.quote)}”</div>
          ${card.attribution ? `<div class="subtitle">— ${escapeHtml(card.attribution)}</div>` : ""}
        </section>
      `.trim();
      }

      if (card.kind === "agenda" && (card as any).agenda?.sections?.length) {
        const sections = (card as any).agenda.sections as Array<{ section_no?: number; section_title?: string; topics?: string[] }>;
        const body = sections
          .map((s) => {
            const label =
              s.section_no && s.section_title
                ? `${s.section_no}. ${s.section_title}`
                : String(s.section_title ?? (s as any).title ?? "");
            const topics = Array.isArray(s.topics) ? s.topics : [];
            return `
              <div style="margin:10px 0 14px;">
                <div style="font-weight:800; font-size:18px;">${escapeHtml(label)}</div>
                ${topics.length ? `<ul>${topics.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>` : ""}
              </div>
            `.trim();
          })
          .join("\n");

        return `
        <section class="card">
          <div class="top"><h2 class="title">${escapeHtml(card.title)}</h2></div>
          <div class="accent"></div>
          ${body}
        </section>
      `.trim();
      }

      if (card.kind === "bullets" && card.bullets?.length) {
        return `
        <section class="card">
          <div class="top"><h2 class="title">${escapeHtml(card.title)}</h2>${sectionLabel ? `<div class="sectionLabel">${escapeHtml(sectionLabel)}</div>` : ""}</div>
          <div class="accent"></div>
          <ul>${card.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
        </section>
      `.trim();
      }

      if (card.kind === "code" && card.code?.text) {
        const res = highlightCodeToHtml({ code: card.code.text, language: (card.code as any).language });
        return `
      <section class="card">
        <div class="top"><h2 class="title">${escapeHtml(card.title)}</h2>${sectionLabel ? `<div class="sectionLabel">${escapeHtml(sectionLabel)}</div>` : ""}</div>
        <div class="accent"></div>
        <pre style="font-family:${escapeHtml(mono)};"><code class="hljs">${res.html}</code></pre>
      </section>
    `.trim();
      }

      if (card.kind === "table" && card.table?.markdown) {
        const parsed = parseMarkdownTable(card.table.markdown);
        if (parsed) {
          const thead = `<tr>${parsed.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>`;
          const tbody = parsed.rows
            .map((r) => `<tr>${r.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
            .join("");
          return `
          <section class="card">
            <div class="top"><h2 class="title">${escapeHtml(card.title)}</h2>${sectionLabel ? `<div class="sectionLabel">${escapeHtml(sectionLabel)}</div>` : ""}</div>
            <div class="accent"></div>
            <table><thead>${thead}</thead><tbody>${tbody}</tbody></table>
          </section>
        `.trim();
        }

        return `
        <section class="card">
          <div class="top"><h2 class="title">${escapeHtml(card.title)}</h2>${sectionLabel ? `<div class="sectionLabel">${escapeHtml(sectionLabel)}</div>` : ""}</div>
          <div class="accent"></div>
          <pre style="font-family:${escapeHtml(mono)};"><code>${escapeHtml(card.table.markdown)}</code></pre>
        </section>
      `.trim();
      }

      return `
      <section class="card">
        <div class="top"><h2 class="title">${escapeHtml(card.title)}</h2>${sectionLabel ? `<div class="sectionLabel">${escapeHtml(sectionLabel)}</div>` : ""}</div>
        <div class="accent"></div>
        <div class="subtitle">${escapeHtml(card.notes ?? "")}</div>
      </section>
    `.trim();
    })
    .join("\n");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(deck.title)}</title>
<style>${css}</style>
</head>
<body>
  <main class="deck">
    ${cards}
  </main>
</body>
</html>`;
}
