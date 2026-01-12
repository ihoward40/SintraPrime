import nacl from "tweetnacl";
import fs from "node:fs";

function parseOpenSSHPublicKeyLine(line) {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 2) throw new Error("Invalid OpenSSH public key format");

  const algTag = parts[0];
  const b64 = parts[1];
  if (algTag !== "ssh-ed25519") {
    throw new Error(`Unexpected OpenSSH key algorithm: ${algTag}`);
  }

  const buf = Buffer.from(b64, "base64");
  let offset = 0;

  const readU32 = () => {
    if (offset + 4 > buf.length) throw new Error("Invalid OpenSSH public key blob");
    const v = buf.readUInt32BE(offset);
    offset += 4;
    return v;
  };

  const readChunk = () => {
    const len = readU32();
    if (offset + len > buf.length) throw new Error("Invalid OpenSSH public key blob");
    const chunk = buf.subarray(offset, offset + len);
    offset += len;
    return chunk;
  };

  const alg = readChunk().toString("utf8");
  if (alg !== "ssh-ed25519") {
    throw new Error(`Unexpected OpenSSH key algorithm: ${alg}`);
  }

  const pk = readChunk();
  if (pk.length !== nacl.sign.publicKeyLength) {
    throw new Error(`Unexpected Ed25519 key length: ${pk.length}`);
  }

  return new Uint8Array(pk);
}

export function loadPublicKey(pubPath) {
  const text = fs.readFileSync(pubPath, "utf8");
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length !== 1) {
    throw new Error("Unsupported public key format (expected exactly one non-empty line)");
  }

  const line = lines[0];

  // Case 1: canonical raw-32-byte base64
  try {
    const raw = Buffer.from(line, "base64");
    if (raw.length === nacl.sign.publicKeyLength) {
      return new Uint8Array(raw);
    }
  } catch {
    // fall through
  }

  // Case 2: OpenSSH public key line
  if (line.startsWith("ssh-ed25519 ")) {
    return parseOpenSSHPublicKeyLine(line);
  }

  throw new Error(
    "Unsupported public key format. Expected raw-32-byte base64 or OpenSSH ssh-ed25519 public key line.",
  );
}

export function loadSecretKey(secretPath) {
  const b64 = fs.readFileSync(secretPath, "utf8").trim();
  const bytes = Buffer.from(b64, "base64");
  if (bytes.length !== nacl.sign.secretKeyLength) throw new Error("Bad secret key length");
  return new Uint8Array(bytes);
}

export function signDetached(messageBytes, secretKey) {
  const sig = nacl.sign.detached(messageBytes, secretKey);
  return Buffer.from(sig).toString("base64");
}

export function verifyDetached(messageBytes, sigB64, publicKey) {
  const sig = new Uint8Array(Buffer.from(sigB64, "base64"));
  return nacl.sign.detached.verify(messageBytes, sig, publicKey);
}
