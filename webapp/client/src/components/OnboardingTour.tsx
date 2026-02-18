import { useState, useEffect } from "react";
import Joyride, { Step, CallBackProps, STATUS } from "react-joyride";

interface OnboardingTourProps {
  page: "notebooklm" | "mission-control" | "dashboard";
}

const tourSteps: Record<string, Step[]> = {
  notebooklm: [
    {
      target: "body",
      content: "Welcome to NotebookLM! Your AI-powered research assistant for document analysis and insights.",
      placement: "center",
    },
    {
      target: "[data-tour='upload-document']",
      content: "Start by uploading documents - PDFs, DOCX files, or URLs. You can add up to 50 sources per collection.",
    },
    {
      target: "[data-tour='qa-tab']",
      content: "Ask questions about your documents and get source-grounded answers with citations.",
    },
    {
      target: "[data-tour='audio-tab']",
      content: "Generate podcast-style audio overviews with two AI voices discussing your research.",
    },
    {
      target: "[data-tour='search-tab']",
      content: "Use semantic search to find relevant information across all your documents.",
    },
  ],
  "mission-control": [
    {
      target: "body",
      content: "Welcome to Mission Control! Your AI Operating System command center.",
      placement: "center",
    },
    {
      target: "[data-tour='intelligence-tab']",
      content: "Browse 150+ AI tools with ratings, reviews, and detailed information.",
    },
    {
      target: "[data-tour='stack-builder-tab']",
      content: "Get AI-powered tool recommendations based on your project requirements.",
    },
    {
      target: "[data-tour='ai-roles-tab']",
      content: "Use specialized AI roles: Head of Innovation, Ghostwriter, and Prompt Engineer.",
    },
    {
      target: "[data-tour='recommendations-widget']",
      content: "View personalized tool recommendations based on your preferences and usage patterns.",
    },
  ],
  dashboard: [
    {
      target: "body",
      content: "Welcome to your Intelligence Dashboard! Real-time legal warfare command center.",
      placement: "center",
    },
    {
      target: "[data-tour='metrics']",
      content: "Monitor key metrics: total cases, active cases, success rate, and AI assistant availability.",
    },
    {
      target: "[data-tour='activity-chart']",
      content: "Track case activity trends over the last 6 months.",
    },
    {
      target: "[data-tour='quick-actions']",
      content: "Quick access to AI Companion, Agent Zero, and document management.",
    },
  ],
};

export function OnboardingTour({ page }: OnboardingTourProps) {
  const [run, setRun] = useState(false);
  const [steps] = useState<Step[]>(tourSteps[page] || []);

  useEffect(() => {
    // Check if user has completed this tour before
    const tourKey = `tour-completed-${page}`;
    const completed = localStorage.getItem(tourKey);
    
    if (!completed) {
      // Start tour after a short delay
      const timer = setTimeout(() => setRun(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [page]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      // Mark tour as completed
      localStorage.setItem(`tour-completed-${page}`, "true");
    }
  };

  const restartTour = () => {
    localStorage.removeItem(`tour-completed-${page}`);
    setRun(true);
  };

  // Expose restart function globally for "Help" menu
  useEffect(() => {
    (window as any)[`restart${page.replace(/-/g, "")}Tour`] = restartTour;
  }, [page]);

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          textColor: "hsl(var(--foreground))",
          backgroundColor: "hsl(var(--card))",
          arrowColor: "hsl(var(--card))",
          overlayColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 8,
          padding: 20,
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          borderRadius: 6,
          padding: "8px 16px",
        },
        buttonBack: {
          color: "hsl(var(--muted-foreground))",
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
        },
      }}
    />
  );
}
