import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { casesScan } from "../../src/cases/scan.js";

class FakeStore {
  private cases: any[];
  constructor(cases: any[]) {
    this.cases = [...cases];
  }
  async queryDueCases() {
    return this.cases;
  }
  async claimEscalationLock() {
    return true;
  }
  async releaseEscalationLock() {
    return;
  }
  async updateCase(patch: any) {
    const idx = this.cases.findIndex((c) => c.notionPageId === patch.notionPageId);
    if (idx >= 0) this.cases[idx] = { ...this.cases[idx], ...patch };
  }
}

function die(msg: string): never {
  process.stderr.write(msg + "\n");
  process.exit(2);
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), "sintraprime-cases-"));
const store: any = new FakeStore([
  {
    notionPageId: "page1",
    caseId: "C-TEST-1",
    status: "Active",
    stage: "Notice",
    priority: "Medium",
    dueDate: "2000-01-01",
    nextAction: "x",
    intakeKey: "sha256:abc",
    escalationLockUntil: null,
    title: "demo",
  },
]);

await casesScan({ rootDir: root, store, lockMinutes: 1 });

const eventsPath = path.join(root, "cases", "C-TEST-1", "case.events.jsonl");
if (!fs.existsSync(eventsPath)) die("Missing case.events.jsonl");

const events = fs.readFileSync(eventsPath, "utf8");
if (!events.includes("ESCALATED")) die("Expected ESCALATED event");

const runsDir = path.join(root, "cases", "C-TEST-1", "runs");
if (!fs.existsSync(runsDir)) die("Missing runs dir");

const runs = fs.readdirSync(runsDir).filter((f) => f.endsWith(".json"));
if (runs.length < 1) die("Expected at least one run receipt");

process.stdout.write("CASES_SMOKE_OK\n");
