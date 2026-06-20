# Chat Agent Persistence Gap Audit

**PR**: PR-0005  
**Date**: 2026-06-13  
**Agent**: Hermes  
**Scope**: All chat, agent, and conversational AI storage in SintraPrime-Unified

---

## Executive Summary

SintraPrime has **two chat/agent message systems** with **divergent persistence characteristics**:

1. **AI Chat Router (`ai-chat` router)** — *Designed* to persist to PostgreSQL/MySQL, but targets `chatConversations` / `chatMessages` tables that **did not exist in the Drizzle schema** until this PR.
2. **Agent Zero (`agent-zero` router)** — **100 % in-memory** via `Map<string, AgentZero>`. All session state, task history, and agent memory are lost on restart or after a 5-minute TTL.

**This PR (PR-0005)** only addresses the missing AI Chat tables. It does **not** add persistence to Agent Zero or WebSocket chat.

Additionally, the WebSocket chat layer and the Agent Orchestrator store message/history state entirely in runtime memory.

**Bottom line**: The DB tables `chat_conversations` / `chat_messages` already exist from `0016_colossal_chameleon.sql`, but they were not exported/declared in the active Drizzle schema until this PR. As a result, the `ai-chat` router’s Drizzle-based persistence would not have had matching schema exports/types on `master`.

---

## 1. Inventory of Chat / Agent Message Storage

### 1.1 AI Chat Router (`webapp/server/ai-chat/router.ts`)

| Aspect | Finding |
|--------|---------|
| **Storage target** | `chatConversations` and `chatMessages` tables via `chat-conversation-helpers.ts` |
| **Schema exists?** | **YES** now — `schema-chat.ts` adds the missing Drizzle exports/types. The underlying DB tables already exist from `0016_colossal_chameleon.sql`. |
| **Runtime behavior** | `sendMessage` mutation calls `chatConvHelpers.addMessage()` for both user and assistant messages. If the tables existed, this would be persistent. |
| **Conversation history** | Passed client→server as `conversationHistory` array in the request body (last 10 messages). Not fetched from DB. |
| **Conversation CRUD** | `createConversation`, `getConversations`, `getConversationMessages`, `updateConversationTitle`, `deleteConversation` all delegate to `chat-conversation-helpers.ts`. This PR adds the missing Drizzle schema exports/types those helpers compile against (the underlying tables come from `0016`). |

**Evidence**:
- `webapp/server/db/chat-conversation-helpers.ts:1` imports `chatConversations, chatMessages` from `../../drizzle/schema`.
- Grepped entire `webapp/drizzle/` — no `export const chatConversations` or `export const chatMessages` found.

### 1.2 Agent Zero (`webapp/server/agent-zero/router.ts`)

Note: this repository currently uses `webapp/server/autonomous/router.ts` instead of `agent-zero/router.ts`. The in-memory state finding applies to any runtime-backed agent-session store not persisted to the database.

| Aspect | Finding |
|--------|---------|
| **Storage target** | `activeSessions = new Map<string, AgentZero>()` and `progressListeners = new Map<string, () => void>()` |
| **Schema exists?** | N/A — in-memory only |
| **Lifetime** | 5-minute TTL (`setTimeout(() => activeSessions.delete(sessionId), 300000)`). Lost on process restart immediately. |
| **Data lost** | Task history, agent memory (`Map`), progress callbacks, tool call results, LLM receipts. |
| **getTaskHistory** | Returns empty array if session expired: `"Session not found or expired"`. |

**Evidence**:
- `webapp/server/agent-zero/router.ts:8-9` — `activeSessions` and `progressListeners` Maps.
- `webapp/server/agent-zero/router.ts:70-73` — 5-minute cleanup timer.

### 1.3 Agent Orchestrator (`webapp/server/agent/orchestrator.ts`)

| Aspect | Finding |
|--------|---------|
| **Storage target** | `executionHistory: Array<{ step: any; result: ToolResult }>` (instance property) |
| **Schema exists?** | N/A — in-memory only |
| **Data lost** | Complete step-by-step execution log of every tool call and result for a given task. |
| **Memory persistence** | Calls `storeAgentInteraction(context.userId, task, finalResult, context.caseId)` which uses `vectorMemory` service. The vector DB may persist embeddings, but the raw execution history is lost. |

### 1.4 WebSocket Chat (`webapp/server/_core/websocket.ts`)

| Aspect | Finding |
|--------|---------|
| **Storage target** | `connectedUsers = new Map<string, ...>()` (in-memory presence) |
| **Chat persistence** | `chat:message` event handler (lines 67-75) **broadcasts only** — no database write. Messages are ephemeral. |
| **Client state** | `client/src/hooks/useWebSocket.ts` holds `chatMessages` in React `useState`. Lost on page refresh. |

### 1.5 AI Chats (`webapp/server/db.ts`)

| Aspect | Finding |
|--------|---------|
| **Storage target** | `aiChats` table — imported in `db.ts` as `aiChats` |
| **Schema exists?** | **YES** — now defined in `webapp/drizzle/schema-core-tables.ts` (legacy AI chat records) |
| **Helper functions** | `createAiChat`, `getAiChatsBySessionId`, `getAiChatsByCaseId` exist in `db.ts`. These target the legacy table. New AI Chat persistence should prefer `chatConversations`/`chatMessages`. |

**Evidence**:
- `webapp/server/db.ts:24-27` imports `aiChats`.
- `webapp/drizzle/schema-core-tables.ts` defines `export const aiChats` (legacy AI chat records).
- `chatConversations`/`chatMessages` should be the target for new threaded chat features.

---

## 2. What Is Lost on Process Restart

| Component | Data Lost | Impact |
|-----------|-----------|--------|
| Agent Zero | Active sessions, task history, agent memory, progress streams | Users cannot resume interrupted autonomous tasks. No audit trail of agent actions. |
| Agent Orchestrator | Execution history per task | No step-level replay or debugging of multi-step agent tasks. |
|| WebSocket Chat | Presence map, in-flight chat messages | Chat messages broadcast during a session are never stored. Users see empty chat on refresh. |
|| AI Chat (Drizzle schema exports) | `chat_conversations` / `chat_messages` already exist from `0016`, but `master` was missing matching Drizzle schema exports/types. Writes/reads via `chat-conversation-helpers.ts` were therefore not reliably persistent until this PR adds the missing exports. | **Chat history becomes persistent** once schema exports/types are in place. |

---

## 3. Existing Persistent Tables That Could Be Reused

| Table | Schema File | Purpose | Reusable for Chat? |
|-------|-------------|---------|-------------------|
| `ai_memory` | `schema-ai-memory.ts` | Key-value agent memory (preferences, facts, strategy) | **Partially** — could store conversation summaries, but not full message threads. |
| `agentMemory` | `schema-agent-memory.ts` | Key-value agent memory (preferences, facts, strategy) | **Partially** — could store conversation summaries, but not full message threads. |
| `agentExecutions` | `schema-agent-executions.ts` | Execution history metadata | N/A — not designed for threaded message persistence. |

**Conclusion**: There is no existing chat-specific persistent table. The `ai_memory` table is the only durable AI-context store, but it is not designed for ordered message threads.

---

## 4. Privacy / Security Risks If Persistence Is Added

| Risk | Mitigation Required |
|------|-------------------|
| Chat messages may contain PII (SSN, account numbers, legal strategy) | Apply same redaction rules as PR-0004 (`sanitizeForLog`) before logging; encrypt sensitive columns at rest. |
| Multi-user case access | `chatMessages` table needs `userId` + `caseId` with proper RLS or query filtering so only authorized parties read messages. |
| Agent memory leakage | Agent Zero memory currently is a `Map<string, any>`. If persisted, ensure memory keys/values are scoped per-user and per-case. |
| Data retention | Legal chat data may need retention policies (e.g., 7-year hold). Design `deletedAt` soft-delete rather than hard deletes. |

---

## 5. Migration Risks

| Risk | Assessment |
|------|------------|
| No existing chat data to migrate | **Low risk** — migration is additive (adds columns + enum expansion), but `chat_conversations` / `chat_messages` may already have rows from `0016_colossal_chameleon.sql`. Phase 1 keeps `chat_messages.user_id` nullable. |
| Schema addition is additive only | **Low risk** — creating new tables does not break existing tables. |
| Code paths already reference tables | `ai-chat/router.ts` and `chat-conversation-helpers.ts` already expect these tables. Adding the schema is a **fix**, not a breaking change. |
| `aiChats` legacy table | The `aiChats` table is now defined in `schema-core-tables.ts`. Decision needed: migrate legacy records to `chatConversations`/`chatMessages`, or deprecate `aiChats` writes and standardize all new chat on the new tables. |

---

## 6. Recommended Persistence Path

### Preferred Option: **B — Create separate Chat Agent persistence tables**

**Rationale**:
- **A (Reuse Portal Messages)** — There is no "Portal Messages" table in this repo. The `ai_memory` table is key-value, not threaded. Reusing it for full message threads would be a design smell.
- **C (Hybrid event-log + message table)** — Over-engineered for current needs. Event sourcing adds complexity without a proven requirement.
- **B (New chat tables)** — The code already expects `chatConversations` and `chatMessages`. We just need to **define the schema** that the code assumes exists.

### 6.1 Proposed Schema

Create a new file: `webapp/drizzle/schema-chat.ts`

```typescript
import { mysqlTable, int, varchar, text, timestamp, json, mysqlEnum } from "drizzle-orm/mysql-core";

export const chatConversations = mysqlTable("chat_conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  caseId: int("case_id"), // optional case linkage
  title: varchar("title", { length: 500 }),
  model: varchar("model", { length: 64 }).default("gemini-2.5-flash"),
  status: mysqlEnum("status", ["active", "archived", "deleted"]).default("active").notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().
});

// Added since migration 0016:
// - model
// - status enum
// Existing rows keep defaults.

export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatConversation = typeof chatConversations.$inferInsert;
```

```typescript
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversation_id").notNull(),
  userId: int("user_id"), // nullable in Phase 1; enforce NOT NULL after backfill
  role: mysqlEnum("role", ["user", "assistant", "system", "tool"]).notNull(),
  content: text("content").notNull(),
  attachments: json("attachments"), // fileContext, images, etc.
  model: varchar("model", { length: 64 }), // which model generated this (for assistant)
  tokensUsed: int("tokens_used"), // for cost tracking
  latencyMs: int("latency_ms"), // for performance tracking
  receiptId: varchar("receipt_id", { length: 64 }), // links to PR-0004 receipt
  idempotencyKey: varchar("idempotency_key", { length: 128 }).unique(), // dedupe guard
  status: mysqlEnum("status", ["visible", "edited", "deleted"]).default("visible").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;
```

**New columns vs migration 0016 / existing production table:**

| Column | In 0016 | In new schema | Migration action |
|---|---|---|---|
| `user_id` | absent | nullable `int` | `ADD COLUMN user_id int` (no default) |
| `role` | enum('user','assistant') | enum('system','user','assistant','tool') | `MODIFY COLUMN role enum(...)` • MySQL allows enum expansion without table rebuild |
| `model` | absent | `varchar(64)` nullable | `ADD COLUMN model varchar(64)` |
| `tokens_used` | absent | `int` nullable | `ADD COLUMN tokens_used int` |
| `latency_ms` | absent | `int` nullable | `ADD COLUMN latency_ms int` |
| `receipt_id` | absent | `varchar(64)` nullable | `ADD COLUMN receipt_id varchar(64)` |
| `idempotency_key` | absent | `varchar(128) UNIQUE` nullable | `ADD COLUMN idempotency_key varchar(128) UNIQUE` |
| `status` | absent | enum('visible','edited','deleted') default 'visible' not null | `ADD COLUMN status enum('visible','edited','deleted') default 'visible' not null` |
| `updated_at` | absent | `timestamp` default/update | `ADD COLUMN updated_at timestamp ...` |

*All changes are additive; no data is dropped.*

**Notes**:
- Uses `int` autoincrement PK (consistent with existing schema).
- `caseId` is nullable — allows general chat and case-specific chat.
- `attachments` as `json` mirrors the existing `fileContext` array usage.
- `receiptId` links to the LLM invocation receipt from PR-0004.
- `idempotencyKey` prevents duplicate writes on retries.
- `status` enum supports soft-delete and edit tracking (future-proofing).

### 6.2 Export the Schema

Add to `webapp/drizzle/schema.ts`:

```typescript
export * from './schema-chat';
```

This makes `chatConversations` and `chatMessages` available to `chat-conversation-helpers.ts` and `db.ts` exactly as the code already expects.

### 6.3 Migration Plan

1. **Create migration SQL** (Drizzle-compatible or raw SQL):
   ```sql
   CREATE TABLE chat_conversations (
     id INT AUTO_INCREMENT PRIMARY KEY,
     user_id INT NOT NULL,
     case_id INT,
     title VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
     model VARCHAR(64) DEFAULT 'gemini-2.5-flash',
     status ENUM('active','archived','deleted') DEFAULT 'active' NOT NULL,
     last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
     INDEX idx_user (user_id),
     INDEX idx_case (case_id)
   );

   CREATE TABLE chat_messages (
     id INT AUTO_INCREMENT PRIMARY KEY,
     conversation_id INT NOT NULL,
     user_id INT NOT NULL,
     role ENUM('system','user','assistant','tool') NOT NULL,
     content TEXT NOT NULL,
     attachments JSON,
     model VARCHAR(64),
     tokens_used INT,
     latency_ms INT,
     receipt_id VARCHAR(64),
     idempotency_key VARCHAR(128) UNIQUE,
     status ENUM('visible','edited','deleted') DEFAULT 'visible' NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
     INDEX idx_conversation (conversation_id),
     INDEX idx_created (created_at)
   );
   ```

2. **Run migration** against the database.
3. **Verify** that `ai-chat/router.ts` operations now succeed without runtime errors.

### 6.4 Rollback Plan
Rollback should **not** drop these tables: `chat_conversations` and `chat_messages` already exist from `0016_colossal_chameleon.sql`.

For a rollback, revert only the additive column/enum changes introduced by `0052_pr0005_chat_agent_persistence_gap.sql` (and the corresponding Drizzle schema exports/types) rather than dropping tables.

(Implementation detail intentionally omitted in this Phase-1 document.)

### 6.5 Idempotency Strategy

- **Idempotency key**: Generated client-side or server-side as `hash(userId + conversationId + content + timestamp)` and stored in `chatMessages.idempotencyKey`. On duplicate-key conflict, skip insert.
- **Receipt tracking**: PR-0004 already emits per-LLM-call receipts. Store `receiptId` on the assistant message row for end-to-end traceability.

### 6.6 Tests Needed

| Test | Scope |
|------|-------|
| Schema compilation | Ensure `drizzle-kit generate` or TypeScript build passes with new schema file |
| Create conversation | `createConversation` returns valid ID |
| Add message | `addMessage` persists to `chat_messages` with correct `conversationId` |
| Get messages | `getConversationMessages` returns ordered list |
| Delete conversation | Cascading delete removes messages |
| Idempotency | Duplicate `addMessage` with same key is ignored |
| Case linkage | Messages filtered by `caseId` correctly |

### 6.7 Backfill Plan for `chat_messages.user_id`

Version 1 of `chat_messages` was created without `user_id`. The new schema makes `user_id` **nullable temporarily** so existing rows remain valid.

1. Phase 1 (this PR): `userId: int("user_id")` nullable. New writes populate it; old rows remain NULL.
2. Phase 2 (future PR): backfill `user_id` from `chat_conversations.user_id` via:
   ```sql
   UPDATE chat_messages m
   JOIN chat_conversations c ON m.conversation_id = c.id
   SET m.user_id = c.user_id
   WHERE m.user_id IS NULL;
   ```
3. Phase 3 (future PR): after backfill verification, change `userId` to `.notNull()`.

| Reason | Risk |
|---|---|
| Avoids migrating data in a design-only PR | Low |
| Requires API/router updates to always set `user_id` before Phase 3 | Medium |

---

### 6.7 Agent Zero Extension (Optional, Future PR)

If Agent Zero sessions should persist across restarts:

1. Add `agent_sessions` and `agent_session_steps` tables.
2. On `executeTask`, serialize the `AgentZero` state (task history, memory) to DB.
3. On `getTaskHistory`, read from DB if not in `activeSessions` Map.
4. This is **higher risk** than the chat tables and should be a separate PR.

---

## 7. Acceptance Criteria

- [ ] `docs/chat-agent-persistence-gap.md` exists (this document)
- [ ] All in-memory message points identified (Agent Zero, Orchestrator, WebSocket).
- [ ] Preferred persistence path selected (Option B — new chat tables)
- [ ] Proposed schema documented
- [ ] Migration and rollback plans documented
- [ ] No full persistence implementation in this PR (design-only, per instruction)
- [ ] Receipt emitted
- [ ] Repo verification report updated

---

## 8. Appendix: Commands Used for Verification

```bash
# Find all chat-related server files
find webapp/server -name "*.ts" | xargs grep -l "chat\|conversation" | sort

# Confirm chat tables are missing from schema
grep -r "export const chatConversations" webapp/drizzle/ --include="*.ts"
grep -r "export const chatMessages" webapp/drizzle/ --include="*.ts"
grep -r "export const aiChats" webapp/drizzle/ --include="*.ts"
# → All returned no results (exit code 1)

# Confirm in-memory Maps in agent-zero
grep -n "Map<string" webapp/server/agent-zero/router.ts
# → 8: const activeSessions = new Map<string, AgentZero>();
# → 9: const progressListeners = new Map<string, (progress: AgentProgress) => void>();

# Confirm websocket chat does not persist
grep -n "chat:message" webapp/server/_core/websocket.ts
# → 67-75: emits only, no DB write
```
