# Phase X — Plain-English Explanation of a Lock File

This document is informational. It explains what a lock file is and what it is used for.

## Purpose

A lock file is a summary record that captures **exactly what digital files existed at a specific point in time**, using digital fingerprints (hashes).

## What a lock file is

A lock file lists:

- Which files were included
- The fingerprint (SHA-256 hash) of each file
- A combined fingerprint that represents the entire set

## Why it is used

In disputes, questions often arise about:

- Whether a document existed earlier
- Whether a document was changed later
- Whether different versions were used

A lock file helps answer those questions by making later changes detectable.

## How verification works (simple)

1. Compute a fingerprint for each file.
2. Compare those fingerprints to the values recorded in the lock file.
3. If any file changes, the fingerprints no longer match.

## What this proves

A lock file can help show:

- The contents of a referenced set of files have not changed since the lock was created (integrity)

## What this does not prove

A lock file does not decide:

- Whether statements inside the files are true
- Any legal conclusion
- Any person’s intent

It is an integrity and record-preservation mechanism.

## Analogy

A lock file is similar to sealing documents in an envelope and writing down a seal number. If the seal number changes, it indicates the contents are not identical.
