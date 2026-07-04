#!/usr/bin/env python3
"""
check_bandit.py — Single source of truth for Bandit security-policy evaluation.

Architecture:
    GitHub Workflow -> check_bandit.py -> Bandit -> JSON -> Policy Evaluation
                    -> Human-readable diagnostics -> Pass/Fail exit code

Bandit exit-code semantics (verified for bandit 1.x):
    0  — Bandit ran successfully AND found no issues.
    1  — Bandit ran successfully AND found at least one issue (any severity).
    2  — Bandit could not run due to argument/execution error (non-JSON output).

Because we want to control pass/fail ourselves based on policy (HIGH findings
above baseline), we always invoke Bandit with --exit-zero so it exits 0 on
completion regardless of findings.  We then evaluate the JSON output ourselves
and exit with 0 (pass) or 1 (fail) based on our policy rules.

Policy:
    FAIL  — Any HIGH-severity finding that is NOT in the accepted baseline.
    PASS  — All HIGH-severity findings are already in the accepted baseline,
            or there are no HIGH-severity findings at all.

Usage:
    python scripts/check_bandit.py [target_path] [baseline_path]

    Defaults:
        target_path   = .   (scan entire repo)
        baseline_path = scripts/bandit_baseline.json
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEFAULT_TARGET = "."
DEFAULT_BASELINE = Path(__file__).parent / "bandit_baseline.json"
EXCLUDED_PATHS = "node_modules,.git,dist,build,__pycache__"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _baseline_key(finding: dict) -> str:
    """Return a stable fingerprint for a single Bandit finding.

    The key is composed of (test_id, normalised_filename, line_number) so that
    accepted findings are matched regardless of the working directory prefix.
    """
    filename = finding.get("filename", "")
    # Strip common leading ./ prefix produced by bandit when scanning "."
    filename = filename.lstrip("./")
    return f"{finding.get('test_id', '')}::{filename}::{finding.get('line_number', '')}"


def _load_baseline(baseline_path: Path) -> set[str]:
    """Load the set of accepted finding keys from the baseline file.

    Returns an empty set if the baseline file does not exist, which means all
    HIGH findings will be treated as new and will trigger a failure.
    """
    if not baseline_path.exists():
        print(f"[bandit-policy] WARNING: Baseline file not found: {baseline_path}")
        print("[bandit-policy] All HIGH findings will be treated as new violations.")
        return set()

    with baseline_path.open() as fh:
        data = json.load(fh)

    # The baseline stores findings in the same format as Bandit JSON output.
    # We extract the fingerprint for each accepted finding.
    accepted: set[str] = set()
    for finding in data.get("results", []):
        accepted.add(_baseline_key(finding))

    return accepted


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> int:
    # ------------------------------------------------------------------
    # CLI args
    # ------------------------------------------------------------------
    target = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_TARGET
    baseline_path = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_BASELINE

    # ------------------------------------------------------------------
    # Diagnostics header
    # ------------------------------------------------------------------
    repo_sha = os.environ.get("GITHUB_SHA", "local")
    bandit_version_result = subprocess.run(
        ["bandit", "--version"],
        capture_output=True,
        text=True,
    )
    bandit_version = bandit_version_result.stdout.strip() if bandit_version_result.returncode == 0 else "unknown"

    bandit_cmd = [
        "bandit",
        "-r",
        target,
        "-f", "json",
        "-x", EXCLUDED_PATHS,
        "--exit-zero",   # Always exit 0; we control pass/fail via policy below.
    ]

    print("=" * 70)
    print("BANDIT SECURITY SCAN")
    print("=" * 70)
    print(f"  Bandit version : {bandit_version}")
    print(f"  Repository SHA : {repo_sha}")
    print(f"  Baseline file  : {baseline_path.resolve()}")
    print(f"  Scan target    : {target}")
    print(f"  Command        : {' '.join(bandit_cmd)}")
    print("=" * 70)

    # ------------------------------------------------------------------
    # Execute Bandit
    # ------------------------------------------------------------------
    # We use --exit-zero so that Bandit always exits 0 on completion,
    # even when findings exist.  This lets us evaluate the JSON output
    # ourselves and apply our own policy rules.
    #
    # Bandit exit-code reference (bandit 1.x):
    #   0  — completed successfully, no findings
    #   1  — completed successfully, findings present (suppressed by --exit-zero)
    #   2  — argument/execution error (not suppressed by --exit-zero)
    result = subprocess.run(
        bandit_cmd,
        capture_output=True,
        text=True,
    )

    # With --exit-zero, Bandit exits 0 on successful completion regardless of
    # findings.  Any non-zero exit code therefore indicates an execution error
    # (e.g., exit 2 for unrecognised arguments or invocation failures).
    if result.returncode != 0:
        print(f"[bandit-policy] ERROR: Bandit exited with code {result.returncode}")
        print("[bandit-policy] stderr:", result.stderr)
        return 1

    # ------------------------------------------------------------------
    # Parse JSON output
    # ------------------------------------------------------------------
    stdout = result.stdout.strip()

    # Bandit may emit INFO log lines to stdout before the JSON block.
    # Find the first '{' to locate the start of the JSON payload.
    json_start = stdout.find("{")
    if json_start == -1:
        print("[bandit-policy] ERROR: Bandit produced no JSON output.")
        print("[bandit-policy] stdout:", stdout)
        print("[bandit-policy] stderr:", result.stderr)
        return 1

    try:
        data = json.loads(stdout[json_start:])
    except json.JSONDecodeError as exc:
        print(f"[bandit-policy] ERROR: Failed to parse Bandit JSON output: {exc}")
        print("[bandit-policy] stdout:", stdout)
        return 1

    all_findings: list[dict] = data.get("results", [])
    high_findings: list[dict] = [
        f for f in all_findings if f.get("issue_severity", "").upper() == "HIGH"
    ]

    # Report any Bandit scan errors (e.g., files it could not read).
    scan_errors = data.get("errors", [])
    if scan_errors:
        print(f"[bandit-policy] WARNING: Bandit reported {len(scan_errors)} scan error(s):")
        for err in scan_errors:
            print(f"  - {err.get('filename', '?')}: {err.get('reason', '?')}")

    print(f"\n  Total findings : {len(all_findings)}")
    print(f"  HIGH findings  : {len(high_findings)}")

    # ------------------------------------------------------------------
    # Print all HIGH findings with full detail
    # ------------------------------------------------------------------
    if high_findings:
        print("\n" + "-" * 70)
        print("HIGH SEVERITY FINDINGS")
        print("-" * 70)
        for i, f in enumerate(high_findings, start=1):
            print(f"\n  [{i}] Rule ID   : {f.get('test_id', 'unknown')} ({f.get('test_name', '')})")
            print(f"       File      : {f.get('filename', 'unknown')}")
            print(f"       Line      : {f.get('line_number', '?')}")
            print(f"       Severity  : {f.get('issue_severity', '?')}")
            print(f"       Confidence: {f.get('issue_confidence', '?')}")
            print(f"       Message   : {f.get('issue_text', '')}")
            print(f"       More info : {f.get('more_info', '')}")
        print("-" * 70)

    # ------------------------------------------------------------------
    # Policy evaluation: compare HIGH findings against baseline
    # ------------------------------------------------------------------
    accepted_keys = _load_baseline(baseline_path)

    new_violations: list[dict] = [
        f for f in high_findings if _baseline_key(f) not in accepted_keys
    ]

    print("\n" + "=" * 70)
    if new_violations:
        print("RESULT: FAIL")
        print(f"  {len(new_violations)} new HIGH finding(s) not in baseline:")
        for v in new_violations:
            key = _baseline_key(v)
            print(f"  -> {key}")
        print("\nTo accept these findings, add them to the baseline:")
        print(f"  {baseline_path.resolve()}")
        print("=" * 70)
        return 1

    print("RESULT: PASS")
    if high_findings:
        print(f"  All {len(high_findings)} HIGH finding(s) are in the accepted baseline.")
    else:
        print("  No HIGH severity findings.")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(main())
