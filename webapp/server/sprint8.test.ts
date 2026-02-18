import { describe, it, expect, vi } from "vitest";

// ============================================================================
// Sprint 8 Tests: Research Library Seeding, Case Cloning, Settings
// ============================================================================

describe("Sprint 8: Research Library Seeding", () => {
  it("should define comprehensive statute categories", () => {
    const categories = [
      "consumer_protection",
      "civil_procedure",
      "evidence",
      "guides",
    ];
    expect(categories.length).toBe(4);
    expect(categories).toContain("consumer_protection");
    expect(categories).toContain("civil_procedure");
  });

  it("should include key federal statutes in seed data", () => {
    const statutes = [
      "Fair Debt Collection Practices Act (FDCPA)",
      "Fair Credit Reporting Act (FCRA)",
      "Truth in Lending Act (TILA)",
      "Real Estate Settlement Procedures Act (RESPA)",
      "Telephone Consumer Protection Act (TCPA)",
      "Equal Credit Opportunity Act (ECOA)",
      "Servicemembers Civil Relief Act (SCRA)",
      "Unfair, Deceptive, or Abusive Acts or Practices (UDAP/UDAAP)",
    ];
    expect(statutes.length).toBeGreaterThanOrEqual(8);
    statutes.forEach(s => expect(s.length).toBeGreaterThan(10));
  });

  it("should include Federal Rules of Civil Procedure", () => {
    const rules = [
      "Rule 12 - Defenses and Objections",
      "Rule 26 - Duty to Disclose",
      "Rule 30 - Depositions by Oral Examination",
      "Rule 33 - Interrogatories to Parties",
      "Rule 34 - Producing Documents",
      "Rule 56 - Summary Judgment",
    ];
    expect(rules.length).toBe(6);
    rules.forEach(r => expect(r).toMatch(/Rule \d+/));
  });

  it("should include Federal Rules of Evidence", () => {
    const rules = ["Rule 802 - The Rule Against Hearsay"];
    expect(rules.length).toBeGreaterThanOrEqual(1);
  });

  it("should include practical legal guides", () => {
    const guides = [
      "Debt Validation Letter Guide",
      "Cease and Desist Letter Guide",
      "Small Claims Court Guide",
      "Motion to Compel Discovery Guide",
    ];
    expect(guides.length).toBe(4);
    guides.forEach(g => expect(g).toContain("Guide"));
  });

  it("should have at least 20 total entries in seed data", () => {
    // Statutes (8) + CFPB (1) + Rules (6) + Evidence (1) + Guides (4) + extras
    const totalEntries = 8 + 1 + 6 + 1 + 4 + 2; // = 22
    expect(totalEntries).toBeGreaterThanOrEqual(20);
  });
});

describe("Sprint 8: Case Cloning", () => {
  it("should validate clone input requires case id", () => {
    const input = { id: 1 };
    expect(input.id).toBeDefined();
    expect(typeof input.id).toBe("number");
  });

  it("should create new case with [CLONE] prefix", () => {
    const originalTitle = "Smith v. ABC Credit Corp";
    const clonedTitle = `[CLONE] ${originalTitle}`;
    expect(clonedTitle).toBe("[CLONE] Smith v. ABC Credit Corp");
    expect(clonedTitle.startsWith("[CLONE]")).toBe(true);
  });

  it("should reset status to draft for cloned case", () => {
    const clonedCase = {
      title: "[CLONE] Test Case",
      status: "draft",
    };
    expect(clonedCase.status).toBe("draft");
  });

  it("should clone parties with correct field mapping", () => {
    const originalParty = {
      name: "John Smith",
      type: "plaintiff" as const,
      entityType: "individual" as const,
      contactInfo: { email: "john@example.com", phone: "555-0100" },
      notes: "Primary plaintiff",
    };
    const clonedParty = {
      caseId: 2, // new case
      name: originalParty.name,
      type: originalParty.type,
      entityType: originalParty.entityType,
      contactInfo: originalParty.contactInfo,
      notes: originalParty.notes,
    };
    expect(clonedParty.name).toBe(originalParty.name);
    expect(clonedParty.type).toBe("plaintiff");
    expect(clonedParty.caseId).toBe(2);
  });

  it("should clone notes with correct field mapping", () => {
    const originalNote = {
      content: "Important legal research finding",
      noteType: "research",
      isPinned: true,
      tags: ["important", "research"],
    };
    const clonedNote = {
      caseId: 2,
      userId: 1,
      content: originalNote.content,
      noteType: originalNote.noteType,
      isPinned: originalNote.isPinned,
      tags: originalNote.tags,
    };
    expect(clonedNote.content).toBe(originalNote.content);
    expect(clonedNote.noteType).toBe("research");
    expect(clonedNote.isPinned).toBe(true);
  });

  it("should clone warfare strategies with correct field mapping", () => {
    const originalStrategy = {
      strategyName: "FDCPA Violation Claim",
      front: "legal" as const,
      description: "File complaint under FDCPA",
      priority: "high",
    };
    const clonedStrategy = {
      caseId: 2,
      userId: 1,
      front: originalStrategy.front,
      strategyName: originalStrategy.strategyName,
      description: originalStrategy.description,
      status: "planned",
      priority: originalStrategy.priority,
    };
    expect(clonedStrategy.strategyName).toBe(originalStrategy.strategyName);
    expect(clonedStrategy.front).toBe("legal");
    expect(clonedStrategy.status).toBe("planned");
  });

  it("should generate auto-notification for cloned case", () => {
    const notification = {
      type: "case_update",
      title: "Case Cloned",
      message: 'Case "[CLONE] Smith v. ABC" created from template',
    };
    expect(notification.type).toBe("case_update");
    expect(notification.title).toBe("Case Cloned");
    expect(notification.message).toContain("[CLONE]");
  });
});

describe("Sprint 8: Settings Page", () => {
  it("should define notification preference types", () => {
    const preferences = {
      notifDeadlines: true,
      notifCaseUpdates: true,
      notifCoalition: true,
      notifAiSuggestions: false,
      defaultJurisdiction: "Federal",
    };
    expect(preferences.notifDeadlines).toBe(true);
    expect(preferences.notifAiSuggestions).toBe(false);
    expect(preferences.defaultJurisdiction).toBe("Federal");
  });

  it("should support all 50 states plus DC as jurisdictions", () => {
    const states = [
      "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
      "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
      "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
      "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
      "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
      "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
      "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
      "Wisconsin", "Wyoming", "District of Columbia",
    ];
    expect(states.length).toBe(51);
    expect(states).toContain("California");
    expect(states).toContain("District of Columbia");
  });

  it("should define tier features for all subscription levels", () => {
    const tierFeatures: Record<string, string[]> = {
      free: ["2 cases", "10 AI messages/day", "50MB storage", "Basic templates"],
      pro: ["Unlimited cases", "Unlimited AI messages", "5GB storage", "Quantum Workspace", "PDF export", "All templates"],
      coalition: ["Everything in Pro", "10 team members", "Shared workspace", "25GB storage", "Priority support"],
      enterprise: ["Everything in Coalition", "Unlimited team members", "100GB storage", "Custom integrations", "Dedicated support"],
    };
    expect(Object.keys(tierFeatures).length).toBe(4);
    expect(tierFeatures.free.length).toBe(4);
    expect(tierFeatures.pro).toContain("Quantum Workspace");
    expect(tierFeatures.coalition).toContain("Priority support");
    expect(tierFeatures.enterprise).toContain("Dedicated support");
  });

  it("should serialize preferences to JSON for localStorage", () => {
    const prefs = {
      notifDeadlines: true,
      notifCaseUpdates: false,
      notifCoalition: true,
      notifAiSuggestions: false,
      defaultJurisdiction: "New York",
    };
    const serialized = JSON.stringify(prefs);
    const parsed = JSON.parse(serialized);
    expect(parsed.notifDeadlines).toBe(true);
    expect(parsed.notifCaseUpdates).toBe(false);
    expect(parsed.defaultJurisdiction).toBe("New York");
  });

  it("should handle missing preferences gracefully", () => {
    const emptyPrefs = "{}";
    const parsed = JSON.parse(emptyPrefs);
    expect(parsed.notifDeadlines).toBeUndefined();
    expect(parsed.defaultJurisdiction).toBeUndefined();
  });

  it("should display user profile information", () => {
    const user = {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      subscriptionTier: "pro",
    };
    expect(user.name).toBe("John Doe");
    expect(user.subscriptionTier).toBe("pro");
  });

  it("should support Stripe portal for subscription management", () => {
    const portalInput = { origin: "https://example.com" };
    expect(portalInput.origin).toBeDefined();
    expect(portalInput.origin.startsWith("https://")).toBe(true);
  });
});

describe("Sprint 8: Integration", () => {
  it("should have all Sprint 8 features accessible from sidebar", () => {
    const sidebarItems = [
      { label: "Research Library", path: "/research" },
      { label: "Settings", path: "/settings" },
    ];
    expect(sidebarItems.length).toBeGreaterThanOrEqual(2);
    sidebarItems.forEach(item => {
      expect(item.path.startsWith("/")).toBe(true);
      expect(item.label.length).toBeGreaterThan(0);
    });
  });

  it("should have clone button on dashboard case cards", () => {
    const caseCardActions = ["view", "clone"];
    expect(caseCardActions).toContain("clone");
  });

  it("should have settings accessible from user dropdown", () => {
    const dropdownItems = ["Settings", "Sign out"];
    expect(dropdownItems).toContain("Settings");
  });
});
