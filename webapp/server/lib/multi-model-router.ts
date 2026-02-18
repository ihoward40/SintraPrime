/**
 * Multi-Model AI Router
 * 
 * Provides unified interface for multiple LLM providers with automatic routing,
 * fallback handling, and performance tracking.
 */

export type AIProvider = "anthropic" | "openai" | "gemini" | "kimi" | "minimax";

export type ModelCapability = 
  | "chat"
  | "code"
  | "vision"
  | "reasoning"
  | "long-context"
  | "fast-response";

export interface ModelConfig {
  provider: AIProvider;
  modelId: string;
  capabilities: ModelCapability[];
  contextWindow: number;
  costPer1kTokens: number;
  avgResponseTime: number; // milliseconds
  priority: number; // 1-10, higher is better
}

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: "text" | "image_url"; text?: string; image_url?: { url: string } }>;
}

export interface AIRequest {
  messages: AIMessage[];
  preferredCapability?: ModelCapability;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  _retryCount?: number; // Internal: track retry attempts
  _excludeProviders?: AIProvider[]; // Internal: exclude failed providers
}

export interface AIResponse {
  content: string;
  provider: AIProvider;
  model: string;
  tokensUsed: number;
  responseTime: number;
  cached?: boolean;
}

// Model registry with configurations
const MODEL_REGISTRY: ModelConfig[] = [
  // Anthropic Claude (already integrated)
  {
    provider: "anthropic",
    modelId: "claude-3-5-sonnet-20241022",
    capabilities: ["chat", "code", "vision", "reasoning", "long-context"],
    contextWindow: 200000,
    costPer1kTokens: 0.015,
    avgResponseTime: 2000,
    priority: 9,
  },
  {
    provider: "anthropic",
    modelId: "claude-3-5-haiku-20241022",
    capabilities: ["chat", "fast-response"],
    contextWindow: 200000,
    costPer1kTokens: 0.001,
    avgResponseTime: 800,
    priority: 7,
  },
  
  // OpenAI GPT (to be integrated)
  {
    provider: "openai",
    modelId: "gpt-4o",
    capabilities: ["chat", "code", "vision", "reasoning"],
    contextWindow: 128000,
    costPer1kTokens: 0.01,
    avgResponseTime: 1500,
    priority: 8,
  },
  {
    provider: "openai",
    modelId: "gpt-4o-mini",
    capabilities: ["chat", "fast-response"],
    contextWindow: 128000,
    costPer1kTokens: 0.0002,
    avgResponseTime: 600,
    priority: 6,
  },
  
  // Google Gemini (disabled - model not found errors)
  // {
  //   provider: "gemini",
  //   modelId: "gemini-2.0-flash-exp",
  //   capabilities: ["chat", "code", "vision", "reasoning", "fast-response"],
  //   contextWindow: 1000000,
  //   costPer1kTokens: 0.0001,
  //   avgResponseTime: 500,
  //   priority: 5,
  // },
  // {
  //   provider: "gemini",
  //   modelId: "gemini-2.0-flash-thinking-exp",
  //   capabilities: ["reasoning", "long-context"],
  //   contextWindow: 1000000,
  //   costPer1kTokens: 0.0002,
  //   avgResponseTime: 3000,
  //   priority: 4,
  // },
  
  // Kimi AI (to be integrated)
  {
    provider: "kimi",
    modelId: "moonshot-v1-128k",
    capabilities: ["chat", "long-context"],
    contextWindow: 128000,
    costPer1kTokens: 0.005,
    avgResponseTime: 1800,
    priority: 7,
  },
  
  // MiniMax (to be integrated)
  {
    provider: "minimax",
    modelId: "abab6.5s-chat",
    capabilities: ["chat", "fast-response"],
    contextWindow: 245760,
    costPer1kTokens: 0.003,
    avgResponseTime: 1200,
    priority: 6,
  },
];

// Performance tracking
interface ProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  totalResponseTime: number;
  lastFailure?: Date;
}

const providerMetrics = new Map<AIProvider, ProviderMetrics>();

// Initialize metrics for all providers
MODEL_REGISTRY.forEach(model => {
  if (!providerMetrics.has(model.provider)) {
    providerMetrics.set(model.provider, {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTokens: 0,
      totalResponseTime: 0,
    });
  }
});

/**
 * Select the best model for a given request
 */
export function selectModel(request: AIRequest): ModelConfig {
  // Filter models by capability
  let candidates = MODEL_REGISTRY;
  
  if (request.preferredCapability) {
    candidates = candidates.filter(m => 
      m.capabilities.includes(request.preferredCapability!)
    );
  }
  
  // Check for vision content
  const hasVision = request.messages.some(msg => 
    Array.isArray(msg.content) && 
    msg.content.some(c => c.type === "image_url")
  );
  
  if (hasVision) {
    candidates = candidates.filter(m => m.capabilities.includes("vision"));
  }
  
  // Calculate context size needed
  const estimatedTokens = request.messages.reduce((sum, msg) => {
    const content = typeof msg.content === "string" ? msg.content : 
      msg.content.map(c => c.text || "").join(" ");
    return sum + Math.ceil(content.length / 4); // rough estimate
  }, 0);
  
  // Filter by context window
  candidates = candidates.filter(m => m.contextWindow >= estimatedTokens * 1.5);
  
  // Score candidates based on priority, cost, and performance
  const scored = candidates.map(model => {
    const metrics = providerMetrics.get(model.provider)!;
    const successRate = metrics.totalRequests > 0 
      ? metrics.successfulRequests / metrics.totalRequests 
      : 1;
    
    // Penalize recently failed providers
    const recentFailurePenalty = metrics.lastFailure && 
      Date.now() - metrics.lastFailure.getTime() < 60000 ? 0.5 : 1;
    
    const score = 
      model.priority * 10 + 
      successRate * 50 + 
      (1 / model.costPer1kTokens) * 5 +
      (1 / model.avgResponseTime) * 1000 * recentFailurePenalty;
    
    return { model, score };
  });
  
  // Sort by score and return best
  scored.sort((a, b) => b.score - a.score);
  
  if (scored.length === 0) {
    // Fallback to default Claude model
    return MODEL_REGISTRY[0];
  }
  
  return scored[0].model;
}

/**
 * Route request to appropriate provider with retry logic
 */
export async function routeAIRequest(request: AIRequest): Promise<AIResponse> {
  const MAX_RETRIES = 3;
  const retryCount = request._retryCount || 0;
  
  if (retryCount >= MAX_RETRIES) {
    throw new Error("Max retries exceeded for AI request");
  }
  
  const model = selectModel(request);
  const startTime = Date.now();
  
  try {
    let response: AIResponse;
    
    switch (model.provider) {
      case "anthropic":
        response = await callAnthropic(model, request);
        break;
      case "openai":
        response = await callOpenAI(model, request);
        break;
      case "gemini":
        response = await callGemini(model, request);
        break;
      case "kimi":
        response = await callKimi(model, request);
        break;
      case "minimax":
        response = await callMiniMax(model, request);
        break;
      default:
        throw new Error(`Unsupported provider: ${model.provider}`);
    }
    
    // Update metrics
    const metrics = providerMetrics.get(model.provider)!;
    metrics.totalRequests++;
    metrics.successfulRequests++;
    metrics.totalTokens += response.tokensUsed;
    metrics.totalResponseTime += response.responseTime;
    
    return response;
    
  } catch (error) {
    // Update failure metrics
    const metrics = providerMetrics.get(model.provider)!;
    metrics.totalRequests++;
    metrics.failedRequests++;
    metrics.lastFailure = new Date();
    
    console.error(`AI request failed for ${model.provider}:`, error);
    
    // Try fallback provider with retry tracking
    const excludeProviders = request._excludeProviders || [];
    excludeProviders.push(model.provider);
    
    const fallbackModel = MODEL_REGISTRY.find(m => 
      !excludeProviders.includes(m.provider) &&
      m.capabilities.some(c => model.capabilities.includes(c))
    );
    
    if (fallbackModel && retryCount < MAX_RETRIES) {
      console.log(`Falling back to ${fallbackModel.provider} (retry ${retryCount + 1}/${MAX_RETRIES})`);
      return routeAIRequest({
        ...request,
        _retryCount: retryCount + 1,
        _excludeProviders: excludeProviders,
      });
    }
    
    throw new Error(`AI request failed after ${retryCount + 1} attempts: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Call Anthropic Claude API
 */
async function callAnthropic(model: ModelConfig, request: AIRequest): Promise<AIResponse> {
  const { invokeLLM } = await import("../_core/llm");
  const startTime = Date.now();
  
  const response = await invokeLLM({
    messages: request.messages as any,
    max_tokens: request.maxTokens,
  });
  
  const content = response.choices[0]?.message?.content;
  const responseText = typeof content === "string" ? content : "";
  
  return {
    content: responseText,
    provider: "anthropic",
    model: model.modelId,
    tokensUsed: response.usage?.total_tokens || 0,
    responseTime: Date.now() - startTime,
  };
}

/**
 * Call OpenAI GPT API
 */
async function callOpenAI(model: ModelConfig, request: AIRequest): Promise<AIResponse> {
  const startTime = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }
  
  // Convert messages to OpenAI format
  const messages = request.messages.map(msg => ({
    role: msg.role,
    content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
  }));
  
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model.modelId,
      messages,
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature || 0.7,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }
  
  const data = await response.json();
  
  return {
    content: data.choices[0]?.message?.content || "",
    provider: "openai",
    model: model.modelId,
    tokensUsed: data.usage?.total_tokens || 0,
    responseTime: Date.now() - startTime,
  };
}

/**
 * Call Google Gemini API
 */
async function callGemini(model: ModelConfig, request: AIRequest): Promise<AIResponse> {
  const startTime = Date.now();
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("GOOGLE_GEMINI_API_KEY not configured");
  }
  
  // Convert messages to Gemini format
  const contents = request.messages
    .filter(msg => msg.role !== "system") // Gemini doesn't support system messages directly
    .map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content) }],
    }));
  
  // Add system message as first user message if present
  const systemMessage = request.messages.find(msg => msg.role === "system");
  if (systemMessage) {
    contents.unshift({
      role: "user",
      parts: [{ text: `System: ${systemMessage.content}` }],
    });
  }
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model.modelId}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: request.maxTokens || 4096,
          temperature: request.temperature || 0.7,
        },
      }),
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }
  
  const data = await response.json();
  
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
    provider: "gemini",
    model: model.modelId,
    tokensUsed: data.usageMetadata?.totalTokenCount || 0,
    responseTime: Date.now() - startTime,
  };
}

/**
 * Call Kimi AI API (Moonshot)
 */
async function callKimi(model: ModelConfig, request: AIRequest): Promise<AIResponse> {
  const startTime = Date.now();
  const apiKey = process.env.KIMI_API_KEY;
  
  if (!apiKey) {
    throw new Error("KIMI_API_KEY not configured");
  }
  
  // Kimi uses OpenAI-compatible API
  const messages = request.messages.map(msg => ({
    role: msg.role,
    content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
  }));
  
  const response = await fetch("https://api.moonshot.cn/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model.modelId,
      messages,
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature || 0.7,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Kimi API error: ${error}`);
  }
  
  const data = await response.json();
  
  return {
    content: data.choices[0]?.message?.content || "",
    provider: "kimi",
    model: model.modelId,
    tokensUsed: data.usage?.total_tokens || 0,
    responseTime: Date.now() - startTime,
  };
}

/**
 * Call MiniMax API
 */
async function callMiniMax(model: ModelConfig, request: AIRequest): Promise<AIResponse> {
  const startTime = Date.now();
  const apiKey = process.env.MINIMAX_API_KEY;
  
  if (!apiKey) {
    throw new Error("MINIMAX_API_KEY not configured");
  }
  
  // MiniMax uses a different API format
  const messages = request.messages.map(msg => ({
    sender_type: msg.role === "user" ? "USER" : msg.role === "assistant" ? "BOT" : "SYSTEM",
    text: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
  }));
  
  const response = await fetch("https://api.minimax.chat/v1/text/chatcompletion_v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model.modelId,
      messages,
      tokens_to_generate: request.maxTokens || 4096,
      temperature: request.temperature || 0.7,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`MiniMax API error: ${error}`);
  }
  
  const data = await response.json();
  
  return {
    content: data.choices?.[0]?.message || data.reply || "",
    provider: "minimax",
    model: model.modelId,
    tokensUsed: data.usage?.total_tokens || 0,
    responseTime: Date.now() - startTime,
  };
}

/**
 * Get provider metrics for monitoring
 */
export function getProviderMetrics(): Map<AIProvider, ProviderMetrics> {
  return new Map(providerMetrics);
}

/**
 * Get available models filtered by capability
 */
export function getAvailableModels(capability?: ModelCapability): ModelConfig[] {
  if (!capability) return MODEL_REGISTRY;
  return MODEL_REGISTRY.filter(m => m.capabilities.includes(capability));
}
