// scripts/ci/simple-secret-scanner.ts
// Simplified secret scanner for CI/CD pipelines.
// Scans committed files for known secret patterns (API keys, private keys, etc.).
// A real implementation would use a more robust tool like Gitleaks.
//
// Usage: npx tsx scripts/ci/simple-secret-scanner.ts <file1> <file2> ...

import * as fs from "fs";

const secretPatterns: Array<{ name: string; pattern: RegExp }> = [
  { name: "Stripe Live Key", pattern: /sk_live_[a-zA-Z0-9]{24}/ },
  { name: "Stripe Test Key", pattern: /sk_test_[a-zA-Z0-9]{24}/ },
  { name: "OAuth Client Secret", pattern: /"client_secret":\s*"[a-zA-Z0-9_\-]+"/ },
  { name: "RSA Private Key", pattern: /-----BEGIN RSA PRIVATE KEY-----/ },
  { name: "EC Private Key", pattern: /-----BEGIN EC PRIVATE KEY-----/ },
  { name: "Generic Private Key", pattern: /-----BEGIN PRIVATE KEY-----/ },
  { name: "AWS Access Key", pattern: /AKIA[0-9A-Z]{16}/ },
  { name: "GitHub Token", pattern: /ghp_[a-zA-Z0-9]{36}/ },
  { name: "GitHub OAuth", pattern: /gho_[a-zA-Z0-9]{36}/ },
  { name: "Slack Token", pattern: /xox[bpors]-[a-zA-Z0-9\-]+/ },
  { name: "Telegram Bot Token", pattern: /\d{8,10}:[a-zA-Z0-9_-]{35}/ },
  { name: "Generic API Key", pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*["']?[a-zA-Z0-9]{20,}["']?/i },
  { name: "Generic Secret", pattern: /(?:secret|password|passwd|pwd)\s*[:=]\s*["'][^"']{8,}["']/i },
];

const IGNORED_EXTENSIONS = [".lock", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".woff", ".woff2", ".ttf", ".eot"];
const IGNORED_DIRS = ["node_modules", ".git", "dist", "coverage"];

function scanFile(filePath: string): string[] {
  const findings: string[] = [];

  // Skip binary and ignored files
  const ext = filePath.substring(filePath.lastIndexOf("."));
  if (IGNORED_EXTENSIONS.includes(ext)) return findings;
  if (IGNORED_DIRS.some((d) => filePath.includes(`/${d}/`))) return findings;

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comments and example lines
      if (line.trim().startsWith("//") && line.includes("example")) continue;
      if (line.trim().startsWith("#") && line.includes("example")) continue;

      for (const { name, pattern } of secretPatterns) {
        if (pattern.test(line)) {
          findings.push(
            `[${name}] found in ${filePath} on line ${i + 1}`
          );
        }
      }
    }
  } catch {
    // Skip files that can't be read
  }

  return findings;
}

function main(): void {
  const filesToScan = process.argv.slice(2);

  if (filesToScan.length === 0) {
    console.log("Usage: npx tsx scripts/ci/simple-secret-scanner.ts <file1> <file2> ...");
    console.log("No files specified. Pass files as arguments or pipe from git diff.");
    process.exit(0);
  }

  let allFindings: string[] = [];

  for (const file of filesToScan) {
    if (fs.existsSync(file)) {
      const findings = scanFile(file);
      allFindings = [...allFindings, ...findings];
    }
  }

  if (allFindings.length > 0) {
    console.error("SECRETS DETECTED! FAILING BUILD.\n");
    allFindings.forEach((finding) => console.error(`  ✗ ${finding}`));
    console.error(`\nTotal: ${allFindings.length} secret(s) found.`);
    process.exit(1);
  } else {
    console.log(`✓ No secrets found in ${filesToScan.length} file(s). Scan passed.`);
  }
}

main();
