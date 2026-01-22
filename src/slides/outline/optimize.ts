import crypto from "node:crypto";

import type { Deck, Card } from "./compile.js";
import type { BrandKit } from "../brandkit/load.js";

export type OptimizeOptions = {
  maxBullets?: number;
  sectionEvery?: number;
  maxBulletChars?: number;
  maxMonoChars?: number;
};

export function optimizeDeck(deck: Deck, brand: BrandKit, opts?: OptimizeOptions): Deck {
  const maxBullets = opts?.maxBullets ?? brand.layout.max_bullets ?? 6;
  const sectionEvery = opts?.sectionEvery ?? 5;
  const maxBulletChars = opts?.maxBulletChars ?? 140;
  const maxMonoChars = opts?.maxMonoChars ?? 1800;

  let cards = deck.cards.map((c) => normalizeCard(c, { maxBullets, maxBulletChars }));
  cards = cards.flatMap((c) => extractMonoFromCard(c, { maxMonoChars }));
  cards = cards.flatMap((c) => splitBulletsCard(c, { maxBullets }));

  // Insert auto section dividers first so Agenda can include both manual + auto sections.
  cards = insertSectionDividers(cards, { every: sectionEvery });
  cards = applySectionContext(cards);
  cards = insertAgendaCard(cards, { maxTopicsPerSection: 5, maxSections: 10 });

  cards = cards.filter((c) => !(c.kind === "bullets" && (!c.bullets || c.bullets.length === 0)));

  return {
    ...deck,
    version: bumpMinor(deck.version ?? "1.0.0"),
    meta: {
      ...(deck.meta ?? {}),
      optimizer: {
        version: "1.0.0",
        maxBullets,
        sectionEvery,
        maxBulletChars,
        maxMonoChars,
      },
    },
    cards,
  };
}

function normalizeCard(card: Card, cfg: { maxBullets: number; maxBulletChars: number }): Card {
  if (card.kind !== "bullets") return card;
  const bullets = (card.bullets ?? [])
    .map((b) => b.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((b) => clamp(b, cfg.maxBulletChars));

  // Allow extra bullets for splitting later.
  return { ...card, bullets: bullets.slice(0, Math.max(cfg.maxBullets * 3, cfg.maxBullets)) };
}

function extractMonoFromCard(card: Card, cfg: { maxMonoChars: number }): Card[] {
  if (card.kind !== "bullets" && card.kind !== "section") return [card];

  const text = [...(card.bullets ?? []).map((b) => b.trim()), ...(card.notes ? [card.notes] : [])].join("\n");

  const extracted: Card[] = [];
  let remaining = text;

  const codeMatches = [...remaining.matchAll(/```(\w+)?\s*\n([\s\S]*?)\n```/g)];
  for (const m of codeMatches) {
    const lang = (m[1] ?? "").trim() || undefined;
    const body = clamp((m[2] ?? "").trim(), cfg.maxMonoChars);
    if (!body) continue;
    extracted.push({
      card_id: cid(card.card_id, "code", body.slice(0, 32)),
      kind: "code",
      title: lang ? `Code (${lang})` : "Code",
      code: { language: lang, text: body },
    });
  }
  remaining = remaining.replace(/```(\w+)?\s*\n([\s\S]*?)\n```/g, "").trim();

  const tableBlocks = findMarkdownTables(remaining);
  for (const tbl of tableBlocks) {
    const md = clamp(tbl.trim(), cfg.maxMonoChars);
    extracted.push({
      card_id: cid(card.card_id, "table", md.slice(0, 32)),
      kind: "table",
      title: "Table",
      table: { markdown: md },
    });
  }
  for (const tbl of tableBlocks) {
    remaining = remaining.replace(tbl, "").trim();
  }

  if (extracted.length > 0 && card.kind === "bullets") {
    const rebuiltBullets = remaining ? remaining.split("\n").map((s) => s.trim()).filter(Boolean) : [];
    return [{ ...card, bullets: rebuiltBullets, notes: undefined }, ...extracted];
  }

  return [card, ...extracted];
}

function splitBulletsCard(card: Card, cfg: { maxBullets: number }): Card[] {
  if (card.kind !== "bullets" || !card.bullets) return [card];
  const bullets = card.bullets;
  if (bullets.length <= cfg.maxBullets) return [card];

  const chunks = chunk(bullets, cfg.maxBullets);
  const total = chunks.length;

  return chunks.map((chunkBullets, idx) => ({
    ...card,
    card_id: cid(card.card_id, "split", String(idx)),
    title: total > 1 ? `${card.title} (${idx + 1}/${total})` : card.title,
    bullets: chunkBullets,
  }));
}

function insertSectionDividers(cards: Card[], cfg: { every: number }): Card[] {
  if (cfg.every <= 0) return cards;
  if (cards.length <= 2) return cards;

  const out: Card[] = [];
  let sinceSection = 0;

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    if (!c) continue;
    out.push(c);

    if (c.kind === "title" || c.kind === "section") {
      sinceSection = 0;
      continue;
    }

    if (["bullets", "quote", "code", "table", "image"].includes(c.kind)) sinceSection++;

    const next = cards[i + 1];
    if (next && sinceSection >= cfg.every && next.kind !== "section") {
      const topic = topicFromCard(next);
      out.push({
        card_id: cid(next.card_id, "auto_section", topic),
        kind: "section",
        title: topic,
      });
      sinceSection = 0;
    }
  }

  return out;
}

function applySectionContext(cards: Card[]): Card[] {
  let sectionNo = 0;
  let sectionTitle = "";

  return cards.map((c) => {
    if (c.kind === "section") {
      sectionNo += 1;
      sectionTitle = String(c.title || "").trim();
      return { ...c, section_no: sectionNo, section_title: sectionTitle };
    }

    if (["bullets", "quote", "code", "table", "image"].includes(c.kind) && sectionNo > 0) {
      return { ...c, section_no: sectionNo, section_title: sectionTitle };
    }

    return c;
  });
}

function insertAgendaCard(cards: Card[], cfg: { maxTopicsPerSection: number; maxSections: number }): Card[] {
  const titleIdx = cards.findIndex((c) => c.kind === "title");
  if (titleIdx < 0) return cards;

  const already = cards.some((c) => c.kind === "agenda");
  if (already) return cards;

  const sections: Array<{ section_no?: number; section_title: string; title: string; topics: string[] }> = [];
  let current: { section_no?: number; section_title: string; title: string; topics: string[] } | null = null;

  for (const c of cards) {
    if (c.kind === "section") {
      if (current) sections.push(current);
      const st = String(c.section_title || c.title || "Section").trim();
      current = { section_no: c.section_no, section_title: st, title: st, topics: [] };
      continue;
    }
    if (!current) continue;
    if (["bullets", "quote", "code", "table", "image"].includes(c.kind)) {
      const topic = String(c.title || "").trim();
      if (topic && current.topics.length < cfg.maxTopicsPerSection) current.topics.push(topic);
    }
  }
  if (current) sections.push(current);
  if (sections.length === 0) return cards;

  const trimmed = sections.slice(0, cfg.maxSections).map((s) => {
    const t = s.title.length > 60 ? s.title.slice(0, 59) + "…" : s.title;
    return {
      title: t,
      section_no: s.section_no,
      section_title: s.section_title,
      topics: s.topics,
    };
  });

  const agendaCard: Card = {
    card_id: cid(cards[titleIdx]?.card_id ?? "title", "agenda", trimmed.map((s) => s.title).join("|")),
    kind: "agenda",
    title: "Agenda",
    agenda: { sections: trimmed },
    notes: "Auto-generated agenda: numbered sections + grouped topics.",
  };

  return [...cards.slice(0, titleIdx + 1), agendaCard, ...cards.slice(titleIdx + 1)];
}

function topicFromCard(c: Card): string {
  const base = String(c.title || "Section").trim();
  return base.length > 48 ? base.slice(0, 47) + "…" : base;
}

function findMarkdownTables(s: string): string[] {
  const paras = s
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const out: string[] = [];
  for (const p of paras) {
    const lines = p.split("\n").map((x) => x.trim());
    const hasSep = lines.some((l) => /\|\s*:?-{3,}:?\s*\|/.test(l) || /^:?-{3,}:?\s*\|/.test(l));
    const hasPipes = lines.filter((l) => l.includes("|")).length >= 2;
    if (hasSep && hasPipes) out.push(p);
  }
  return out;
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function clamp(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function cid(seed: string, kind: string, extra: string): string {
  return `${kind}_${sha256(`${seed}:${kind}:${extra}`).slice(0, 12)}`;
}

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function bumpMinor(v: string): string {
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return "1.1.0";
  const major = Number(m[1]);
  const minor = Number(m[2]) + 1;
  return `${major}.${minor}.0`;
}
