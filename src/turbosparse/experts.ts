export type ExpertId =
  | "core"
  | "legal"
  | "devops"
  | "slides"
  | "evidence"
  | "email"
  | "finance"
  | "creative";

export type Expert = {
  id: ExpertId;
  title: string;
  system: string;
  keywords: string[];
  tools?: string[];
};

export const EXPERTS: Expert[] = [
  {
    id: "core",
    title: "Core Governance",
    system:
      "You must follow SintraPrime governance: audit-safe outputs, deterministic receipts, refusal codes when needed, minimal speculation.",
    keywords: [],
  },
  {
    id: "devops",
    title: "DevOps / Repo Ops",
    system:
      "Prefer patches, reproducible commands, CI gates, and deterministic build artifacts. Be explicit about file paths and failure modes.",
    keywords: [
      "ci",
      "github actions",
      "workflow",
      "patch",
      "diff",
      "node",
      "typescript",
      "vercel",
      "docker",
      "lint",
    ],
  },
  {
    id: "slides",
    title: "Slides Engine",
    system:
      "When working on slides: output card schema, PPTX/HTML/PDF rendering steps, enforce strict schema, and preserve audit logs.",
    keywords: ["pptx", "slides", "deck", "agenda", "table grid", "speaker notes", "gamma"],
  },
  {
    id: "legal",
    title: "Legal Reasoning (Non-advice)",
    system:
      "Use statutes/case law carefully, separate facts from theories, and keep language court-safe. Avoid sovereign-citizen framing.",
    keywords: [
      "ucc",
      "fdcpa",
      "fcra",
      "tala",
      "cfpb",
      "complaint",
      "affidavit",
      "notice",
      "cure",
      "default",
    ],
  },
  {
    id: "evidence",
    title: "Evidence / Binder Ops",
    system:
      "Prefer evidence-grade structure: exhibit indices, hash receipts, provenance logs, and Rule 803(6)/902-friendly documentation.",
    keywords: ["evidence", "binder", "exhibit", "receipt", "hash", "merkle", "timestamp", "notary"],
  },
];
