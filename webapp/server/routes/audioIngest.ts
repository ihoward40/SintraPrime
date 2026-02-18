import { Router } from 'express';
import { getDb } from '../db';
import { audioRecordings, cases, evidence, workflowTriggers, triggerExecutions, workflowExecutions, workflows } from '../../drizzle/schema';
import { storagePut } from '../storage';
import crypto from 'crypto';
import { transcribeAudio } from '../_core/voiceTranscription';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * Audio Ingest Webhook
 * POST /api/audio/ingest
 * 
 * Accepts audio files from external sources (Make.com, Zapier, etc.)
 * Uploads to S3, transcribes with Whisper API, and stores metadata
 * 
 * Expected payload:
 * {
 *   userId: number,
 *   caseId?: number,
 *   title: string,
 *   description?: string,
 *   audioBase64: string, // Base64-encoded audio file
 *   fileName: string,
 *   mimeType: string,
 *   recordedAt?: string // ISO 8601 timestamp
 * }
 */
router.post('/ingest', async (req, res) => {
  try {
    const {
      userId,
      caseId,
      title,
      description,
      audioBase64,
      fileName,
      mimeType,
      recordedAt
    } = req.body;

    // Validation
    if (!userId || !title || !audioBase64 || !fileName) {
      return res.status(400).json({
        error: 'Missing required fields: userId, title, audioBase64, fileName'
      });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    // Decode base64 audio
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const fileSize = audioBuffer.length;

    // Upload audio to S3
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const audioKey = `audio-recordings/${userId}/${timestamp}-${randomSuffix}-${fileName}`;
    const { url: audioUrl } = await storagePut(audioKey, audioBuffer, mimeType);

    // Insert audio recording record
    const insertResult: any = await db.insert(audioRecordings).values({
      userId,
      caseId: caseId || null,
      title,
      description: description || null,
      audioUrl,
      audioKey,
      fileName,
      mimeType,
      fileSize,
      duration: null, // Will be populated after transcription
      transcriptionStatus: 'pending',
      transcriptionText: null,
      transcriptionLanguage: null,
      segments: null,
      speakers: null,
      metadata: {
        uploadedAt: new Date().toISOString(),
        source: 'webhook'
      },
      recordedAt: recordedAt ? new Date(recordedAt) : null
    });

    const audioRecordingId = insertResult.insertId || insertResult[0]?.insertId || 0;

    // Auto-create case if not provided and title suggests legal context
    let finalCaseId = caseId;
    if (!caseId) {
      const legalKeywords = ['deposition', 'hearing', 'testimony', 'interview', 'court', 'case', 'witness', 'statement'];
      const titleLower = title.toLowerCase();
      const isLegalAudio = legalKeywords.some(keyword => titleLower.includes(keyword));
      
      if (isLegalAudio) {
        const caseResult: any = await db.insert(cases).values({
          userId,
          title: `Audio Case: ${title}`,
          description: `Auto-created from audio recording: ${fileName}\n\n${description || 'No description provided'}`,
          status: 'draft',
          caseType: 'Audio Evidence',
          metadata: {
            source: 'audio_ingest',
            originalAudioId: audioRecordingId,
            autoCreated: true,
            createdAt: new Date().toISOString()
          }
        });
        
        finalCaseId = caseResult.insertId || caseResult[0]?.insertId || null;
        
        // Update audio recording with case ID
        if (finalCaseId) {
          await db.update(audioRecordings)
            .set({ caseId: finalCaseId })
            .where(eq(audioRecordings.id, audioRecordingId));
        }
      }
    }

    // Create evidence record linking audio to case
    let evidenceId = null;
    if (finalCaseId && audioRecordingId) {
      const evidenceResult: any = await db.insert(evidence).values({
        caseId: finalCaseId,
        userId,
        title: `Audio: ${title}`,
        description: description || `Audio recording: ${fileName}`,
        evidenceType: 'audio',
        fileUrl: audioUrl,
        fileKey: audioKey,
        fileName,
        fileSize,
        mimeType,
        captureMethod: 'audio_ingest',
        blockchainVerified: false,
        metadata: {
          audioRecordingId,
          source: 'audio_ingest',
          linkedAt: new Date().toISOString()
        }
      });
      
      evidenceId = evidenceResult.insertId || evidenceResult[0]?.insertId || null;
    }

    // Trigger transcription asynchronously (don't block response)
    if (audioRecordingId) {
      transcribeAudioAsync(audioRecordingId, audioUrl).catch(error => {
        console.error(`[Audio Ingest] Transcription failed for recording ${audioRecordingId}:`, error);
      });
    }

    return res.status(201).json({
      success: true,
      audioRecordingId,
      audioUrl,
      caseId: finalCaseId,
      evidenceId,
      caseCreated: !caseId && !!finalCaseId,
      message: 'Audio uploaded successfully. Transcription in progress.'
    });

  } catch (error: any) {
    console.error('[Audio Ingest] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * Asynchronous transcription handler
 */
async function transcribeAudioAsync(audioRecordingId: number, audioUrl: string) {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('Database connection failed');
    }

    // Update status to processing
    await db
      .update(audioRecordings)
      .set({ transcriptionStatus: 'processing' })
      .where(eq(audioRecordings.id, audioRecordingId));

    // Call Whisper API
    const transcriptionResult = await transcribeAudio({
      audioUrl,
      language: undefined, // Auto-detect
      prompt: undefined
    });

    // Update record with transcription results
    await db
      .update(audioRecordings)
      .set({
        transcriptionStatus: 'completed',
        transcriptionText: 'text' in transcriptionResult ? transcriptionResult.text : null,
        transcriptionLanguage: 'language' in transcriptionResult ? transcriptionResult.language : null,
        segments: 'segments' in transcriptionResult ? (transcriptionResult.segments as any) : null,
        duration: 'duration' in transcriptionResult && transcriptionResult.duration ? Math.round(transcriptionResult.duration) : null
      })
      .where(eq(audioRecordings.id, audioRecordingId));

    console.log(`[Audio Ingest] Transcription completed for recording ${audioRecordingId}`);

    // Check for workflow triggers after successful transcription
    const [audioRecord] = await db
      .select()
      .from(audioRecordings)
      .where(eq(audioRecordings.id, audioRecordingId))
      .limit(1);

    if (audioRecord && audioRecord.transcriptionText) {
      await checkAudioTriggers(db, audioRecord.title, audioRecord.transcriptionText, audioRecordingId);
    }

  } catch (error: any) {
    console.error(`[Audio Ingest] Transcription error for recording ${audioRecordingId}:`, error);

    // Update status to failed
    const db = await getDb();
    if (db) {
      await db
        .update(audioRecordings)
        .set({
          transcriptionStatus: 'failed',
          metadata: {
            transcriptionError: error.message,
            failedAt: new Date().toISOString()
          }
        })
        .where(eq(audioRecordings.id, audioRecordingId));
    }
  }
}

export default router;


/**
 * Check if audio transcription matches any workflow triggers
 */
async function checkAudioTriggers(db: any, title: string, transcriptionText: string, audioId: number) {
  // Get all active audio triggers
  const triggers = await db
    .select()
    .from(workflowTriggers)
    .where(eq(workflowTriggers.triggerType, 'audio_transcribed'))
    .where(eq(workflowTriggers.isActive, true));

  const firedTriggers = [];

  for (const trigger of triggers) {
    const conditions = trigger.conditions || {};
    let matched = false;
    const matchedConditions: any = {};

    // Check keyword matching in title and transcription
    if (conditions.keywords && conditions.keywords.length > 0) {
      const text = `${title} ${transcriptionText}`.toLowerCase();
      const matchedKeywords = conditions.keywords.filter((keyword: string) => 
        text.includes(keyword.toLowerCase())
      );
      
      if (matchedKeywords.length > 0) {
        matched = true;
        matchedConditions.keywords = matchedKeywords;
        matchedConditions.field = 'title/transcription';
      }
    }

    // If trigger matched, execute workflow
    if (matched) {
      try {
        // Create trigger execution record
        const triggerExecResult: any = await db.insert(triggerExecutions).values({
          triggerId: trigger.id,
          eventType: 'audio_transcribed',
          eventId: audioId,
          eventData: {
            title,
            transcriptionPreview: transcriptionText.substring(0, 500)
          },
          matchedConditions,
          status: 'pending'
        });

        const triggerExecId = triggerExecResult.insertId || triggerExecResult[0]?.insertId;

        // Get workflow definition
        const [workflow] = await db
          .select()
          .from(workflows)
          .where(eq(workflows.id, trigger.workflowId))
          .limit(1);

        if (workflow) {
          const executionParams = trigger.executionParams || {};
          
          // Create workflow execution
          const workflowExecResult: any = await db.insert(workflowExecutions).values({
            workflowId: workflow.id,
            userId: trigger.userId,
            status: executionParams.autoStart ? 'running' : 'pending',
            currentStep: 0,
            totalSteps: workflow.definition?.steps?.length || 0,
            variables: {
              ...executionParams.variables,
              audioId,
              audioTitle: title,
              transcriptionText
            },
            metadata: {
              triggeredBy: 'audio_ingest',
              triggerId: trigger.id,
              triggerExecId
            }
          });

          const workflowExecId = workflowExecResult.insertId || workflowExecResult[0]?.insertId;

          // Update trigger execution with workflow execution ID
          await db
            .update(triggerExecutions)
            .set({
              workflowExecutionId: workflowExecId,
              status: 'executed',
              executedAt: new Date()
            })
            .where(eq(triggerExecutions.id, triggerExecId));

          // Update trigger last triggered
          await db
            .update(workflowTriggers)
            .set({
              lastTriggered: new Date(),
              triggerCount: trigger.triggerCount + 1
            })
            .where(eq(workflowTriggers.id, trigger.id));

          firedTriggers.push({
            triggerId: trigger.id,
            workflowId: workflow.id,
            workflowExecId
          });

          console.log(`[Audio Ingest] Triggered workflow ${workflow.id} from audio ${audioId}`);
        }
      } catch (error) {
        console.error(`[Audio Ingest] Trigger execution failed for trigger ${trigger.id}:`, error);
      }
    }
  }

  return firedTriggers;
}
