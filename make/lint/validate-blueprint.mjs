import fs from 'node:fs';
import path from 'node:path';

const [,, blueprintPathArg, profilePathArg, outPathArg] = process.argv;

if (!blueprintPathArg || !profilePathArg || !outPathArg) {
  console.error('Usage: node validate-blueprint.mjs <blueprint.json> <profile.json> <out.json>');
  process.exit(2);
}

const blueprintPath = path.resolve(process.cwd(), blueprintPathArg);
const profilePath = path.resolve(process.cwd(), profilePathArg);
const outPath = path.resolve(process.cwd(), outPathArg);

const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));

function pushIfString(set, v) {
  if (typeof v === 'string' && v.trim()) set.add(v.trim());
}

function collectFacts(obj) {
  const routeNames = new Set();
  const moduleLabels = new Set();

  // Common-ish shapes:
  // - { flow: [ { name, type, ... } ] }
  // - { modules: [ ... ] }
  // - Make exports vary; we do a safe recursive scrape.
  const stack = [obj];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== 'object') continue;

    if (Array.isArray(cur)) {
      for (const item of cur) stack.push(item);
      continue;
    }

    // Heuristics: treat any of these as possible route/module identifiers.
    pushIfString(routeNames, cur.route_name);
    pushIfString(routeNames, cur.routeName);
    pushIfString(routeNames, cur.name);
    pushIfString(moduleLabels, cur.module);
    pushIfString(moduleLabels, cur.label);
    pushIfString(moduleLabels, cur.type);

    for (const v of Object.values(cur)) {
      if (v && typeof v === 'object') stack.push(v);
    }
  }

  return {
    route_names: Array.from(routeNames).sort(),
    module_labels: Array.from(moduleLabels).sort(),
  };
}

const facts = collectFacts(blueprint);
const routeSet = new Set(facts.route_names);

const errors = [];
const warnings = [];

// Required routes (exact match)
for (const r of profile.required_routes || []) {
  if (!routeSet.has(r)) {
    errors.push(`Missing required route: ${r}`);
  }
}

// Forbidden modules (substring match against labels)
for (const f of profile.forbidden_modules || []) {
  const hit = facts.module_labels.some((n) => n.includes(f));
  if (hit) errors.push(`Forbidden module detected: ${f}`);
}

// Structural requirements (best-effort heuristics)
if (profile.requirements?.router_present) {
  const hasRouter =
    facts.module_labels.some((l) => String(l).toLowerCase().includes('router')) ||
    routeSet.has('mode_router') ||
    routeSet.has('lint_verdict_router');
  if (!hasRouter) errors.push('Router module missing');
}

if (profile.requirements?.error_handler_present) {
  // We can’t reliably infer Make error handlers from all exports, but we *can* require a named component.
  // Accept either a conventional label OR a route name that indicates explicit error handling.
  const hasErr =
    facts.module_labels.some((l) => String(l).toLowerCase().includes('error')) ||
    routeSet.has('error_handler') ||
    routeSet.has('notify_dr_status') ||
    routeSet.has('notify_lint_result');
  if (!hasErr) warnings.push('Error handler not detected (heuristic)');
}

if (profile.requirements?.scenario_disabled_on_fail) {
  // If the profile demands auto-disable capability, require the canonical route.
  if (!routeSet.has('auto_disable_scenario')) {
    errors.push('Scenario disable-on-fail missing: expected route auto_disable_scenario');
  }
}

const verdict =
  errors.length > 0 ? 'FAIL' :
  warnings.length > 0 ? 'WARN' :
  'PASS';

const result = {
  blueprint: blueprintPathArg,
  profile: profilePathArg,
  verdict,
  errors,
  warnings,
  checked_at: new Date().toISOString(),
  facts,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`Lint verdict: ${verdict}`);

if (verdict === 'FAIL') process.exit(1);
