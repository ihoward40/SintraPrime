# Phase X — Affidavit Template (Integrity + Time-of-Existence)

This is a template for an affidavit focused on integrity and time-of-existence. It is not legal advice.

---

## AFFIDAVIT OF GOVERNANCE FREEZE AND INTEGRITY

**State of ____________ )**
**County of __________ )**

I, **[NAME]**, being duly sworn, declare as follows:

1. I am the custodian and operator of a record-keeping and automation system used to generate and preserve materials.

2. On **[DATE_UTC]**, I generated a system freeze identified as **Phase X**.

3. The freeze produced a lock file titled:

   **`governance/freeze/phaseX.lock.json`**

4. The SHA-256 hash of the lock file is:

   **[LOCK_SHA256]**

5. The lock file describes, with specificity, the scope of materials included in the freeze, including file paths and file hashes.

6. The freeze produced a bundled archive titled:

   **`dist/phaseX/ike-governance-phaseX.zip`**

   with SHA-256 hash:

   **[BUNDLE_SHA256]**

7. The freeze can be mechanically verified using the same verification process used for automated enforcement:

   **`npm run -s phaseX:freeze-verify`**

8. After the freeze was generated, changes to the governed materials would be detectable by mismatch with the lock file.

9. (Optional — include only if applicable)
   A hash of the bundled archive was submitted to an independent Time Stamping Authority (RFC-3161), which issued a timestamp token.

   - TSA URL: **[TSA_URL]**
   - TSA Serial: **[TSA_SERIAL]**
   - Timestamp (UTC): **[TIMESTAMP_UTC]**
   - TSR file reference: **[TSR_PATH]**

10. This affidavit is submitted to establish integrity and time-of-existence of the referenced materials. It does not assert legal conclusions about the content of the materials.

I declare under penalty of perjury that the foregoing is true and correct.

**Executed on:** ____________________

**Signature:** ______________________

**Name:** [NAME]

---

## Notary acknowledgment

(Attach standard notary block.)

---

## Suggested exhibits

- Exhibit A: `governance/freeze/phaseX.lock.json`
- Exhibit B: `dist/phaseX/ike-governance-phaseX.zip.sha256`
- Exhibit C (optional): RFC-3161 `.tsr`
