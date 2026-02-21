---
sidebar_position: 4
title: Quick Start (Local)
description: Set up SintraPrime for local development with Node.js.
---

# Quick Start — Local Development

This guide walks you through setting up SintraPrime for local development, running the agent engine, and executing your first workflow.

## Step 1: Install Dependencies

```bash
git clone https://github.com/ihoward40/SintraPrime.git
cd SintraPrime
npm install
```

## Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash title=".env"
# AI Provider
OPENAI_API_KEY=sk-your-key-here

# Local development settings
NODE_ENV=development
LOG_LEVEL=debug

# Governance
GOVERNANCE_MODE=SINGLE_RUN_APPROVED
RECEIPT_SIGNING=enabled
```

## Step 3: Build and Start

```bash
# Build TypeScript
npm run build

# Start in development mode (with hot reload)
npm run dev
```

## Step 4: Use the Agent-Mode CLI

SintraPrime includes an interactive CLI for agent operations:

```bash
# Start the agent-mode REPL
npx sintraprime agent

# Or run a single command
npx sintraprime run "Summarize the latest governance receipts"
```

### Available CLI Commands

| Command | Description |
|:---|:---|
| `/run <task>` | Execute a task through the Validator → Planner → Executor pipeline |
| `/plan <task>` | Generate an execution plan without running it |
| `/status` | Show current system status and active tasks |
| `/logs` | Display recent operation logs |
| `/config` | View current configuration |
| `/validate-batch <file>` | Validate a batch of tasks from a JSON file |
| `/build-batch <file>` | Execute a batch of tasks |

### Example Session

```bash
$ npx sintraprime agent
SintraPrime Agent Mode v2.0.0
Governance: SINGLE_RUN_APPROVED | Receipts: ENABLED

> /run Send a test email via Gmail adapter
[Validator] ✓ Task validated against policy gates
[Planner]   ✓ Plan generated: 1 step, 1 adapter (gmail)
[Executor]  ✓ Email sent successfully
[Receipt]   ✓ Receipt generated: rcpt_a1b2c3d4.json

> /status
Active tasks: 0
Receipts today: 1
Governance mode: SINGLE_RUN_APPROVED
```

## Step 5: Run a Workflow

Create a sample workflow file:

```yaml title="workflows/hello-world.yml"
name: hello-world
version: "1.0"
trigger:
  type: manual
steps:
  - id: greet
    adapter: shell
    action: echo
    params:
      message: "Hello from SintraPrime!"
  - id: log
    adapter: receipt
    action: generate
    params:
      summary: "Hello world workflow completed"
```

Execute it:

```bash
npx sintraprime workflow run workflows/hello-world.yml
```

## Step 6: Run Tests

```bash
# Run the full test suite
npm test

# Run specific test categories
npm run test:governance
npm run test:adapters
npm run test:agents
```

:::info Development Tools
SintraPrime includes several development utilities in the `scripts/` directory:
- `scripts/mock-server.js` — Mock external services for testing
- `scripts/smoke-webhook-dual.js` — Test webhook endpoints
- `test-build.js` — Verify build integrity
:::

## Project Structure

```
SintraPrime/
├── src/                    # Main source code
│   ├── core/              # Orchestrator, planner, executor
│   ├── agents/            # Agent implementations
│   ├── browser/           # Playwright browser automation
│   ├── cli/               # CLI implementation
│   ├── llm/               # LLM provider integrations
│   ├── skills/            # Kilo skills system
│   └── tools/             # Utility tools
├── governance/            # Governance keys and policies
├── airlock_server/        # ManusLite Gateway
├── deepthink/             # Analysis runner
├── webapp/                # Operator dashboard
├── config/                # Configuration files
├── receipts/              # Generated receipts
└── docs/                  # Documentation
```

## Next Steps

- [Architecture Overview](../core-concepts/architecture-overview) — Understand the system design
- [Agent Mode Engine](../core-concepts/agent-mode-engine) — Deep dive into the execution pipeline
- [Workflow Runner](../core-concepts/workflow-runner) — Write complex workflows
- [Contributing Guide](../contributing/guide) — Start contributing to SintraPrime
