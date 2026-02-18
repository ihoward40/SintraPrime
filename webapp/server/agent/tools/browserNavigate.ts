import type { Tool, ToolResult, AgentContext } from "../types";
import { navigateToUrl } from "../services/browserService";

export const browserNavigateTool: Tool = {
  name: "browser_navigate",
  description: "Navigate to a URL in a headless browser and extract page content. Returns page title, URL, and text content. Use this to read web pages, documentation, or online resources.",
  parameters: [
    {
      name: "url",
      type: "string",
      description: "Full URL to navigate to (must include http:// or https://)",
      required: true,
    },
    {
      name: "wait_for",
      type: "string",
      description: "CSS selector to wait for before extracting content (optional)",
      required: false,
    },
  ],
  async execute(params: any, context: AgentContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      const { url, wait_for } = params;
      
      if (!url || typeof url !== "string" || !url.startsWith("http")) {
        return {
          success: false,
          error: "Invalid URL parameter: must be a valid HTTP/HTTPS URL",
        };
      }
      
      // Use real Puppeteer browser automation
      const result = await navigateToUrl(url, wait_for);
      
      return {
        success: true,
        data: {
          ...result,
          contentLength: result.content.length,
        },
        metadata: {
          executionTime: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Browser navigation failed: ${error.message}`,
        metadata: {
          executionTime: Date.now() - startTime,
        },
      };
    }
  },
};
