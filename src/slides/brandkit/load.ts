import { readFile } from "node:fs/promises";
import path from "node:path";

export type BrandKit = {
  brand_id: string;
  version: string;
  assets?: { logo_path?: string; background_path?: string };
  colors: { background: string; text: string; accent: string; muted?: string; card_bg?: string };
  typography: { font_family: string; title_size: number; body_size: number; mono_family?: string };
  layout: { slide_w: number; slide_h: number; margin: number; card_gap: number; max_bullets?: number };
};

export async function loadBrandKit(opts: { brandIdOrPath: string }): Promise<BrandKit> {
  const p = opts.brandIdOrPath.endsWith(".json")
    ? path.resolve(process.cwd(), opts.brandIdOrPath)
    : path.resolve(process.cwd(), "governance", "brandkits", `${opts.brandIdOrPath}.json`);

  const raw = await readFile(p, "utf8");
  return JSON.parse(raw) as BrandKit;
}
