import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Plus,
  Search,
  Send,
  FileText,
  Upload,
  Sparkles,
  History,
  Trash2,
  Edit2,
  AlertTriangle,
  Loader2,
  Files,
  Lightbulb,
  Volume2,
  Mic,
} from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { AudioPlayer } from "@/components/AudioPlayer";
import { WakeWordSettings } from "@/components/WakeWordSettings";
import { useWakeWord } from "@/hooks/useWakeWord";
import { CollaborativeEditor } from "@/components/CollaborativeEditor";
import { useAuth } from "@/_core/hooks/useAuth";

interface Message {
  id?: number;
  role: "user" | "assistant";
  content: string;
  attachments?: any;
  createdAt?: Date | null;
}

interface Conversation {
  id: number;
  title: string | null;
  lastMessageAt: Date | null;
  createdAt: Date | null;
}

const SUGGESTED_PROMPTS = {
  analysis: [
    { title: "Analyze Contract", prompt: "Analyze this contract and identify key terms, obligations, and potential risks." },
    { title: "Review Evidence", prompt: "Review this evidence and assess its relevance, credibility, and potential impact on the case." },
    { title: "Case Strength", prompt: "Assess the overall strength of this case, identifying strong points and weaknesses." },
  ],
  drafting: [
    { title: "Draft Motion", prompt: "Draft a motion to dismiss based on the following facts and legal arguments." },
    { title: "Demand Letter", prompt: "Write a professional demand letter addressing the following issues." },
    { title: "Discovery Request", prompt: "Create a comprehensive discovery request for the following information." },
  ],
  research: [
    { title: "Find Case Law", prompt: "Find relevant case law supporting the following legal argument." },
    { title: "Statute Analysis", prompt: "Analyze the following statute and explain its application to this situation." },
    { title: "Legal Precedent", prompt: "Research legal precedents related to this issue and summarize key findings." },
  ],
  strategy: [
    { title: "Litigation Strategy", prompt: "Develop a litigation strategy for this case, including key arguments and timeline." },
    { title: "Settlement Analysis", prompt: "Analyze settlement options and provide recommendations based on case strengths." },
    { title: "Risk Assessment", prompt: "Assess litigation risks and provide strategic recommendations." },
  ],
};

export default function AIAssistant() {
  const { user } = useAuth();
  const [isVoiceInputActive, setIsVoiceInputActive] = useState(false);
  const { isListening, isEnabled, toggleEnabled, startListening, stopListening } = useWakeWord({
    enabled: true,
    onWakeWordDetected: () => {
      toast.success('Wake word detected! Listening...');
      setIsVoiceInputActive(true);
    },
  });
  // Using sonner toast
  const [activeTab, setActiveTab] = useState("chat");
  const [comparisonDocuments, setComparisonDocuments] = useState<Array<{ name: string; content: string }>>([]);
  const [comparisonContent, setComparisonContent] = useState("");
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);
  const uploadFileMutation = trpc.upload.file.useMutation();
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof SUGGESTED_PROMPTS | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; url: string; type: string }>>([]);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | undefined>();
  const [selectedVoice, setSelectedVoice] = useState("alloy");
  const [selectedSpeed, setSelectedSpeed] = useState(1.0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const conversationsQuery = trpc.aiChat.getConversations.useQuery({});
  const messagesQuery = trpc.aiChat.getConversationMessages.useQuery(
    { conversationId: currentConversationId! },
    { enabled: !!currentConversationId }
  );
  const suggestedPromptsQuery = trpc.aiChat.getSuggestedPrompts.useQuery({
    category: selectedCategory,
  });

  // Mutations
  const createConversationMutation = trpc.aiChat.createConversation.useMutation({
    onSuccess: (data) => {
      setCurrentConversationId(data.conversationId);
      conversationsQuery.refetch();
    },
  });

  const textToSpeechMutation = trpc.voice.textToSpeech.useMutation({
    onSuccess: (data: { audioUrl?: string }) => {
      if (data.audioUrl) {
        setCurrentAudioUrl(data.audioUrl);
        toast.success("Audio generated successfully");
      }
    },
    onError: (error: { message: string }) => {
      toast.error(`TTS failed: ${error.message}`);
    },
  });

  const sendMessageMutation = trpc.aiChat.sendMessage.useMutation({
    onSuccess: (data: any) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
      setIsLoading(false);
      messagesQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
      setIsLoading(false);
    },
  });

  const deleteConversationMutation = trpc.aiChat.deleteConversation.useMutation({
    onSuccess: () => {
      conversationsQuery.refetch();
      setCurrentConversationId(null);
      setMessages([]);
      toast.success("Conversation deleted");
    },
  });

  const updateConversationMutation = trpc.aiChat.updateConversationTitle.useMutation({
    onSuccess: () => {
      conversationsQuery.refetch();
      toast.success("Conversation renamed");
    },
  });

  // Load messages when conversation changes
  useEffect(() => {
    if (messagesQuery.data) {
      setMessages(messagesQuery.data.map(msg => ({
        ...msg,
        createdAt: msg.createdAt || undefined,
      })));
    }
  }, [messagesQuery.data]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewConversation = () => {
    createConversationMutation.mutate({
      title: "New Conversation",
    });
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() && uploadedFiles.length === 0) return;

    const userMessage: Message = {
      role: "user",
      content: inputMessage,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setInputMessage("");

    sendMessageMutation.mutate({
      conversationId: currentConversationId || undefined,
      message: inputMessage,
      conversationHistory: messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    setUploadedFiles([]);
  };

  const handlePromptClick = (prompt: string) => {
    setInputMessage(prompt);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files).map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type,
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);
    toast.success(`${newFiles.length} file(s) uploaded`);
  };

  const handleDeleteConversation = (id: number) => {
    if (confirm("Are you sure you want to delete this conversation?")) {
      deleteConversationMutation.mutate({ conversationId: id });
    }
  };

  const handleRenameConversation = (id: number) => {
    const newTitle = prompt("Enter new conversation title:");
    if (newTitle) {
      updateConversationMutation.mutate({
        conversationId: id,
        title: newTitle,
      });
    }
  };

  const filteredConversations = conversationsQuery.data?.filter((conv) =>
    (conv.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-4rem)] flex gap-4">
        {/* Sidebar - Conversation History */}
        <Card className="w-80 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" />
                Conversations
              </CardTitle>
              <Button size="sm" onClick={handleNewConversation}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="p-4 pt-0 space-y-2">
              {filteredConversations?.map((conv) => (
                <div
                  key={conv.id}
                  className={`p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors ${
                    currentConversationId === conv.id ? "bg-accent" : ""
                  }`}
                  onClick={() => setCurrentConversationId(conv.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{conv.title || "Untitled"}</p>
                      <p className="text-xs text-muted-foreground">
                        {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString() : "No messages"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameConversation(conv.id);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(conv.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredConversations?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No conversations yet
                </p>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Main Content */}
        <Card className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Assistant
                {isListening && (
                  <span className="flex items-center gap-1.5 text-sm font-normal text-muted-foreground ml-4">
                    <Mic className="h-4 w-4 text-blue-500 animate-pulse" />
                    Listening for "Hey SintraPrime"...
                  </span>
                )}
              </CardTitle>
              <TabsList>
                <TabsTrigger value="chat">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="prompts">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Prompts
                </TabsTrigger>
                <TabsTrigger value="compare">
                  <Files className="h-4 w-4 mr-2" />
                  Compare
                </TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>

          <Separator />

          <TabsContent value="chat" className="flex-1 flex flex-col m-0">
            {/* Disclaimer */}
            <div className="p-4 pb-2">
              <Card className="border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/10">
                <CardContent className="py-2 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    AI responses are for informational purposes only and do not constitute legal advice.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">Start a conversation</p>
                    <p className="text-sm text-muted-foreground">
                      Ask about legal research, case analysis, or document review
                    </p>
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <>
                          <Streamdown>{msg.content}</Streamdown>
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <AudioPlayer text={msg.content} />
                          </div>
                        </>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t">
              {uploadedFiles.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {uploadedFiles.map((file, idx) => (
                    <Badge key={idx} variant="secondary">
                      <FileText className="h-3 w-3 mr-1" />
                      {file.name}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Audio Player */}
              {currentAudioUrl && (
                <div className="mb-4">
                  <AudioPlayer
                    audioUrl={currentAudioUrl}
                    onVoiceChange={(voice) => setSelectedVoice(voice)}
                    onSpeedChange={(speed) => setSelectedSpeed(speed)}
                    defaultVoice={selectedVoice}
                    defaultSpeed={selectedSpeed}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <VoiceInputButton
                  onTranscript={(text) => {
                    setInputMessage((prev) => prev + " " + text);
                  }}
                  onError={(error) => {
                    toast.error(error);
                  }}
                  disabled={isLoading}
                />
                <Input
                  placeholder="Type your message..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={isLoading}
                />
                <Button onClick={handleSendMessage} disabled={isLoading}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>        </div>
          </TabsContent>

          <TabsContent value="prompts" className="flex-1 m-0 p-4">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={selectedCategory === null ? "default" : "outline"}
                  onClick={() => setSelectedCategory(null)}
                >
                  All
                </Button>
                {Object.keys(SUGGESTED_PROMPTS).map((category) => (
                  <Button
                    key={category}
                    size="sm"
                    variant={selectedCategory === category ? "default" : "outline"}
                    onClick={() => setSelectedCategory(category as keyof typeof SUGGESTED_PROMPTS)}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {suggestedPromptsQuery.data?.map((prompt) => (
                  <Card
                    key={prompt.id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => {
                      handlePromptClick(prompt.prompt);
                      setActiveTab("chat");
                    }}
                  >
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-2">{prompt.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {prompt.prompt}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="compare" className="flex-1 m-0 p-4">
            {comparisonDocuments.length === 0 ? (
              <div className="text-center py-12">
                <Files className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Collaborative Document Comparison</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload multiple documents to compare side-by-side with real-time collaboration
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.multiple = true;
                      input.accept = '.txt,.md,.pdf,.doc,.docx';
                      input.onchange = async (e) => {
                        const files = (e.target as HTMLInputElement).files;
                        if (!files || files.length === 0) return;
                        
                        setIsUploadingDocs(true);
                        const uploadedDocs: Array<{ name: string; content: string }> = [];
                        
                        try {
                          for (const file of Array.from(files)) {
                            // Read file content
                            const reader = new FileReader();
                            const content = await new Promise<string>((resolve, reject) => {
                              reader.onload = () => resolve(reader.result as string);
                              reader.onerror = reject;
                              reader.readAsText(file);
                            });
                            
                            // Upload to S3
                            const buffer = await file.arrayBuffer();
                            const uint8Array = new Uint8Array(buffer);
                            const base64 = btoa(Array.from(uint8Array).map(b => String.fromCharCode(b)).join(''));
                            
                            const result = await uploadFileMutation.mutateAsync({
                              fileName: file.name,
                              base64Data: base64,
                              mimeType: file.type || 'text/plain',
                              context: 'document' as const,
                              caseId: 0, // Temporary case ID for comparison documents
                            });
                            
                            uploadedDocs.push({
                              name: file.name,
                              content: content.slice(0, 5000), // Limit preview to 5000 chars
                            });
                          }
                          
                          setComparisonDocuments(uploadedDocs);
                          setComparisonContent(`# Document Comparison Notes\n\nComparing ${uploadedDocs.length} documents...`);
                          toast.success(`${uploadedDocs.length} document(s) uploaded successfully`);
                        } catch (error) {
                          toast.error('Failed to upload documents');
                          console.error(error);
                        } finally {
                          setIsUploadingDocs(false);
                        }
                      };
                      input.click();
                    }}
                    disabled={isUploadingDocs}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploadingDocs ? 'Uploading...' : 'Upload Documents'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Load sample documents for demonstration
                      setComparisonDocuments([
                        { name: "Contract v1.pdf", content: "# Contract Version 1\n\nThis is the first version of the contract..." },
                        { name: "Contract v2.pdf", content: "# Contract Version 2\n\nThis is the updated version of the contract..." },
                      ]);
                      setComparisonContent("# Document Comparison Notes\n\nCompare the two contract versions and note key differences...");
                      toast.success("Sample documents loaded");
                    }}
                  >
                    Load Sample
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Comparing Documents</h3>
                    <p className="text-sm text-muted-foreground">
                      {comparisonDocuments.map(d => d.name).join(" vs ")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setComparisonDocuments([]);
                      setComparisonContent("");
                    }}
                  >
                    Clear
                  </Button>
                </div>

                {user && (
                  <CollaborativeEditor
                    workspaceId="ai-assistant-comparison"
                    documentId={`comparison-${currentConversationId || 'default'}`}
                    currentUser={{
                      id: user.openId,
                      name: user.name || 'Anonymous',
                      color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
                    }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Comparison Notes</CardTitle>
                        <CardDescription>
                          Collaborate with team members in real-time
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="prose max-w-none">
                          <pre className="whitespace-pre-wrap text-sm">{comparisonContent}</pre>
                        </div>
                      </CardContent>
                    </Card>
                  </CollaborativeEditor>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {comparisonDocuments.map((doc, idx) => (
                    <Card key={idx}>
                      <CardHeader>
                        <CardTitle className="text-sm">{doc.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="prose max-w-none text-xs">
                          <pre className="whitespace-pre-wrap">{doc.content}</pre>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
          </Tabs>
        </Card>
      </div>
    </DashboardLayout>
  );
}
