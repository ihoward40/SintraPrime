#!/usr/bin/env bash
set -euo pipefail

TAG=""
OBJECTIVE=""
RUNS_ROOT="runs"
SEQ=""
NOW=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)
      TAG="$2"; shift 2 ;;
    --objective)
      OBJECTIVE="$2"; shift 2 ;;
    --runs-root)
      RUNS_ROOT="$2"; shift 2 ;;
    --seq)
      SEQ="$2"; shift 2 ;;
    --now)
      NOW="$2"; shift 2 ;;
    *)
      echo "Usage: tools/run-skeleton/run-skeleton.sh --tag <TAG> --objective <text> [--runs-root <path>] [--seq <NNN>] [--now <ISO>]" >&2
      exit 2
      ;;
  esac
done

if [[ -z "$TAG" || -z "$OBJECTIVE" ]]; then
  echo "Missing required args: --tag and --objective" >&2
  exit 2
fi

node tools/run-skeleton/run-skeleton.mjs --tag "$TAG" --objective "$OBJECTIVE" --runs-root "$RUNS_ROOT" ${SEQ:+--seq "$SEQ"} ${NOW:+--now "$NOW"}
