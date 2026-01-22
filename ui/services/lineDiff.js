// Very small, dependency-free line diff for UI previews.
// Produces a list of hunks with {type:'equal'|'add'|'del', line:string}

export function diffLines(aText, bText, { maxLines = 4000 } = {}) {
  const a = String(aText || "").split(/\r?\n/).slice(0, maxLines);
  const b = String(bText || "").split(/\r?\n/).slice(0, maxLines);

  const n = a.length;
  const m = b.length;

  // DP for LCS length (rolling rows)
  const prev = new Uint32Array(m + 1);
  const curr = new Uint32Array(m + 1);

  for (let i = 1; i <= n; i++) {
    curr.fill(0);
    const ai = a[i - 1];
    for (let j = 1; j <= m; j++) {
      if (ai === b[j - 1]) curr[j] = prev[j - 1] + 1;
      else curr[j] = prev[j] > curr[j - 1] ? prev[j] : curr[j - 1];
    }
    prev.set(curr);
  }

  // Backtrack to build diff
  const out = [];
  let i = n;
  let j = m;

  // Recompute full table for backtracking if too big? We avoid full table by re-running with memo chunks.
  // For our expected sizes this is fine to compute full table once.
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let ii = 1; ii <= n; ii++) {
    const row = dp[ii];
    const prow = dp[ii - 1];
    const ai = a[ii - 1];
    for (let jj = 1; jj <= m; jj++) {
      if (ai === b[jj - 1]) row[jj] = prow[jj - 1] + 1;
      else row[jj] = prow[jj] > row[jj - 1] ? prow[jj] : row[jj - 1];
    }
  }

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      out.push({ type: "equal", line: a[i - 1] });
      i -= 1;
      j -= 1;
      continue;
    }
    const up = i > 0 ? dp[i - 1][j] : 0;
    const left = j > 0 ? dp[i][j - 1] : 0;
    if (j > 0 && (i === 0 || left >= up)) {
      out.push({ type: "add", line: b[j - 1] });
      j -= 1;
    } else if (i > 0) {
      out.push({ type: "del", line: a[i - 1] });
      i -= 1;
    }
  }

  out.reverse();
  return out;
}
