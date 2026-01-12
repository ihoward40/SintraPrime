Verifier Release: verify-run.js
Version: v1.0.0
Purpose: Offline verification of append-only run hash chains
Scope: Non-governing, non-executing

Files:
- verify-run.js
- verify-run.js.sha256 (SHA-256 hash)
- verify-run.js.sig (detached signature over verify-run.js.sha256)

Verification (hash):
- Recompute SHA-256 of verify-run.js and compare to verify-run.js.sha256

Verification (signature, OpenSSH/Ed25519):
- Public key: docs/keys/verify-run.pub
- Verify signature:
  1) Create an allowed signers file (one line):
    verify-run <contents of docs/keys/verify-run.pub>

  2) Verify:
    ssh-keygen -Y verify -f allowed_signers.txt -I verify-run -n sintraprime-verify-run -s verify-run.js.sig < verify-run.js.sha256

Notes:
- This verifier has no network access
- This verifier does not modify runs
- This verifier does not confer authority
