---
sidebar_position: 2
title: Installation
description: Prerequisites and step-by-step installation guide for SintraPrime on macOS, Linux, and Windows.
---

# Installation

This guide covers installing SintraPrime on your local machine or server. SintraPrime supports two deployment paths: **Docker** (recommended for production) and **local development**.

## Prerequisites

### Required Software

| Software | Minimum Version | Purpose |
|:---|:---|:---|
| **Node.js** | 20.x LTS | Runtime for SintraPrime core |
| **npm** | 10.x | Package management |
| **Git** | 2.30+ | Source control |
| **Docker** | 24.x | Container deployment (production) |
| **Docker Compose** | 2.20+ | Multi-service orchestration |

### System Requirements

| Resource | Development | Production |
|:---|:---|:---|
| **CPU** | 2 cores | 4+ cores |
| **RAM** | 4 GB | 8+ GB |
| **Disk** | 10 GB | 50+ GB |
| **OS** | macOS, Linux, Windows (WSL2) | Linux (Ubuntu 22.04+ recommended) |

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/ihoward40/SintraPrime.git
cd SintraPrime
```

### 2. Choose Your Path

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="docker" label="Docker (Recommended)" default>

```bash
# Copy the Docker environment template
cp .env.example .env.docker

# Edit the environment file with your API keys
nano .env.docker

# Start all services
docker-compose -f docker-compose.full.yml up -d
```

See the [Docker Quick Start](./quick-start-docker) for detailed instructions.

</TabItem>
<TabItem value="local" label="Local Development">

```bash
# Install dependencies
npm install

# Copy the environment template
cp .env.example .env

# Edit the environment file
nano .env

# Build the project
npm run build

# Start in development mode
npm run dev
```

See the [Local Quick Start](./quick-start-local) for detailed instructions.

</TabItem>
</Tabs>

### 3. Configure Environment Variables

The `.env` file controls all SintraPrime configuration. At minimum, you need:

```bash
# Required: At least one AI provider
OPENAI_API_KEY=sk-...
# or
ANTHROPIC_API_KEY=sk-ant-...

# Required for adapters you plan to use
GMAIL_CLIENT_ID=...
NOTION_API_KEY=...
SLACK_BOT_TOKEN=xoxb-...
```

See the [Configuration Reference](./configuration) for all available variables.

### 4. Verify Installation

```bash
# Docker: Check service health
docker-compose -f docker-compose.full.yml ps

# Local: Run the test suite
npm test

# Both: Verify the agent engine
npx sintraprime --version
```

:::tip Platform-Specific Notes
**macOS**: Ensure Docker Desktop is running and has sufficient memory allocated (8 GB recommended).

**Windows**: Use WSL2 with Ubuntu 22.04. Native Windows is not supported for production deployments.

**Linux**: Ensure your user is in the `docker` group: `sudo usermod -aG docker $USER`
:::

## Next Steps

- [Quick Start (Docker)](./quick-start-docker) — Get running in 5 minutes
- [Quick Start (Local)](./quick-start-local) — Set up a development environment
- [Configuration Reference](./configuration) — Complete `.env` variable reference
