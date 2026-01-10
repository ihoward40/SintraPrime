# Canonical Make.com Suite (Scenario + Route Names)

Use these verbatim. Treat them as identifiers, not prose.

## FOLDER: `SINTRAPRIME / BUILD`

**Scenario Name**

```
BUILD · DeepThink → Snapshot → Publish
```

**Modules + Route Names (in order)**

1. **Webhook (Custom)**

   - Route name: `deepthink_request_in`

2. **Tools → JSON Parse**

   - Route name: `parse_deepthink_request`

3. **Tools → Set Variables**

   - Route name: `set_execution_context`

4. **Router**

   - Route name: `mode_router`

   **Routes inside router (names matter):**

   - `MODE_DEMO`
   - `MODE_OBSERVE`
   - `MODE_EXECUTE`

5. *(MODE_EXECUTE only)* **Data Store / Approval Check**

   - Route name: `operator_gate_check`

6. **Tools → JSON Create**

   - Route name: `emit_deepthink_request_json`

7. **HTTP → Make a Request**

   - Route name: `invoke_local_deepthink_runner`
   - (This calls your `dev.mjs deepthink` path or tunnel)

8. **HTTP → Get a File**

   - Route name: `fetch_public_runs_json`

9. **Google Drive → Upload a File**

   - Route name: `publish_runs_json`

10. **Google Drive → Upload a File**

    - Route name: `publish_merkle_and_sidecars`

11. **Google Drive → Upload a File**

    - Route name: `publish_latest_public_pointer`

12. **Slack → Post Message**

    - Route name: `notify_build_completion`

---

## FOLDER: `SINTRAPRIME / DR`

**Scenario Name**

```
DR · Snapshot Rebuild → Verify → Report
```

**Modules**

1. **Manual Trigger / Schedule** — `dr_trigger`
2. **Google Drive → Download Folder** — `fetch_snapshot_bundle`
3. **Tools → JSON Parse** — `parse_manifest`
4. **HTTP / Local Exec** — `rebuild_from_snapshot_only`
5. **HTTP / Local Exec** — `run_deepthink_gates`
6. **Slack → Post Message** — `notify_dr_status`

---

## FOLDER: `SINTRAPRIME / LINT`

**Scenario Name**

```
LINT · Scenario Guardrails → Enforce → Refuse
```

**Modules**

1. **Notion / Drive Trigger** — `scenario_registry_updated`

2. **Tools → JSON Parse** — `parse_scenario_export`

3. **Tools → Run Script** — `apply_lint_profile`

4. **Router** — `lint_verdict_router`

   **Routes:**

   - `LINT_PASS`
   - `LINT_WARN`
   - `LINT_FAIL`

5. *(FAIL only)* **HTTP / Local Exec** — `emit_refusal_pack`

6. *(FAIL only)* **Make → Disable Scenario** — `auto_disable_scenario`

7. **Slack → Post Message** — `notify_lint_result`
