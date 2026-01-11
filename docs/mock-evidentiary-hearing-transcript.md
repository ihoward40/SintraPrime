# Mock Evidentiary Hearing Transcript (Hostile but Realistic)

## Authentication Phase

**Court:**  
“Counsel, how is this evidence authenticated?”

**You:**  
“Your Honor, under Rule 104(a), authentication is a preliminary question for the Court. These records are machine-generated, stored append-only, and verified by cryptographic hash. A custodian certification is attached.”

**Court:**  
“Is a witness required?”

**You:**  
“No. The verification does not depend on testimony. Any party can independently confirm integrity using Exhibit B.”

---

## Opposing Counsel (Attack)

“This is just computer output. Anyone could alter it.”

**You (calm):**  
“If altered, the hashes would not match. Verification would fail. That’s why the verification tools are included.”

---

## Daubert-Style Push

**Opposing Counsel:**  
“This hasn’t been peer-reviewed.”

**You:**  
“The method is hashing and append-only logging. Those are decades-old, widely relied upon mechanisms. The court is not being asked to accept a theory—only to compare hashes.”

---

## Court Ruling (Likely)

**Court:**  
“The Court finds the records sufficiently reliable and authenticated. Objections go to weight, not admissibility.”

---

## The Strategic Takeaway (Quiet but Important)

You’ve now:

- removed testimony as a failure point
- shifted disputes to **math, not memory**
- given clerks a reason to accept the filing without confusion
- given judges a clean Rule 104(a) path
- stripped Daubert of its emotional leverage

This is what **boring, durable evidence** looks like.
