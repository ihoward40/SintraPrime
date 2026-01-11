This kit allows independent verification of a published mirror.

It does not prove claims.
It does not require trust.
It does not contact any network.

Contents:
- mirror_site/        (read-only evidence surface)
- verify_mirror.mjs   (verification script)
- PUBLIC_KEY.pem      (used to verify signatures)
- README.txt          (this file)

How to use:
1. Do not modify the mirror_site directory.
2. Run the verifier script against it.
3. Review the generated verification receipt.

What verification means:
- Files matched their published hashes.
- Signatures verified.
- Results are reproducible at the time you ran it.

What verification does not mean:
- It does not say the contents are correct.
- It does not say the claims are valid.
- It does not endorse any party.

You are free to publish your results, disagree with them, or ignore them.

This kit is read-only by design.
