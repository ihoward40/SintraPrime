import crypto from "node:crypto";

export type Deck = {
  deck_id: string;
  version: string;
  title: string;
  subtitle?: string;
  meta?: Record<string, unknown>;
  cards: Card[];
};

export type CardKind = "title" | "agenda" | "bullets" | "quote" | "image" | "section" | "code" | "table";

export type Card = {
  card_id: string;
  kind: CardKind;
  title: string;
  subtitle?: string;
  section_no?: number;
  section_title?: string;
  bullets?: string[];
  agenda?: {
    sections: Array<{
      title?: string;
      section_no?: number;
      section_title?: string;
      topics?: string[];
    }>;
  };
  quote?: string;
  attribution?: string;
  code?: { language?: string; text: string };
  table?: { markdown: string };
  image?: { path: string; alt?: string };
  notes?: string;
};

export function compileOutlineToDeck(opts: {
  title: string;
  sourceText: string;
  subtitle?: string;
  maxCards?: number;
  maxBullets?: number;
  sourceType?: string;
}): Deck {
  const maxCards = opts.maxCards ?? 20;
  const maxBullets = opts.maxBullets ?? 6;

  const normalized = normalize(opts.sourceText);
  const blocks = normalized
    .split(/\n\s*\n/g)
    .map((b) => b.trim())
    .filter(Boolean);

  const cards: Card[] = [];

  cards.push({
    card_id: cid("title", opts.title),
    kind: "title",
    title: opts.title,
    subtitle: opts.subtitle,
  });

  const addContentBlock = (contentBlock: string) => {
    if (cards.length >= maxCards) return;

    if (/^\s*>\s+/.test(contentBlock)) {
      const q = contentBlock.replace(/^\s*>\s+/gm, "").trim();
      cards.push({
        card_id: cid("quote", q.slice(0, 32)),
        kind: "quote",
        title: "Quote",
        quote: clamp(q, 360),
      });
      return;
    }

    const bulletLines = contentBlock.split("\n").filter((l) => /^\s*[-*]\s+/.test(l));
    if (bulletLines.length >= 2) {
      const bullets = bulletLines
        .map((l) => l.replace(/^\s*[-*]\s+/, "").trim())
        .filter(Boolean)
        // Keep extra bullets so the optimizer can split deterministically.
        .slice(0, Math.max(maxBullets * 3, maxBullets));

      const title = inferTitleFromBullets(bullets) ?? "Key Points";
      cards.push({
        card_id: cid("bullets", title),
        kind: "bullets",
        title,
        bullets,
      });
      return;
    }

    const raw = contentBlock.trim();
    const para = raw.replace(/\s+/g, " ").trim();
    const bullets = sentenceBullets(para).slice(0, maxBullets);
    cards.push({
      card_id: cid("bullets", para.slice(0, 20)),
      kind: "bullets",
      title: inferTitleFromParagraph(para) ?? "Summary",
      bullets,
      notes: raw,
    });
  };

  for (const block of blocks) {
    if (cards.length >= maxCards) break;

    const headingAtStart = block.match(/^(#{1,3})\s+(.+?)(?:\n([\s\S]*))?$/);
    if (headingAtStart) {
      const title = String(headingAtStart[2] ?? "").trim();
      if (title) {
        cards.push({
          card_id: cid("section", title),
          kind: "section",
          title,
        });
      }

      const rest = String(headingAtStart[3] ?? "").trim();
      if (rest) addContentBlock(rest);
      continue;
    }

    addContentBlock(block);
  }

  return {
    deck_id: did(opts.title, normalized),
    version: "1.0.0",
    title: opts.title,
    subtitle: opts.subtitle,
    meta: {
      source_type: opts.sourceType ?? "text",
      source_hash: sha256(normalized),
    },
    cards: cards.slice(0, maxCards),
  };
}

function normalize(s: string): string {
  return s.replace(/\r\n/g, "\n").trim();
}

function did(title: string, body: string): string {
  return "deck_" + sha256(title + "\n" + body).slice(0, 16);
}

function cid(kind: string, seed: string): string {
  return kind + "_" + sha256(kind + ":" + seed).slice(0, 12);
}

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function clamp(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

function sentenceBullets(p: string): string[] {
  const parts = p
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (parts.length >= 3) return parts.map((x) => clamp(x, 120));
  return p
    .split(/,\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => clamp(x, 120));
}

function inferTitleFromBullets(bullets: string[]): string | null {
  if (!bullets.length) return null;
  const first = bullets[0] ?? "";
  if (!first) return null;
  return first.split(/\s+/).slice(0, 6).join(" ");
}

function inferTitleFromParagraph(p: string): string | null {
  return p.split(/\s+/).slice(0, 6).join(" ");
}
