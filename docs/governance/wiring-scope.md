# Governance Wiring Scope Declaration

**Status:** Completed
**Change Type:** ☑ New wiring ☐ Modification ☐ Removal
**Branch:** copilot/add-elevenlabs-voice-integration
**Scope Hash (SHA-256):** N/A (Infrastructure addition, not spec wiring)
**Prepared By:** GitHub Copilot
**Date (UTC):** 2026-02-04

---

## 1. Purpose of This Change

This PR adds a new optional speech output sink for ElevenLabs text-to-speech integration. It does NOT wire governance specifications into runtime behavior. Instead, it extends the existing speech sink infrastructure (established pattern) with an additional optional output mechanism.

The change enables voice synthesis for speech events when explicitly configured via environment variables. It remains opt-in and fail-open by design.

---

## 2. Specifications Being Wired

**None.** This PR does not wire governance specifications or policy documents into runtime behavior.

This is a **pure infrastructure addition** following the existing speech sink pattern established in:
- `src/speech/sinks/consoleSink.ts`
- `src/speech/sinks/webhookSink.ts`  
- `src/speech/sinks/osTtsSink.ts`

No governance specs, schemas, or policy templates are connected to runtime.

---

## 3. Execution Paths Affected (Explicit)

**New optional path added:**
- Module: `src/speech/sinks/elevenLabsSink.ts`
- Before: Speech events routed to console/webhook/os-tts sinks only
- After: Speech events can optionally be routed to ElevenLabs API (when `SPEECH_SINKS` includes "elevenlabs")

**Existing path modified:**
- Module: `src/speech/sinks/index.ts`
- Before: Sink registry included console, webhook, os-tts
- After: Sink registry includes console, webhook, os-tts, **elevenlabs**

**Activation:**
- Default behavior unchanged (console sink only)
- ElevenLabs sink activated ONLY when `SPEECH_SINKS=elevenlabs` (or `console,elevenlabs`, etc.)
- Requires explicit environment configuration (ELEVEN_API_KEY + voice IDs)

---

## 4. Execution Paths Explicitly **Not** Affected

**All governance execution paths remain unchanged:**
- Autonomy mode logic (`src/autonomy/*`)
- Approval workflows (`src/approval/*`)
- Confidence/tier systems (`src/speech/speechTiers.ts`, `src/speech/gradient/*`)
- Policy enforcement (`src/policy/*`)
- Agent authority boundaries (`src/agents/*`)

**Speech content generation unchanged:**
- Speech tier logic (`src/speech/decideSpeech.ts`)
- Redaction rules (`src/speech/redaction/*`)
- Budget controls (`src/speech/budget/*`)

**Other sinks unchanged:**
- Console, webhook, os-tts sinks unaffected
- Sink selection logic unchanged (still driven by `SPEECH_SINKS` env var)

---

## 5. Authority Impact Assessment

☑ No authority expansion  
☐ Authority expansion

**Analysis:**
- No new permissions granted to the system
- No new external APIs accessed without explicit user configuration
- ElevenLabs API calls are:
  - Opt-in (requires `SPEECH_SINKS=elevenlabs`)
  - Credential-gated (requires `ELEVEN_API_KEY`)
  - Read-only output (text-to-speech generation)
  - Fail-open (errors logged, never crash)
- No access to user data, live accounts, or governance state
- No execution authority added (output-only functionality)

---

## 6. Safety & Restraint Controls

**Fail-open design:**
- Missing API key: sink silently skips (logged if SPEECH_DEBUG=1)
- API errors: logged but don't interrupt execution
- Network failures: caught and ignored (no crash)

**Rate limiting:**
- Global request queue prevents concurrent API calls
- 100ms spacing between requests prevents rate limit errors
- No retry loops or unbounded API usage

**Credential safety:**
- Zero hardcoded credentials (verified by CodeQL: 0 alerts)
- All credentials via environment variables
- `.gitignore` prevents credential leaks
- `.env.example` contains only placeholders

**No Demo/Observe mode impact:**
- Speech events still logged to console (parallel output)
- ElevenLabs sink is additive, not replacing existing logging
- No governance mode checks bypassed

**Kill switch:**
- Remove `elevenlabs` from `SPEECH_SINKS` env var
- Delete `ELEVEN_API_KEY` env var
- Both instantly disable the integration

---

## 7. Backward Compatibility

☑ Existing runs unaffected  
☐ Existing runs affected

**Rationale:**
- Default `SPEECH_SINKS` value unchanged (console only)
- Existing environment configurations continue to work identically
- New sink registered but not activated unless explicitly enabled
- No breaking changes to speech payload structure or sink interface
- All existing sinks (console, webhook, os-tts) continue functioning

---

## 8. Validation & Evidence

**Tests added:**
- Diagnostic script: `test-elevenlabs-complete.mjs`
  - Environment validation (fails fast if misconfigured)
  - API connectivity test
  - Audio generation test
  - Rate limiting demonstration

**Manual verification steps:**
1. Without configuration: existing behavior preserved (console output only)
2. With configuration: ElevenLabs audio generated alongside console output
3. With invalid credentials: fail-open (logged, not crash)
4. Documentation: `docs/ELEVENLABS_SETUP.md` provides complete setup guide

**Evidence artifacts:**
- CodeQL security scan: 0 alerts
- No hardcoded credentials (verified by grep scan)
- TypeScript compilation: elevenLabsSink.ts follows same patterns as existing sinks
- Git protection: `.env`, `.env.*`, `voice/` excluded from commits

---

## 9. Non-Regression Statement

> This change does not silently activate previously inert specifications and does not
> alter governance semantics beyond what is explicitly described above.

This PR adds a **new optional output mechanism** to the speech system. It does NOT:
- Wire governance specs into runtime
- Modify governance semantics or authority boundaries
- Change approval workflows or autonomy controls
- Alter existing speech tier logic or content generation
- Bypass any existing safety controls or refusal logic

The change is purely additive infrastructure following established patterns.

**Signature:** GitHub Copilot  
**Role:** Code contributor (PR #[auto-assigned])
