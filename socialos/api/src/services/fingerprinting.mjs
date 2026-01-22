import { sha256Hex, hashCanonicalJson } from "../../../shared/lib/hash.mjs";

export function buildCanonicalAssets({ original_text, media_paths = [] }) {
  const media = media_paths.map((file_ref) => ({
    file_ref,
    hash: sha256Hex(file_ref)
  }));

  return {
    media,
    text: {
      original: original_text,
      variations: []
    }
  };
}

export function computeContentFingerprint({ canonical_assets, tags = [], governance_mode }) {
  return hashCanonicalJson({
    canonical_assets,
    tags,
    governance_mode
  });
}
