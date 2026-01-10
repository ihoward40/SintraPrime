# Documentation Index — Contract Responsibilities

**Purpose:**
This index defines **what each document is responsible for** and, just as importantly, **what it is not**.
Each file has one job. If you’re unsure where something belongs, this page answers that.

---

## Core Data Contracts (Authoritative)

### `verizon-guardian-output.v1.0.1.schema.json`

**Responsibility:**
Defines the **only valid shape** of incident data emitted by the Verizon Guardian pipeline.

**Does not:**

* Render messages
* Store history
* Perform aggregation

---

### `verizon-guardian-prompts.v1.0.1.md`

**Responsibility:**
Defines AI classification prompts that must emit data compliant with the JSON schema.

**Does not:**

* Route messages
* Persist records
* Assemble packets

---

## Operational Output (Read-Only Surfaces)

### `slack-templates.md`

**Responsibility:**
Deterministic rendering of schema-validated incident data into Slack messages.

**Does not:**

* Contain logic
* Infer intent
* Modify data

Slack is a **signal surface**, not a system of record.

---

## Persistent Memory (Notion Contracts)

### `notion-patterns-db.md`

**Responsibility:**
Tracks **repeated conduct over time** based on recorded incidents.

**Does not:**

* Store raw incidents
* Compute damages
* Assemble packets

---

### `notion-claim-summary-db.md`

**Responsibility:**
Tracks **aggregated damage totals and thresholds** over time.

**Does not:**

* Classify incidents
* Detect patterns
* Generate artifacts

---

### `notion-escalation-fields.md`

**Responsibility:**
Tracks **procedural stage** (Notice → Cure → Default).

**Does not:**

* Determine liability
* Trigger actions by itself

---

## Artifact Generation (Process, Not Logic)

### `complaint-packet-builder.md`

**Responsibility:**
Defines **how packets are assembled**, ordered, and numbered from existing data.

**Does not:**

* Interpret facts
* Compute totals
* Reach conclusions
* Read Slack

---

### `notion-packet-record-db.md`

**Responsibility:**
Maintains an **audit ledger of packet builds** (what was built, when, from which sources).

**Does not:**

* Recalculate anything
* Replace incident, pattern, or claim records

---

## Procedural Integrity

### `packet-build-checklist.md`

**Responsibility:**
Human-readable **pre/post conditions** to validate packet completeness.

**Does not:**

* Execute builds
* Store data

---

### `packet-rebuild-comparison.md`

**Responsibility:**
Explains **what changed between packet builds** in neutral, factual terms.

**Does not:**

* Argue significance
* Re-summarize evidence

---

## Architecture & Organization

### `scenario-index.md`

**Responsibility:**
Maintains an **operational map** of scenarios (layer, trigger, output, upstream/downstream).

**Does not:**

* Define data schemas
* Replace runbooks
* Store system-of-record history

### `make-scenario-electrical-panel-architecture.md`

**Responsibility:**
Defines **scenario boundaries, naming, and routing discipline** for Make.com.

**Does not:**

* Describe legal process
* Define data schemas

---

## Enforcement (CI)

### `../../docs/slack-make-governance.md`

**Responsibility:**
Defines the Slack ↔ Make governance model and where enforcement lives.

**Does not:**

* Replace runbooks
* Define data schemas

---

### `../../docs/make-lint-operator-guide.md`

**Responsibility:**
Operator procedure for adding scenarios safely and interpreting Make Lint failures.

**Does not:**

* Replace runbooks
* Override enforcement rules

---

## Notion Import Artifacts

### `../../docs/notion-template-spec.md`

**Responsibility:**
Entry point for Notion schemas, migration CSVs, and contract docs.

**Does not:**

* Replace enforcement
* Backfill history

---

### `verizon-guardian-primary-pipeline.v1.0.0.md`

**Responsibility:**
Module-by-module execution plan for the **live monitoring pipeline**.

**Does not:**

* Define packet assembly
* Store historical records

---

## Governing Principle (Read This Once)

* **JSON defines facts**
* **Slack shows signals**
* **Notion stores memory**
* **Runbooks describe process**
* **Packets are artifacts**
* **Packet Records are ledgers**

If a document starts doing more than one of these, it’s wrong.

---

### End of Index
