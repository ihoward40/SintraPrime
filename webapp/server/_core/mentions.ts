import { getDocumentById, getEvidenceById } from "../db";

export type Mention = {
  type: "document" | "evidence";
  id: number;
  text: string;
};

/**
 * Parse @mentions from chat messages
 * Supports: @document:123, @evidence:456, @doc:123, @ev:456
 */
export function parseMentions(message: string): Mention[] {
  const mentions: Mention[] = [];
  
  // Match @document:123 or @doc:123
  const documentRegex = /@(?:document|doc):(\d+)/gi;
  let match;
  
  while ((match = documentRegex.exec(message)) !== null) {
    mentions.push({
      type: "document",
      id: parseInt(match[1]),
      text: match[0],
    });
  }
  
  // Match @evidence:456 or @ev:456
  const evidenceRegex = /@(?:evidence|ev):(\d+)/gi;
  
  while ((match = evidenceRegex.exec(message)) !== null) {
    mentions.push({
      type: "evidence",
      id: parseInt(match[1]),
      text: match[0],
    });
  }
  
  return mentions;
}

/**
 * Fetch mentioned items and build context string
 */
export async function resolveMentions(mentions: Mention[], userId: number): Promise<string> {
  if (mentions.length === 0) return "";
  
  const contextParts: string[] = ["\n\n--- Referenced Items ---\n"];
  
  for (const mention of mentions) {
    try {
      if (mention.type === "document") {
        const doc = await getDocumentById(mention.id);
        if (doc) {
          contextParts.push(`\nDocument #${doc.id}: ${doc.title}`);
          if (doc.documentType) {
            contextParts.push(`Type: ${doc.documentType}`);
          }
          if (doc.content) {
            // Limit content length to avoid token overflow
            const truncatedContent = doc.content.length > 1000
              ? doc.content.substring(0, 1000) + "... (truncated)"
              : doc.content;
            contextParts.push(`Content: ${truncatedContent}`);
          }
          contextParts.push("---");
        }
      } else if (mention.type === "evidence") {
        const evidence = await getEvidenceById(mention.id);
        if (evidence) {
          contextParts.push(`\nEvidence #${evidence.id}: ${evidence.title}`);
          if (evidence.evidenceType) {
            contextParts.push(`Type: ${evidence.evidenceType}`);
          }
          if (evidence.description) {
            contextParts.push(`Description: ${evidence.description}`);
          }
          if (evidence.fileUrl) {
            contextParts.push(`File: ${evidence.fileUrl}`);
          }
          contextParts.push("---");
        }
      }
    } catch (error) {
      console.error(`Failed to resolve ${mention.type} #${mention.id}:`, error);
      contextParts.push(`\n[Error: Could not load ${mention.type} #${mention.id}]`);
    }
  }
  
  return contextParts.join("\n");
}

/**
 * Extract suggestions for autocomplete
 * Returns items that match the partial mention
 */
export async function getMentionSuggestions(
  partial: string,
  userId: number
): Promise<Array<{ type: string; id: number; title: string }>> {
  const suggestions: Array<{ type: string; id: number; title: string }> = [];
  
  // Determine what type of mention is being typed
  if (partial.startsWith("@doc") || partial.startsWith("@document")) {
    // Fetch recent documents for this user
    // This would need a new DB function to get recent documents
    // For now, return empty array
  } else if (partial.startsWith("@ev") || partial.startsWith("@evidence")) {
    // Fetch recent evidence for this user
    // This would need a new DB function to get recent evidence
    // For now, return empty array
  }
  
  return suggestions;
}
