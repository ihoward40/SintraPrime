import { mysqlTable, varchar, text, timestamp, json, int, boolean, date } from 'drizzle-orm/mysql-core';

export const timelineEvents = mysqlTable('timeline_events', {
  id: int('id').primaryKey().autoincrement(),
  caseId: int('case_id').notNull(),
  userId: int('user_id').notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  eventDate: date('event_date').notNull(), // The actual date of the event
  eventTime: varchar('event_time', { length: 20 }), // Optional time (HH:MM format)
  eventType: varchar('event_type', { length: 100 }).notNull(), // filing, hearing, discovery, correspondence, etc.
  category: varchar('category', { length: 100 }), // Custom categorization
  importance: varchar('importance', { length: 50 }).default('medium').notNull(), // low, medium, high, critical
  linkedDocumentIds: json('linked_document_ids').$type<number[]>(), // Link to documents
  linkedEvidenceIds: json('linked_evidence_ids').$type<number[]>(), // Link to evidence
  linkedPartyIds: json('linked_party_ids').$type<number[]>(), // Link to parties involved
  location: varchar('location', { length: 300 }), // Court, office, etc.
  outcome: text('outcome'), // Result or outcome of the event
  notes: text('notes'), // Additional notes
  color: varchar('color', { length: 20 }).default('#00d4ff'), // Hex color for visualization
  icon: varchar('icon', { length: 50 }), // Icon identifier for UI
  position: int('position').default(0), // Order in timeline
  metadata: json('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const narratives = mysqlTable('narratives', {
  id: int('id').primaryKey().autoincrement(),
  caseId: int('case_id').notNull(),
  userId: int('user_id').notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull(), // Generated narrative text
  narrativeType: varchar('narrative_type', { length: 100 }).notNull(), // chronological, thematic, legal_argument
  template: varchar('template', { length: 100 }), // Template used for generation
  timelineEventIds: json('timeline_event_ids').$type<number[]>(), // Events included in narrative
  generatedBy: varchar('generated_by', { length: 50 }).default('ai').notNull(), // ai, manual, hybrid
  isPublished: boolean('is_published').default(false).notNull(),
  publishedAt: timestamp('published_at'),
  metadata: json('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});
