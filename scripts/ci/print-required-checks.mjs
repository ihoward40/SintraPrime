// scripts/ci/print-required-checks.mjs
// Repo-local verifier for branch protection required checks.
// Usage:
//   GH_TOKEN=... node ./scripts/ci/print-required-checks.mjs --branch master
//   (GITHUB_TOKEN is also accepted)

import { execSync } from "node:child_process";

function parseArgs(argv) {
  const out = {
    branch: "master",
    jsonOut: null,
    expectContexts: null,
    expectAppId: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--branch") out.branch = argv[i + 1] || out.branch;
    if (a === "--repo") out.repo = argv[i + 1];
    if (a === "--json-out") out.jsonOut = argv[i + 1] || out.jsonOut;
    if (a === "--expect-contexts") out.expectContexts = argv[i + 1] || out.expectContexts;
    if (a === "--expect-app-id") out.expectAppId = argv[i + 1] || out.expectAppId;
    if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

function parseCsvList(s) {
  if (s == null) return null;
  const v = String(s).trim();
  if (!v) return [];
  return v
    .split(",")
    .map((x) => String(x).trim())
    .filter(Boolean);
}

function die(msg, code = 2) {
  console.error(msg);
  process.exit(code);
}

function sh(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString("utf8").trim();
}

function repoFromOriginUrl(originUrl) {
  // Supports:
  //  - https://github.com/owner/repo.git
  //  - git@github.com:owner/repo.git
  //  - https://github.com/owner/repo
  const u = String(originUrl).trim();
  let m = u.match(/github\.com[:/](?<owner>[^/]+)\/(?<repo>[^.\s/]+)(?:\.git)?\s*$/i);
  if (!m?.groups?.owner || !m?.groups?.repo) return null;
  return `${m.groups.owner}/${m.groups.repo}`;
}

function getRepo() {
  // Preferred: explicit env from GitHub Actions
  const envRepo = process.env.GITHUB_REPOSITORY;
  if (envRepo) return envRepo;

  // Fallback: parse from git remote
  try {
    const origin = sh('git config --get remote.origin.url');
    const parsed = repoFromOriginUrl(origin);
    if (parsed) return parsed;
  } catch {
    // ignore
  }

  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      "Usage: node ./scripts/ci/print-required-checks.mjs [--branch <branch>] [--repo <owner/repo>] [--json-out <path>] [--expect-contexts <csv>] [--expect-app-id <id>]"
    );
    console.log("Env: GH_TOKEN or GITHUB_TOKEN required (needs permission to read branch protection).\n");
    console.log("Optional drift checks: EXPECTED_CONTEXTS (csv) and EXPECTED_APP_ID.");
    process.exit(0);
  }

  const repo = args.repo || getRepo();
  if (!repo) die("❌ Could not determine repo. Provide --repo <owner/repo> or set GITHUB_REPOSITORY.");

  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    die(
      "❌ Missing auth token. Set GH_TOKEN or GITHUB_TOKEN (must be able to read branch protection).\n" +
        "Tip: if you use GitHub CLI, you can do: GH_TOKEN=$(gh auth token) node ./scripts/ci/print-required-checks.mjs"
    );
  }

  const url = `https://api.github.com/repos/${repo}/branches/${encodeURIComponent(args.branch)}/protection/required_status_checks`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "sintraprime-print-required-checks",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    die(`❌ GitHub API error ${res.status} ${res.statusText}\n${body}`);
  }

  const data = await res.json();

  if (args.jsonOut) {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const outPath = String(args.jsonOut);
    if (!outPath || outPath.startsWith("--")) {
      die("❌ --json-out requires a file path argument.");
    }
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2) + "\n", "utf8");
  }

  const strict = Boolean(data?.strict);
  const contexts = Array.isArray(data?.contexts) ? data.contexts : [];
  const checks = Array.isArray(data?.checks) ? data.checks : [];

  const expectContexts =
    args.expectContexts != null
      ? parseCsvList(args.expectContexts)
      : parseCsvList(process.env.EXPECTED_CONTEXTS);
  const expectAppId =
    args.expectAppId != null
      ? String(args.expectAppId)
      : process.env.EXPECTED_APP_ID != null
        ? String(process.env.EXPECTED_APP_ID)
        : null;

  console.log(`repo:   ${repo}`);
  console.log(`branch: ${args.branch}`);
  console.log("---");
  console.log(`strict: ${strict}`);

  console.log("contexts:");
  if (contexts.length === 0) console.log("  (none)");
  for (const c of contexts) console.log(`  - ${c}`);

  console.log("checks:");
  if (checks.length === 0) console.log("  (none)");
  for (const c of checks) {
    const ctx = c?.context ? String(c.context) : "(missing context)";
    const app = c?.app_id != null ? String(c.app_id) : "(missing app_id)";
    console.log(`  - ${ctx}\tapp_id=${app}`);
  }

  // Optional drift detection (machine-enforced receipt)
  const problems = [];

  if (expectContexts) {
    const expectedSorted = [...new Set(expectContexts)].sort();
    const actualSorted = [...new Set(contexts.map(String))].sort();

    const missing = expectedSorted.filter((c) => !actualSorted.includes(c));
    const extra = actualSorted.filter((c) => !expectedSorted.includes(c));
    if (missing.length || extra.length) {
      problems.push({ kind: "contexts", missing, extra });
    }
  }

  if (expectAppId) {
    const wrong = checks
      .map((c) => ({ context: String(c?.context || ""), app_id: c?.app_id }))
      .filter((c) => c.context)
      .filter((c) => String(c.app_id) !== String(expectAppId));
    if (wrong.length > 0) problems.push({ kind: "app_id", expectAppId, wrong });
  }

  if (problems.length > 0) {
    console.error("❌ REQUIRED CHECKS DRIFT DETECTED");
    console.error(`repo=${repo} branch=${args.branch}`);

    for (const p of problems) {
      if (p.kind === "contexts") {
        if (p.missing?.length) {
          console.error("Missing required contexts:");
          for (const c of p.missing) console.error(` - ${c}`);
        }
        if (p.extra?.length) {
          console.error("Unexpected required contexts:");
          for (const c of p.extra) console.error(` - ${c}`);
        }
      }

      if (p.kind === "app_id") {
        console.error(`Expected app_id=${p.expectAppId} for required checks, but found:`);
        for (const w of p.wrong) console.error(` - ${w.context}\tapp_id=${String(w.app_id)}`);
      }
    }

    process.exitCode = 1;
    return;
  }
}

await main();
