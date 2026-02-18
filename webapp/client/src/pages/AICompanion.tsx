import DashboardLayout from "@/components/DashboardLayout";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useTierGate } from "@/hooks/useTierGate";
import UpgradePrompt from "@/components/UpgradePrompt";
import { Badge } from "@/components/ui/badge";

const SUGGESTED_PROMPTS = [
  "What are my rights under the FDCPA?",
  "Help me draft a debt validation letter",
  "Explain FCRA dispute procedures",
  "What is a RICO claim and when does it apply?",
  "How do I file a complaint with the CFPB?",
  "Explain the statute of limitations for debt collection",
];

export default function AICompanion() {
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { tier, limits, usage, canSendAiMessage, aiMessagesRemaining } = useTierGate();

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
      setIsLoading(false);
    },
    onError: (error) => {
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `I encountered an error processing your request. Please try again.\n\nError: ${error.message}`,
        },
      ]);
      setIsLoading(false);
    },
  });

  const handleSendMessage = (content: string) => {
    setMessages(prev => [
      ...prev,
      { role: "user", content },
    ]);
    setIsLoading(true);

    chatMutation.mutate({
      sessionId,
      message: content,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 h-[calc(100vh-6rem)]">
        <div>
          <h1 className="text-3xl font-bold">AI Companion</h1>
          <p className="text-muted-foreground">
            Your legal research and strategy assistant
          </p>
        </div>

        {/* Tier usage info */}
        {tier === "free" && (
          <div className="flex items-center gap-2">
            <Badge variant={canSendAiMessage ? "secondary" : "destructive"} className="text-xs">
              {canSendAiMessage
                ? `${aiMessagesRemaining} messages remaining today`
                : "Daily limit reached"}
            </Badge>
            {!canSendAiMessage && (
              <UpgradePrompt feature="Unlimited AI Messages" requiredTier="pro" currentTier={tier} compact />
            )}
          </div>
        )}

        {/* Disclaimer */}
        <Card className="border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/10">
          <CardContent className="py-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              SintraPrime AI is a research tool, not a lawyer. Responses are for informational purposes only 
              and do not constitute legal advice. Always consult a licensed attorney for your specific situation.
            </p>
          </CardContent>
        </Card>

        <AIChatBox
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          placeholder="Ask about legal research, strategy, or case analysis..."
          height="calc(100vh - 16rem)"
          emptyStateMessage="Ask me anything about legal research, strategy, or case analysis"
          suggestedPrompts={SUGGESTED_PROMPTS}
        />
      </div>
    </DashboardLayout>
  );
}
