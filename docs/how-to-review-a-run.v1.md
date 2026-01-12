# How to Review a SintraPrime Run (v1)

## What this is
A run is a self-contained execution record. Each run stands alone and can be reviewed independently.

## Where to start
1) runs/<RUN_ID>/ledger.jsonl  
   - Chronological posture and events  
   - Look for the WATCH manifest (informational)  
   - Look for mode transitions and any SILENT_HALT entries

2) runs/<RUN_ID>/plan/summary.md  
   - Human-readable plan summary  
   - No execution authority implied

3) runs/<RUN_ID>/apply/steps.executed.json  
   - Step-by-step execution record  
   - Timestamps, systems, outcomes  
   - Optional watch references (if enabled)

## Optional visual witness (if present)
- runs/<RUN_ID>/screen/
  - tour/  (phase tours)
  - steps/ (per-step screenshots, opt-in)

## How to read Watch artifacts
- Watch artifacts are observational only  
- Presence indicates opt-in witnessing  
- Absence does not invalidate the run

## What not to expect
- No prompts or reasoning chains
- No credentials
- No autonomous decisions

## End
