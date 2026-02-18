import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Zap, Code, Globe, FileText, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

interface ToolCall {
  tool: string;
  status: "running" | "completed" | "failed";
  input: any;
  output?: any;
  error?: string;
}

export default function AgentZeroChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const executeTask = trpc.agentZero.executeTask.useMutation({
    onSuccess: (data) => {
      // Add assistant response
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.task?.result || "Task completed successfully",
        timestamp: new Date(),
        toolCalls: data.task?.toolCalls?.map((tc: any) => ({
          tool: tc.tool,
          status: tc.error ? "failed" : "completed",
          input: tc.input,
          output: tc.output,
          error: tc.error,
        })) || [],
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsStreaming(false);
    },
    onError: (error) => {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Error: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsStreaming(false);
    },
  });

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    // Execute task with Agent Zero
    executeTask.mutate({
      taskDescription: input,
      sessionId: `chat-${Date.now()}`,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getToolIcon = (tool: string) => {
    switch (tool) {
      case "web_search":
        return <Globe className="h-4 w-4" />;
      case "code_executor":
        return <Code className="h-4 w-4" />;
      case "file_operations":
        return <FileText className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  const getToolStatusIcon = (status: ToolCall["status"]) => {
    switch (status) {
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary/10">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Agent Zero</h1>
            <p className="text-sm text-muted-foreground">
              Autonomous AI agent with web search, code execution, and file operations
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12 space-y-4">
              <div className="inline-flex p-4 rounded-full bg-primary/10">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Welcome to Agent Zero</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  I can help you with research, code execution, file operations, and complex multi-step tasks.
                  Just describe what you need!
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center pt-4">
                <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setInput("Search for the latest AI developments")}>
                  Search for the latest AI developments
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setInput("Write a Python script to calculate fibonacci numbers")}>
                  Write a Python script to calculate fibonacci
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setInput("Analyze this legal document and extract key terms")}>
                  Analyze a legal document
                </Badge>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className={`flex-1 max-w-2xl ${message.role === "user" ? "text-right" : ""}`}>
                <Card className={message.role === "user" ? "bg-primary text-primary-foreground" : ""}>
                  <CardContent className="p-4">
                    {message.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <Streamdown>{message.content}</Streamdown>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    )}

                    {/* Tool Calls */}
                    {message.toolCalls && message.toolCalls.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Tool Executions
                        </p>
                        {message.toolCalls.map((toolCall, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg border border-border bg-muted/30 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {getToolIcon(toolCall.tool)}
                                <span className="text-sm font-medium">{toolCall.tool}</span>
                              </div>
                              {getToolStatusIcon(toolCall.status)}
                            </div>
                            {toolCall.error && (
                              <p className="text-xs text-destructive">{toolCall.error}</p>
                            )}
                            {toolCall.output && (
                              <details className="text-xs">
                                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                  View output
                                </summary>
                                <pre className="mt-2 p-2 rounded bg-background overflow-x-auto">
                                  {JSON.stringify(toolCall.output, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <p className="text-xs text-muted-foreground mt-1 px-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
              {message.role === "user" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <span className="text-sm font-semibold">You</span>
                </div>
              )}
            </div>
          ))}

          {isStreaming && (
            <div className="flex gap-4 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Agent Zero is thinking...</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Agent Zero anything... (Shift+Enter for new line)"
              className="min-h-[60px] max-h-[200px] resize-none"
              disabled={isStreaming}
            />
            <Button
              type="submit"
              size="lg"
              disabled={!input.trim() || isStreaming}
              className="px-6"
            >
              {isStreaming ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Agent Zero can search the web, execute code, and perform file operations to help you complete tasks.
          </p>
        </form>
      </div>
    </div>
  );
}
