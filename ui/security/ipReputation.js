const ipState = new Map(); // ip -> { score, lastSeen, blockedUntil, reason }

export function noteSuspiciousIp(ip, amount = 5, reason = "suspicious") {
  const key = String(ip || "unknown");
  const now = Date.now();
  const entry = ipState.get(key) || { score: 0, lastSeen: 0, blockedUntil: 0, reason: null };

  entry.score += Number(amount || 0);
  entry.lastSeen = now;
  entry.reason = reason;

  // Escalate blocks when score is high
  if (entry.score >= 40 && entry.blockedUntil < now) {
    entry.blockedUntil = now + 10 * 60 * 1000;
  }

  ipState.set(key, entry);
}

export function getIpReputation(ip) {
  const key = String(ip || "unknown");
  return ipState.get(key) || { score: 0, lastSeen: 0, blockedUntil: 0, reason: null };
}

export function isIpBlocked(ip) {
  const now = Date.now();
  const entry = ipState.get(String(ip || "unknown"));
  if (!entry) return false;
  return Number(entry.blockedUntil || 0) > now;
}
