// Interface for summarizers. PR1: no-op summarizer that returns the first N chars.

export async function summarize(text: string, maxTokens = 512): Promise<string> {
  if (!text) return '';
  // rough approximation: 1 token ~= 4 chars
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n\n[truncated summary]';
}

export default { summarize };
