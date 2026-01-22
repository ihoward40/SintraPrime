import type { ArchSelection } from "../governance/arch.js";
import type { ModeSelection } from "../governance/mode.js";

export type AssembleOptions = {
  arch?: ArchSelection;
  modes?: ModeSelection;
  turbosparse?: {
    enabled: boolean;
    experts: string[];
    reason?: string[];
    systemPromptText?: string;
  };
  command: string;
};

export function assembleSystemPrompt(opts: AssembleOptions): string {
  const command = String(opts.command || "").trim();
  if (!command) return "";

  const archPrompt = opts.arch?.systemPromptText?.trim();
  const modePrompts = (opts.modes?.modePrompts ?? []).map((s) => String(s ?? "").trim()).filter(Boolean);

  const turbo = opts.turbosparse;
  const turboEnabled = !!turbo?.enabled;
  const turboExperts = (turbo?.experts ?? []).map((s) => String(s ?? "").trim()).filter(Boolean);
  const turboReasons = (turbo?.reason ?? []).map((s) => String(s ?? "").trim()).filter(Boolean);
  const turboPrompt = String(turbo?.systemPromptText ?? "").trim();

  if (!archPrompt && modePrompts.length === 0 && !turboPrompt) return command;

  // IMPORTANT: upstream agents treat "message starts with /" as binding.
  // Keep the actual command as the first bytes of the message.
  return [
    command,
    "",
    archPrompt
      ? `__ARCHITECTURE__ arch_id=${opts.arch?.archId} arch_version=${opts.arch?.archVersion}`
      : "",
    archPrompt ?? "",
    modePrompts.length ? `__MODES__ mode_ids=${(opts.modes?.modeIds ?? []).join(",")}` : "",
    ...modePrompts,
    turboEnabled
      ? `__TURBOSPARSE__ enabled=true experts=${turboExperts.join(",") || "core"}`
      : turbo && !turboEnabled
        ? `__TURBOSPARSE__ enabled=false`
        : "",
    turboReasons.length ? `__TURBOSPARSE_REASON__ ${turboReasons.join(" | ")}` : "",
    turboPrompt,
  ]
    .filter(Boolean)
    .join("\n\n");
}
