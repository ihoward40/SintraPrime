// templates/tauri-teaching-cockpit/src/pages/TeachingCockpit/pages.ts

export interface TeachingPage {
  id: string;
  title: string;
  body: string[];
  highlights?: string[];
  footer?: string;
}

export const teachingPages: TeachingPage[] = [
  {
    id: "what-it-is",
    title: "What this tool does",
    body: [
      "This tool organizes files into a clean, readable case bundle.",
      "It does not decide what the files mean.",
      "It does not judge accuracy or truth.",
      "It does not change the original files.",
    ],
    highlights: ["originals/", "index.json", "INDEX.md"],
    footer: "All decisions are deterministic. The same inputs always produce the same bundle.",
  },
  {
    id: "numbering",
    title: "Why everything gets a number",
    body: [
      "Each file is given a number like 0001, 0002, 0003.",
      "This allows people to reference documents precisely.",
      "The numbers are assigned mechanically, not by importance.",
    ],
    highlights: ["Naming Preview"],
  },
  {
    id: "duplicates",
    title: "Duplicates are not errors",
    body: [
      "A duplicate means two files are byte-for-byte identical.",
      "Duplicates are never deleted or hidden.",
      "Each duplicate remains visible and indexed.",
    ],
    footer: "This preserves what was provided, without guessing intent.",
  },
  {
    id: "collisions",
    title: "Why builds can be blocked",
    body: [
      "If two files would overwrite each other, the tool stops.",
      "Silent overwrites destroy evidence.",
      "A human must resolve the issue deliberately.",
    ],
    highlights: ["Collision panel", "Build button"],
  },
  {
    id: "preview-build",
    title: "Preview vs Build",
    body: [
      "Preview shows you exactly what will be created.",
      "Build only happens after Preview succeeds.",
      "Nothing is written until you explicitly choose Build.",
    ],
  },
  {
    id: "is-is-not",
    title: "What this tool is / is not",
    body: [
      "This tool is a file organizer.",
      "This tool is not a legal advisor.",
      "This tool is not an automated decision-maker.",
    ],
  },
];
