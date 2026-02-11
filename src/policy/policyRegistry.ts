// src/policy/policyRegistry.ts
/* eslint-disable @typescript-eslint/consistent-type-definitions */

export type PolicyDecision = "ALLOW" | "DENY" | "APPROVAL_REQUIRED";
export type PolicyTier = 1 | 2 | 3;

export type PolicyRegistryEntry =
  | {
      kind: "action";
      action: string; // exact step.action
      capability: string; // exact required capability
      tier: PolicyTier;
      // allow is "possible" (e.g., Tier 1/2 lanes). Tier 3 is typically allow=false.
      allow: boolean;
      denyCodes: readonly string[];
      approvalCodes: readonly string[];
    }
  | {
      kind: "prefix";
      prefix: string; // action startsWith(prefix)
      capability: string;
      tier: PolicyTier;
      allow: boolean;
      denyCodes: readonly string[];
      approvalCodes: readonly string[];
    };

// Legacy entry shape used by earlier iterations; still kept as the authoring format below
// to avoid rewriting a large static registry list.
export type LegacyPolicyRegistryEntry =
  | {
      kind: "action";
      action: string;
      capability: string;
      tier: PolicyTier;
      decisions: {
        allow?: boolean;
        deny: readonly string[];
        approval: readonly string[];
      };
    }
  | {
      kind: "prefix";
      prefix: string;
      capability: string;
      tier: PolicyTier;
      decisions: {
        allow?: boolean;
        deny: readonly string[];
        approval: readonly string[];
      };
    };

export const CODES_COMMON = {
  CAPABILITY_MISSING: "CAPABILITY_MISSING",
} as const;

// ===== Autonomy / governance =====
export const CODES_AUTONOMY = {
  READ_ONLY_VIOLATION: "AUTONOMY_READ_ONLY_VIOLATION",
  APPROVAL_REQUIRED: "AUTONOMY_APPROVAL_REQUIRED",
} as const;

export const CODES_MODE_GOVERNANCE = {
  DECLARATION_MISSING: "MODE_DECLARATION_MISSING",
  DECLARATION_NOT_FOUND: "MODE_DECLARATION_NOT_FOUND",
  FROZEN: "MODE_FROZEN",
  WRITE_REQUIRES_SINGLE_RUN_APPROVED: "MODE_WRITE_REQUIRES_SINGLE_RUN_APPROVED",
} as const;

export const CODES_LIMB = {
  INACTIVE: "LIMB_INACTIVE",
} as const;

export const CODES_CONFIDENCE = {
  TOO_LOW: "CONFIDENCE_TOO_LOW",
} as const;

export const CODES_REQUALIFICATION = {
  BLOCKED: "REQUALIFICATION_BLOCKED",
  PROBATION_READ_ONLY_ENFORCED: "PROBATION_READ_ONLY_ENFORCED",
} as const;

export const CODES_DOMAIN_OVERLAY = {
  DENY_WRITE: "DOMAIN_OVERLAY_DENY_WRITE",
} as const;

// ===== Policy engine / budget guards =====
export const CODES_POLICY_BUDGET = {
  MAX_PHASES: "POLICY_MAX_PHASES",
  MAX_TOTAL_STEPS: "POLICY_MAX_TOTAL_STEPS",
  MAX_STEPS_EXCEEDED: "BUDGET_MAX_STEPS_EXCEEDED",
  MAX_RUNTIME_EXCEEDED: "BUDGET_MAX_RUNTIME_EXCEEDED",
} as const;

export const CODES_POLICY_ENGINE = {
  CAPABILITY_INVALID: "POLICY_CAPABILITY_INVALID",
  CAPABILITY_NOT_ALLOWED: "POLICY_CAPABILITY_NOT_ALLOWED",
  URL_INVALID: "POLICY_URL_INVALID",
  URL_PROTOCOL_BLOCK: "POLICY_URL_PROTOCOL_BLOCK",
  METHOD_BLOCK: "POLICY_METHOD_BLOCK",
  STEP_TIMEOUT_CAP: "POLICY_STEP_TIMEOUT_CAP",
  TIME_WINDOW: "POLICY_TIME_WINDOW",
  DOMAIN_NOT_ALLOWED: "DOMAIN_NOT_ALLOWED",
} as const;

// ===== Notion lanes =====
export const CODES_NOTION = {
  METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
  READ_ONLY_REQUIRED: "READ_ONLY_REQUIRED",
  ENDPOINT_FORBIDDEN: "NOTION_ENDPOINT_FORBIDDEN",
  ACTION_FORBIDDEN: "NOTION_ACTION_FORBIDDEN",
} as const;

export const CODES_NOTION_WRITE = {
  APPROVAL_REQUIRED: "NOTION_WRITE_APPROVAL_REQUIRED",
  REQUIRES_APPROVAL: "NOTION_WRITE_REQUIRES_APPROVAL",
  ORCHESTRATED_WRITE_REQUIRES_APPROVAL: "ORCHESTRATED_WRITE_REQUIRES_APPROVAL",
} as const;

export const CODES_NOTION_LIVE = {
  REQUIRES_READ_ONLY: "NOTION_LIVE_REQUIRES_READ_ONLY",
  WRITE_REQUIRES_PRESTATE: "NOTION_LIVE_WRITE_REQUIRES_PRESTATE",
  WRITE_METHOD_NOT_ALLOWED: "NOTION_LIVE_WRITE_METHOD_NOT_ALLOWED",
  METHOD_NOT_ALLOWED: "NOTION_LIVE_METHOD_NOT_ALLOWED",
  WRITE_APPROVAL_REQUIRED: "NOTION_LIVE_WRITE_APPROVAL_REQUIRED",
} as const;

export const CODES_PROD_APPROVAL = {
  WRITE_OPERATION: "WRITE_OPERATION",
} as const;

export const CODES_COVERAGE = {
  ALLOW: "ALLOW",
} as const;

// ===== Voice (WisprFlow) ingest =====
export const CODES_VOICE_WISPRFLOW = {
  REQUIRES_READ_ONLY: "WISPRFLOW_INGEST_REQUIRES_READ_ONLY",
  METHOD_NOT_ALLOWED: "WISPRFLOW_INGEST_METHOD_NOT_ALLOWED",
  PAYLOAD_INVALID: "WISPRFLOW_INGEST_PAYLOAD_INVALID",
  OUTBOUND_NOT_ALLOWED: "WISPRFLOW_INGEST_OUTBOUND_NOT_ALLOWED",
  SECRETS_NOT_ALLOWED: "WISPRFLOW_INGEST_SECRETS_NOT_ALLOWED",
  TOO_LARGE: "WISPRFLOW_INGEST_TOO_LARGE",
  PATH_NOT_ALLOWED: "WISPRFLOW_INGEST_PATH_NOT_ALLOWED",
} as const;

export const CODES_URL_GUARD = {
  SCHEME_NOT_ALLOWED: "SCHEME_NOT_ALLOWED",
  HOST_NOT_ALLOWED: "HOST_NOT_ALLOWED",
  SSRF_GUARD_BLOCKED: "SSRF_GUARD_BLOCKED",
} as const;

export const CODES_BROWSER_L0 = {
  BAD_URL: "BROWSER_L0_BAD_URL",
  REQUIRES_READ_ONLY: "BROWSER_L0_REQUIRES_READ_ONLY",
  METHOD_NOT_ALLOWED: "BROWSER_L0_METHOD_NOT_ALLOWED",
  SCHEME_NOT_ALLOWED: CODES_URL_GUARD.SCHEME_NOT_ALLOWED,
  HOST_NOT_ALLOWED: CODES_URL_GUARD.HOST_NOT_ALLOWED,
  SSRF_BLOCKED: CODES_URL_GUARD.SSRF_GUARD_BLOCKED,
} as const;

export const CODES_COMPETITIVE_BRIEF = {
  REQUIRES_READ_ONLY: "COMPETITIVE_BRIEF_REQUIRES_READ_ONLY",
  METHOD_NOT_ALLOWED: "COMPETITIVE_BRIEF_METHOD_NOT_ALLOWED",
  PAYLOAD_INVALID: "COMPETITIVE_BRIEF_PAYLOAD_INVALID",
  NO_CRAWL_FIELDS_ALLOWED: "COMPETITIVE_BRIEF_NO_CRAWL_FIELDS_ALLOWED",
  TARGETS_REQUIRED: "COMPETITIVE_BRIEF_TARGETS_REQUIRED",
  WIDE_RESEARCH_REQUIRES_APPROVAL: "COMPETITIVE_BRIEF_WIDE_RESEARCH_REQUIRES_APPROVAL",
  TOO_MANY_TARGETS: "COMPETITIVE_BRIEF_TOO_MANY_TARGETS",
  SCREENSHOT_MODE_NOT_ALLOWED: "COMPETITIVE_BRIEF_SCREENSHOT_MODE_NOT_ALLOWED",
  SCREENSHOT_MAX_REQUESTS_INVALID: "COMPETITIVE_BRIEF_SCREENSHOT_MAX_REQUESTS_INVALID",
  SCREENSHOT_MAX_REQUESTS_TOO_HIGH: "COMPETITIVE_BRIEF_SCREENSHOT_MAX_REQUESTS_TOO_HIGH",
  BAD_TARGET: "COMPETITIVE_BRIEF_BAD_TARGET",
  SCHEME_NOT_ALLOWED: CODES_URL_GUARD.SCHEME_NOT_ALLOWED,
  HOST_NOT_ALLOWED: CODES_URL_GUARD.HOST_NOT_ALLOWED,
  SSRF_BLOCKED: CODES_URL_GUARD.SSRF_GUARD_BLOCKED,
} as const;

export const CODES_SKILLS_LEARN = {
  REQUIRES_READ_ONLY: "SKILLS_LEARN_REQUIRES_READ_ONLY",
  METHOD_NOT_ALLOWED: "SKILLS_LEARN_METHOD_NOT_ALLOWED",
  PAYLOAD_INVALID: "SKILLS_LEARN_PAYLOAD_INVALID",
  MODE_NOT_ALLOWED: "SKILLS_LEARN_MODE_NOT_ALLOWED",
  REQUEST_REQUIRED: "SKILLS_LEARN_REQUEST_REQUIRED",
  APPLY_INTENT_NOT_ALLOWED: "SKILLS_LEARN_APPLY_INTENT_NOT_ALLOWED",
} as const;

export const CODES_SKILLS_APPLY = {
  REQUIRES_WRITE_STEP: "SKILLS_APPLY_REQUIRES_WRITE_STEP",
  METHOD_NOT_ALLOWED: "SKILLS_APPLY_METHOD_NOT_ALLOWED",
  PAYLOAD_INVALID: "SKILLS_APPLY_PAYLOAD_INVALID",
  PATCH_PATH_MISSING: "SKILLS_APPLY_PATCH_PATH_MISSING",
  PATCH_PATH_NOT_ALLOWED: "SKILLS_APPLY_PATCH_PATH_NOT_ALLOWED",
  PATCH_SHA256_INVALID: "SKILLS_APPLY_PATCH_SHA256_INVALID",
  REQUIRES_APPROVAL: "SKILLS_APPLY_REQUIRES_APPROVAL",
} as const;

export const CODES_WEBHOOK_INGEST = {
  REQUIRES_READ_ONLY: "WEBHOOK_INGEST_REQUIRES_READ_ONLY",
  METHOD_NOT_ALLOWED: "WEBHOOK_INGEST_METHOD_NOT_ALLOWED",
  PAYLOAD_INVALID: "WEBHOOK_INGEST_PAYLOAD_INVALID",
  PAYLOAD_TOO_LARGE: "WEBHOOK_INGEST_PAYLOAD_TOO_LARGE",
  OUTBOUND_NOT_ALLOWED: "WEBHOOK_INGEST_OUTBOUND_NOT_ALLOWED",
  SECRETS_NOT_ALLOWED: "WEBHOOK_INGEST_SECRETS_NOT_ALLOWED",
} as const;

export const CODES_MEETINGS_INGEST = {
  REQUIRES_READ_ONLY: "MEETINGS_INGEST_REQUIRES_READ_ONLY",
  METHOD_NOT_ALLOWED: "MEETINGS_INGEST_METHOD_NOT_ALLOWED",
  PAYLOAD_INVALID: "MEETINGS_INGEST_PAYLOAD_INVALID",
  OUTBOUND_NOT_ALLOWED: "MEETINGS_INGEST_OUTBOUND_NOT_ALLOWED",
  SECRETS_NOT_ALLOWED: "MEETINGS_INGEST_SECRETS_NOT_ALLOWED",
  PATH_NOT_ALLOWED: "MEETINGS_INGEST_PATH_NOT_ALLOWED",
  TOO_LARGE: "MEETINGS_INGEST_TOO_LARGE",
} as const;

export const CODES_RESEARCH_PERPLEXITY = {
  REQUIRES_READ_ONLY: "RESEARCH_PERPLEXITY_REQUIRES_READ_ONLY",
  METHOD_NOT_ALLOWED: "RESEARCH_PERPLEXITY_METHOD_NOT_ALLOWED",
  PAYLOAD_INVALID: "RESEARCH_PERPLEXITY_PAYLOAD_INVALID",
  NO_CRAWL_FIELDS_ALLOWED: "RESEARCH_PERPLEXITY_NO_CRAWL_FIELDS_ALLOWED",
  URL_NOT_ALLOWED: "RESEARCH_PERPLEXITY_URL_NOT_ALLOWED",
  BUDGET_EXCEEDED: "RESEARCH_PERPLEXITY_BUDGET_EXCEEDED",
  SCOPE_EXPANDED: "RESEARCH_PERPLEXITY_SCOPE_EXPANDED",
} as const;

export const CODES_DEV_SERENA = {
  DEV_ONLY_TOOL: "DEV_ONLY_TOOL",
  WRITE_NOT_ALLOWED: "SERENA_WRITE_NOT_ALLOWED",
} as const;

export const CODES_DOCS_CAPTURE = {
  REQUIRES_READ_ONLY: "DOCS_CAPTURE_REQUIRES_READ_ONLY",
  METHOD_NOT_ALLOWED: "DOCS_CAPTURE_METHOD_NOT_ALLOWED",
  HOST_NOT_ALLOWED: "DOCS_CAPTURE_HOST_NOT_ALLOWED",
} as const;

export const CODES_SCHEDULE_MOTION = {
  PAYLOAD_INVALID: "SCHEDULE_MOTION_PAYLOAD_INVALID",
  BULK_NOT_ALLOWED: "SCHEDULE_MOTION_BULK_NOT_ALLOWED",
  APPROVAL_REQUIRED: "SCHEDULE_MOTION_APPROVAL_REQUIRED",
} as const;

export const CODES_WRITING_GRAMMARLY = {
  REQUIRES_READ_ONLY: "GRAMMARLY_INGEST_REQUIRES_READ_ONLY",
  METHOD_NOT_ALLOWED: "GRAMMARLY_INGEST_METHOD_NOT_ALLOWED",
  PAYLOAD_INVALID: "GRAMMARLY_INGEST_PAYLOAD_INVALID",
  OUTBOUND_NOT_ALLOWED: "GRAMMARLY_INGEST_OUTBOUND_NOT_ALLOWED",
  SECRETS_NOT_ALLOWED: "GRAMMARLY_INGEST_SECRETS_NOT_ALLOWED",
  TOO_LARGE: "GRAMMARLY_INGEST_TOO_LARGE",
  PATH_NOT_ALLOWED: "GRAMMARLY_INGEST_PATH_NOT_ALLOWED",
} as const;

export const CODES_MEDIA_DESCRIPT = {
  INGEST_REQUIRES_READ_ONLY: "DESCRIPT_INGEST_REQUIRES_READ_ONLY",
  INGEST_METHOD_NOT_ALLOWED: "DESCRIPT_INGEST_METHOD_NOT_ALLOWED",
  INGEST_PAYLOAD_INVALID: "DESCRIPT_INGEST_PAYLOAD_INVALID",
  INGEST_OUTBOUND_NOT_ALLOWED: "DESCRIPT_INGEST_OUTBOUND_NOT_ALLOWED",
  INGEST_SECRETS_NOT_ALLOWED: "DESCRIPT_INGEST_SECRETS_NOT_ALLOWED",
  INGEST_PATH_NOT_ALLOWED: "DESCRIPT_INGEST_PATH_NOT_ALLOWED",
  INGEST_TOO_LARGE: "DESCRIPT_INGEST_TOO_LARGE",
  RENDER_PAYLOAD_INVALID: "DESCRIPT_RENDER_PAYLOAD_INVALID",
  RENDER_APPROVAL_REQUIRED: "MEDIA_DESCRIPT_RENDER_APPROVAL_REQUIRED",
} as const;

export const CODES_RESEARCH_NOTEBOOKLM = {
  REQUIRES_READ_ONLY: "NOTEBOOKLM_INGEST_REQUIRES_READ_ONLY",
  METHOD_NOT_ALLOWED: "NOTEBOOKLM_INGEST_METHOD_NOT_ALLOWED",
  PAYLOAD_INVALID: "NOTEBOOKLM_INGEST_PAYLOAD_INVALID",
  OUTBOUND_NOT_ALLOWED: "NOTEBOOKLM_INGEST_OUTBOUND_NOT_ALLOWED",
  SECRETS_NOT_ALLOWED: "NOTEBOOKLM_INGEST_SECRETS_NOT_ALLOWED",
  PATH_NOT_ALLOWED: "NOTEBOOKLM_INGEST_PATH_NOT_ALLOWED",
  TOO_LARGE: "NOTEBOOKLM_INGEST_TOO_LARGE",
} as const;

export const CODES_AUDIO_UDIO = {
  PAYLOAD_INVALID: "AUDIO_UDIO_PAYLOAD_INVALID",
  APPROVAL_REQUIRED: "AUDIO_UDIO_APPROVAL_REQUIRED",
} as const;

export const CODES_LLM_ANTHROPIC = {
  PAYLOAD_INVALID: "LLM_ANTHROPIC_PAYLOAD_INVALID",
  APPROVAL_REQUIRED: "LLM_ANTHROPIC_APPROVAL_REQUIRED",
} as const;

export const CODES_LLM_GOOGLE_AI_STUDIO = {
  PAYLOAD_INVALID: "LLM_GOOGLE_AI_STUDIO_PAYLOAD_INVALID",
  APPROVAL_REQUIRED: "LLM_GOOGLE_AI_STUDIO_APPROVAL_REQUIRED",
} as const;

export const CODES_DEV_BRIDGE = {
  DEV_ONLY_TOOL: "DEV_ONLY_TOOL",
  REQUIRES_READ_ONLY: "DEV_BRIDGE_REQUIRES_READ_ONLY",
  METHOD_NOT_ALLOWED: "DEV_BRIDGE_METHOD_NOT_ALLOWED",
  PAYLOAD_INVALID: "DEV_BRIDGE_PAYLOAD_INVALID",
  OUTBOUND_NOT_ALLOWED: "DEV_BRIDGE_OUTBOUND_NOT_ALLOWED",
  SECRETS_NOT_ALLOWED: "DEV_BRIDGE_SECRETS_NOT_ALLOWED",
} as const;

export const CODES_VOICE_ELEVENLABS = {
  PAYLOAD_INVALID: "VOICE_ELEVENLABS_PAYLOAD_INVALID",
  TEXT_TOO_LARGE: "VOICE_ELEVENLABS_TEXT_TOO_LARGE",
  VOICE_NOT_ALLOWED: "VOICE_ELEVENLABS_VOICE_NOT_ALLOWED",
  APPROVAL_REQUIRED: "VOICE_ELEVENLABS_APPROVAL_REQUIRED",
} as const;

// Confidence scoring reason codes (used by scorePolicy).
export const CODES_POLICY_SCORE = {
  POLICY_DENIED: "POLICY_DENIED",
  UNRESOLVED_CAPABILITY: "UNRESOLVED_CAPABILITY",
  UNKNOWN_DOMAIN: "UNKNOWN_DOMAIN",
  READ_ONLY: "READ_ONLY",
  WRITE_PRESENT: "WRITE_PRESENT",
  APPROVAL_GATED_WRITE: "APPROVAL_GATED_WRITE",
  PRESTATE_REQUIRED: "PRESTATE_REQUIRED",
  DOMAIN_ALLOWLIST_MATCH: "DOMAIN_ALLOWLIST_MATCH",
  LOW_STEP_COUNT: "LOW_STEP_COUNT",
  TIMEOUTS_CAPPED: "TIMEOUTS_CAPPED",
  AGENT_VERSION_PINNED: "AGENT_VERSION_PINNED",
  CAPABILITIES_RESOLVED: "CAPABILITIES_RESOLVED",
  RETRY_OCCURRED: "RETRY_OCCURRED",
  SCHEMA_TOLERANCE_USED: "SCHEMA_TOLERANCE_USED",
} as const;

/**
 * Canonical code bundles (single source-of-truth for strings).
 * Keep `CODES_*` exports for backward compatibility; prefer `POLICY_CODES` for new uses.
 */
export const POLICY_CODES = {
  COMMON: CODES_COMMON,

  AUTONOMY: CODES_AUTONOMY,
  MODE_GOVERNANCE: CODES_MODE_GOVERNANCE,
  LIMB: CODES_LIMB,
  CONFIDENCE: CODES_CONFIDENCE,
  REQUALIFICATION: CODES_REQUALIFICATION,
  DOMAIN_OVERLAY: CODES_DOMAIN_OVERLAY,
  POLICY_BUDGET: CODES_POLICY_BUDGET,
  POLICY_ENGINE: CODES_POLICY_ENGINE,
  POLICY_SCORE: CODES_POLICY_SCORE,

  NOTION: CODES_NOTION,
  NOTION_WRITE: CODES_NOTION_WRITE,
  NOTION_LIVE: CODES_NOTION_LIVE,
  PROD_APPROVAL: CODES_PROD_APPROVAL,
  COVERAGE: CODES_COVERAGE,
  VOICE_WISPRFLOW: CODES_VOICE_WISPRFLOW,

  // Browser L0 (family)
  BROWSER_L0: {
    BAD_URL: CODES_BROWSER_L0.BAD_URL,
    REQUIRES_READ_ONLY: CODES_BROWSER_L0.REQUIRES_READ_ONLY,
    METHOD_NOT_ALLOWED: CODES_BROWSER_L0.METHOD_NOT_ALLOWED,
    SCHEME_NOT_ALLOWED: CODES_URL_GUARD.SCHEME_NOT_ALLOWED,
    HOST_NOT_ALLOWED: CODES_URL_GUARD.HOST_NOT_ALLOWED,
    SSRF_GUARD_BLOCKED: CODES_URL_GUARD.SSRF_GUARD_BLOCKED,
  },

  COMPETITIVE_BRIEF: CODES_COMPETITIVE_BRIEF,
  SKILLS_LEARN: CODES_SKILLS_LEARN,
  SKILLS_APPLY: CODES_SKILLS_APPLY,
  WEBHOOK_INGEST: CODES_WEBHOOK_INGEST,
  MEETINGS_INGEST: CODES_MEETINGS_INGEST,
  RESEARCH_PERPLEXITY: CODES_RESEARCH_PERPLEXITY,
  DOCS_EDEN_CAPTURE: CODES_DOCS_CAPTURE,
  DEV_SERENA: CODES_DEV_SERENA,
  SCHEDULE_MOTION: CODES_SCHEDULE_MOTION,
  VOICE_ELEVENLABS: CODES_VOICE_ELEVENLABS,

  WRITING_GRAMMARLY: CODES_WRITING_GRAMMARLY,
  MEDIA_DESCRIPT: CODES_MEDIA_DESCRIPT,
  RESEARCH_NOTEBOOKLM: CODES_RESEARCH_NOTEBOOKLM,
  AUDIO_UDIO: CODES_AUDIO_UDIO,
  LLM_ANTHROPIC: CODES_LLM_ANTHROPIC,
  LLM_GOOGLE_AI_STUDIO: CODES_LLM_GOOGLE_AI_STUDIO,
  DEV_BRIDGE: CODES_DEV_BRIDGE,
} as const;

export const C = POLICY_CODES;

const LEGACY_POLICY_REGISTRY = [
  // Prefix groups
  {
    kind: "prefix",
    prefix: "browser.l0.",
    capability: "browser:l0",
    tier: 1,
    decisions: {
      allow: true,
      deny: [
        CODES_BROWSER_L0.BAD_URL,
        CODES_BROWSER_L0.REQUIRES_READ_ONLY,
        CODES_BROWSER_L0.METHOD_NOT_ALLOWED,
        CODES_BROWSER_L0.SCHEME_NOT_ALLOWED,
        CODES_BROWSER_L0.HOST_NOT_ALLOWED,
        CODES_BROWSER_L0.SSRF_BLOCKED,
      ] as const,
      approval: [] as const,
    },
  },
  {
    kind: "prefix",
    prefix: "dev.serena.",
    capability: "dev:serena",
    tier: 1,
    decisions: {
      allow: true,
      deny: [CODES_COMMON.CAPABILITY_MISSING, CODES_DEV_SERENA.DEV_ONLY_TOOL, CODES_DEV_SERENA.WRITE_NOT_ALLOWED] as const,
      approval: [] as const,
    },
  },

  // Schema actions
  {
    kind: "action",
    action: "browser.l0.dom_extract.v1",
    capability: "browser:l0",
    tier: 1,
    decisions: {
      allow: true,
      deny: [
        CODES_BROWSER_L0.BAD_URL,
        CODES_BROWSER_L0.REQUIRES_READ_ONLY,
        CODES_BROWSER_L0.METHOD_NOT_ALLOWED,
        CODES_BROWSER_L0.SCHEME_NOT_ALLOWED,
        CODES_BROWSER_L0.HOST_NOT_ALLOWED,
        CODES_BROWSER_L0.SSRF_BLOCKED,
      ] as const,
      approval: [] as const,
    },
  },
  {
    kind: "action",
    action: "browser.l0.navigate.v1",
    capability: "browser:l0",
    tier: 1,
    decisions: {
      allow: true,
      deny: [
        CODES_BROWSER_L0.BAD_URL,
        CODES_BROWSER_L0.REQUIRES_READ_ONLY,
        CODES_BROWSER_L0.METHOD_NOT_ALLOWED,
        CODES_BROWSER_L0.SCHEME_NOT_ALLOWED,
        CODES_BROWSER_L0.HOST_NOT_ALLOWED,
        CODES_BROWSER_L0.SSRF_BLOCKED,
      ] as const,
      approval: [] as const,
    },
  },
  {
    kind: "action",
    action: "browser.l0.screenshot.v1",
    capability: "browser:l0",
    tier: 1,
    decisions: {
      allow: true,
      deny: [
        CODES_BROWSER_L0.BAD_URL,
        CODES_BROWSER_L0.REQUIRES_READ_ONLY,
        CODES_BROWSER_L0.METHOD_NOT_ALLOWED,
        CODES_BROWSER_L0.SCHEME_NOT_ALLOWED,
        CODES_BROWSER_L0.HOST_NOT_ALLOWED,
        CODES_BROWSER_L0.SSRF_BLOCKED,
      ] as const,
      approval: [] as const,
    },
  },

  {
    kind: "action",
    action: "competitive.brief.v1",
    capability: "browser:l0",
    tier: 1,
    decisions: {
      allow: true,
      deny: [
        CODES_COMMON.CAPABILITY_MISSING,
        CODES_COMPETITIVE_BRIEF.REQUIRES_READ_ONLY,
        CODES_COMPETITIVE_BRIEF.METHOD_NOT_ALLOWED,
        CODES_COMPETITIVE_BRIEF.PAYLOAD_INVALID,
        CODES_COMPETITIVE_BRIEF.NO_CRAWL_FIELDS_ALLOWED,
        CODES_COMPETITIVE_BRIEF.TARGETS_REQUIRED,
        CODES_COMPETITIVE_BRIEF.SCREENSHOT_MODE_NOT_ALLOWED,
        CODES_COMPETITIVE_BRIEF.SCREENSHOT_MAX_REQUESTS_INVALID,
        CODES_COMPETITIVE_BRIEF.SCREENSHOT_MAX_REQUESTS_TOO_HIGH,
        CODES_COMPETITIVE_BRIEF.BAD_TARGET,
        CODES_COMPETITIVE_BRIEF.SCHEME_NOT_ALLOWED,
        CODES_COMPETITIVE_BRIEF.HOST_NOT_ALLOWED,
        CODES_COMPETITIVE_BRIEF.SSRF_BLOCKED,
      ] as const,
      approval: [CODES_COMPETITIVE_BRIEF.WIDE_RESEARCH_REQUIRES_APPROVAL, CODES_COMPETITIVE_BRIEF.TOO_MANY_TARGETS] as const,
    },
  },

  {
    kind: "action",
    action: "skills.learn.v1",
    capability: "skills:learn",
    tier: 2,
    decisions: {
      allow: true,
      deny: [
        CODES_COMMON.CAPABILITY_MISSING,
        CODES_SKILLS_LEARN.REQUIRES_READ_ONLY,
        CODES_SKILLS_LEARN.METHOD_NOT_ALLOWED,
        CODES_SKILLS_LEARN.PAYLOAD_INVALID,
        CODES_SKILLS_LEARN.MODE_NOT_ALLOWED,
        CODES_SKILLS_LEARN.REQUEST_REQUIRED,
        CODES_SKILLS_LEARN.APPLY_INTENT_NOT_ALLOWED,
      ] as const,
      approval: [] as const,
    },
  },
  {
    kind: "action",
    action: "skills.apply.v1",
    capability: "skills:apply",
    tier: 3,
    decisions: {
      allow: false,
      deny: [
        CODES_COMMON.CAPABILITY_MISSING,
        CODES_SKILLS_APPLY.REQUIRES_WRITE_STEP,
        CODES_SKILLS_APPLY.METHOD_NOT_ALLOWED,
        CODES_SKILLS_APPLY.PAYLOAD_INVALID,
        CODES_SKILLS_APPLY.PATCH_PATH_MISSING,
        CODES_SKILLS_APPLY.PATCH_PATH_NOT_ALLOWED,
        CODES_SKILLS_APPLY.PATCH_SHA256_INVALID,
      ] as const,
      approval: [CODES_SKILLS_APPLY.REQUIRES_APPROVAL] as const,
    },
  },

  {
    kind: "action",
    action: "integrations.webhook.ingest.v1",
    capability: "integrations:webhook",
    tier: 1,
    decisions: {
      allow: true,
      deny: [
        CODES_COMMON.CAPABILITY_MISSING,
        CODES_WEBHOOK_INGEST.REQUIRES_READ_ONLY,
        CODES_WEBHOOK_INGEST.METHOD_NOT_ALLOWED,
        CODES_WEBHOOK_INGEST.PAYLOAD_INVALID,
        CODES_WEBHOOK_INGEST.PAYLOAD_TOO_LARGE,
        CODES_WEBHOOK_INGEST.OUTBOUND_NOT_ALLOWED,
        CODES_WEBHOOK_INGEST.SECRETS_NOT_ALLOWED,
      ] as const,
      approval: [] as const,
    },
  },

  {
    kind: "action",
    action: "meetings.fireflies.ingest.v1",
    capability: "meetings:fireflies",
    tier: 1,
    decisions: {
      allow: true,
      deny: [
        CODES_COMMON.CAPABILITY_MISSING,
        CODES_MEETINGS_INGEST.REQUIRES_READ_ONLY,
        CODES_MEETINGS_INGEST.METHOD_NOT_ALLOWED,
        CODES_MEETINGS_INGEST.PAYLOAD_INVALID,
        CODES_MEETINGS_INGEST.OUTBOUND_NOT_ALLOWED,
        CODES_MEETINGS_INGEST.SECRETS_NOT_ALLOWED,
        CODES_MEETINGS_INGEST.PATH_NOT_ALLOWED,
        CODES_MEETINGS_INGEST.TOO_LARGE,
      ] as const,
      approval: [] as const,
    },
  },
  {
    kind: "action",
    action: "meetings.fathom.ingest.v1",
    capability: "meetings:fathom",
    tier: 1,
    decisions: {
      allow: true,
      deny: [
        CODES_COMMON.CAPABILITY_MISSING,
        CODES_MEETINGS_INGEST.REQUIRES_READ_ONLY,
        CODES_MEETINGS_INGEST.METHOD_NOT_ALLOWED,
        CODES_MEETINGS_INGEST.PAYLOAD_INVALID,
        CODES_MEETINGS_INGEST.OUTBOUND_NOT_ALLOWED,
        CODES_MEETINGS_INGEST.SECRETS_NOT_ALLOWED,
        CODES_MEETINGS_INGEST.PATH_NOT_ALLOWED,
        CODES_MEETINGS_INGEST.TOO_LARGE,
      ] as const,
      approval: [] as const,
    },
  },

  {
    kind: "action",
    action: "research.perplexity.fetch.v1",
    capability: "research:perplexity",
    tier: 1,
    decisions: {
      allow: true,
      deny: [
        CODES_COMMON.CAPABILITY_MISSING,
        CODES_RESEARCH_PERPLEXITY.REQUIRES_READ_ONLY,
        CODES_RESEARCH_PERPLEXITY.METHOD_NOT_ALLOWED,
        CODES_RESEARCH_PERPLEXITY.PAYLOAD_INVALID,
        CODES_RESEARCH_PERPLEXITY.NO_CRAWL_FIELDS_ALLOWED,
        CODES_RESEARCH_PERPLEXITY.URL_NOT_ALLOWED,
        CODES_RESEARCH_PERPLEXITY.BUDGET_EXCEEDED,
      ] as const,
      approval: [CODES_RESEARCH_PERPLEXITY.SCOPE_EXPANDED] as const,
    },
  },

  {
    kind: "action",
    action: "docs.eden.capture.v1",
    capability: "docs:eden",
    tier: 1,
    decisions: {
      allow: true,
      deny: [
        CODES_COMMON.CAPABILITY_MISSING,
        CODES_DOCS_CAPTURE.REQUIRES_READ_ONLY,
        CODES_DOCS_CAPTURE.METHOD_NOT_ALLOWED,
        CODES_DOCS_CAPTURE.HOST_NOT_ALLOWED,
      ] as const,
      approval: [] as const,
    },
  },

  {
    kind: "action",
    action: "schedule.motion.create_task.v1",
    capability: "schedule:motion",
    tier: 3,
    decisions: {
      allow: false,
      deny: [CODES_COMMON.CAPABILITY_MISSING, CODES_SCHEDULE_MOTION.PAYLOAD_INVALID, CODES_SCHEDULE_MOTION.BULK_NOT_ALLOWED] as const,
      approval: [CODES_SCHEDULE_MOTION.APPROVAL_REQUIRED] as const,
    },
  },
  {
    kind: "action",
    action: "schedule.motion.update_task.v1",
    capability: "schedule:motion",
    tier: 3,
    decisions: {
      allow: false,
      deny: [CODES_COMMON.CAPABILITY_MISSING, CODES_SCHEDULE_MOTION.PAYLOAD_INVALID, CODES_SCHEDULE_MOTION.BULK_NOT_ALLOWED] as const,
      approval: [CODES_SCHEDULE_MOTION.APPROVAL_REQUIRED] as const,
    },
  },
  {
    kind: "action",
    action: "schedule.motion.delete_task.v1",
    capability: "schedule:motion",
    tier: 3,
    decisions: {
      allow: false,
      deny: [CODES_COMMON.CAPABILITY_MISSING, CODES_SCHEDULE_MOTION.PAYLOAD_INVALID, CODES_SCHEDULE_MOTION.BULK_NOT_ALLOWED] as const,
      approval: [CODES_SCHEDULE_MOTION.APPROVAL_REQUIRED] as const,
    },
  },

  {
    kind: "action",
    action: "writing.grammarly.ingest.v1",
    capability: "writing:grammarly",
    tier: 1,
    decisions: {
      allow: true,
      deny: [
        CODES_COMMON.CAPABILITY_MISSING,
        CODES_WRITING_GRAMMARLY.REQUIRES_READ_ONLY,
        CODES_WRITING_GRAMMARLY.METHOD_NOT_ALLOWED,
        CODES_WRITING_GRAMMARLY.PAYLOAD_INVALID,
        CODES_WRITING_GRAMMARLY.OUTBOUND_NOT_ALLOWED,
        CODES_WRITING_GRAMMARLY.SECRETS_NOT_ALLOWED,
        CODES_WRITING_GRAMMARLY.TOO_LARGE,
        CODES_WRITING_GRAMMARLY.PATH_NOT_ALLOWED,
      ] as const,
      approval: [] as const,
    },
  },

  {
    kind: "action",
    action: "media.descript.ingest.v1",
    capability: "media:descript",
    tier: 1,
    decisions: {
      allow: true,
      deny: [
        CODES_COMMON.CAPABILITY_MISSING,
        CODES_MEDIA_DESCRIPT.INGEST_REQUIRES_READ_ONLY,
        CODES_MEDIA_DESCRIPT.INGEST_METHOD_NOT_ALLOWED,
        CODES_MEDIA_DESCRIPT.INGEST_PAYLOAD_INVALID,
        CODES_MEDIA_DESCRIPT.INGEST_OUTBOUND_NOT_ALLOWED,
        CODES_MEDIA_DESCRIPT.INGEST_SECRETS_NOT_ALLOWED,
        CODES_MEDIA_DESCRIPT.INGEST_PATH_NOT_ALLOWED,
        CODES_MEDIA_DESCRIPT.INGEST_TOO_LARGE,
      ] as const,
      approval: [] as const,
    },
  },
  {
    kind: "action",
    action: "media.descript.render.v1",
    capability: "media:descript",
    tier: 3,
    decisions: {
      allow: false,
      deny: [CODES_COMMON.CAPABILITY_MISSING, CODES_MEDIA_DESCRIPT.RENDER_PAYLOAD_INVALID] as const,
      approval: [CODES_MEDIA_DESCRIPT.RENDER_APPROVAL_REQUIRED] as const,
    },
  },

  {
    kind: "action",
    action: "research.notebooklm.ingest.v1",
    capability: "research:notebooklm",
    tier: 1,
    decisions: {
      allow: true,
      deny: [
        CODES_COMMON.CAPABILITY_MISSING,
        CODES_RESEARCH_NOTEBOOKLM.REQUIRES_READ_ONLY,
        CODES_RESEARCH_NOTEBOOKLM.METHOD_NOT_ALLOWED,
        CODES_RESEARCH_NOTEBOOKLM.PAYLOAD_INVALID,
        CODES_RESEARCH_NOTEBOOKLM.OUTBOUND_NOT_ALLOWED,
        CODES_RESEARCH_NOTEBOOKLM.SECRETS_NOT_ALLOWED,
        CODES_RESEARCH_NOTEBOOKLM.PATH_NOT_ALLOWED,
        CODES_RESEARCH_NOTEBOOKLM.TOO_LARGE,
      ] as const,
      approval: [] as const,
    },
  },

  {
    kind: "action",
    action: "audio.udio.generate.v1",
    capability: "audio:udio",
    tier: 3,
    decisions: {
      allow: false,
      deny: [CODES_COMMON.CAPABILITY_MISSING, CODES_AUDIO_UDIO.PAYLOAD_INVALID] as const,
      approval: [CODES_AUDIO_UDIO.APPROVAL_REQUIRED] as const,
    },
  },

  {
    kind: "action",
    action: "llm.anthropic.chat.v1",
    capability: "llm:anthropic",
    tier: 3,
    decisions: {
      allow: false,
      deny: [CODES_COMMON.CAPABILITY_MISSING, CODES_LLM_ANTHROPIC.PAYLOAD_INVALID] as const,
      approval: [CODES_LLM_ANTHROPIC.APPROVAL_REQUIRED] as const,
    },
  },
  {
    kind: "action",
    action: "llm.google_ai_studio.generate.v1",
    capability: "llm:google_ai_studio",
    tier: 3,
    decisions: {
      allow: false,
      deny: [CODES_COMMON.CAPABILITY_MISSING, CODES_LLM_GOOGLE_AI_STUDIO.PAYLOAD_INVALID] as const,
      approval: [CODES_LLM_GOOGLE_AI_STUDIO.APPROVAL_REQUIRED] as const,
    },
  },

  {
    kind: "action",
    action: "dev.cursor.bridge.v1",
    capability: "dev:cursor",
    tier: 1,
    decisions: {
      allow: true,
      deny: [
        CODES_COMMON.CAPABILITY_MISSING,
        CODES_DEV_BRIDGE.DEV_ONLY_TOOL,
        CODES_DEV_BRIDGE.REQUIRES_READ_ONLY,
        CODES_DEV_BRIDGE.METHOD_NOT_ALLOWED,
        CODES_DEV_BRIDGE.PAYLOAD_INVALID,
        CODES_DEV_BRIDGE.OUTBOUND_NOT_ALLOWED,
        CODES_DEV_BRIDGE.SECRETS_NOT_ALLOWED,
      ] as const,
      approval: [] as const,
    },
  },
  {
    kind: "action",
    action: "dev.lovable.bridge.v1",
    capability: "dev:lovable",
    tier: 1,
    decisions: {
      allow: true,
      deny: [
        CODES_COMMON.CAPABILITY_MISSING,
        CODES_DEV_BRIDGE.DEV_ONLY_TOOL,
        CODES_DEV_BRIDGE.REQUIRES_READ_ONLY,
        CODES_DEV_BRIDGE.METHOD_NOT_ALLOWED,
        CODES_DEV_BRIDGE.PAYLOAD_INVALID,
        CODES_DEV_BRIDGE.OUTBOUND_NOT_ALLOWED,
        CODES_DEV_BRIDGE.SECRETS_NOT_ALLOWED,
      ] as const,
      approval: [] as const,
    },
  },
  {
    kind: "action",
    action: "dev.gamma.bridge.v1",
    capability: "dev:gamma",
    tier: 1,
    decisions: {
      allow: true,
      deny: [
        CODES_COMMON.CAPABILITY_MISSING,
        CODES_DEV_BRIDGE.DEV_ONLY_TOOL,
        CODES_DEV_BRIDGE.REQUIRES_READ_ONLY,
        CODES_DEV_BRIDGE.METHOD_NOT_ALLOWED,
        CODES_DEV_BRIDGE.PAYLOAD_INVALID,
        CODES_DEV_BRIDGE.OUTBOUND_NOT_ALLOWED,
        CODES_DEV_BRIDGE.SECRETS_NOT_ALLOWED,
      ] as const,
      approval: [] as const,
    },
  },
  {
    kind: "action",
    action: "dev.icon.bridge.v1",
    capability: "dev:icon",
    tier: 1,
    decisions: {
      allow: true,
      deny: [
        CODES_COMMON.CAPABILITY_MISSING,
        CODES_DEV_BRIDGE.DEV_ONLY_TOOL,
        CODES_DEV_BRIDGE.REQUIRES_READ_ONLY,
        CODES_DEV_BRIDGE.METHOD_NOT_ALLOWED,
        CODES_DEV_BRIDGE.PAYLOAD_INVALID,
        CODES_DEV_BRIDGE.OUTBOUND_NOT_ALLOWED,
        CODES_DEV_BRIDGE.SECRETS_NOT_ALLOWED,
      ] as const,
      approval: [] as const,
    },
  },

  {
    kind: "action",
    action: "dev.serena.find_symbol.v1",
    capability: "dev:serena",
    tier: 1,
    decisions: {
      allow: true,
      deny: [CODES_COMMON.CAPABILITY_MISSING, CODES_DEV_SERENA.DEV_ONLY_TOOL, CODES_DEV_SERENA.WRITE_NOT_ALLOWED] as const,
      approval: [] as const,
    },
  },
  {
    kind: "action",
    action: "dev.serena.find_referencing_symbols.v1",
    capability: "dev:serena",
    tier: 1,
    decisions: {
      allow: true,
      deny: [CODES_COMMON.CAPABILITY_MISSING, CODES_DEV_SERENA.DEV_ONLY_TOOL, CODES_DEV_SERENA.WRITE_NOT_ALLOWED] as const,
      approval: [] as const,
    },
  },
  {
    kind: "action",
    action: "dev.serena.get_symbols_overview.v1",
    capability: "dev:serena",
    tier: 1,
    decisions: {
      allow: true,
      deny: [CODES_COMMON.CAPABILITY_MISSING, CODES_DEV_SERENA.DEV_ONLY_TOOL, CODES_DEV_SERENA.WRITE_NOT_ALLOWED] as const,
      approval: [] as const,
    },
  },
  {
    kind: "action",
    action: "dev.serena.type_hierarchy.v1",
    capability: "dev:serena",
    tier: 1,
    decisions: {
      allow: true,
      deny: [CODES_COMMON.CAPABILITY_MISSING, CODES_DEV_SERENA.DEV_ONLY_TOOL, CODES_DEV_SERENA.WRITE_NOT_ALLOWED] as const,
      approval: [] as const,
    },
  },

  // Non-schema but currently implemented adapter (kept here so strings live in one place).
  {
    kind: "action",
    action: "voice.elevenlabs.tts.v1",
    capability: "voice:elevenlabs",
    tier: 3,
    decisions: {
      allow: false,
      deny: [
        CODES_COMMON.CAPABILITY_MISSING,
        CODES_VOICE_ELEVENLABS.PAYLOAD_INVALID,
        CODES_VOICE_ELEVENLABS.TEXT_TOO_LARGE,
        CODES_VOICE_ELEVENLABS.VOICE_NOT_ALLOWED,
      ] as const,
      approval: [CODES_VOICE_ELEVENLABS.APPROVAL_REQUIRED] as const,
    },
  },
] as const satisfies readonly LegacyPolicyRegistryEntry[];

/**
 * The registry itself:
 * - “prefix” entries model families like browser.l0.*
 * - “action” entries model single actions like skills.learn.v1
 */
export const POLICY_REGISTRY: readonly PolicyRegistryEntry[] = LEGACY_POLICY_REGISTRY.map((e) => {
  if (e.kind === "action") {
    return {
      kind: "action",
      action: e.action,
      capability: e.capability,
      tier: e.tier,
      allow: Boolean(e.decisions.allow),
      denyCodes: e.decisions.deny,
      approvalCodes: e.decisions.approval,
    };
  }

  return {
    kind: "prefix",
    prefix: e.prefix,
    capability: e.capability,
    tier: e.tier,
    allow: Boolean(e.decisions.allow),
    denyCodes: e.decisions.deny,
    approvalCodes: e.decisions.approval,
  };
});

export function registryEntriesForAction(action: string): PolicyRegistryEntry[] {
  const direct = POLICY_REGISTRY.filter(
    (e): e is Extract<PolicyRegistryEntry, { kind: "action" }> => e.kind === "action" && e.action === action
  );
  const prefixes = POLICY_REGISTRY.filter(
    (e): e is Extract<PolicyRegistryEntry, { kind: "prefix" }> => e.kind === "prefix" && action.startsWith(e.prefix)
  );
  return [...direct, ...prefixes];
}

export function hasPolicyRegistryEntryForAction(action: string): boolean {
  return registryEntriesForAction(action).length > 0;
}

export function unionCodesForAction(action: string): {
  allowPossible: boolean;
  denyCodes: readonly string[];
  approvalCodes: readonly string[];
} {
  const entries = registryEntriesForAction(action);
  const allowPossible = entries.some((e) => e.allow);
  const deny = new Set<string>();
  const approval = new Set<string>();
  for (const e of entries) {
    for (const c of e.denyCodes) deny.add(c);
    for (const c of e.approvalCodes) approval.add(c);
  }
  return {
    allowPossible,
    denyCodes: Array.from(deny),
    approvalCodes: Array.from(approval),
  };
}
