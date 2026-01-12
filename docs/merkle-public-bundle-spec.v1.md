# Merkle Specification — Public Verifier Bundles (v1)

## Purpose
This specification defines a deterministic Merkle tree construction for Public Verifier
bundles so that a single root hash can represent bundle integrity.

This spec is integrity-only. It does not assert authorship, authorization, or correctness.

---

## Scope
Applies to:
- Public Verifier bundles
- Transparency artifacts intended for third-party verification

Does not apply to:
- Runtime execution
- Private/internal artifacts
- Secrets or credentials (explicitly excluded)

---

## Inputs
The Merkle tree is constructed from a set of files included in the Public Verifier bundle.

Each leaf represents a file with:
- normalized path
- SHA-256 digest of file contents

---

## Path Normalization Rules (MANDATORY)
Before hashing, file paths MUST be normalized as follows:
- Use forward slashes (`/`) regardless of OS
- Relative to bundle root
- No leading `./`
- Case-sensitive
- No trailing slashes

Example:
```

documentation/watch-mode-transparency-report.v1.md

```

---

## Leaf Construction
Each leaf node is constructed from:
```

leaf_hash = SHA256( file_bytes )

````

A leaf record MUST include:
```json
{
  "path": "<normalized_path>",
  "sha256": "<hex_digest>"
}
````

All leaf records are stored in:

```
checksums/merkle.leaves.json
```

---

## Leaf Ordering (CRITICAL)

Leaf records MUST be sorted lexicographically by `path` (byte-order, ascending).

This ordering rule is mandatory. Any deviation produces a different root.

---

## Internal Node Construction

* Leaf hashes are treated as raw bytes (hex decoded)
* Internal nodes are computed as:

```
node = SHA256( left_child || right_child )
```

Where `||` is byte concatenation.

---

## Odd Node Rule

If a level has an odd number of nodes:

* The final node is duplicated
* The duplicated node is concatenated with itself

This rule MUST be applied consistently at every level.

---

## Merkle Root Output

The final Merkle root is written to:

```
checksums/merkle.root.txt
```

Format:

```
<hex_sha256_root>
```

---

## Verification

A verifier MAY:

* recompute leaf hashes
* rebuild the tree using this spec
* confirm the computed root matches `merkle.root.txt`

Merkle proofs (per-file inclusion proofs) are optional and out of scope for v1.

---

## Claims Boundary

The Merkle root proves:

* bundle integrity
* inclusion of specific files

It does NOT prove:

* correctness
* authorization
* intent
* legal sufficiency
