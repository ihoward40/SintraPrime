import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Scale,
  FileText,
  Brain,
  Calculator,
  Shield,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Sparkles,
  Briefcase,
  Upload,
  MessageSquare,
  Clock,
} from "lucide-react";

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

const STEPS = [
  {
    id: "welcome",
    title: "Welcome to SintraPrime",
    subtitle: "Your Legal Warfare Command Center",
    icon: Scale,
    description:
      "SintraPrime empowers you with advanced legal tools, AI-powered research, and strategic planning capabilities. Let's take a quick tour of what you can do.",
    features: [
      { icon: Briefcase, label: "Case Management", desc: "Organize and track all your legal cases" },
      { icon: Brain, label: "AI Companion", desc: "Legal research assistant powered by AI" },
      { icon: FileText, label: "Document Templates", desc: "Pre-built legal document templates" },
      { icon: Calculator, label: "Deadline Calculator", desc: "Never miss a filing deadline" },
    ],
  },
  {
    id: "cases",
    title: "Create Your First Case",
    subtitle: "Start organizing your legal matters",
    icon: Briefcase,
    description:
      "Cases are the foundation of SintraPrime. Create a case to organize documents, evidence, timelines, and strategies all in one place.",
    action: { label: "Go to Dashboard", path: "/dashboard" },
    tips: [
      "Click '+ New Case' on the Dashboard to get started",
      "Add case details like type (FDCPA, FCRA, etc.), jurisdiction, and priority",
      "Track case status from draft through resolution",
    ],
  },
  {
    id: "documents",
    title: "Upload Documents & Evidence",
    subtitle: "Build your case file",
    icon: Upload,
    description:
      "Upload legal documents and evidence directly to your cases. Use our template library to generate complaint letters, dispute letters, and more.",
    action: { label: "Go to Documents", path: "/documents" },
    tips: [
      "Drag and drop files to upload (PDF, DOC, images supported)",
      "Use templates for FDCPA validation letters, FCRA disputes, and more",
      "Evidence uploads include automatic chain of custody tracking",
    ],
  },
  {
    id: "ai",
    title: "Meet Your AI Companion",
    subtitle: "Legal research at your fingertips",
    icon: MessageSquare,
    description:
      "The AI Companion is your 24/7 legal research assistant. Ask questions about statutes, case law, filing procedures, and legal strategy.",
    action: { label: "Try AI Companion", path: "/ai-companion" },
    tips: [
      "Ask about specific statutes like FDCPA § 1692g or FCRA § 1681i",
      "Get help drafting legal arguments and responses",
      "Research case law and procedural requirements",
      "Remember: AI is a tool, not a lawyer — always verify with legal counsel",
    ],
  },
  {
    id: "deadlines",
    title: "Calculate Filing Deadlines",
    subtitle: "Never miss a critical date",
    icon: Clock,
    description:
      "The Deadline Calculator computes filing deadlines based on federal statutes (FDCPA, FCRA, TILA, RESPA) and state-specific statute of limitations.",
    action: { label: "Try Deadline Calculator", path: "/deadline-calculator" },
    tips: [
      "Select a statute and enter the trigger date to see all applicable deadlines",
      "Covers all 50 states plus DC for statute of limitations",
      "Federal civil procedure deadlines for answer, discovery, and appeals",
    ],
  },
  {
    id: "complete",
    title: "You're All Set!",
    subtitle: "Start building your legal strategy",
    icon: Sparkles,
    description:
      "You now know the essentials of SintraPrime. Explore Warfare Strategies for multi-front planning, Coalitions for team collaboration, and Legal Alerts to stay informed.",
    extras: [
      { icon: Shield, label: "Warfare Strategies", desc: "Plan across 7 strategic fronts" },
      { icon: Scale, label: "Coalitions", desc: "Collaborate with your legal team" },
      { icon: FileText, label: "Legal Alerts", desc: "Stay updated on legal changes" },
    ],
  },
];

export default function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [, setLocation] = useLocation();
  const completeMutation = trpc.onboarding.complete.useMutation();

  const step = STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === STEPS.length - 1;
  const StepIcon = step.icon;

  const handleNext = () => {
    if (isLast) {
      completeMutation.mutate(undefined, {
        onSuccess: () => onComplete(),
      });
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    completeMutation.mutate(undefined, {
      onSuccess: () => onSkip(),
    });
  };

  const handleAction = (path: string) => {
    completeMutation.mutate(undefined, {
      onSuccess: () => {
        onComplete();
        setLocation(path);
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <CardHeader className="relative pb-2">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors"
            aria-label="Skip onboarding"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mb-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentStep
                    ? "w-6 bg-primary"
                    : i < currentStep
                    ? "w-1.5 bg-primary/50"
                    : "w-1.5 bg-muted-foreground/20"
                }`}
              />
            ))}
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="p-3 rounded-xl bg-primary/10 mb-3">
              <StepIcon className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{step.title}</CardTitle>
            <CardDescription className="text-base mt-1">{step.subtitle}</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-2">
          <p className="text-center text-muted-foreground leading-relaxed">{step.description}</p>

          {/* Welcome step features grid */}
          {"features" in step && step.features && (
            <div className="grid grid-cols-2 gap-3">
              {step.features.map((f) => {
                const FIcon = f.icon;
                return (
                  <div key={f.label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <FIcon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{f.label}</p>
                      <p className="text-xs text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tips list */}
          {"tips" in step && step.tips && (
            <div className="space-y-2">
              {step.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{tip}</span>
                </div>
              ))}
            </div>
          )}

          {/* Complete step extras */}
          {"extras" in step && step.extras && (
            <div className="grid grid-cols-3 gap-3">
              {step.extras.map((e) => {
                const EIcon = e.icon;
                return (
                  <div key={e.label} className="text-center p-3 rounded-lg bg-muted/50">
                    <EIcon className="h-5 w-5 text-primary mx-auto mb-1" />
                    <p className="font-medium text-xs">{e.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{e.desc}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action button for specific steps */}
          {"action" in step && step.action && (
            <div className="text-center">
              <Button variant="outline" onClick={() => handleAction(step.action!.path)}>
                {step.action.label}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              variant="ghost"
              onClick={() => setCurrentStep((s) => s - 1)}
              disabled={isFirst}
              className={isFirst ? "invisible" : ""}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <div className="flex items-center gap-2">
              {!isLast && (
                <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
                  Skip Tour
                </Button>
              )}
              <Button onClick={handleNext}>
                {isLast ? (
                  <>
                    Get Started
                    <Sparkles className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
