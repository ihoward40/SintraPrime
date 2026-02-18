import type { Tool, ToolResult, AgentContext } from "../types";
import { fillForm } from "../services/browserService";

export const browserFillFormTool: Tool = {
  name: "browser_fill_form",
  description: "Navigate to a URL, fill out a form with provided data, and optionally submit it. Returns success status and screenshot. Use this to automate form submissions.",
  parameters: [
    {
      name: "url",
      type: "string",
      description: "URL of the page containing the form",
      required: true,
    },
    {
      name: "form_data",
      type: "object",
      description: "Object mapping field names to values (e.g., {name: 'John', email: 'john@example.com'})",
      required: true,
    },
    {
      name: "submit",
      type: "boolean",
      description: "Whether to submit the form after filling (default: false)",
      required: false,
    },
  ],
  async execute(params: any, context: AgentContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      const { url, form_data, submit = false } = params;
      
      if (!url || typeof url !== "string") {
        return {
          success: false,
          error: "Invalid URL parameter",
        };
      }
      
      if (!form_data || typeof form_data !== "object") {
        return {
          success: false,
          error: "Invalid form_data parameter: must be an object",
        };
      }
      
      // Use real Puppeteer form filling
      const result = await fillForm(url, form_data, submit);
      
      return {
        success: true,
        data: {
          url: result.finalUrl,
          filledFields: result.filledFields,
          submitted: result.submitted,
          message: `Filled ${result.filledFields.length} fields${result.submitted ? " and submitted" : ""}`,
        },
        metadata: {
          executionTime: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Form filling failed: ${error.message}`,
        metadata: {
          executionTime: Date.now() - startTime,
        },
      };
    }
  },
};
