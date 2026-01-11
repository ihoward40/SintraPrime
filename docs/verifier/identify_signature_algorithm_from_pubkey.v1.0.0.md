# Identify Signature Algorithm From Public Key (v1.0.0)

Good question — and this is one of those places where being precise saves you from pointless arguments later. The nice part: you don’t need to guess, and you don’t need the private key.

Here are the clean, deterministic ways to identify your actual signature algorithm.

---

## Method 1 (fastest): Ask the public key itself

This works offline and is the gold standard.

### Step 1: Locate your public key

Example:

```
pubkey.pem
```

### Step 2: Run ONE command (Windows / macOS / Linux)

```bash
openssl pkey -in pubkey.pem -pubin -text -noout
```

### How to read the result

You’ll see one of these patterns:

### Ed25519

```
Public-Key: (256 bit)
ASN1 OID: ED25519
```

or simply:

```
ED25519 Public-Key
```

If you see ED25519, you’re done. That’s your algorithm.

---

### RSA

```
Public-Key: (2048 bit)
Modulus:
Exponent: 65537 (0x10001)
```

If you see Modulus / Exponent, it’s RSA.

---

### ECDSA

```
Public-Key: (256 bit)
ASN1 OID: prime256v1
```

or:

```
ASN1 OID: secp256r1
```

That means ECDSA (curve-based, not Ed25519).

---

## Method 2: If OpenSSL complains about the key type

Sometimes OpenSSL gives the answer by how it fails.

Try this:

```bash
openssl dgst -sha256 -verify pubkey.pem -signature MANIFEST.sig MANIFEST.json
```

### Interpret the result

- Fails immediately with “unsupported key type” → very likely Ed25519
- Says something like “wrong signature length” → likely ECDSA
- Says “bad signature” but accepts the command → likely RSA or ECDSA (signature just doesn’t match)

Then try:

```bash
openssl pkeyutl -verify -pubin -inkey pubkey.pem -sigfile MANIFEST.sig -in MANIFEST.json
```

- Works here → Ed25519
- Works only in `dgst` → RSA / ECDSA

---

## Method 3: Check how the key was created (memory jog)

If you generated the key, this often rings a bell immediately.

### Ed25519 usually came from

- `ssh-keygen -t ed25519`
- modern libsodium / NaCl
- newer “secure-by-default” tooling
- anything described as fast, modern, or curve25519

### RSA usually came from

- `openssl genrsa`
- older PKI workflows
- anything mentioning 2048 / 4096 bits

### ECDSA usually came from

- `prime256v1`
- `secp256r1`
- hardware tokens / smart cards
- FIPS-oriented setups

---

## Method 4 (court-safe): Add the algorithm to your manifest metadata

Once identified, freeze it into evidence so nobody can argue later.

Example snippet in `MANIFEST.json`:

```json
{
  "signature": {
    "algorithm": "Ed25519",
    "hash": "none",
    "pubkey_fingerprint": "sha256:abcd..."
  }
}
```

Or:

```json
{
  "signature": {
    "algorithm": "RSA-2048",
    "hash": "SHA-256"
  }
}
```

That turns a future “what algorithm is this?” into a read-only fact, not a debate.

---

## Recommendation (practical, not theoretical)

- If you see Ed25519 → keep it. It’s simpler, modern, deterministic, and easier to defend.
- If you see RSA/ECDSA → also fine. Just lock the algorithm explicitly and don’t mix methods.
