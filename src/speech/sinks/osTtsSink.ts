import type { SpeechSink } from "./types.js";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { SpeechAutoplayDenied } from "../autoplayDenied.js";

function debug(reason: string, details?: Record<string, unknown>): void {
  if (process.env.SPEECH_DEBUG !== "1") return;
  try {
    process.stderr.write(`${JSON.stringify({ kind: "OsTtsDebug", reason, ...(details ? { details } : {}) })}\n`);
  } catch {
    // fail-open
  }
}

function findProjectRoot(startDir: string): string {
  let dir = path.resolve(startDir);
  for (let i = 0; i < 50; i += 1) {
    try {
      if (fs.existsSync(path.join(dir, "package.json"))) return dir;
    } catch {
      // ignore
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(startDir);
}

export const osTtsSink: SpeechSink = {
  name: "os-tts",
  speak(payload) {
    try {
      const text = String(payload?.text ?? "");
      const source = payload?.meta?.source ?? "operator";
      const requested =
        source === "alert" ? payload?.meta?.autoplay_requested === true : payload?.meta?.autoplay_requested !== false;

      // Alerts that did not request autoplay should never be treated as a denial.
      if (source === "alert" && !requested) return;
      const production = String(process.env.NODE_ENV ?? "").trim() === "production";
      const autoplayEnv =
        String(process.env.SPEECH_AUTOPLAY ?? "").trim() === "1" || String(process.env.SPEECH_OS_TTS_AUTOPLAY ?? "").trim() === "1";
      const allowEmit = requested && autoplayEnv && !production;

      if (!allowEmit) {
        throw new SpeechAutoplayDenied(production ? "DISABLED_IN_PRODUCTION" : "AUTOPLAY_DISABLED");
      }

      if (process.platform === "darwin") {
        const child = spawn("say", [text], { stdio: "ignore", windowsHide: true });
        child.unref();
        return;
      }

      if (process.platform === "win32") {
        const debugEnabled = process.env.SPEECH_DEBUG === "1";

        // Debugging aid: write a WAV under runs/ so we can prove synthesis happened even
        // when Windows audio routing (RDP/device mismatch) makes playback inaudible.
        const wantAudioArtifact = debugEnabled || process.env.SPEECH_AUDIO_ARTIFACTS === "1";
        const audioOut = (() => {
          if (!wantAudioArtifact) return null;
          try {
            const root = findProjectRoot(process.cwd());
            const dir = path.join(root, "runs", "speech-audio");
            fs.mkdirSync(dir, { recursive: true });
            return path.join(dir, `os-tts_${Date.now()}.wav`);
          } catch {
            return null;
          }
        })();

        // Avoid injection/quoting issues by passing text via stdin.
        debug("spawn", { chars: String(text ?? "").length });
        const child = spawn(
          "powershell",
          [
            "-STA",
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            `Add-Type -AssemblyName System.Speech; ` +
              `Add-Type -AssemblyName System; ` +
              `$t=[Console]::In.ReadToEnd(); ` +
              `$out=$env:SPEECH_AUDIO_OUT; ` +
              `if ($out) { ` +
              `  try { ` +
              `    $sf=New-Object System.Speech.Synthesis.SpeechSynthesizer; ` +
              `    $sf.SetOutputToWaveFile($out); ` +
              `    $sf.Speak($t); ` +
              `    try { $sf.SetOutputToNull() } catch { } ` +
              `    try { $sf.Dispose() } catch { } ` +
              `    $bytes = $null; ` +
              `    try { if (Test-Path -LiteralPath $out) { $bytes=(Get-Item -LiteralPath $out).Length } } catch { } ` +
              `    if ($env:SPEECH_DEBUG -eq '1') { ` +
              `      $j=(@{kind='OsTtsDebug';reason='wrote_wav';details=@{file=$out;bytes=$bytes}} | ConvertTo-Json -Compress); ` +
              `      [Console]::Error.WriteLine($j); ` +
              `    } ` +
              `    try { ` +
              `      $p = New-Object System.Media.SoundPlayer($out); ` +
              `      $p.PlaySync(); ` +
              `      if ($env:SPEECH_DEBUG -eq '1') { [Console]::Error.WriteLine((@{kind='OsTtsDebug';reason='played_wav'} | ConvertTo-Json -Compress)) } ` +
              `    } catch { ` +
              `      if ($env:SPEECH_DEBUG -eq '1') { [Console]::Error.WriteLine((@{kind='OsTtsDebug';reason='play_error'} | ConvertTo-Json -Compress)) } ` +
              `    } ` +
              `    if ($env:SPEECH_OS_TTS_AUTOPLAY -eq '1') { ` +
              `      try { ` +
              `        Start-Process -FilePath $out | Out-Null; ` +
              `        if ($env:SPEECH_DEBUG -eq '1') { [Console]::Error.WriteLine((@{kind='OsTtsDebug';reason='autoplay_started'} | ConvertTo-Json -Compress)) } ` +
              `      } catch { ` +
              `        if ($env:SPEECH_DEBUG -eq '1') { [Console]::Error.WriteLine((@{kind='OsTtsDebug';reason='autoplay_error'} | ConvertTo-Json -Compress)) } ` +
              `      } ` +
              `    } ` +
              `  } catch { ` +
              `    if ($env:SPEECH_DEBUG -eq '1') { [Console]::Error.WriteLine((@{kind='OsTtsDebug';reason='wav_error'} | ConvertTo-Json -Compress)) } ` +
              `  } ` +
              `}; ` +
              `try { ` +
              `  $sa=New-Object System.Speech.Synthesis.SpeechSynthesizer; ` +
              `  $sa.SetOutputToDefaultAudioDevice(); ` +
              `  $sa.Speak($t); ` +
              `  try { $sa.Dispose() } catch { } ` +
              `} catch { }`,
          ],
          {
            stdio: debugEnabled ? ["pipe", "ignore", "inherit"] : ["pipe", "ignore", "ignore"],
            windowsHide: true,
            // In normal mode, detach+unref so speech is fire-and-forget.
            // In debug mode, keep attached so the process can't be killed early
            // and so stderr is visible.
            detached: !debugEnabled,
            env: {
              ...process.env,
              ...(audioOut ? { SPEECH_AUDIO_OUT: audioOut } : {}),
            },
          }
        );

        if (!debugEnabled) child.unref();
        try {
          child.stdin.end(text);
        } catch {
          // ignore
        }
      }
    } catch {
      debug("error");
      // fail-open
    }
  },
};
