import { mysqlTable, varchar, text, timestamp, json, int, boolean } from 'drizzle-orm/mysql-core';

export const audioRecordings = mysqlTable('audio_recordings', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  caseId: int('case_id'), // Optional: link to specific case
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  audioUrl: text('audio_url').notNull(), // S3 URL
  audioKey: varchar('audio_key', { length: 500 }).notNull(), // S3 key
  fileName: varchar('file_name', { length: 300 }),
  mimeType: varchar('mime_type', { length: 100 }),
  fileSize: int('file_size'), // bytes
  duration: int('duration'), // seconds
  transcriptionStatus: varchar('transcription_status', { length: 50 }).default('pending').notNull(), // pending, processing, completed, failed
  transcriptionText: text('transcription_text'),
  transcriptionLanguage: varchar('transcription_language', { length: 10 }),
  segments: json('segments').$type<Array<{
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avgLogprob: number;
    compressionRatio: number;
    noSpeechProb: number;
  }>>(),
  speakers: json('speakers').$type<Array<{
    id: string;
    name?: string;
    segments: number[]; // segment IDs
  }>>(),
  metadata: json('metadata').$type<Record<string, any>>(),
  recordedAt: timestamp('recorded_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const audioTranscriptSegments = mysqlTable('audio_transcript_segments', {
  id: int('id').primaryKey().autoincrement(),
  audioRecordingId: int('audio_recording_id').notNull(),
  segmentIndex: int('segment_index').notNull(),
  startTime: int('start_time').notNull(), // milliseconds
  endTime: int('end_time').notNull(), // milliseconds
  text: text('text').notNull(),
  speakerId: varchar('speaker_id', { length: 100 }),
  confidence: int('confidence'), // 0-100
  metadata: json('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow(),
});
