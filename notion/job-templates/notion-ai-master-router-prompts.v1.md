# Notion AI Master Router Prompts (v1)

This file is a repository-local copy of the prompts used to generate deterministic job request JSON templates via Notion AI.

For the Notion-side “hands-free” setup (database + template + button wiring), see:

- notion-hands-free-router-wiring.v1.md

---

## 1) Master Router Prompt (Notion AI paste)

Copy/paste everything below into Notion AI:

```text
You are generating deterministic job request JSON templates for a legal automation system.

OUTPUT RULES (HARD):
- Output ONLY valid JSON (no markdown, no comments, no prose).
- Output must be a JSON array of objects.
- Every object MUST include exactly these top-level keys:
  template_name, case_id, job_type, idempotency_key, params
- No other top-level keys allowed.

NAMING SCHEME (MUST FOLLOW):
- case_id: "verizon-2025" (use exactly this value)
- template_name: "A_<job_type>" prefix letters A, B, C… in pipeline order
- output paths: ALWAYS under "Cases/{case_id}/" and must use consistent folders:
  - Evidence: "Cases/{case_id}/Evidence/..."
  - Ledger: "Cases/{case_id}/Ledger/..."
  - Artifacts: "Cases/{case_id}/Artifacts/..."
  - Manifests: "Cases/{case_id}/Manifests/..."
  - Public: "Cases/{case_id}/Public/..."
  - Private: "Cases/{case_id}/Private/..."
  - Submissions: "Cases/{case_id}/Submissions/<FORUM>/..."
- Hash placeholder tokens allowed ONLY as ALL CAPS wrapped in double-underscores:
  __SNAPSHOT_SHA256__, __EVENTS_DIGEST_SHA256__, __MANIFEST_SHA256__, __DATE_ISO__
- All sha256 values must be lowercase hex placeholders of length 64 ONLY if needed, otherwise use the tokens above.

IDEMPOTENCY RULE (MUST FOLLOW):
- idempotency_key MUST reference the primary input hash token for the job:
  - If job is snapshot-driven: include __SNAPSHOT_SHA256__
  - If job is events-driven: include __EVENTS_DIGEST_SHA256__
  - If job is manifest-driven: include __MANIFEST_SHA256__
  - If time-driven reporting: include __DATE_ISO__
- Format: "{case_id}:{job_type}:{PRIMARY_TOKEN}"

JOBS TO GENERATE (ALL REQUIRED, IN THIS ORDER):
1) silence_clock_dashboard_v1
2) motion_to_compel_sanctions_v1 (KEYED ONLY to silence_snapshot)
3) consent_order_auto_draft_v1 (KEYED ONLY to silence_snapshot + sanctions manifest)
4) public_verifier_page_generate (KEYED to a single source manifest)
5) consent_order_submission_packet_v1 (generate 3 templates: FCC, CFPB, NJ-AG)
6) multi_case_pattern_report_v1 (2 case nodes example)

JOB PARAMS REQUIREMENTS:
A) silence_clock_dashboard_v1 params MUST include:
- case_id, forum_track, cure_window_hours, timezone, clock_policy
- events_path (Ledger events JSON)
- output_silence_snapshot_path, output_dashboard_pdf_path, output_manifest_path
- output_snapshot_sha256_path, output_pdf_sha256_path

B) motion_to_compel_sanctions_v1 params MUST include:
- case_id
- silence_snapshot_path (Ledger snapshot path using __SNAPSHOT_SHA256__)
- doc_type_profile_id (use "motion_to_compel_sanctions.profile.v1")
- style_registry_id (use "docx_style_registry.v1")
- run_integrity_gates true
- parity_gate object with:
  require_heading_order_match true
  require_cardinality_match true
  allow_pdf_preface_bookmarks true
- heading_digest_pin true
- render_plan_digest_pin true
- output_docx_path, output_pdf_path, output_manifest_path

C) consent_order_auto_draft_v1 params MUST include:
- case_id
- silence_snapshot_path (same token)
- sanctions_motion_manifest_path (Manifests path referencing __SNAPSHOT_SHA256__)
- outcome_mode enum placeholder (set to "ignored" by default)
- doc_type_profile_id "consent_order.profile.v1"
- style_registry_id "docx_style_registry.v1"
- same integrity + parity gate fields as sanctions job
- heading_digest_pin true, render_plan_digest_pin true
- output_docx_path, output_pdf_path, output_manifest_path

D) public_verifier_page_generate params MUST include:
- case_id
- source_manifest_path (use a master binder manifest under Manifests, token __MANIFEST_SHA256__)
- doc_type_profile_id "public_verifier.profile.v1"
- pin_heading_digest true
- pin_render_plan_digest true
- pin_merkle_root_slots true
- output_verifier_html_path, output_verifier_manifest_path, output_verifier_sha256_path

E) consent_order_submission_packet_v1 params MUST include:
- case_id, forum enum value, consent_order_pdf_path, consent_order_docx_path
- public_binder_pdf_path, private_binder_pdf_path
- summary_card_pdf_path
- public_verifier_html_path, public_verifier_manifest_path
- output_zip_path, output_manifest_path
- include_cover_memo true
- cover_memo_template: "standard" for FCC/CFPB, "ag_variant" for NJ-AG
- zip_root_dir "Regulator_Submission"

F) multi_case_pattern_report_v1 params MUST include:
- report_id (use "carrier_pattern_report.__DATE_ISO__")
- case_nodes array (min 2) each with case_id + verifier_manifest_path + label
- pattern_definitions_path
- output_public_pdf_path, output_regulator_pdf_path
- output_graph_json_path, output_graph_svg_path
- output_manifest_path
- redaction_mode "public"
- cluster_threshold 0.65

DEFAULTS:
- case_id: "verizon-2025"
- forum_track: "regulator_parallel"
- cure_window_hours: 72
- timezone: "America/New_York"
- clock_policy: "strict"

FINAL OUTPUT:
Return the JSON array with all templates. No extra text.
```

---

## 2) “Extra Mean” Master Router Prompt (self-check + no-cute mode)

This is the one you use when you’re tired, angry, or Notion AI starts freelancing.

```text
STRICT COMPILER MODE. DO NOT BE CREATIVE. DO NOT ADD EXPLANATIONS.

You must output ONLY valid JSON. If you cannot comply, output ONLY this JSON:
{"error":"NONCOMPLIANT_OUTPUT"}

Required output format:
- JSON array of objects
- each object MUST have ONLY keys: template_name, case_id, job_type, idempotency_key, params

ABSOLUTE RULES:
1) Every template MUST include required keys (template_name, case_id, job_type, idempotency_key, params).
2) Every output path in params MUST start with "Cases/{case_id}/" EXACTLY.
3) idempotency_key MUST contain the correct primary input token for the job:
   - silence_clock_dashboard_v1 uses __EVENTS_DIGEST_SHA256__
   - motion_to_compel_sanctions_v1 uses __SNAPSHOT_SHA256__
   - consent_order_auto_draft_v1 uses __SNAPSHOT_SHA256__
   - public_verifier_page_generate uses __MANIFEST_SHA256__
   - consent_order_submission_packet_v1 uses __MANIFEST_SHA256__
   - multi_case_pattern_report_v1 uses __DATE_ISO__
4) Forbid unknown keys everywhere:
   - No extra top-level keys
   - params must not include random fields not listed in the spec below.
5) Any sha256 value must be either:
   - token (__SNAPSHOT_SHA256__/__EVENTS_DIGEST_SHA256__/__MANIFEST_SHA256__), OR
   - lowercase hex length 64. Nothing else.

TEMPLATES TO GENERATE (IN ORDER):
A) silence_clock_dashboard_v1
B) motion_to_compel_sanctions_v1
C) consent_order_auto_draft_v1
D) public_verifier_page_generate
E1) consent_order_submission_packet_v1 (FCC)
E2) consent_order_submission_packet_v1 (CFPB)
E3) consent_order_submission_packet_v1 (NJ-AG)
F) multi_case_pattern_report_v1

PARAMS SPEC (ONLY THESE FIELDS ALLOWED):

A) silence_clock_dashboard_v1 params:
case_id, forum_track, cure_window_hours, timezone, clock_policy,
events_path,
output_silence_snapshot_path, output_dashboard_pdf_path, output_manifest_path,
output_snapshot_sha256_path, output_pdf_sha256_path

B) motion_to_compel_sanctions_v1 params:
case_id, silence_snapshot_path, doc_type_profile_id, style_registry_id,
run_integrity_gates, parity_gate, heading_digest_pin, render_plan_digest_pin,
output_docx_path, output_pdf_path, output_manifest_path

C) consent_order_auto_draft_v1 params:
case_id, silence_snapshot_path, sanctions_motion_manifest_path, outcome_mode,
doc_type_profile_id, style_registry_id,
run_integrity_gates, parity_gate, heading_digest_pin, render_plan_digest_pin,
output_docx_path, output_pdf_path, output_manifest_path

D) public_verifier_page_generate params:
case_id, source_manifest_path, doc_type_profile_id,
pin_heading_digest, pin_render_plan_digest, pin_merkle_root_slots,
output_verifier_html_path, output_verifier_manifest_path, output_verifier_sha256_path

E) consent_order_submission_packet_v1 params:
case_id, forum,
consent_order_pdf_path, consent_order_docx_path,
public_binder_pdf_path, private_binder_pdf_path, summary_card_pdf_path,
public_verifier_html_path, public_verifier_manifest_path,
output_zip_path, output_manifest_path,
include_cover_memo, cover_memo_template, zip_root_dir

F) multi_case_pattern_report_v1 params:
report_id, case_nodes, pattern_definitions_path,
output_public_pdf_path, output_regulator_pdf_path,
output_graph_json_path, output_graph_svg_path, output_manifest_path,
redaction_mode, cluster_threshold

DEFAULT VALUES:
case_id="verizon-2025"
forum_track="regulator_parallel"
cure_window_hours=72
timezone="America/New_York"
clock_policy="strict"
parity_gate={require_heading_order_match:true, require_cardinality_match:true, allow_pdf_preface_bookmarks:true}
doc_type_profile_id values:
- sanctions: "motion_to_compel_sanctions.profile.v1"
- consent: "consent_order.profile.v1"
- verifier: "public_verifier.profile.v1"
style_registry_id="docx_style_registry.v1"
zip_root_dir="Regulator_Submission"
cover_memo_template: FCC/CFPB="standard", NJ-AG="ag_variant"
redaction_mode="public"
cluster_threshold=0.65

SELF-CHECK (MANDATORY):
After generating the array, verify ALL RULES. If any rule fails, output {"error":"SELF_CHECK_FAILED"} only.

OUTPUT NOW. JSON ONLY.
```

---

## 3) Short “Agent Button” Versions (for Notion AI buttons)

### Button: “Generate All Job Templates”

```text
Output ONLY JSON array of job templates for: silence_clock_dashboard_v1, motion_to_compel_sanctions_v1, consent_order_auto_draft_v1, public_verifier_page_generate, consent_order_submission_packet_v1 (FCC/CFPB/NJ-AG), multi_case_pattern_report_v1.
Use case_id="verizon-2025". All paths must be under Cases/{case_id}/. Idempotency keys must include the correct primary token for each job.
```

### Button: “Generate One Template (Pick Job Type)”

```text
Ask me for one job_type from: silence_clock_dashboard_v1, motion_to_compel_sanctions_v1, consent_order_auto_draft_v1, public_verifier_page_generate, consent_order_submission_packet_v1, multi_case_pattern_report_v1. Then output ONLY the JSON template object for that job, strict paths under Cases/verizon-2025/.
```

---

## 4) JSON Config “Glue” Spec (Make/Zapier-friendly)

This is the minimal config object your automations can store so template generation stays consistent:

```json
{
  "case_id": "verizon-2025",
  "timezone": "America/New_York",
  "defaults": {
    "forum_track": "regulator_parallel",
    "cure_window_hours": 72,
    "clock_policy": "strict",
    "zip_root_dir": "Regulator_Submission",
    "style_registry_id": "docx_style_registry.v1"
  },
  "tokens": {
    "events_digest": "__EVENTS_DIGEST_SHA256__",
    "snapshot": "__SNAPSHOT_SHA256__",
    "manifest": "__MANIFEST_SHA256__",
    "date": "__DATE_ISO__"
  },
  "folders": {
    "root": "Cases/{case_id}/",
    "evidence": "Cases/{case_id}/Evidence/",
    "ledger": "Cases/{case_id}/Ledger/",
    "artifacts": "Cases/{case_id}/Artifacts/",
    "manifests": "Cases/{case_id}/Manifests/",
    "public": "Cases/{case_id}/Public/",
    "private": "Cases/{case_id}/Private/",
    "submissions": "Cases/{case_id}/Submissions/"
  }
}
```

---

If you want the next step to be fully “hands-free,” the move is: store the Extra-Mean prompt in a Notion template button, and store the JSON config above in a “System Settings” page so every run uses the same defaults even when you’re mad at Verizon and the universe.
