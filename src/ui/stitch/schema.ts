export type StitchBackendId = "stitch_web_ingest" | "stitch_auto_playwright";

export type StitchAsset =
  | { kind: "html"; path: string; sha256?: string }
  | { kind: "css"; path: string; sha256?: string }
  | { kind: "js"; path: string; sha256?: string }
  | { kind: "image"; path: string; sha256?: string }
  | { kind: "zip"; path: string; sha256?: string }
  | { kind: "other"; path: string; sha256?: string; note?: string };

export type StitchPack = {
  version: 1;
  runId: string;
  createdAt: string; // ISO
  backend: StitchBackendId;
  prompt: {
    text: string;
    constraints?: string[];
    platform?: "web" | "mobile" | "unknown";
  };
  import: {
    dir: string; // runDir-relative (posix)
    found: boolean;
    assets: StitchAsset[];
  };
  notes?: string[];
};
