import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { RunRecord } from './types.js';

export class RunLogger {
  private runsDir = 'runs';

  async logRun(run: RunRecord): Promise<string> {
    const runDir = path.join(this.runsDir, `MONITOR_${run.run_id}`);
    fs.mkdirSync(runDir, { recursive: true });

    // Write run record
    const runFilePath = path.join(runDir, 'run_record.json');
    const runJson = JSON.stringify(run, null, 2);
    fs.writeFileSync(runFilePath, runJson, 'utf-8');

    // Write SHA-256 sidecar
    const sha256 = crypto.createHash('sha256').update(runJson).digest('hex');
    fs.writeFileSync(`${runFilePath}.sha256`, sha256, 'utf-8');

    // Append to ledger (append-only)
    const ledgerPath = path.join(runDir, 'ledger.jsonl');
    const ledgerEntry = {
      event: 'RUN_LOGGED',
      run_id: run.run_id,
      severity: run.severity,
      timestamp: new Date().toISOString(),
    };
    fs.appendFileSync(ledgerPath, JSON.stringify(ledgerEntry) + '\n', 'utf-8');

    return runDir;
  }
}
