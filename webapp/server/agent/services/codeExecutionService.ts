// E2B Code Interpreter integration
// Requires E2B_API_KEY environment variable
// Note: E2B integration requires proper API setup. Using mock implementation for now.

interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  result: any;
  executionTime: number;
  error?: string;
}

export async function executeCode(
  code: string,
  language: "python" | "javascript",
  timeout: number = 30
): Promise<CodeExecutionResult> {
  const apiKey = process.env.E2B_API_KEY;

  if (!apiKey) {
    console.warn("E2B API key not configured, returning mock execution");
    return getMockExecution(code, language);
  }

  // TODO: Integrate with E2B SDK when API key is configured
  // For now, return mock execution
  console.log("E2B integration pending - using mock execution");
  return getMockExecution(code, language);
}

function getMockExecution(code: string, language: string): CodeExecutionResult {
  const executionTime = Math.random() * 1000 + 100;

  // Simulate basic execution for common patterns
  let stdout = "";
  let result: any = null;

  if (language === "python") {
    if (code.includes("print(")) {
      // Extract print statements
      const printMatches = code.match(/print\((.*?)\)/g);
      if (printMatches) {
        stdout = printMatches.map((m) => m.replace(/print\(|\)/g, "").replace(/['"]/g, "")).join("\n");
      }
    }
    stdout += `\n[Mock Python execution - E2B API key not configured]`;
  } else if (language === "javascript") {
    if (code.includes("console.log(")) {
      const logMatches = code.match(/console\.log\((.*?)\)/g);
      if (logMatches) {
        stdout = logMatches.map((m) => m.replace(/console\.log\(|\)/g, "").replace(/['"]/g, "")).join("\n");
      }
    }
    stdout += `\n[Mock JavaScript execution - E2B API key not configured]`;
  }

  return {
    stdout: stdout || `Mock execution of ${language} code:\n\n${code.substring(0, 200)}...`,
    stderr: "",
    result: "Mock execution result",
    executionTime,
  };
}

// Helper function to execute Python code with file operations
export async function executePythonWithFiles(
  code: string,
  files: Record<string, string> = {},
  timeout: number = 30
): Promise<CodeExecutionResult> {
  const apiKey = process.env.E2B_API_KEY;

  if (!apiKey) {
    return getMockExecution(code, "python");
  }

  // TODO: Integrate with E2B SDK when API key is configured
  return getMockExecution(code, "python");
}
