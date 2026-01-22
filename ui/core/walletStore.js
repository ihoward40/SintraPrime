import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "beneficiaryWallets.json");

let cache = null;

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function loadFile() {
  if (cache) return cache;

  try {
    const raw = fs.readFileSync(FILE_PATH, "utf8");
    const parsed = safeJsonParse(raw);
    cache = parsed && typeof parsed === "object" ? parsed : { beneficiaries: {} };
  } catch {
    cache = { beneficiaries: {} };
  }

  if (!cache.beneficiaries || typeof cache.beneficiaries !== "object") {
    cache.beneficiaries = {};
  }

  return cache;
}

function writeFileAtomic(absPath, content) {
  const dir = path.dirname(absPath);
  fs.mkdirSync(dir, { recursive: true });

  const tmp = `${absPath}.tmp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  fs.writeFileSync(tmp, content, "utf8");
  fs.renameSync(tmp, absPath);
}

function saveFile() {
  if (!cache) return;
  writeFileAtomic(FILE_PATH, JSON.stringify(cache, null, 2));
}

function normalizeId(value, label) {
  const s = String(value || "").trim();
  if (!s) throw new Error(`${label} is required`);
  return s;
}

function normalizeAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error("Amount must be a finite number");
  if (n <= 0) throw new Error("Amount must be positive");
  return n;
}

function ensureWallet(beneficiaryId, name) {
  const data = loadFile();
  const id = normalizeId(beneficiaryId, "beneficiaryId");

  if (!data.beneficiaries[id]) {
    const displayName = String(name || "").trim();
    if (!displayName) throw new Error("name is required to create a new wallet");

    data.beneficiaries[id] = {
      beneficiaryId: id,
      name: displayName,
      currency: "USD",
      openingBalance: 0,
      currentBalance: 0,
      availableBalance: 0,
      reservedBalance: 0,
      lastUpdatedAt: new Date().toISOString(),
      transactions: [],
    };

    saveFile();
  } else if (name && String(name).trim()) {
    // Allow caller to refresh display name.
    data.beneficiaries[id].name = String(name).trim();
  }

  return data.beneficiaries[id];
}

function nextTxId() {
  return `tx_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function addTx(wallet, tx) {
  wallet.transactions.push(tx);
  wallet.lastUpdatedAt = new Date().toISOString();
}

export function getAllWallets() {
  const data = loadFile();
  return Object.values(data.beneficiaries);
}

export function getWallet(beneficiaryId) {
  const data = loadFile();
  const id = String(beneficiaryId || "").trim();
  if (!id) return null;
  return data.beneficiaries[id] || null;
}

export function creditWallet({ beneficiaryId, name, amount, source, ref, note }) {
  const amt = normalizeAmount(amount);
  const wallet = ensureWallet(beneficiaryId, name);

  wallet.currentBalance += amt;
  wallet.availableBalance += amt;

  addTx(wallet, {
    id: nextTxId(),
    type: "credit",
    source: String(source || "manual"),
    amount: amt,
    ref: ref != null ? String(ref) : null,
    note: note != null ? String(note) : null,
    createdAt: new Date().toISOString(),
  });

  saveFile();
  return wallet;
}

export function debitWallet({ beneficiaryId, amount, source, ref, note }) {
  const amt = normalizeAmount(amount);

  const data = loadFile();
  const id = normalizeId(beneficiaryId, "beneficiaryId");
  const wallet = data.beneficiaries[id];
  if (!wallet) throw new Error("Wallet not found");

  if (wallet.availableBalance < amt) {
    throw new Error("Insufficient available balance");
  }

  wallet.currentBalance -= amt;
  wallet.availableBalance -= amt;

  addTx(wallet, {
    id: nextTxId(),
    type: "debit",
    source: String(source || "payout"),
    amount: amt,
    ref: ref != null ? String(ref) : null,
    note: note != null ? String(note) : null,
    createdAt: new Date().toISOString(),
  });

  saveFile();
  return wallet;
}

export function holdFunds({ beneficiaryId, amount, source, ref, note }) {
  const amt = normalizeAmount(amount);

  const data = loadFile();
  const id = normalizeId(beneficiaryId, "beneficiaryId");
  const wallet = data.beneficiaries[id];
  if (!wallet) throw new Error("Wallet not found");

  if (wallet.availableBalance < amt) {
    throw new Error("Insufficient available balance for hold");
  }

  wallet.availableBalance -= amt;
  wallet.reservedBalance += amt;

  addTx(wallet, {
    id: nextTxId(),
    type: "hold",
    source: String(source || "hold"),
    amount: amt,
    ref: ref != null ? String(ref) : null,
    note: note != null ? String(note) : null,
    createdAt: new Date().toISOString(),
  });

  saveFile();
  return wallet;
}

export function releaseHold({ beneficiaryId, amount, source, ref, note, asDebit = false }) {
  const amt = normalizeAmount(amount);

  const data = loadFile();
  const id = normalizeId(beneficiaryId, "beneficiaryId");
  const wallet = data.beneficiaries[id];
  if (!wallet) throw new Error("Wallet not found");

  if (wallet.reservedBalance < amt) {
    throw new Error("Insufficient reserved balance");
  }

  wallet.reservedBalance -= amt;

  if (asDebit) {
    wallet.currentBalance -= amt;
  } else {
    wallet.availableBalance += amt;
  }

  addTx(wallet, {
    id: nextTxId(),
    type: asDebit ? "hold_spend" : "release",
    source: String(source || "hold"),
    amount: amt,
    ref: ref != null ? String(ref) : null,
    note: note != null ? String(note) : null,
    createdAt: new Date().toISOString(),
  });

  saveFile();
  return wallet;
}
