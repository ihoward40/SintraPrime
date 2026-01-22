#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   tools/agent/agent.sh --text "..." [--governance G1|G2|G3] [--runs-root runs] [--timeout-sec N] [--ship|--publish]

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
AGENT="$REPO_ROOT/tools/agent/agent.mjs"

node "$AGENT" "$@"
