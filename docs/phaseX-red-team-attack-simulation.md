# Phase X — Red-Team Pressure Test (Integrity Claims)

This is a threat-model style checklist for how an adversary might challenge integrity/time-of-existence claims, and what evidence answers each challenge.

## Claim boundary (keep narrow)

- This system is designed to support **integrity** (detect change) and optionally **time-of-existence** (RFC-3161).
- It does not prove the truth of statements inside documents.

## Attacks and defenses

### 1) “You created it later / backdated it.”

**Pressure:** self-reported timestamps are weak.

**Best counter-evidence:**
- RFC-3161 TSA token for the bundle hash (third-party issued)
- A clean git commit hash recorded in the lock

### 2) “You changed something after the freeze.”

**Pressure:** repo owner can edit files.

**Counter-evidence:**
- The lock contains per-file SHA-256 and a combined root hash.
- Verification fails on any change to governed files.

### 3) “Scope is vague; you froze something else.”

**Pressure:** unclear inclusion rules.

**Counter-evidence:**
- Explicit file list inside the lock.
- Hash of the scope definition script recorded in the lock.

### 4) “This is just your own internal log.”

**Pressure:** anyone can write JSON.

**Counter-evidence:**
- Deterministic scripts + reproducible verification.
- Optional external anchoring: TSA timestamp, notarized affidavit.

### 5) “It’s too technical to rely on.”

**Pressure:** attempt to exclude due to complexity.

**Counter-evidence:**
- Provide the plain-English explainer alongside the lock.
- Demonstrate verification steps that do not depend on subjective interpretation.
