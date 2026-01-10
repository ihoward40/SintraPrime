# `packet-rebuild-comparison.md`

**Rebuild Comparison Note — What Changed and Why**

**Purpose:**
Explain differences between two packet builds **without re-litigating facts**.

This note exists to answer one question only:

> “Why does this packet differ from the last one?”

---

## 1) When a Rebuild Comparison Is Required

Generate this note **only if**:

* A packet is rebuilt for the same counterparty **and**
* The previous packet was already logged in the Packet Record DB

If this is the first packet, no comparison is needed.

---

## 2) Comparison Inputs

* Prior Packet Record (read-only)
* Current Packet Record (read-only)
* Underlying sources (incidents, patterns, claims)

Slack is **never** used.

---

## 3) Allowed Change Categories (Exhaustive)

Every difference must fall into one or more of the following categories.

### 3.1 New Incidents Added

* New incident dates after last build
* Previously missing evidence now available

---

### 3.2 Pattern Evolution

* Increased occurrence count
* Pattern threshold newly met

---

### 3.3 Claim Totals Updated

* Additional incidents increased totals
* Monthly roll-forward occurred

---

### 3.4 Escalation Stage Change

* Notice → Cure
* Cure → Default

---

### 3.5 Artifact or Verification Additions

* Verification appendices added
* Chain-of-custody documents updated

---

## 4) Required Comparison Fields

Each comparison note must include:

* Prior Packet ID
* Current Packet ID
* Prior Packet Date
* Current Packet Date
* Change Categories (from Section 3)
* Short factual description per category

---

## 5) Example (Neutral, Acceptable Language)

> Since the prior packet dated 2025-03-01, three additional incidents dated 2025-03-04 through 2025-03-10 were recorded and included.
>
> The Pattern DB now reflects five occurrences of the same violation type within a 60-day window, meeting the defined pattern threshold.
>
> Claim totals reflect the inclusion of these incidents.
>
> No previously included incidents were removed or altered.

No adjectives.
No intent.
No conclusions.

---

## 6) Explicit Prohibitions

A Rebuild Comparison note must **not**:

* Argue liability
* Characterize intent
* Introduce new facts
* Re-summarize evidence
* Reference Slack discussions

It is a **delta log**, not advocacy.

---

## 7) Storage & Linking

* Stored alongside the new packet
* Linked from the new Packet Record
* Never modifies or replaces prior records

---

### End of Document

---

## Why these two docs matter

* **Packet Build Checklist** prevents silent procedural failure
* **Rebuild Comparison Note** prevents accusations of moving goalposts

Together, they make your system:

* Defensible
* Reviewable
* Calm under scrutiny
