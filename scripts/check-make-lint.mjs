#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import {
	WORKSPACE_ROOT,
	detectHashBeforeExport,
	detectRunsLedgerWrite,
	detectScheduler,
	detectSlack,
	detectStateHashCompare,
	isSchedulerLikeModule,
	isSlackInteractiveModule,
	isSlackSendMessage,
	listFilesRecursive,
	lower,
	moduleId,
	nowIso,
	rel,
	stableString
} from './lint-utils.mjs';

const GOVERNANCE_DIR = path.join(WORKSPACE_ROOT, 'governance', 'make-lint');
const LINT_PROFILES_DIR = path.join(GOVERNANCE_DIR, 'lint_profiles');
const REPORT_PATH = path.join(GOVERNANCE_DIR, 'lint-report.json');

const SCENARIOS_DIR = path.join(WORKSPACE_ROOT, 'scenarios');
const TEMPLATES_DIR = path.join(WORKSPACE_ROOT, 'make-gmail-slack-automation', 'templates');

function die(code, message) {
	// eslint-disable-next-line no-console
	console.error(message);
	process.exit(code);
}

async function readJson(filePath) {
	const raw = await fs.readFile(filePath, 'utf8');
	return JSON.parse(raw);
}

async function loadProfiles() {
	/** @type {Map<string, any>} */
	const map = new Map();
	const files = await listFilesRecursive(
		LINT_PROFILES_DIR,
		(p) => p.toLowerCase().endsWith('.json')
	);
	for (const file of files) {
		const doc = await readJson(file);
		const name = stableString(doc?.name).trim() || path.basename(file, '.json');
		map.set(name, doc);
	}
	return map;
}

async function loadScenarioDeclarations() {
	/** @type {Map<string, {file: string, decl: any}>} */
	const map = new Map();
	const files = await listFilesRecursive(
		SCENARIOS_DIR,
		(p) => p.toLowerCase().endsWith('.lint.json')
	);

	for (const file of files) {
		const decl = await readJson(file);
		const scenarioId = stableString(decl?.scenario_id).trim();
		if (!scenarioId) {
			die(2, `❌ MAKE LINT FAILED\nScenario: (unknown)\nRule: missing_scenario_id\nFile: ${rel(file)}`);
		}

		if (map.has(scenarioId)) {
			die(2, `❌ MAKE LINT FAILED\nScenario: ${scenarioId}\nRule: duplicate_declaration\nFile: ${rel(file)}`);
		}

		map.set(scenarioId, { file, decl });
	}

	return map;
}

async function loadTemplateScenarios() {
	/** @type {Map<string, {file: string, doc: any}>} */
	const map = new Map();

	const files = await listFilesRecursive(
		TEMPLATES_DIR,
		(p) => p.toLowerCase().endsWith('.json')
	);

	for (const file of files) {
		const doc = await readJson(file);
		const scenarioId = stableString(doc?.scenario_id).trim();
		if (!scenarioId) {
			// If you add a new template, embed scenario_id. Otherwise enforcement can't be deterministic.
			die(2, `❌ MAKE LINT FAILED\nScenario: (unknown)\nRule: template_missing_scenario_id\nFile: ${rel(file)}`);
		}
		if (map.has(scenarioId)) {
			die(2, `❌ MAKE LINT FAILED\nScenario: ${scenarioId}\nRule: duplicate_scenario_id\nFile: ${rel(file)}`);
		}
		map.set(scenarioId, { file, doc });
	}

	return map;
}

function offendersForModules(doc, predicate) {
	const modules = Array.isArray(doc?.modules) ? doc.modules : [];
	return modules
		.map((m, idx) => ({ m, idx }))
		.filter(({ m }) => predicate(m))
		.map(({ m, idx }) => ({
			module_id: moduleId(m, idx),
			module: m?.module ?? null,
			name: m?.name ?? null
		}));
}

function lintOne({ scenarioId, decl, profile, doc }) {
	/** @type {{code: string, message: string, offenders?: any[]}[]} */
	const issues = [];

	const modules = Array.isArray(doc?.modules) ? doc.modules : null;
	if (!modules) {
		issues.push({ code: 'invalid_modules', message: 'Scenario JSON missing modules[] array.' });
		return issues;
	}

	const slack = detectSlack(doc);
	const scheduler = detectScheduler(doc);

	// forbidden.scheduler
	if (profile?.forbidden?.scheduler === true && scheduler) {
		issues.push({
			code: 'forbidden.scheduler',
			message: 'Scheduler/cron detected but forbidden by profile.',
			offenders: offendersForModules(doc, isSchedulerLikeModule)
		});
	}

	// forbidden.periodic_slack (scheduler + slack send)
	if (profile?.forbidden?.periodic_slack === true && scheduler && slack.send) {
		issues.push({
			code: 'forbidden.periodic_slack',
			message: 'Scheduler + Slack post detected (periodic Slack). Forbidden by profile.',
			offenders: offendersForModules(doc, (m) => isSchedulerLikeModule(m) || isSlackSendMessage(m))
		});
	}

	// required.state_hash_compare
	const expectedStateHash = decl?.expected_modules?.state_hash_compare ?? null;
	const requireStateHash = profile?.required?.state_hash_compare === true || expectedStateHash === true;
	if (requireStateHash) {
		const ok = detectStateHashCompare(doc);
		if (!ok) {
			issues.push({
				code: 'required.state_hash_compare',
				message: 'Missing state-change gate (hash compare or explicit idempotency primitive).',
				offenders: slack.send ? offendersForModules(doc, isSlackSendMessage) : undefined
			});
		}
	}

	// required.runs_ledger_write
	const expectedLedger = decl?.expected_modules?.ledger_write ?? null;
	const requireLedger = profile?.required?.runs_ledger_write === true || expectedLedger === true;
	if (requireLedger) {
		const ok = detectRunsLedgerWrite(doc);
		if (!ok) {
			issues.push({
				code: 'required.runs_ledger_write',
				message: 'Missing Runs Ledger write (Notion write or explicit Runs Ledger marker).'
			});
		}
	}

	// required.hash_before_export
	const expectedHash = decl?.expected_modules?.hash_before_export ?? null;
	const requireHash = profile?.required?.hash_before_export === true || expectedHash === true;
	if (requireHash) {
		const ok = detectHashBeforeExport(doc);
		if (!ok) {
			issues.push({
				code: 'required.hash_before_export',
				message: 'Missing hash computation prior to export/artifact output.'
			});
		}
	}

	// required.slack_interactive_for_authority
	if (profile?.required?.slack_interactive_for_authority === true) {
		const authority = stableString(decl?.authority_level).trim() || 'notify';
		const isAuthority = authority !== 'notify';
		if (isAuthority && !slack.interactive) {
			issues.push({
				code: 'required.slack_interactive_for_authority',
				message: 'Authority scenario requires Slack interactive checkpoint, but none detected.'
			});
		}
	}

	// forbidden.slack_interactive
	if (profile?.forbidden?.slack_interactive === true && slack.interactive) {
		issues.push({
			code: 'forbidden.slack_interactive',
			message: 'Slack interactive modules detected but forbidden by profile.',
			offenders: offendersForModules(doc, isSlackInteractiveModule)
		});
	}

	// forbidden.authority_action
	// We treat Slack-interactive decision modules as the signal for "authority action".
	if (profile?.forbidden?.authority_action === true && slack.interactive) {
		issues.push({
			code: 'forbidden.authority_action',
			message: 'Notify-only profiles cannot include authority/decision (interactive) steps.',
			offenders: offendersForModules(doc, isSlackInteractiveModule)
		});
	}

	// expected_modules slack_post / slack_interactive
	if (decl?.expected_modules?.slack_post === true && !slack.send) {
		issues.push({ code: 'expected.slack_post', message: 'Scenario declaration expects a Slack post, but none detected.' });
	}
	if (decl?.expected_modules?.slack_interactive === true && !slack.interactive) {
		issues.push({ code: 'expected.slack_interactive', message: 'Scenario declaration expects Slack interactive, but none detected.' });
	}

	return issues;
}

async function main() {
	const [profiles, declMap, templateMap] = await Promise.all([
		loadProfiles(),
		loadScenarioDeclarations(),
		loadTemplateScenarios()
	]);

	// Enforce: every template scenario must have a declaration.
	for (const scenarioId of templateMap.keys()) {
		if (!declMap.has(scenarioId)) {
			die(2, `❌ MAKE LINT FAILED\nScenario: ${scenarioId}\nRule: missing_declaration\nFile: scenarios/${scenarioId}.lint.json`);
		}
	}

	/** @type {{scenario_id: string, template_file: string, declaration_file: string, status: 'PASS'|'FAIL', issues: any[]}[]} */
	const results = [];

	for (const [scenarioId, { file: declFile, decl }] of declMap.entries()) {
		const profileName = stableString(decl?.lint_profile).trim();
		const profile = profiles.get(profileName);
		if (!profile) {
			results.push({
				scenario_id: scenarioId,
				template_file: '',
				declaration_file: rel(declFile),
				status: 'FAIL',
				issues: [{ code: 'unknown_profile', message: `Unknown lint_profile: ${profileName}` }]
			});
			continue;
		}

		const tpl = templateMap.get(scenarioId);
		if (!tpl) {
			results.push({
				scenario_id: scenarioId,
				template_file: '',
				declaration_file: rel(declFile),
				status: 'FAIL',
				issues: [{ code: 'missing_template', message: `No template JSON found for scenario_id ${scenarioId}` }]
			});
			continue;
		}

		const issues = lintOne({ scenarioId, decl, profile, doc: tpl.doc });
		results.push({
			scenario_id: scenarioId,
			template_file: rel(tpl.file),
			declaration_file: rel(declFile),
			status: issues.length > 0 ? 'FAIL' : 'PASS',
			issues
		});
	}

	const fail = results.filter((r) => r.status === 'FAIL');
	const pass = results.filter((r) => r.status === 'PASS');

	const report = {
		generated_at: nowIso(),
		scanned_scenarios: results.length,
		pass: pass.length,
		fail: fail.length,
		results
	};

	await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');

	if (fail.length === 0) {
		// eslint-disable-next-line no-console
		console.log(`✅ MAKE LINT PASSED (${pass.length}/${results.length})`);
		// eslint-disable-next-line no-console
		console.log(`Report: governance/make-lint/lint-report.json`);
		process.exit(0);
	}

	const firstFail = fail[0];
	const firstIssue = firstFail.issues?.[0] ?? null;
	const offender = firstIssue?.offenders?.[0] ?? null;

	// Tight operator output (mirrors your example)
	// eslint-disable-next-line no-console
	console.error('❌ MAKE LINT FAILED');
	// eslint-disable-next-line no-console
	console.error(`Scenario: ${firstFail.scenario_id}`);
	// eslint-disable-next-line no-console
	console.error(`Rule: ${firstIssue?.code ?? 'unknown'}`);
	if (offender?.module_id) {
		// eslint-disable-next-line no-console
		console.error(`Module ID: ${offender.module_id}`);
	}
	// eslint-disable-next-line no-console
	console.error('See report: governance/make-lint/lint-report.json');
	process.exit(1);
}

await main();
