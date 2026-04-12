CHANGE_PROPOSAL
- claim_being_verified_or_corrected: AI memory extraction should tolerate non-string or malformed LLM payloads without leaking raw payload content into logs.
- evidence:
  - webapp/server/ai-memory-router.ts directly calls .match() / JSON.parse() on response.choices[0]?.message?.content even though webapp/server/_core/llm.ts allows that content to be a string or an array of multimodal content parts.
  - On parse failure, the current code logs raw content.
- files_likely_affected:
  - webapp/server/ai-memory-router.ts
  - webapp/server/ai-memory-router.test.ts
- change_reason: Add malformed-input guards and redacted failure logging around one brittle parsing path with minimal churn.
- verification_plan:
  - add a targeted regression test for fenced JSON, text-part arrays, invalid-shape payloads, and non-text multimodal payloads
  - compare branch diff against master to confirm narrow scope
  - inspect commit status checks exposed by GitHub
- rollback_plan: revert the reliability patch commits on fix/reliability-ai-memory-parse-guards

Selected issue
- AI memory extraction parse guards + log redaction boundary

Expected reliability impact
- Prevents .match() / JSON.parse() misuse on array-based LLM content
- Converts malformed or non-text model output into a controlled { success: false, extracted: 0 } result
- Stops raw payload spill in parse-failure logs
