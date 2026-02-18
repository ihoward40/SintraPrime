import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, User, Send, Loader2, FileText, Folder, Download, 
  Paperclip, Image as ImageIcon, FileAudio, Volume2, VolumeX,
  X, File
} from "lucide-react";
import VoiceInput from "@/components/VoiceInput";
import { Streamdown } from "streamdown";
import { trpc } from "@/lib/trpc";
import { playSound } from "@/lib/sounds";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { suggestedPrompts, getPromptsByCategory } from "@/lib/suggestedPrompts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Attachment = {
  name: string;
  type: string;
  url: string;
  size: number;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
};

export default function AIChatEnhanced() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm your SintraPrime AI Assistant. I can help you with legal research, case analysis, document drafting, and more. Upload documents, images, or audio files, or use voice input. How can I assist you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch user's cases for context
  const { data: cases } = trpc.cases.list.useQuery();
  const { data: currentCase } = trpc.cases.get.useQuery(
    { id: parseInt(selectedCaseId || "0") },
    { enabled: !!selectedCaseId }
  );

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const maxSize = 16 * 1024 * 1024; // 16MB limit
      
      const validFiles = files.filter(file => {
        if (file.size > maxSize) {
          toast.error(`${file.name} exceeds 16MB limit`);
          return false;
        }
        return true;
      });
      
      setAttachedFiles(prev => [...prev, ...validFiles]);
      toast.success(`${validFiles.length} file(s) attached`);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachedFiles.length === 0) || isLoading) return;

    // Upload files first if any
    const attachments: Attachment[] = [];
    const fileContext: any[] = [];
    
    if (attachedFiles.length > 0) {
      toast.info("Uploading files...");
      
      for (const file of attachedFiles) {
        try {
          // Convert file to base64
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve(base64);
            };
            reader.readAsDataURL(file);
          });
          
          const base64Data = await base64Promise;
          
          // Upload to S3
          const uploadMutation = trpc.aiChat.uploadFile.useMutation();
          const uploadResult = await uploadMutation.mutateAsync({
            fileName: file.name,
            fileType: file.type,
            fileData: base64Data,
          });
          
          attachments.push({
            name: file.name,
            type: file.type,
            url: uploadResult.url,
            size: file.size,
          });
          
          // Process file (extract text, transcribe audio, etc.)
          const processMutation = trpc.aiChat.processFile.useMutation();
          const processResult = await processMutation.mutateAsync({
            fileUrl: uploadResult.url,
            fileType: file.type,
            fileName: file.name,
          });
          
          fileContext.push({
            fileName: file.name,
            fileType: file.type,
            extractedText: processResult.extractedText,
          });
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          toast.error(`Failed to upload ${file.name}`);
        }
      }
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input || "(Sent files)",
      timestamp: new Date(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setAttachedFiles([]);
    setIsLoading(true);

    // Call AI chat API with context
    try {
      // Build context from selected case
      let context = "";
      if (selectedCaseId && selectedCaseId !== "none" && currentCase) {
        context = `Current Case Context:\nTitle: ${currentCase.title}\nType: ${currentCase.caseType}\nStatus: ${currentCase.status}\nDescription: ${currentCase.description || "N/A"}\n\n`;
      }

      // Add attachment context
      if (attachments.length > 0) {
        context += `Attached Files:\n${attachments.map(a => `- ${a.name} (${a.type})`).join("\n")}\n\n`;
      }

      // Build conversation history
      const conversationHistory = messages
        .filter(m => m.id !== "welcome")
        .map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      // Call AI chat API with LLM integration
      const chatMutation = trpc.aiChat.sendMessage.useMutation();
      const response = await chatMutation.mutateAsync({
        message: input,
        caseId: selectedCaseId ? parseInt(selectedCaseId) : undefined,
        fileContext: fileContext.length > 0 ? fileContext : undefined,
        conversationHistory,
      });
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: typeof response.message === 'string' ? response.message : JSON.stringify(response.message),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      playSound("message");
    } catch (error) {
      toast.error("Failed to send message");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const speakMessage = (text: string) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      toast.error("Text-to-speech failed");
    };
    
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
    if (type.startsWith("audio/")) return <FileAudio className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">AI Assistant</h2>
          </div>
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        
        {/* Case Context Selector */}
        <Select
          value={selectedCaseId || "none"}
          onValueChange={(value) => setSelectedCaseId(value === "none" ? null : value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select case context" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No case context</SelectItem>
            {cases?.map((c: any) => (
              <SelectItem key={c.id} value={c.id.toString()}>
                {c.title} ({c.caseType})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Suggested Prompts (show when no messages) */}
      {messages.length === 1 && (
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-medium mb-3">Suggested Prompts</h3>
          <div className="grid grid-cols-2 gap-2">
            {suggestedPrompts.slice(0, 6).map((prompt) => (
              <Button
                key={prompt.id}
                variant="outline"
                size="sm"
                className="justify-start text-left h-auto py-2 px-3"
                onClick={() => {
                  setInput(prompt.prompt);
                  if (prompt.requiresFile) {
                    toast.info("Please upload a file for this prompt");
                  }
                }}
              >
                <span className="mr-2">{prompt.icon}</span>
                <span className="text-xs">{prompt.title}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "assistant" ? "justify-start" : "justify-end"
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                </div>
              )}
              
              <div className={`flex-1 max-w-[80%] ${message.role === "user" ? "text-right" : ""}`}>
                <div
                  className={`inline-block rounded-lg p-3 ${
                    message.role === "assistant"
                      ? "bg-muted text-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <Streamdown>{message.content}</Streamdown>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                  
                  {/* Attachments */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.attachments.map((attachment, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2 rounded bg-background/50 text-sm"
                        >
                          {getFileIcon(attachment.type)}
                          <span className="flex-1 truncate">{attachment.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.size)}
                          </span>
                          {attachment.type.startsWith("image/") && (
                            <img
                              src={attachment.url}
                              alt={attachment.name}
                              className="max-w-full max-h-48 rounded mt-2"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* TTS Button for assistant messages */}
                {message.role === "assistant" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1"
                    onClick={() => speakMessage(message.content)}
                  >
                    {isSpeaking ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
                
                <p className="text-xs text-muted-foreground mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>

              {message.role === "user" && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Attached Files Preview */}
      {attachedFiles.length > 0 && (
        <div className="border-t border-border p-2">
          <div className="flex flex-wrap gap-2">
            {attachedFiles.map((file, idx) => (
              <Badge key={idx} variant="secondary" className="gap-2">
                {getFileIcon(file.type)}
                <span className="max-w-[150px] truncate">{file.name}</span>
                <button
                  onClick={() => removeAttachment(idx)}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border p-4">
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,audio/*,.pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 self-end mb-2"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <VoiceInput 
            onTranscript={(text) => setInput(prev => prev + (prev ? " " : "") + text)}
            size="md"
            className="shrink-0 self-end mb-2"
          />
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about your legal cases..."
            className="flex-1 min-h-[60px] max-h-[200px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button
            type="submit"
            disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
            className="shrink-0 self-end"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </Card>
  );
}
