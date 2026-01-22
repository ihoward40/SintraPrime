#!/usr/bin/env bash
set -euo pipefail

RUN_ID=""
BY=""
NOTE=""
RUNS_ROOT="runs"
NO_REHASH=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --run-id) RUN_ID="$2"; shift 2 ;;
    --by) BY="$2"; shift 2 ;;
    --note) NOTE="$2"; shift 2 ;;
    --runs-root) RUNS_ROOT="$2"; shift 2 ;;
    --no-rehash) NO_REHASH="--no-rehash"; shift 1 ;;
    --help|-h) node "$(dirname "$0")/approve-run.mjs" --help; exit 0 ;;
    --version) node "$(dirname "$0")/approve-run.mjs" --version; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$RUN_ID" || -z "$BY" ]]; then
  echo "Missing --run-id and/or --by" >&2
  exit 1
fi

ARGS=("$(dirname "$0")/approve-run.mjs" "--run-id" "$RUN_ID" "--by" "$BY" "--runs-root" "$RUNS_ROOT")
if [[ -n "$NOTE" ]]; then
  ARGS+=("--note" "$NOTE")
fi
if [[ -n "$NO_REHASH" ]]; then
  ARGS+=("--no-rehash")
fi

node "${ARGS[@]}"
