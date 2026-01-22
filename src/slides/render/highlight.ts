import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as any)[ch]
  );
}

export function highlightCodeToHtml(opts: {
  code: string;
  language?: string;
}): { html: string; used: boolean } {
  const raw = String(opts.code ?? "");

  try {
    // Optional dependency; present in CI/package.json.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const hljs = require("highlight.js");

    if (opts.language && typeof hljs.getLanguage === "function" && hljs.getLanguage(opts.language)) {
      const res = hljs.highlight(raw, { language: opts.language, ignoreIllegals: true });
      return { html: res.value, used: true };
    }

    const res = hljs.highlightAuto(raw);
    return { html: res.value, used: true };
  } catch {
    return { html: escapeHtml(raw), used: false };
  }
}
