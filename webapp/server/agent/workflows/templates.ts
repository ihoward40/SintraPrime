/**
 * Pre-built agent workflow templates for common legal tasks
 * 
 * These templates define multi-step workflows that combine multiple agent patterns
 * to accomplish complex legal tasks automatically.
 */

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: "contract" | "research" | "filing" | "discovery" | "client";
  estimatedTime: string;
  requiredInputs: {
    name: string;
    type: "text" | "file" | "date" | "select";
    description: string;
    required: boolean;
    options?: string[];
  }[];
  steps: {
    name: string;
    description: string;
    agentPattern: "sequential" | "parallel" | "router" | "reflect" | "consensus";
    tools: string[];
  }[];
  outputFormat: "document" | "report" | "email" | "form";
}

export const workflowTemplates: WorkflowTemplate[] = [
  // ============================================================================
  // CONTRACT WORKFLOWS
  // ============================================================================
  {
    id: "contract_review_pipeline",
    name: "Contract Review Pipeline",
    description: "Comprehensive contract analysis with risk assessment, clause review, and recommendations",
    category: "contract",
    estimatedTime: "5-10 minutes",
    requiredInputs: [
      {
        name: "contract_text",
        type: "text",
        description: "Full text of the contract to review",
        required: true,
      },
      {
        name: "contract_type",
        type: "select",
        description: "Type of contract",
        required: true,
        options: ["Employment", "Service Agreement", "NDA", "Lease", "Purchase Agreement", "Other"],
      },
      {
        name: "jurisdiction",
        type: "text",
        description: "Relevant jurisdiction (e.g., California, New York)",
        required: false,
      },
    ],
    steps: [
      {
        name: "Initial Analysis",
        description: "Extract key terms, parties, and obligations",
        agentPattern: "sequential",
        tools: ["document_generator"],
      },
      {
        name: "Risk Assessment",
        description: "Identify potential risks and unusual clauses",
        agentPattern: "parallel",
        tools: ["web_search", "citation_checker"],
      },
      {
        name: "Legal Research",
        description: "Research relevant case law and statutes",
        agentPattern: "parallel",
        tools: ["web_search"],
      },
      {
        name: "Quality Review",
        description: "Critic agent reviews findings and suggests improvements",
        agentPattern: "reflect",
        tools: ["document_generator"],
      },
      {
        name: "Generate Report",
        description: "Compile findings into comprehensive report",
        agentPattern: "sequential",
        tools: ["document_generator"],
      },
    ],
    outputFormat: "report",
  },

  {
    id: "contract_drafting_workflow",
    name: "Contract Drafting Workflow",
    description: "Draft a new contract from scratch with clause library and best practices",
    category: "contract",
    estimatedTime: "10-15 minutes",
    requiredInputs: [
      {
        name: "contract_type",
        type: "select",
        description: "Type of contract to draft",
        required: true,
        options: ["Employment", "Service Agreement", "NDA", "Consulting Agreement", "Partnership Agreement"],
      },
      {
        name: "parties",
        type: "text",
        description: "Names and roles of parties (e.g., Company XYZ as Employer, John Doe as Employee)",
        required: true,
      },
      {
        name: "key_terms",
        type: "text",
        description: "Key terms and conditions to include",
        required: true,
      },
      {
        name: "jurisdiction",
        type: "text",
        description: "Governing law jurisdiction",
        required: true,
      },
    ],
    steps: [
      {
        name: "Research Best Practices",
        description: "Find similar contracts and best practices",
        agentPattern: "parallel",
        tools: ["web_search"],
      },
      {
        name: "Draft Initial Version",
        description: "Create first draft with standard clauses",
        agentPattern: "sequential",
        tools: ["document_generator"],
      },
      {
        name: "Legal Compliance Check",
        description: "Verify compliance with jurisdiction requirements",
        agentPattern: "parallel",
        tools: ["web_search", "citation_checker"],
      },
      {
        name: "Iterative Refinement",
        description: "Critic reviews and suggests improvements",
        agentPattern: "reflect",
        tools: ["document_generator"],
      },
      {
        name: "Final Polish",
        description: "Format and finalize document",
        agentPattern: "sequential",
        tools: ["document_generator"],
      },
    ],
    outputFormat: "document",
  },

  // ============================================================================
  // RESEARCH WORKFLOWS
  // ============================================================================
  {
    id: "legal_research_memo",
    name: "Legal Research Memo",
    description: "Comprehensive legal research with case law, statutes, and analysis",
    category: "research",
    estimatedTime: "15-20 minutes",
    requiredInputs: [
      {
        name: "legal_question",
        type: "text",
        description: "The legal question or issue to research",
        required: true,
      },
      {
        name: "jurisdiction",
        type: "text",
        description: "Relevant jurisdiction(s)",
        required: true,
      },
      {
        name: "practice_area",
        type: "select",
        description: "Practice area",
        required: false,
        options: ["Consumer Protection", "Employment", "Contract", "Tort", "Criminal", "Family", "Other"],
      },
    ],
    steps: [
      {
        name: "Parallel Research",
        description: "Search case law, statutes, and secondary sources simultaneously",
        agentPattern: "parallel",
        tools: ["web_search"],
      },
      {
        name: "Citation Validation",
        description: "Verify all citations are accurate and current",
        agentPattern: "sequential",
        tools: ["citation_checker", "web_search"],
      },
      {
        name: "Multi-Agent Analysis",
        description: "Multiple agents analyze findings and vote on conclusions",
        agentPattern: "consensus",
        tools: ["document_generator"],
      },
      {
        name: "Draft Memo",
        description: "Compile research into formal legal memo",
        agentPattern: "sequential",
        tools: ["document_generator"],
      },
      {
        name: "Quality Assurance",
        description: "Senior agent reviews for accuracy and completeness",
        agentPattern: "reflect",
        tools: ["document_generator", "citation_checker"],
      },
    ],
    outputFormat: "report",
  },

  {
    id: "case_law_finder",
    name: "Case Law Finder",
    description: "Find and summarize relevant case law for a specific legal issue",
    category: "research",
    estimatedTime: "10-15 minutes",
    requiredInputs: [
      {
        name: "legal_issue",
        type: "text",
        description: "Description of the legal issue",
        required: true,
      },
      {
        name: "jurisdiction",
        type: "text",
        description: "Jurisdiction (state or federal)",
        required: true,
      },
      {
        name: "date_range",
        type: "text",
        description: "Date range for cases (e.g., 2020-2026)",
        required: false,
      },
    ],
    steps: [
      {
        name: "Broad Search",
        description: "Cast wide net for potentially relevant cases",
        agentPattern: "parallel",
        tools: ["web_search"],
      },
      {
        name: "Filter and Rank",
        description: "Filter results by relevance and authority",
        agentPattern: "sequential",
        tools: ["citation_checker"],
      },
      {
        name: "Summarize Cases",
        description: "Create summaries of top cases",
        agentPattern: "parallel",
        tools: ["document_generator"],
      },
      {
        name: "Generate Report",
        description: "Compile into organized report with citations",
        agentPattern: "sequential",
        tools: ["document_generator", "citation_checker"],
      },
    ],
    outputFormat: "report",
  },

  // ============================================================================
  // COURT FILING WORKFLOWS
  // ============================================================================
  {
    id: "complaint_drafting",
    name: "Complaint Drafting",
    description: "Draft a comprehensive complaint with research-backed claims",
    category: "filing",
    estimatedTime: "20-30 minutes",
    requiredInputs: [
      {
        name: "case_type",
        type: "select",
        description: "Type of case",
        required: true,
        options: ["Consumer Protection", "Employment Discrimination", "Personal Injury", "Contract Dispute", "Other"],
      },
      {
        name: "facts",
        type: "text",
        description: "Statement of facts",
        required: true,
      },
      {
        name: "parties",
        type: "text",
        description: "Plaintiff(s) and Defendant(s) information",
        required: true,
      },
      {
        name: "jurisdiction",
        type: "text",
        description: "Court and jurisdiction",
        required: true,
      },
      {
        name: "claims",
        type: "text",
        description: "Legal claims to assert",
        required: true,
      },
    ],
    steps: [
      {
        name: "Research Claims",
        description: "Find supporting case law and statutes for each claim",
        agentPattern: "parallel",
        tools: ["web_search", "citation_checker"],
      },
      {
        name: "Draft Complaint",
        description: "Create initial complaint with proper formatting",
        agentPattern: "sequential",
        tools: ["document_generator"],
      },
      {
        name: "Legal Review",
        description: "Review for legal sufficiency and completeness",
        agentPattern: "reflect",
        tools: ["document_generator", "citation_checker"],
      },
      {
        name: "Format Check",
        description: "Ensure compliance with court rules",
        agentPattern: "sequential",
        tools: ["document_generator"],
      },
      {
        name: "Final Review",
        description: "Multi-agent consensus on final version",
        agentPattern: "consensus",
        tools: ["document_generator"],
      },
    ],
    outputFormat: "document",
  },

  {
    id: "motion_to_dismiss_response",
    name: "Motion to Dismiss Response",
    description: "Draft opposition to motion to dismiss with legal research",
    category: "filing",
    estimatedTime: "25-35 minutes",
    requiredInputs: [
      {
        name: "motion_text",
        type: "text",
        description: "Text of the motion to dismiss",
        required: true,
      },
      {
        name: "complaint_text",
        type: "text",
        description: "Text of the original complaint",
        required: true,
      },
      {
        name: "jurisdiction",
        type: "text",
        description: "Court and jurisdiction",
        required: true,
      },
    ],
    steps: [
      {
        name: "Analyze Motion",
        description: "Extract arguments and legal theories",
        agentPattern: "sequential",
        tools: ["document_generator"],
      },
      {
        name: "Research Counterarguments",
        description: "Find case law supporting opposition",
        agentPattern: "parallel",
        tools: ["web_search", "citation_checker"],
      },
      {
        name: "Draft Response",
        description: "Create opposition brief",
        agentPattern: "sequential",
        tools: ["document_generator"],
      },
      {
        name: "Strengthen Arguments",
        description: "Critic reviews and suggests improvements",
        agentPattern: "reflect",
        tools: ["document_generator", "citation_checker"],
      },
      {
        name: "Final Polish",
        description: "Format and finalize",
        agentPattern: "sequential",
        tools: ["document_generator"],
      },
    ],
    outputFormat: "document",
  },

  // ============================================================================
  // DISCOVERY WORKFLOWS
  // ============================================================================
  {
    id: "interrogatory_generator",
    name: "Interrogatory Generator",
    description: "Generate comprehensive interrogatories tailored to case type",
    category: "discovery",
    estimatedTime: "10-15 minutes",
    requiredInputs: [
      {
        name: "case_type",
        type: "select",
        description: "Type of case",
        required: true,
        options: ["Personal Injury", "Employment", "Contract", "Consumer Protection", "Other"],
      },
      {
        name: "key_issues",
        type: "text",
        description: "Key issues to explore in discovery",
        required: true,
      },
      {
        name: "jurisdiction",
        type: "text",
        description: "Jurisdiction (for interrogatory limits)",
        required: true,
      },
    ],
    steps: [
      {
        name: "Research Standard Interrogatories",
        description: "Find standard interrogatories for case type",
        agentPattern: "parallel",
        tools: ["web_search"],
      },
      {
        name: "Draft Custom Questions",
        description: "Create case-specific interrogatories",
        agentPattern: "sequential",
        tools: ["document_generator"],
      },
      {
        name: "Review and Refine",
        description: "Ensure questions are clear and not objectionable",
        agentPattern: "reflect",
        tools: ["document_generator"],
      },
      {
        name: "Format",
        description: "Format according to court rules",
        agentPattern: "sequential",
        tools: ["document_generator"],
      },
    ],
    outputFormat: "document",
  },

  {
    id: "document_request_generator",
    name: "Document Request Generator",
    description: "Generate requests for production of documents",
    category: "discovery",
    estimatedTime: "10-15 minutes",
    requiredInputs: [
      {
        name: "case_type",
        type: "select",
        description: "Type of case",
        required: true,
        options: ["Personal Injury", "Employment", "Contract", "Consumer Protection", "Other"],
      },
      {
        name: "document_categories",
        type: "text",
        description: "Categories of documents needed",
        required: true,
      },
    ],
    steps: [
      {
        name: "Research Standard Requests",
        description: "Find standard document requests",
        agentPattern: "parallel",
        tools: ["web_search"],
      },
      {
        name: "Draft Requests",
        description: "Create comprehensive document requests",
        agentPattern: "sequential",
        tools: ["document_generator"],
      },
      {
        name: "Review Scope",
        description: "Ensure requests are neither too broad nor too narrow",
        agentPattern: "reflect",
        tools: ["document_generator"],
      },
      {
        name: "Format",
        description: "Format according to court rules",
        agentPattern: "sequential",
        tools: ["document_generator"],
      },
    ],
    outputFormat: "document",
  },

  // ============================================================================
  // CLIENT COMMUNICATION WORKFLOWS
  // ============================================================================
  {
    id: "demand_letter_generator",
    name: "Demand Letter Generator",
    description: "Draft persuasive demand letter with legal research",
    category: "client",
    estimatedTime: "15-20 minutes",
    requiredInputs: [
      {
        name: "claim_type",
        type: "select",
        description: "Type of claim",
        required: true,
        options: ["Debt Collection Violation", "Personal Injury", "Contract Breach", "Employment", "Other"],
      },
      {
        name: "facts",
        type: "text",
        description: "Facts of the case",
        required: true,
      },
      {
        name: "damages",
        type: "text",
        description: "Damages claimed",
        required: true,
      },
      {
        name: "recipient",
        type: "text",
        description: "Recipient name and address",
        required: true,
      },
    ],
    steps: [
      {
        name: "Research Legal Basis",
        description: "Find statutes and case law supporting claim",
        agentPattern: "parallel",
        tools: ["web_search", "citation_checker"],
      },
      {
        name: "Draft Letter",
        description: "Create persuasive demand letter",
        agentPattern: "sequential",
        tools: ["document_generator"],
      },
      {
        name: "Strengthen Arguments",
        description: "Review and enhance persuasiveness",
        agentPattern: "reflect",
        tools: ["document_generator"],
      },
      {
        name: "Final Review",
        description: "Ensure professional tone and accuracy",
        agentPattern: "sequential",
        tools: ["document_generator"],
      },
    ],
    outputFormat: "document",
  },

  {
    id: "client_update_email",
    name: "Client Update Email",
    description: "Generate professional client update email with case status",
    category: "client",
    estimatedTime: "5-10 minutes",
    requiredInputs: [
      {
        name: "case_name",
        type: "text",
        description: "Name of the case",
        required: true,
      },
      {
        name: "updates",
        type: "text",
        description: "Recent developments and updates",
        required: true,
      },
      {
        name: "next_steps",
        type: "text",
        description: "Upcoming actions and deadlines",
        required: true,
      },
    ],
    steps: [
      {
        name: "Draft Email",
        description: "Create professional update email",
        agentPattern: "sequential",
        tools: ["document_generator"],
      },
      {
        name: "Review Tone",
        description: "Ensure appropriate tone and clarity",
        agentPattern: "reflect",
        tools: ["document_generator"],
      },
      {
        name: "Format",
        description: "Format for email delivery",
        agentPattern: "sequential",
        tools: ["email_sender"],
      },
    ],
    outputFormat: "email",
  },
];

/**
 * Get workflow template by ID
 */
export function getWorkflowTemplate(id: string): WorkflowTemplate | undefined {
  return workflowTemplates.find((t) => t.id === id);
}

/**
 * Get workflows by category
 */
export function getWorkflowsByCategory(category: WorkflowTemplate["category"]): WorkflowTemplate[] {
  return workflowTemplates.filter((t) => t.category === category);
}

/**
 * Get all workflow categories
 */
export function getWorkflowCategories(): Array<{ id: WorkflowTemplate["category"]; name: string; count: number }> {
  const categories = [
    { id: "contract" as const, name: "Contract Management" },
    { id: "research" as const, name: "Legal Research" },
    { id: "filing" as const, name: "Court Filings" },
    { id: "discovery" as const, name: "Discovery" },
    { id: "client" as const, name: "Client Communication" },
  ];

  return categories.map((cat) => ({
    ...cat,
    count: workflowTemplates.filter((t) => t.category === cat.id).length,
  }));
}
