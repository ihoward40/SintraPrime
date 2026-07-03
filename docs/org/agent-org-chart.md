# SintraPrime Enterprise — Enterprise Governance Topology

*Formerly: Agent Organization Chart. Renamed per GOV-001-ADR-0002-R1 reviewer recommendation — this document defines authority flow, information flow, review flow, event flow, and accountability. It is richer than a traditional org chart.*

**Last Updated:** 2026-07-02 (v1.1 — renamed, Twin role clarified)  
**Source:** ChatGPT Founding Week Governance Session  
**Authority:** Isiah Howard (Founder)

---

## Org Structure

```
                        YOU (Isiah Howard)
                        Founder & CEO
                             │
                        Chief of Staff
                           Hermes
                    (Orchestrates, never executes)
                             │
        ┌────────────┬───────┴──────────┬────────────┐
        │            │                  │            │
   CIO         Operations          Creative      Production
  ChatGPT        Tasklet             Viktor         Manus
        │            │                  │            │
   QA Mirror    Infrastructure      Local Auto
     Twin        Space Agent         Agent Zero
```

---

## Department Roster

| Department | Lead Agent | Platform | Responsibilities |
|------------|-----------|----------|-----------------|
| Executive Office | Isiah Howard | — | Final decisions, vision |
| Chief of Staff | Hermes (Sintra) | Sintra AI | Orchestration, delegation, weekly reports, bottleneck detection |
| Chief Intelligence Officer | ChatGPT | OpenAI | Reasoning, architecture, legal analysis, conflict resolution, strategic review |
| Operations | Tasklet (Sintra) | Sintra AI / Make.com | Automations, APIs, databases, scheduling, webhooks |
| Creative | Viktor | Viktor AI | Marketing, branding, music, video, social media, TikTok |
| Production | Manus | Manus AI | Documents, presentations, websites, polished deliverables |
| Infrastructure | Space Agent | Sintra AI | Servers, Docker, GitHub, deployments, CI/CD |
| Local Automation | Agent Zero | Agent Zero | Windows filesystem, local AI, scripts, command execution |
| Independent Verification | Twin | SintraPrime Twin | *Not QA. Independent verification.* QA asks "Does it work?" — Twin asks "What did we miss?" |

---

## Communication Protocol

### Hermes' Primary Responsibilities
- Monitor every agent
- Detect duplicate work
- Balance workloads  
- Resolve conflicts
- Escalate blockers
- Assign new work autonomously
- Produce executive summaries
- Ensure no task falls through

> **Key principle:** Hermes manages work. Hermes does NOT perform work.

### Agent Collaboration Model

Instead of linear (You → Planner → Executor), SintraPrime uses a hub model:

```
Planner (Hermes)
     │
     ├────────────┐
     ▼            ▼
Research      Legal/CIO
(ChatGPT)    (ChatGPT)
     │            │
     └────┬───────┘
          ▼
   Evidence Manager
          │
   Devil's Advocate
          │
   Quality Control (Twin)
          │
   Memory (Notion)
          │
   Slack Report
```

### Event-Driven Communication

All agents publish structured events to Slack. No direct point-to-point calls.

Event format:
```
agent.action_completed
evidence.updated
research.completed
quality.failed
mission.started
mission.completed
```

---

## Slack Organization Structure

### Required Channels

| Channel | Purpose | Who Posts |
|---------|---------|-----------|
| #executive | High-priority decisions, approvals | Hermes, ChatGPT, Isiah |
| #operations | Tasklet, Space Agent, Agent Zero | Ops agents |
| #creative | Viktor, Manus | Creative agents |
| #legal | Hermes, ChatGPT | Legal/research work |
| #research | All agents | Research outputs |
| #receipts | Automatic only | Every task, API call, webhook, approval, failure |
| #memory | Lessons learned ONLY | No conversation — only knowledge entries |
| #alerts | Critical failures, security, API issues | Automated only |
| #mission-control | Mission started/completed/errors/approvals | Hermes |

### Existing SintraPrime Channels (Already Created)

| Channel | Status |
|---------|--------|
| #sintraprime-alerts | ✓ Active |
| #watchtower-briefs | ✓ Active |
| #tiktok-leads | ✓ Active |
| #verizon-watch | ✓ Active |
| #compliance | ✓ Active |
| #funding-alerts | ✓ Active |

---

## Daily Standup Protocol

Every morning each agent posts to their department channel:
```
Yesterday: [completed]
Today: [working on]
Blocked: [yes/no — describe]
Need help from: [agent name or none]
```

Hermes reads all standups and posts to #executive:
```
Company Health
  X agents online
  X blocked
  X missions completed
  X approvals waiting
Today's priorities: [list]
```

---

## Weekly Council (Every Monday)

Each agent submits:
- Accomplishments
- Failures
- Ideas
- Bottlenecks
- Automation opportunities
- Knowledge gained
- Confidence changes

Hermes produces: **Weekly State of SintraPrime**

---

## Institutional Memory Protocol

Every completed mission creates a memory entry:

```
Mission-ID:
Problem:
Solution:
Mistakes Made:
Time Required:
Files Used:
Authorities/Sources Used:
Confidence Score:
Success Score:
```

Before starting any new mission, agents query memory:
> "Have we solved this before?"

---

## Peer Review Protocol

Before anything reaches Isiah:

```
Agent Output
    ↓
Devil's Advocate (ChatGPT)
    ↓
Quality Control (Twin)
    ↓
Evidence Manager
    ↓
Hermes
    ↓
Slack Report to Isiah
```

---

## Governance Relationship

```
SintraPrime Enterprise (the platform)
    ↑ governed by
SintraPrime Governance Framework (the meta-system)
    ↑ defined by
Tier 1 Constitutional Artifacts
```

These are two separate assets that must remain conceptually distinct.
