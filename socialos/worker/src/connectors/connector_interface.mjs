/**
 * Connector interface
 *
 * A connector publishes content to a specific platform.
 *
 * Expected input:
 * - content: SocialOS ContentRecord
 * - schedule: ScheduleRecord
 *
 * Expected output:
 * - { status: 'success'|'failure'|'assist_required'|'refused', result?: object|null }
 */

export function assertConnectorResult(result) {
  if (!result || typeof result !== "object") throw new Error("Connector result must be an object");
  if (!result.status) throw new Error("Connector result missing status");
  return result;
}
