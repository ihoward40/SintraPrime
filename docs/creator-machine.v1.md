# Creator Machine v1 (2026)

A tight, repeatable system designed to be runnable by a tired human.

Loop: **Voice → System → Output → Asset**

---

### 🔐 GOVERNANCE DECISION — EMAIL PROTOCOL LOCK

**Decision:** Lock the winning email pattern as the Default Email Sub-Protocol
**Effective Version:** Creator Machine v1.1
**Scope:** Email assets only
**Rationale:** Repeated revenue signal under consistent structure

**Constraints:**
- Structure is frozen for 14 days
- Scope remains single-domain during this cycle
- No concurrent structural + domain changes permitted

---

---

## STEP 1 — Build the 5 Notion Databases (Exact Specs)

Create these as **full-page databases** (not inline).

### Database 1: INBOX — Raw Captures

Purpose: everything lands here. No judgment.

**Properties**
- Title: `Capture`
- Date: `Captured At`
- Select: `Source` (Voice, Text, Link, Comment)
- Select: `Energy` (Low, Medium, High)
- Checkbox: `Processed`

**Rule**
- Nothing leaves until `Processed = true`.

---

### Database 2: IDEAS VAULT — Distilled Thinking

Purpose: noise → signal.

**Properties**
- Title: `Idea`
- Multi-select: `Theme` (Education, Money, Systems, Story, Proof)
- Select: `Stage` (Raw, Clear, Ready)
- Relation: `Linked Capture` → INBOX — Raw Captures
- Number: `Reuse Count`

**Notion AI Button (create once)**
- See prompt: `prompts/creator-machine/notion-ai-distill.md`

---

### Database 3: CONTENT FACTORY — One Idea, Many Outputs

Purpose: leverage. One idea becomes multiple formats.

**Properties**
- Title: `Content Piece`
- Select: `Format` (Short, Long, Email, Post, Video)
- Relation: `Source Idea` → IDEAS VAULT — Distilled Thinking
- Select: `Status` (Draft, Ready, Published)
- URL: `Publish Link`

**Rule**
- Every idea gets **at least 2 formats** before it’s considered “used”.

**Email monetization awareness (Email entries only)**
- Add properties:
   - `Revenue Attribution` (Select: None, Lead Capture, Service Inquiry, Product Sale, Bundle / Upsell, Authority Only)
   - `Associated Offer` (Relation → REVENUE BOARD — Money Follows Attention)
   - `Revenue Signal` (Select: Not Observed, Weak, Moderate, Strong)
- Optional: `Experimental` (Checkbox)
- Rule: Every Email asset must be tagged with a `Revenue Attribution` value before it can be marked `Published`.

**Enforcement Button (default: Short + Email)**
- See prompt: `prompts/creator-machine/notion-ai-enforce-2-formats-email.md`

**Email Asset Quality (binding)**
- Pass/Fail checklist: `email-asset-quality.md`
- If any checklist item fails → keep `Status = Draft`.

**Default Email Sub-Protocol (binding)**
- `email-sub-protocol.default.md`
- All Email assets must conform to the Default Email Sub-Protocol unless explicitly marked `Experimental`.

**Optional alternate (Short + Long)**
- See prompt: `prompts/creator-machine/notion-ai-enforce-2-formats.md`

---

### Database 4: ASSETS LIBRARY — Reusable Parts

Purpose: stop recreating the same thing forever.

**Properties**
- Title: `Asset`
- Select: `Type` (Hook, Script, Visual, CTA)
- Relation: `Used In` → CONTENT FACTORY — One Idea, Many Outputs
- Multi-select: `Style` (Direct, Educational, Emotional)

---

### Database 5: REVENUE BOARD — Money Follows Attention

Purpose: no content without a path to money.

**Properties**
- Title: `Offer`
- Select: `Type` (Service, Product, Bundle)
- Number: `Price`
- Select: `Status` (Idea, Live, Retired)
- Relation: `Powered By Content` → CONTENT FACTORY — One Idea, Many Outputs

**Rule**
- If content never connects here, it’s a hobby.

---

## STEP 2 — Save 3 Poppy AI Workflows (Non-Negotiable)

Save these as named workflows so you never re-prompt.

See full prompt pack: `prompts/creator-machine/poppy-workflows.md`

Workflows:
1. **Short-Form Script Engine**
2. **Long-Form Authority Builder**
3. **Monetization Translator**

---

## STEP 3 — The 90-Minute Daily Loop (14-Day Contract)

Same time. Same order. No debate.

### 30 min — Capture
- Whisper ideas out loud
- Dump into INBOX — Raw Captures
- No editing. Ever.

### 30 min — Distill
- Process INBOX → IDEAS VAULT
- Use the Notion AI button
- Promote 1 idea to `Stage = Ready`

### 20 min — Build
- Run Poppy Workflow #1 or #2
- Create at least one publishable content piece in CONTENT FACTORY

### 10 min — Visual / Finalize
- Create at least one asset in ASSETS LIBRARY
- Mark the content piece `Status = Ready`

### Rule
- If you miss a day, you **do not double up**.
- You continue the loop. Systems persist.

---

## STEP 4 — Monetize Before You Perfect

Sell **setup and execution**, not advice.

Examples:
- “I’ll build your Notion second brain.”
- “I’ll turn your voice notes into content.”
- “I’ll create AI thumbnails/scripts weekly.”

**Pricing Rule**
- One offer
- One price
- One outcome

---

## Notion Command Center — One-Page Dashboard (Exact Views)

Page name: **Command Center (Voice → System → Output)**

Create linked database views (one page). Use these names.

### Section: Capture
1. **Inbox — Unprocessed** (Table)
   - Database: INBOX — Raw Captures
   - Filter: `Processed` is unchecked
   - Sort: `Captured At` descending

2. **Inbox — Processed** (Table)
   - Database: INBOX — Raw Captures
   - Filter: `Processed` is checked
   - Sort: `Captured At` descending

### Section: Distilled Thinking
3. **Ideas Vault — Ready** (Table)
   - Database: IDEAS VAULT — Distilled Thinking
   - Filter: `Stage` is `Ready`
   - Sort: `Last edited time` descending

4. **Ideas Vault — Clear (Next Up)** (Table)
   - Database: IDEAS VAULT — Distilled Thinking
   - Filter: `Stage` is `Clear`
   - Sort: `Last edited time` descending

### Section: Production
5. **Content Factory — Drafting** (Board)
   - Database: CONTENT FACTORY — One Idea, Many Outputs
   - Group by: `Status`
   - Filter: `Status` is `Draft` or `Ready`

6. **Content Factory — Published** (Table)
   - Database: CONTENT FACTORY — One Idea, Many Outputs
   - Filter: `Status` is `Published`
   - Sort: `Last edited time` descending

### Section: Assets
7. **Assets Library — Unused** (Table)
   - Database: ASSETS LIBRARY — Reusable Parts
   - Filter: `Used In` is empty
   - Sort: `Last edited time` descending

8. **Assets Library — Gallery** (Gallery)
   - Database: ASSETS LIBRARY — Reusable Parts
   - Group by: `Type`

### Section: Revenue
9. **Revenue Board — Live** (Table)
   - Database: REVENUE BOARD — Money Follows Attention
   - Filter: `Status` is `Live`
   - Sort: `Price` descending

10. **Revenue Board — Ideas (Next)** (Table)
   - Database: REVENUE BOARD — Money Follows Attention
   - Filter: `Status` is `Idea`
   - Sort: `Last edited time` descending

---

### 🔒 FREEZE ORDER — v1.1

**Duration:** 14 consecutive days
**Applies To:**
- Email structure
- Prompts
- Workflows
- Database schemas

**Allowed During Freeze:**
- Daily execution
- Publishing
- Revenue tagging
- Evidence logging

**Prohibited During Freeze:**
- “Minor tweaks”
- “Quick improvements”
- “Just testing something”

If it feels wrong but produces signal, keep running it.

**Day-15 review ritual (run after the freeze, not during):**
- `docs/creator-machine.day15-review.v1.md`

**Pre-authorized clone (not executed during freeze):**
Domain cloning is permitted only after a frozen cycle and only when revenue intent divergence is evidenced.

**Rule (must keep):**
Never change structure and scope in the same cycle.

---

## 14-Day Operating Rules

For the next 14 days:
- You do not optimize
- You do not refactor
- You do not redesign
- You do not chase better

You execute:
- Capture daily
- Distill daily
- Produce Short + Email
- Tag revenue honestly

If something feels inefficient: good. That’s what data collection feels like.

---

## Amendment Log (v1.x)

No silent edits. Ever.

Template:
- Date:
- Evidence summary (1–2 lines):
- Exact rule change:
- Version bump:
- Next freeze window:
