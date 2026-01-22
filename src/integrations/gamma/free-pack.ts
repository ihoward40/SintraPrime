export type GammaFreePack = {
  gamma_input_md: string;
  gamma_prompt_txt: string;
  notes_txt: string;
};

export function buildGammaFreeImportPack(opts: {
  title: string;
  sections: Array<{ heading: string; bullets: string[] }>;
  tone?: string;
  audience?: string;
}): GammaFreePack {
  const prompt = [
    `Create a presentation titled: ${opts.title}`,
    opts.audience ? `Audience: ${opts.audience}` : "",
    opts.tone ? `Tone: ${opts.tone}` : "",
    "",
    "Use the content below as the source material. Keep cards concise (1 idea per card).",
  ]
    .filter(Boolean)
    .join("\n");

  const md = [
    `# ${opts.title}`,
    "",
    ...opts.sections.flatMap((s) => [`## ${s.heading}`, ...s.bullets.map((b) => `- ${b}`), ""]),
  ].join("\n");

  const notes = [
    "Gamma Free workflow:",
    "1) Open Gamma → New → Paste content",
    "2) Paste gamma_prompt.txt into the prompt box (optional)",
    "3) Paste gamma_input_md as the source content",
    "4) Generate (Free may limit cards per prompt)",
  ].join("\n");

  return { gamma_input_md: md, gamma_prompt_txt: prompt, notes_txt: notes };
}
