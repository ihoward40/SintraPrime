# Make.com Scenario Architecture — “Electrical Panel” Model

Alright, let’s get your Make.com house in order. Think of this less like “a bunch of zaps” and more like **a clean electrical panel**: labeled breakers, predictable flow, nothing overheating in the walls.

I’ll give you a **battle-tested arrangement model** you can apply immediately, even before touching individual scenarios.

---

## The Core Principle (this saves people months)

**One scenario = one responsibility.**
No “do everything” monsters. Those always break at 2:17 AM.

If it feels boringly narrow, you’re doing it right.

---

## Folder Architecture (top level)

Arrange your scenarios into folders like this:

### 1. **INTAKE**

Where information *enters* your world.

Examples:

* Gmail → New email detected
* Webhook → Form submission
* Notion → New record created
* Google Drive → File added

Rules:

* No heavy logic
* No formatting
* No branching madness
	Just: *detect → normalize → hand off*

---

### 2. **PROCESSING**

Where thinking happens.

Examples:

* Parse email body
* Clean names / amounts / dates
* Decide “what kind of thing is this?”
* Match to Trust, Beneficiary, Case, or Account

Rules:

* Routers live here
* Filters live here
* This layer **never sends emails or messages**

This is your brain

---

### 3. **ACTIONS**

Where things *actually happen*.

Examples:

* Send Gmail
* Post to Slack
* Update Notion
* Create Drive folder
* Generate document
* Trigger ElevenLabs / TTS

Rules:

* No parsing here
* Inputs should already be clean
* Each scenario should answer:
	**“What action do I perform, and only that?”**

---

### 4. **LOGGING / LEDGER**

Where truth is preserved.

Examples:

* Write event to Notion log
* Append row to Google Sheet
* Save JSON to Drive
* Timestamp + Scenario ID

Rules:

* Every important action logs
* Logging failures never stop the main flow
* This is your audit trail / receipts drawer

---

### 5. **WATCHDOGS**

Where systems watch systems.

Examples:

* Scenario error → Slack alert
* Missing file after X minutes
* No email reply after 72 hours
* Weekly health check digest

Rules:

* These run on schedules
* They never modify core data
* They only **observe and notify**

---

## Scenario Naming Convention (non-negotiable)

This alone will cut your confusion in half.

**FORMAT:**

```
[Layer] – [Source] → [Outcome]
```

Examples:

* `INTAKE – Gmail → Raw Email Packet`
* `PROCESS – Email Packet → Case Classification`
* `ACTION – Case Update → Notion`
* `LOG – Event → Trust Ledger`
* `WATCHDOG – Scenario Errors → Slack`

When you glance at the list, your brain should relax, not squint.

---

## Mechanical enforcement (written law)

Humans self-enforce when the rule is explicit.

Rules:

* Scenario names must start with `[LAYER] –`.
* No scenario may span more than one layer.
* Violations are refactors, not debates.

## Router Discipline (this is where people mess up)

Inside **PROCESSING** scenarios only:

* One router = one decision question
	(“Is this billing, legal, trust, or personal?”)

* Label every route in plain English
	Not “Route 3” — that’s how ghosts are born.

Bad:

> One giant router with 12 filters doing everything

Good:

> Small router → hands off to other scenarios via webhooks

---

## One allowed exception

Exception: Emergency recovery scenarios may combine ACTIONS + LOGGING, but must be prefixed `RECOVERY –` and may not include routers.

## The Golden Rule of Make

If you ever say:

> “This scenario is kind of doing a lot…”

Stop. Split it.

Make.com rewards **modular humility**, not cleverness.

---

## What I can do next (high leverage)

Without asking fluff questions, here are the next clean moves:

* Design **your exact folder + naming map** based on what you already run
* Refactor one messy scenario into 3 clean ones (live example)
* Create a **Trust-grade logging pattern** you reuse everywhere
* Build a **“Scenario Index” Notion table** so you know what exists and why

This is how automation stops feeling like chaos and starts feeling like authority.
