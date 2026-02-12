# SintraPrime Supermemory - High-ROI Upgrade Roadmap

**Purpose:** This document outlines the recommended next-level upgrades for the Supermemory operational scripts, prioritized by return on investment (ROI). These upgrades are designed to add capability, proof, and rollback mechanisms in a disciplined, evidence-based manner.

**Philosophy:** "More features" isn't progress unless it's **provable, bounded, and reversible**. Autonomous systems fail through scope creep, lack of receipts, and vibes-based decision making. The rule is: Add capability → Add proof → Add rollback → Only then add more capability.

---

## Current State (v2)

The v2 Supermemory scripts provide:

- ✅ Version field (`sm-make-v1`) for schema stability
- ✅ `-Strict` mode on both scripts for fail-closed validation
- ✅ Node.js preflight checks (version + syntax validation)
- ✅ Secret leakage scanning (property name scan for `text`/`rawText`)
- ✅ Make.com-friendly JSON output (single object, no noise)
- ✅ Exit code routing for intelligent failure handling

---

## Upgrade Categories

### A) Better Proofs (High ROI)

These upgrades strengthen the evidence that your system is working correctly.

#### 1. Strict Schema Version Pinning for CLIs

**What:** Require that your Supermemory CLIs emit a `schemaVersion` field and validate it matches expectations.

**Why:** Right now we validate key presence and types. Version pinning prevents silent breakage when CLIs are upgraded.

**How:**
1. Update your Supermemory CLIs to emit `schemaVersion: "v1"` in their JSON output.
2. Update the `-Strict` mode to check for this field and fail if it doesn't match.
3. Update the Make.com router to enforce schema version matching.

**ROI:** High. Prevents "works on my machine" issues and silent CLI upgrades.

**Effort:** Low. One-time CLI update + script enhancement.

---

#### 2. Golden Fixture Tests

**What:** Keep a `fixtures/` folder with known index/search outputs and validate parsers against them.

**Why:** Ensures that your parsing logic doesn't drift over time and catches regressions.

**How:**
1. Create `ops/fixtures/` directory.
2. Capture known-good outputs from your CLIs (e.g., `search_output_v1.json`, `index_output_v1.json`).
3. Add a test script (`ops/test-fixtures.ps1`) that runs the parsing logic against these fixtures.
4. Run this test before deploying script updates.

**ROI:** High. Catches parsing regressions before they reach production.

**Effort:** Medium. One-time fixture capture + test script creation.

---

#### 3. Receipt Integrity Check

**What:** Verify each JSONL line has a `sha256` hash and optional signature, and verify chain continuity (Merkle/log chain).

**Why:** Provides tamper-evidence and court-safe audit trails.

**How:**
1. Update your receipt generation to include `receiptHash` (SHA-256 of the receipt content).
2. Add `chainHash` (hash of current receipt + previous `chainHash`).
3. Opt = optionCh` for cryptographic proof.
4. Update the `-Strict` mode to verify hash continuity.

**ROI:** Very High. Enables court-safe audit trails and tamper detection.

**Effort:** High. Requires updates to receipt generation and validation logic.

---

### B) Observability That Doesn't Lie

These upgrades improve your ability to monitor and debug the system.

#### 4. Health Snapshot JSON

**What:** Emit a single "health snapshot" JSON to `ops/health/sm_health_latest.json` on success (atomic write).

**Why:** Provides a single source of truth for the current system health that can be queried by monitoring tools.

**How:**
1. Create `ops/health/` directory.
2. After a successful run, write a JSON file with the latest metrics (attempts, successes, errors, P95, etc.).
3. Use atomic write (write to temp file, then rename) to prevent partial reads.
4. Monitoring tools can read this file to get the latest health status.

**ROI:** High. Enables simple, fast health checks without parsing receipts.

**Effort:** Low. One-time script enhancement.

---

#### 5. Health Diff Script

**What:** Add a `sm-health-diff.ps1` that compares "latest vs yesterday" and flags regressions (P95 spike, error rate increase).

**Why:** Automatically detects performance degradation and error rate increases.

**How:**
1. Store daily health snapshots (e.g., `sm_health_2026-02-02.json`).
2. Create a script that compares the latest snapshot to the previous day's snapshot.
3. Flag regressions (e.g., P95 increased by >20%, error rate increased by >10%).
4. Integrate with Make.com to send alerts on regressions.

**ROI:** High. Proactive detection of performance and reliability issues.

**Effort:** Medium. Requires snapshot storage + comparison logic.

---

### C) Operational Hardening

These upgrades prevent operational issues and improve reliability.

#### 6. Lock File / Mutex

**What:** Ensure two runs can't overlap (Make retries + manual runs won't collide).

**Why:** Prevents race conditions, duplicate executions, and resource contention.

**How:**
1. At script start, check for a lock file (e.g., `ops/.sm_lock`).
2. If lock exists and is recent (e.g., <5 minutes old), exit with a specific exit code (e.g., `9`).
3. Create lock file with current timestamp.
4. Remove lock file at script end (or after timeout).

**ROI:** High. Prevents operational chaos from overlapping runs.

**Effort:** Low. Simple lock file implementation.

---

#### 7. Receipt Rotation + Retention

**What:** Keep last N days locally, auto-archive older receipts to Google Drive.

**Why:** Prevents disk space issues and ensures long-term receipt retention.

**How:**
1. Create a `sm-receipt-rotate.ps1` script that runs daily.
2. Move receipts older than N days (e.g., 30 days) to an archive directory.
3. Upload archived receipts to Google Drive (or S3, etc.).
4. Delete local archived receipts after successful upload.

**ROI:** Medium. Prevents disk space issues and ensures compliance.

**Effort:** Medium. Requires integration with cloud storage.

---

#### 8. Timeout Discipline

**What:** Hard timeout around node calls (you already have a timeout pattern—next is a killable job wrapper).

**Why:** Prevents hung processes from blocking future runs.

**How:**
1. Wrap all node CLI calls in a timeout wrapper (e.g., `Start-Job` with `-Timeout`).
2. Kill the process if it exceeds the timeout.
3. Log timeout events to receipts.
4. Return a specific exit code for timeout failures (e.g., `10`).

**ROI:** High. Prevents hung processes from cascading failures.

**Effort:** Medium. Requires job wrapper implementation.

---

### D) Governance Upgrades (SintraPrime-Core Vibes)

These upgrades align with SintraPrime's governance philosophy.

#### 9. Policy Pack Hash

**What:** Add `--policyPackHash` into Make JSON output so the router can reject runs produced under the wrong policy pack.

**Why:** Ensures that only approved policy configurations are used in production.

**How:**
1. Compute a hash of your policy configuration (e.g., SHA-256 of policy JSON).
2. Include this hash in the Make-friendly JSON output.
3. Update the Make.com router to enforce policy pack hash matching.
4. Update the policy pack hash when policies change.

**ROI:** High. Prevents unauthorized policy changes from reaching production.

**Effort:** Medium. Requires policy configuration management.

---

#### 10. Two-Person Rule Proof

**What:** Add a "two-person rule proof" field in the receipt summary (e.g., `approvedBy` present when execution enabled).

**Why:** Ensures that high-risk operations require approval from two people.

**How:**
1. For high-risk operations, require an `approvedBy` field in the execution request.
2. Validate that the `approvedBy` field is present and valid.
3. Include the `approvedBy` field in the receipt.
4. Fail if the two-person rule is not satisfied.

**ROI:** Very High. Prevents unauthorized high-risk operations.

**Effort:** High. Requires approval workflow implementation.

---

### E) Make.com Routing Upgrades (Less Regex, More Sanity)

These upgrades improve the robustness of your Make.com integration.

#### 11. Enhanced Router Enforcement

**What:** Implement comprehensive routing logic in Make.com.

**Routes:**
- `version != "v1"` → Quarantine route (don't process)
- `exitCode != 0` → Alert route
- `hits.bait > 0` → **Critical breach lane** (page on-call)
- `p95 > threshold` → Performance lane (alert ops)

**Why:** Ensures that all failure modes are handled appropriately.

**How:**
1. Create a Make.com router with the above routes.
2. Configure alerts for each route (Slack, email, PagerDuty, etc.).
3. Log all routed events to a data store for analysis.

**ROI:** High. Ensures no failures are silently ignored.

**Effort:** Low. Make.com configuration.

---

#### 12. Receipt File Existence Guard

**What:** Add a "receiptFile exists + size > 0" guard before parsing downstream.

**Why:** Prevents parsing errors when receipt files are missing or empty.

**How:**
1. In Make.com, add a check for the `receiptFile` field.
2. Verify that the file exists and has non-zero size.
3. If not, route to a failure lane.

**ROI:** Medium. Prevents downstream parsing errors.

**Effort:** Low. Make.com configuration.

---

## Prioritized Implementation Plan

### Phase 1: Quick Wins (Weeks 1-2)

**Goal:** Implement high-ROI, low-effort upgrades.

1. ✅ **Lock File / Mutex** (Upgrade #6) - Prevents overlapping runs
2. ✅ **Health Snapshot JSON** (Upgrade #4) - Simple health checks
3. ✅ **Enhanced Router Enforcement** (Upgrade #11) - Comprehensive routing
4. ✅ **Receipt File Existence Guard** (Upgrade #12) - Prevents parsing errors

**Expected Impact:** Immediate improvement in operational stability and monitoring.

---

### Phase 2: Observability & Hardening (Weeks 3-4)

**Goal:** Improve monitoring and operational resilience.

1. ✅ **Health Diff Script** (Upgrade #5) - Proactive regression detection
2. ✅ **Timeout Discipline** (Upgrade #8) - Prevents hung processes
3. ✅ **Strict Schema Version Pinning** (Upgrade #1) - Prevents CLI drift

**Expected Impact:** Proactive issue detection and improved reliability.

---

### Phase 3: Governance & Proofs (Weeks 5-8)

**Goal:** Strengthen audit trails and governance controls.

1. ✅ **Golden Fixture Tests** (Upgrade #2) - Catches parsing regressions
2. ✅ **Receipt Integrity Check** (Upgrade #3) - Court-safe audit trails
3.  Pack Hash** (Upgrade #9) - Prevents unauthorized policy changes

**Expected Impact:** Court-safe audit trails and stronger governance.

---

### Phase 4: Advanced Governance (Weeks 9-12)

**Goal:** Implement advanced governance features.

1. ✅ **Receipt Rotation + Retention** (Upgrade #7) - Long-term compliance
2. ✅ **Two-Person Rule Proof** (Upgrade #10) - High-risk operation controls

**Expected Impact:** Enterprise-grade governance and compliance.

---

## Success Metrics

Track these metrics to measure the impact of upgrades:

### Operational Metrics
- **Overlapping Run Rate:** Should be 0% after lock file implementation
- **Hung Process Rate:** Should decrease to <1% after timeout discipline
- **Receipt File Missing Rate:** Should be 0% after existence guard

### Observability Metrics
- **Time to Detect Regression:** Should decrease to <1 hour after health diff
- **False Positive Alert Rate:** Should decrease to <5% after enhanced routing

### Governance Metrics
- **Unauthorized Policy Change Rate:** Should be 0% after policy pack hash
- **Two-Person Rule Violation Rate:** Should be 0% after implementation

---

## Anti-Patterns to Avoid

### 1. Scope Creep
**Problem:** Adding features without clear ROI or proof mechanisms.

**Solution:** Only implement upgrades from this roadmap. Resist the temptation to add "nice to have" features.

### 2. Vibes-Based Decision Making
**Problem:** Making decisions based on intuition rather than evidence.

**Solution:** Always require receipts, metrics, and proof before making operational decisions.

### 3. No Rollback Plan
**Problem:** Deploying upgrades without a way to revert if things go wrong.

**Solution:** Always have a rollback plan before deploying. Test rollback procedures.

### 4. Silent Failures
**Problem:** Failures that don't generate alerts or receipts.

**Solution:** Ensure every failure mode has a corresponding alert and receipt entry.

---

## Conclusion

This roadmap provides a disciplined, evidence-based approach to upgrading the Supermemory operational scripts. By focusing on high-ROI upgrades and maintaining the "capability → proof → rollback" discipline, you can build an operations brain that survives both audits and reality.

**Next Step:** Implement Phase 1 (Quick Wins) and measure the impact before proceeding to Phase 2.

---

**Author:** Manus AI  
**Date:** February 2, 2026  
**Version:** 1.0
