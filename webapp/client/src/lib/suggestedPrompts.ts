export interface SuggestedPrompt {
  id: string;
  title: string;
  prompt: string;
  category: "analysis" | "drafting" | "research" | "strategy";
  icon: string;
  requiresFile?: boolean;
}

export const suggestedPrompts: SuggestedPrompt[] = [
  // Analysis
  {
    id: "analyze-contract",
    title: "Analyze Contract",
    prompt: "Please analyze this contract and identify key terms, potential issues, and risks. Focus on: payment terms, termination clauses, liability limitations, and any unusual provisions.",
    category: "analysis",
    icon: "📄",
    requiresFile: true,
  },
  {
    id: "review-evidence",
    title: "Review Evidence",
    prompt: "Review this evidence and provide a detailed analysis including: authenticity assessment, relevance to the case, potential admissibility issues, and strategic value.",
    category: "analysis",
    icon: "🔍",
    requiresFile: true,
  },
  {
    id: "case-strength",
    title: "Assess Case Strength",
    prompt: "Based on the case information provided, assess the overall strength of our position. Consider: legal merits, evidence quality, procedural posture, and potential weaknesses.",
    category: "analysis",
    icon: "⚖️",
  },
  
  // Drafting
  {
    id: "draft-motion-dismiss",
    title: "Draft Motion to Dismiss",
    prompt: "Draft a motion to dismiss based on the following grounds: [specify grounds]. Include: legal standard, factual background, argument section with case law citations, and conclusion.",
    category: "drafting",
    icon: "✍️",
  },
  {
    id: "draft-demand-letter",
    title: "Draft Demand Letter",
    prompt: "Draft a professional demand letter addressing: [specify issue]. Include: statement of facts, legal basis for claim, specific demands, deadline for response, and consequences of non-compliance.",
    category: "drafting",
    icon: "📨",
  },
  {
    id: "draft-discovery",
    title: "Draft Discovery Requests",
    prompt: "Draft comprehensive discovery requests (interrogatories, requests for production, requests for admission) targeting: [specify areas of inquiry]. Ensure requests are specific, relevant, and properly formatted.",
    category: "drafting",
    icon: "📋",
  },
  
  // Research
  {
    id: "research-case-law",
    title: "Research Case Law",
    prompt: "Research case law on the following legal issue: [describe issue]. Find relevant precedents from [jurisdiction], focusing on recent decisions and binding authority. Summarize key holdings and their applicability.",
    category: "research",
    icon: "📚",
  },
  {
    id: "research-statute",
    title: "Analyze Statute",
    prompt: "Analyze the following statute: [cite statute]. Provide: plain language explanation, key definitions, elements/requirements, relevant case law interpreting the statute, and practical application.",
    category: "research",
    icon: "📖",
  },
  {
    id: "research-jurisdiction",
    title: "Jurisdictional Analysis",
    prompt: "Analyze whether [court name] has jurisdiction over this matter. Consider: subject matter jurisdiction, personal jurisdiction, venue, and any potential jurisdictional defenses.",
    category: "research",
    icon: "🏛️",
  },
  
  // Strategy
  {
    id: "litigation-strategy",
    title: "Develop Litigation Strategy",
    prompt: "Develop a comprehensive litigation strategy for this case. Include: key objectives, timeline with critical deadlines, discovery plan, motion practice strategy, settlement considerations, and potential obstacles.",
    category: "strategy",
    icon: "🎯",
  },
  {
    id: "settlement-analysis",
    title: "Settlement Analysis",
    prompt: "Analyze settlement options for this case. Consider: strengths and weaknesses, litigation costs and risks, potential settlement value range, negotiation leverage points, and recommended settlement approach.",
    category: "strategy",
    icon: "🤝",
  },
  {
    id: "warfare-tactics",
    title: "Legal Warfare Tactics",
    prompt: "Identify aggressive but ethical legal warfare tactics for this case. Consider: procedural maneuvers, discovery pressure points, motion practice opportunities, public relations angles, and multi-front strategies.",
    category: "strategy",
    icon: "⚔️",
  },
];

export function getPromptsByCategory(category: SuggestedPrompt["category"]) {
  return suggestedPrompts.filter((p) => p.category === category);
}

export function getPromptById(id: string) {
  return suggestedPrompts.find((p) => p.id === id);
}
