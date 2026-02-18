# SintraPrime OS - Agent Handoff Script

**Last Updated:** February 17, 2026  
**Current Checkpoint:** `468f5246` (Sprint 82 Complete)  
**Project Path:** `/home/ubuntu/sintraprime`  
**Dev Server:** Running on port 3000  
**Database:** 119 tables (MySQL/TiDB via Drizzle ORM)

---

## 🎯 Project Overview

**SintraPrime OS** is a comprehensive legal warfare platform combining case management, workflow automation, AI agents, document processing, timeline building, and multi-channel ingest systems (email, audio, web monitoring). Built with React 19, Express 4, tRPC 11, Tailwind 4, and Drizzle ORM.

**Core Value Proposition:** Automate legal case workflows from evidence ingestion to strategic execution using AI-powered agents, real-time monitoring, and event-driven triggers.

---

## 📊 Current State (Sprint 82 Complete)

### ✅ Completed Systems (Last 3 Sprints)

**Sprint 78: Ingest System Integration**
- Email ingest → auto-case creation with legal keyword detection
- Audio ingest → Whisper API transcription + evidence linking
- Both systems integrated with case management and evidence chain of custody

**Sprint 79: Monitoring & Automation Infrastructure**
- Ingest Monitoring Dashboard (`/ingest-monitoring`) - real-time email/audio pipeline stats
- Web Monitoring Alerts UI (`/web-monitoring`) - court/regulatory website change detection
- Workflow Automation Triggers - keyword-based auto-execution from ingest events

**Sprint 80: Trigger Management & Analytics**
- Workflow Trigger Management UI (`/workflow-triggers`) - configure triggers with priority levels
- Make.com Integration Hub (`/integrations/make`) - webhook endpoints and scenario management
- Trigger Analytics Dashboard (`/trigger-analytics`) - fire rates, keyword leaderboards, success metrics

**Sprint 81: Testing & Performance**
- Trigger Testing Simulator (`/trigger-test`) - test keyword matching with sample data
- Trigger Performance Alerts - backend with 7 tRPC procedures, auto-notifications
- Make.com Framework - MCP activation instructions (awaiting user OAuth)

**Sprint 82: Alert Settings & History**
- Trigger Alert Settings UI (`/trigger-alert-settings`) - global/per-trigger thresholds
- Trigger Execution History Viewer (`/trigger-history`) - detailed logs with event snapshots
- Workflow Builder trigger linking - "Manage Triggers" button integration

### 🗂️ Database Schema (119 Tables)

**Core Tables:**
- `cases` - Legal case records
- `evidence` - Evidence chain of custody
- `workflows` - Workflow definitions
- `workflow_triggers` - Trigger configurations
- `trigger_executions` - Execution history
- `trigger_performance_alerts` - Alert instances
- `trigger_alert_config` - Alert thresholds
- `email_ingests` - Email ingest records
- `audio_ingests` - Audio transcription records
- `web_monitoring_sites` - Monitored websites
- `web_monitoring_snapshots` - Website snapshots
- `web_monitoring_changes` - Detected changes

**Schema Files:**
- `/home/ubuntu/sintraprime/drizzle/schema.ts` - Main schema exports
- `/home/ubuntu/sintraprime/drizzle/schema-*.ts` - Feature-specific schemas

### 🔌 API Structure

**tRPC Routers:**
- `auth` - Manus OAuth authentication
- `cases` - Case CRUD operations
- `evidence` - Evidence management
- `workflows` - Workflow management
- `workflowTriggers` - Trigger CRUD + execution
- `triggerAlerts` - Alert configuration + metrics
- `ingest` - Email/audio ingest stats
- `webMonitoring` - Website monitoring CRUD

**Key Files:**
- `/home/ubuntu/sintraprime/server/routers.ts` - Main router registration
- `/home/ubuntu/sintraprime/server/routers/*.ts` - Feature routers
- `/home/ubuntu/sintraprime/server/db.ts` - Database query helpers

### 🎨 Frontend Pages (85+ Routes)

**Recent Additions:**
- `/ingest-monitoring` - IngestMonitoring.tsx
- `/web-monitoring` - WebMonitoring.tsx
- `/workflow-triggers` - WorkflowTriggers.tsx
- `/integrations/make` - MakeIntegration.tsx
- `/trigger-analytics` - TriggerAnalytics.tsx
- `/trigger-test` - TriggerTester.tsx
- `/trigger-alert-settings` - TriggerAlertSettings.tsx
- `/trigger-history` - TriggerExecutionHistory.tsx

**Core Pages:**
- `/dashboard` - Main intelligence dashboard
- `/cases/:id` - Case detail view
- `/workspace` - Quantum workspace
- `/timeline-builder` - TimelineBuilder.tsx
- `/agent-zero` - AgentZero.tsx (agent modes dashboard)

---

## 🚀 Sprint 83: Next Implementation Tasks

### Priority 1: Real-Time Trigger Dashboard (`/trigger-dashboard`)

**Goal:** Live monitoring of trigger fires, workflow executions, and automation pipeline

**Implementation Steps:**

1. **Create TriggerDashboard.tsx**
   ```tsx
   // Path: /home/ubuntu/sintraprime/client/src/pages/TriggerDashboard.tsx
   // Features:
   // - Live trigger fire feed (last 50 events, auto-refresh 5s)
   // - Active workflow execution queue with progress bars
   // - Trigger fire rate chart (last 24h, grouped by hour)
   // - Top 5 most-fired triggers with counts
   // - System health indicators (success rate, avg execution time)
   // - Filter by trigger type (email/audio/web)
   ```

2. **Add tRPC Procedures**
   ```typescript
   // Path: /home/ubuntu/sintraprime/server/routers/triggerDashboard.ts
   // Procedures:
   // - getLiveTriggerFeed: Get recent trigger executions with real-time data
   // - getActiveWorkflows: Get currently executing workflows
   // - getTriggerFireRates: Get hourly fire counts for last 24h
   // - getSystemHealth: Get success rate, avg execution time, error rate
   ```

3. **Register Router**
   ```typescript
   // In /home/ubuntu/sintraprime/server/routers.ts
   import triggerDashboard from './routers/triggerDashboard';
   // Add to appRouter: triggerDashboard: triggerDashboard,
   ```

4. **Add Route**
   ```typescript
   // In /home/ubuntu/sintraprime/client/src/App.tsx
   import TriggerDashboard from "./pages/TriggerDashboard";
   // Add route: <Route path={"/trigger-dashboard"} component={TriggerDashboard} />
   ```

### Priority 2: Trigger Condition Builder (Enhance `/workflow-triggers`)

**Goal:** Visual rule builder for complex trigger conditions

**Implementation Steps:**

1. **Create ConditionBuilder Component**
   ```tsx
   // Path: /home/ubuntu/sintraprime/client/src/components/ConditionBuilder.tsx
   // Features:
   // - AND/OR group builder with nested conditions
   // - Condition types: keyword_match, regex_match, field_equals, field_contains
   // - Field selectors (email.from, email.subject, audio.transcript, web.url)
   // - Operator selectors (contains, equals, matches, not_contains)
   // - Value inputs with validation
   // - Visual tree representation
   // - Test condition button (calls tRPC procedure to simulate)
   ```

2. **Update WorkflowTriggers.tsx**
   ```tsx
   // In /home/ubuntu/sintraprime/client/src/pages/WorkflowTriggers.tsx
   // Replace keyword input with ConditionBuilder component
   // Add "Simple Mode" / "Advanced Mode" toggle
   // Simple mode: current keyword tags
   // Advanced mode: ConditionBuilder with AND/OR logic
   ```

3. **Update Schema**
   ```typescript
   // In /home/ubuntu/sintraprime/drizzle/schema-workflow-triggers.ts
   // Add column: conditions: json('conditions').$type<TriggerCondition[]>()
   // Type: { type: 'AND' | 'OR', rules: Array<{field, operator, value}> }
   ```

4. **Update Trigger Matching Logic**
   ```typescript
   // In /home/ubuntu/sintraprime/server/routes/emailIngest.ts
   // In /home/ubuntu/sintraprime/server/routes/audioIngest.ts
   // Replace simple keyword matching with condition evaluation
   // Function: evaluateConditions(event, conditions) => boolean
   ```

### Priority 3: AI Performance Optimizer (`/trigger-optimizer`)

**Goal:** AI-powered suggestions for improving trigger performance

**Implementation Steps:**

1. **Create TriggerOptimizer.tsx**
   ```tsx
   // Path: /home/ubuntu/sintraprime/client/src/pages/TriggerOptimizer.tsx
   // Features:
   // - Select trigger to analyze
   // - Show execution history stats (success rate, avg time, fire frequency)
   // - "Analyze Trigger" button → calls AI analysis
   // - Display suggestions with confidence scores:
   //   * Keyword refinements (add/remove/replace keywords)
   //   * Threshold adjustments (execution time limits)
   //   * Workflow optimizations (remove bottleneck steps)
   // - "Apply Suggestion" button for each suggestion
   // - Before/after comparison preview
   ```

2. **Add AI Analysis Procedure**
   ```typescript
   // Path: /home/ubuntu/sintraprime/server/routers/triggerOptimizer.ts
   // Procedure: analyzeTrigger
   // 1. Fetch trigger execution history (last 100 executions)
   // 2. Calculate metrics: success rate, avg execution time, keyword hit rates
   // 3. Call invokeLLM with prompt:
   //    "Analyze this trigger's performance and suggest improvements..."
   //    Include execution history, matched/unmatched events, error patterns
   // 4. Parse AI response into structured suggestions
   // 5. Return: { suggestions: Array<{type, description, confidence, changes}> }
   ```

3. **Add Apply Suggestion Procedure**
   ```typescript
   // Procedure: applySuggestion
   // Input: { triggerId, suggestionType, changes }
   // Actions:
   // - Update trigger keywords/conditions
   // - Update alert thresholds
   // - Log optimization event
   // - Return updated trigger
   ```

4. **Register Router and Route**
   ```typescript
   // Add to routers.ts and App.tsx as in Priority 1
   ```

---

## 🔧 Development Workflow

### Starting Development

```bash
# Navigate to project
cd /home/ubuntu/sintraprime

# Check dev server status
pnpm dev  # Should already be running on port 3000

# Push database schema changes (if any)
pnpm db:push

# Run tests
pnpm test
```

### Making Changes

1. **Update todo.md** - Add new tasks before implementation
2. **Create/Edit Files** - Use file tool for all file operations
3. **Test Changes** - Check dev server output for errors
4. **Update todo.md** - Mark completed tasks with [x]
5. **Save Checkpoint** - Use webdev_save_checkpoint when feature complete

### TypeScript Errors

**Current Status:** 41 TypeScript errors (mostly schema-related, non-blocking)

**Known Issues:**
- `server/routers/workflowTriggers.ts(53,22)` - and() expects 2-3 arguments
- `server/routers/workflowTriggers.ts(108,22)` - and() expects 2-3 arguments
- Schema type mismatches in timeline/notebook features

**Fix Strategy:** These don't block functionality. Address when implementing related features.

---

## 📝 Code Patterns & Best Practices

### tRPC Procedure Pattern

```typescript
// In server/routers/featureName.ts
import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getDb } from '../db';

export default router({
  list: protectedProcedure
    .input(z.object({ filter: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      // Query logic here
      return results;
    }),
    
  create: protectedProcedure
    .input(z.object({ name: z.string(), /* ... */ }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      const [result] = await db.insert(tableName).values({
        userId: ctx.user.id,
        ...input,
        createdAt: new Date(),
      });
      
      return result;
    }),
});
```

### Frontend Page Pattern

```typescript
// In client/src/pages/FeatureName.tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function FeatureName() {
  const [filter, setFilter] = useState('');
  
  // Query
  const { data: items = [], isLoading } = trpc.feature.list.useQuery({ filter });
  
  // Mutation with optimistic update
  const utils = trpc.useUtils();
  const createMutation = trpc.feature.create.useMutation({
    onMutate: async (newItem) => {
      await utils.feature.list.cancel();
      const prev = utils.feature.list.getData();
      utils.feature.list.setData({ filter }, (old) => [...(old || []), newItem]);
      return { prev };
    },
    onError: (err, newItem, context) => {
      utils.feature.list.setData({ filter }, context?.prev);
      toast.error('Failed to create item');
    },
    onSuccess: () => {
      toast.success('Item created successfully');
    },
  });
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Feature Name</h1>
      {/* Content */}
    </div>
  );
}
```

### Database Query Pattern

```typescript
// In server/db.ts (if adding new helper)
export async function getFeatureItems(userId: number, filter?: string) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(tableName).where(eq(tableName.userId, userId));
  
  if (filter) {
    query = query.where(like(tableName.name, `%${filter}%`));
  }
  
  return query;
}
```

---

## 🗃️ Key File Locations

### Backend
- `/home/ubuntu/sintraprime/server/routers.ts` - Router registration
- `/home/ubuntu/sintraprime/server/routers/*.ts` - Feature routers
- `/home/ubuntu/sintraprime/server/db.ts` - Database helpers
- `/home/ubuntu/sintraprime/server/routes/*.ts` - Express routes (webhooks)
- `/home/ubuntu/sintraprime/drizzle/schema*.ts` - Database schemas

### Frontend
- `/home/ubuntu/sintraprime/client/src/App.tsx` - Route registration
- `/home/ubuntu/sintraprime/client/src/pages/*.tsx` - Page components
- `/home/ubuntu/sintraprime/client/src/components/*.tsx` - Reusable components
- `/home/ubuntu/sintraprime/client/src/lib/trpc.ts` - tRPC client setup

### Configuration
- `/home/ubuntu/sintraprime/package.json` - Dependencies
- `/home/ubuntu/sintraprime/todo.md` - Task tracking
- `/home/ubuntu/sintraprime/AGENT_HANDOFF.md` - This file

---

## 🔗 Integration Points

### Email Ingest Webhook
- **Endpoint:** `/api/email/ingest`
- **File:** `/home/ubuntu/sintraprime/server/routes/emailIngest.ts`
- **Triggers:** Checks `workflow_triggers` for keyword matches, auto-executes workflows
- **Returns:** `{ success, caseCreated, caseId, triggersExecuted }`

### Audio Ingest Webhook
- **Endpoint:** `/api/audio/ingest`
- **File:** `/home/ubuntu/sintraprime/server/routes/audioIngest.ts`
- **Process:** Upload to S3 → Whisper transcription → trigger check → workflow execution
- **Returns:** `{ success, transcription, caseCreated, caseId, evidenceId, triggersExecuted }`

### Web Monitoring (Cron Job)
- **File:** `/home/ubuntu/sintraprime/server/routes/webMonitoring.ts`
- **Schedule:** Runs every 30 minutes
- **Process:** Fetch site → compare snapshot → detect changes → create alerts
- **Triggers:** Checks for web_change_detected triggers

---

## 📦 Dependencies & Tools

### Core Stack
- **React 19** - UI framework
- **tRPC 11** - Type-safe API
- **Express 4** - HTTP server
- **Drizzle ORM** - Database ORM
- **Tailwind 4** - CSS framework
- **shadcn/ui** - Component library

### AI & Media
- **invokeLLM** - LLM integration (`server/_core/llm.ts`)
- **transcribeAudio** - Whisper API (`server/_core/voiceTranscription.ts`)
- **generateImage** - Image generation (`server/_core/imageGeneration.ts`)

### Storage
- **storagePut/storageGet** - S3 helpers (`server/storage.ts`)

### Authentication
- **Manus OAuth** - Pre-configured (`server/_core/oauth.ts`)
- **protectedProcedure** - Auth middleware

---

## ⚠️ Known Issues & Gotchas

1. **TypeScript Errors (41)** - Mostly schema-related, don't block functionality
2. **Make.com MCP** - Requires user OAuth, currently showing mock data
3. **Database Schema** - Some old tables have unused columns (safe to ignore)
4. **Trigger Matching** - Currently simple keyword matching, needs condition builder (Sprint 83 Priority 2)
5. **Real-Time Updates** - Currently polling (30s), consider WebSocket for live dashboard

---

## 🎯 Immediate Next Steps for Continuing Agent

1. **Read this file completely** to understand project state
2. **Check current checkpoint** - `manus-webdev://468f5246`
3. **Review todo.md** - See all pending tasks
4. **Start with Priority 1** - Real-Time Trigger Dashboard (highest user value)
5. **Follow code patterns** - Use examples in this document
6. **Update todo.md** - Mark tasks as you complete them
7. **Save checkpoints** - After each major feature completion

---

## 💡 Tips for Success

- **Use existing components** - Check `/client/src/components/ui/*` for shadcn components
- **Follow tRPC patterns** - All API calls use tRPC, no REST endpoints
- **Optimistic updates** - Use for better UX (see pattern above)
- **Toast notifications** - Use `toast.success/error` from 'sonner'
- **Database queries** - Always check `if (!db)` after `await getDb()`
- **Type safety** - Let TypeScript guide you, types flow end-to-end
- **Test frequently** - Check dev server output after each change

---

## 📞 User Context

**User:** Isiah Howard (isaiah@ikesolutions.org)  
**Urgency:** Almost out of credits, needs seamless handoff  
**Expectations:** Continue implementation without interruption  
**Communication Style:** Direct, technical, appreciates automation

---

## 🚨 Critical Reminders

1. **Always update todo.md** before and after implementation
2. **Save checkpoints** after completing features
3. **Check dev server** for errors after changes
4. **Use file tool** for all file operations (not shell cat/echo)
5. **Follow existing patterns** - consistency matters
6. **Test trigger matching** - use `/trigger-test` page
7. **Monitor performance** - check `/trigger-analytics` after changes

---

**End of Handoff Script**  
**Ready for continuation by next agent**  
**Good luck! 🚀**
