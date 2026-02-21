---
sidebar_position: 1
title: Introduction
description: What is SintraPrime, who it's for, and why it matters for governed AI agent operations.
---

# Introduction to SintraPrime

**SintraPrime** is a multi-branch governance operating system for AI agents, built in Node.js/TypeScript and released under the Apache 2.0 license. It provides institution-grade evidence lifecycle management, cryptographic verification, and court-ready procedural memory for autonomous AI operations.

## What is SintraPrime?

SintraPrime is not a chatbot framework or a simple automation tool. It is a **governance-first operating system** that wraps every AI agent action in cryptographic receipts, policy gates, and immutable audit trails. Whether an agent sends an email, executes a shell command, or publishes content to social media, SintraPrime ensures that every operation is:

- **Authorized** — Policy gates enforce spending controls, approval workflows, and mode governance
- **Auditable** — Every operation generates an immutable receipt with SHA-256 hash chaining and Ed25519 signatures
- **Recoverable** — The receipt ledger provides a complete, verifiable history of all system activity
- **Court-Ready** — Evidence systems produce documentation that meets legal admissibility standards

## Who Is SintraPrime For?

| Audience | Use Case |
|:---|:---|
| **Developers** | Build governed AI agents with built-in compliance, receipts, and multi-platform adapters |
| **Enterprise Teams** | Deploy auditable AI automation with fail-closed governance and policy enforcement |
| **Trust Administrators** | Manage trust operations with the Howard Trust Navigator's 7-module specialized agent |
| **Compliance Officers** | Monitor AI operations with SentinelGuard, severity classification, and immutable audit trails |
| **Legal Teams** | Generate court-ready evidence binders with timeline builders and narrative generators |

## Key Capabilities

SintraPrime ships with **150+ integrated features** across **30 branches**, organized into these core systems:

### Agent Mode Engine
The Validator → Planner → Executor pipeline processes every task through validation, planning, and governed execution. Each step generates cryptographic receipts.

### Governed Adapters
Eight adapters provide receipt-backed access to external services: Gmail, Notion, Slack, Shell, Browser (Playwright), SMS, Voice, and Transcription.

### Evidence Systems
A complete evidence lifecycle chain including email ingest, web snapshots with diff detection, call/audio ingest, timeline builder, narrative generator, and court-ready binder assembly.

### Multi-Platform Bot Integration
ClawdBot, the self-hosted AI gateway, enables governed bot interactions across Telegram, Discord, Facebook, Instagram, WhatsApp, and TikTok.

### Kilo Skills System
An extensible skills framework with Make.com blueprint generation, GitHub productization, and CI badge honesty enforcement.

### Howard Trust Navigator
A specialized 7-module agent for trust administration, including credit enforcement, product factory, and marketing modules.

## Architecture at a Glance

SintraPrime runs as a multi-service Docker deployment:

| Service | Role |
|:---|:---|
| **Airlock** | ManusLite Gateway — secure entry point for all external payloads |
| **Brain** | Core orchestrator — agent engine, workflow runner, governance enforcement |
| **FastAPI** | Python API service for ML/AI integrations |
| **WebApp** | Operator dashboard and monitoring UI |
| **MySQL** | Persistent storage for receipts, evidence, and system state |

## Quick Links

- [Installation Guide](./installation) — Get SintraPrime running on your system
- [Quick Start (Docker)](./quick-start-docker) — Fastest path to a running instance
- [Architecture Overview](../core-concepts/architecture-overview) — Deep dive into system design
- [Governance Model](../core-concepts/governance-model) — Understand fail-closed governance
- [Agent System](../agents/overview) — Explore the multi-agent architecture

## Open Source

SintraPrime is fully open source under the **Apache 2.0 License**. The main repository is available at [github.com/ihoward40/SintraPrime](https://github.com/ihoward40/SintraPrime).

:::info System Version
**SintraPrime v2.0 + Kilo v1.0 (Unified)** — 150+ features, 30 branches, ~90% complete. Production-ready core systems.
:::
