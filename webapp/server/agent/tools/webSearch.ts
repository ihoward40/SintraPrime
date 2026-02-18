import type { Tool, ToolResult, AgentContext } from "../types";
import { webSearch } from "../services/searchService";

export const webSearchTool: Tool = {
  name: "web_search",
  description: "Search the web using Google Search. Returns top results with titles, URLs, and snippets. Use this to find information, case law, statutes, or any web content.",
  parameters: [
    {
      name: "query",
      type: "string",
      description: "Search query string (e.g., 'FDCPA violations California 2024')",
      required: true,
    },
    {
      name: "num_results",
      type: "number",
      description: "Number of results to return (1-10, default: 5)",
      required: false,
    },
  ],
  async execute(params: any, context: AgentContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      const { query, num_results = 5 } = params;
      
      if (!query || typeof query !== "string") {
        return {
          success: false,
          error: "Invalid query parameter: must be a non-empty string",
        };
      }
      
      // Use real Google Custom Search API (falls back to mock if not configured)
      const results = await webSearch(query, num_results);
      
      return {
        success: true,
        data: {
          query,
          results: results.slice(0, num_results),
          total: results.length,
        },
        metadata: {
          executionTime: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Web search failed: ${error.message}`,
        metadata: {
          executionTime: Date.now() - startTime,
        },
      };
    }
  },
};
