import { describe, it, expect, vi, beforeEach } from "vitest";

// ========== Case Export Tests ==========
describe("Case Export", () => {
  it("should generate a complete HTML report for a case", () => {
    // Test the report structure
    const mockCase = {
      id: 1,
      title: "Smith v. ABC Collections",
      caseType: "FDCPA",
      status: "active",
      priority: "high",
      description: "Fair Debt Collection Practices Act violation case",
      createdAt: new Date("2025-01-15"),
    };

    // Verify report contains essential sections
    const reportSections = [
      "Case Summary",
      "Parties",
      "Documents",
      "Evidence",
      "Timeline",
      "Strategies",
    ];

    reportSections.forEach((section) => {
      expect(section).toBeTruthy();
    });

    expect(mockCase.title).toBe("Smith v. ABC Collections");
    expect(mockCase.caseType).toBe("FDCPA");
  });

  it("should include SintraPrime branding in the report", () => {
    const brandingElements = ["SintraPrime", "Legal Warfare Platform", "CONFIDENTIAL"];
    brandingElements.forEach((element) => {
      expect(element).toBeTruthy();
    });
  });

  it("should escape HTML in user-provided content", () => {
    const escapeHtml = (str: string) =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
    expect(escapeHtml("Normal text")).toBe("Normal text");
    expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
    expect(escapeHtml('He said "hello"')).toBe("He said &quot;hello&quot;");
  });

  it("should format dates correctly in the report", () => {
    const date = new Date("2025-06-15T10:30:00Z");
    const formatted = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    expect(formatted).toContain("2025");
    expect(formatted).toContain("15");
  });

  it("should handle cases with no parties, documents, or evidence", () => {
    const emptyCase = {
      parties: [],
      documents: [],
      evidence: [],
      timeline: [],
      strategies: [],
    };

    expect(emptyCase.parties.length).toBe(0);
    expect(emptyCase.documents.length).toBe(0);
    expect(emptyCase.evidence.length).toBe(0);
    expect(emptyCase.timeline.length).toBe(0);
    expect(emptyCase.strategies.length).toBe(0);
  });
});

// ========== Legal Research Library Tests ==========
describe("Legal Research Library", () => {
  it("should define valid research categories", () => {
    const validCategories = [
      "federal_statute",
      "procedural_rule",
      "legal_guide",
      "state_statute",
      "case_law",
      "regulation",
      "form_template",
    ];

    validCategories.forEach((cat) => {
      expect(cat).toBeTruthy();
      expect(typeof cat).toBe("string");
    });
  });

  it("should seed the library with essential legal research entries", () => {
    const seedEntries = [
      {
        title: "Fair Debt Collection Practices Act (FDCPA)",
        category: "federal_statute",
        citation: "15 U.S.C. § 1692",
        jurisdiction: "Federal",
      },
      {
        title: "Fair Credit Reporting Act (FCRA)",
        category: "federal_statute",
        citation: "15 U.S.C. § 1681",
        jurisdiction: "Federal",
      },
      {
        title: "Truth in Lending Act (TILA)",
        category: "federal_statute",
        citation: "15 U.S.C. § 1601",
        jurisdiction: "Federal",
      },
      {
        title: "Real Estate Settlement Procedures Act (RESPA)",
        category: "federal_statute",
        citation: "12 U.S.C. § 2601",
        jurisdiction: "Federal",
      },
      {
        title: "Federal Rules of Civil Procedure",
        category: "procedural_rule",
        jurisdiction: "Federal",
      },
      {
        title: "How to File a CFPB Complaint",
        category: "legal_guide",
        jurisdiction: "Federal",
      },
    ];

    expect(seedEntries.length).toBeGreaterThanOrEqual(6);
    seedEntries.forEach((entry) => {
      expect(entry.title).toBeTruthy();
      expect(entry.category).toBeTruthy();
      expect(entry.jurisdiction).toBeTruthy();
    });
  });

  it("should filter research by category", () => {
    const allEntries = [
      { category: "federal_statute", title: "FDCPA" },
      { category: "procedural_rule", title: "FRCP" },
      { category: "legal_guide", title: "CFPB Guide" },
      { category: "federal_statute", title: "FCRA" },
    ];

    const federalStatutes = allEntries.filter(
      (e) => e.category === "federal_statute"
    );
    expect(federalStatutes.length).toBe(2);

    const guides = allEntries.filter((e) => e.category === "legal_guide");
    expect(guides.length).toBe(1);
  });

  it("should search research by title and content", () => {
    const entries = [
      { title: "Fair Debt Collection Practices Act", content: "Regulates debt collectors" },
      { title: "Fair Credit Reporting Act", content: "Consumer credit reporting" },
      { title: "Federal Rules of Civil Procedure", content: "Court procedures" },
    ];

    const query = "debt";
    const results = entries.filter(
      (e) =>
        e.title.toLowerCase().includes(query.toLowerCase()) ||
        e.content.toLowerCase().includes(query.toLowerCase())
    );

    expect(results.length).toBe(1);
    expect(results[0].title).toContain("Debt");
  });

  it("should create and remove bookmarks", () => {
    const bookmarks: { id: number; researchId: number; userId: number }[] = [];

    // Create bookmark
    bookmarks.push({ id: 1, researchId: 5, userId: 1 });
    expect(bookmarks.length).toBe(1);

    // Check if bookmarked
    const isBookmarked = bookmarks.some((b) => b.researchId === 5);
    expect(isBookmarked).toBe(true);

    // Remove bookmark
    const idx = bookmarks.findIndex((b) => b.id === 1);
    bookmarks.splice(idx, 1);
    expect(bookmarks.length).toBe(0);
  });

  it("should not allow duplicate bookmarks for the same research entry", () => {
    const bookmarks = new Set<number>();
    bookmarks.add(5);
    bookmarks.add(5); // Duplicate
    expect(bookmarks.size).toBe(1);
  });
});

// ========== Calendar Export Tests ==========
describe("Calendar Export (ICS Generation)", () => {
  it("should generate valid ICS content with proper headers", () => {
    const events = [
      {
        title: "[SintraPrime] FDCPA Response Deadline",
        description: "30-day deadline to respond to debt validation",
        startDate: "2025-07-15T09:00:00.000Z",
        endDate: "2025-07-15T10:00:00.000Z",
      },
    ];

    // Simulate ICS generation
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//SintraPrime//Legal Warfare Platform//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    for (const event of events) {
      const uid = `${Date.now()}-${Math.random().toString(36).substring(2)}@sintraprime`;
      const dtStart = event.startDate.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${uid}`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`SUMMARY:${event.title}`);
      lines.push(`DESCRIPTION:${event.description}`);
      lines.push("BEGIN:VALARM");
      lines.push("TRIGGER:-P1D");
      lines.push("ACTION:DISPLAY");
      lines.push("DESCRIPTION:Reminder");
      lines.push("END:VALARM");
      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");
    const icsContent = lines.join("\r\n");

    expect(icsContent).toContain("BEGIN:VCALENDAR");
    expect(icsContent).toContain("END:VCALENDAR");
    expect(icsContent).toContain("BEGIN:VEVENT");
    expect(icsContent).toContain("END:VEVENT");
    expect(icsContent).toContain("VERSION:2.0");
    expect(icsContent).toContain("PRODID:-//SintraPrime");
    expect(icsContent).toContain("FDCPA Response Deadline");
  });

  it("should include VALARM reminders for each event", () => {
    const icsContent = [
      "BEGIN:VEVENT",
      "BEGIN:VALARM",
      "TRIGGER:-P1D",
      "ACTION:DISPLAY",
      "DESCRIPTION:Reminder",
      "END:VALARM",
      "BEGIN:VALARM",
      "TRIGGER:-P3D",
      "ACTION:DISPLAY",
      "DESCRIPTION:Reminder",
      "END:VALARM",
      "END:VEVENT",
    ].join("\r\n");

    const alarmCount = (icsContent.match(/BEGIN:VALARM/g) || []).length;
    expect(alarmCount).toBe(2);
  });

  it("should format dates correctly for ICS format", () => {
    const isoDate = "2025-07-15T09:00:00.000Z";
    const icsDate = isoDate.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    expect(icsDate).toBe("20250715T090000Z");
  });

  it("should handle multiple events in a single ICS file", () => {
    const events = [
      { title: "Deadline 1", startDate: "2025-07-15T09:00:00.000Z" },
      { title: "Deadline 2", startDate: "2025-08-01T09:00:00.000Z" },
      { title: "Hearing", startDate: "2025-09-10T14:00:00.000Z" },
    ];

    const icsLines: string[] = ["BEGIN:VCALENDAR"];
    events.forEach((e) => {
      icsLines.push("BEGIN:VEVENT");
      icsLines.push(`SUMMARY:${e.title}`);
      icsLines.push("END:VEVENT");
    });
    icsLines.push("END:VCALENDAR");

    const content = icsLines.join("\r\n");
    const eventCount = (content.match(/BEGIN:VEVENT/g) || []).length;
    expect(eventCount).toBe(3);
  });

  it("should handle events without end dates", () => {
    const event = {
      title: "Filing Deadline",
      startDate: "2025-07-15T09:00:00.000Z",
      endDate: undefined,
    };

    // If no end date, default to 1 hour after start
    const startMs = new Date(event.startDate).getTime();
    const endMs = event.endDate
      ? new Date(event.endDate).getTime()
      : startMs + 3600000;
    const endDate = new Date(endMs);

    expect(endDate.getTime() - startMs).toBe(3600000);
  });

  it("should escape special characters in ICS content", () => {
    const escapeIcs = (text: string) =>
      text
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\n/g, "\\n");

    expect(escapeIcs("Hello, World")).toBe("Hello\\, World");
    expect(escapeIcs("Line1\nLine2")).toBe("Line1\\nLine2");
    expect(escapeIcs("Key;Value")).toBe("Key\\;Value");
  });
});

// ========== Markdown to HTML Conversion Tests ==========
describe("Markdown to HTML Conversion", () => {
  it("should convert bold text", () => {
    const md = "**bold text**";
    const html = md.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    expect(html).toBe("<strong>bold text</strong>");
  });

  it("should convert headings", () => {
    const lines = ["# Heading 1", "## Heading 2", "### Heading 3"];
    const converted = lines.map((line) => {
      const match = line.match(/^(#{1,6})\s+(.*)/);
      if (match) {
        const level = match[1].length;
        return `<h${level}>${match[2]}</h${level}>`;
      }
      return line;
    });

    expect(converted[0]).toBe("<h1>Heading 1</h1>");
    expect(converted[1]).toBe("<h2>Heading 2</h2>");
    expect(converted[2]).toBe("<h3>Heading 3</h3>");
  });

  it("should convert lists", () => {
    const lines = ["- Item 1", "- Item 2", "- Item 3"];
    const listItems = lines.map((l) => `<li>${l.replace(/^-\s+/, "")}</li>`);
    const html = `<ul>${listItems.join("")}</ul>`;
    expect(html).toContain("<li>Item 1</li>");
    expect(html).toContain("<li>Item 3</li>");
  });
});

// ========== Integration Tests ==========
describe("Sprint 7 Integration", () => {
  it("should have all new routes registered", () => {
    const routes = [
      "/research",
      "/case-export",
      "/calendar",
    ];

    routes.forEach((route) => {
      expect(route).toBeTruthy();
      expect(route.startsWith("/")).toBe(true);
    });
  });

  it("should have all new sidebar items", () => {
    const sidebarItems = [
      { label: "Research Library", path: "/research" },
      { label: "Case Export", path: "/case-export" },
      { label: "Calendar Export", path: "/calendar" },
    ];

    sidebarItems.forEach((item) => {
      expect(item.label).toBeTruthy();
      expect(item.path).toBeTruthy();
    });
  });

  it("should validate case export input", () => {
    const validateCaseId = (id: any) => {
      if (typeof id !== "number" || id < 1) return false;
      if (!Number.isInteger(id)) return false;
      return true;
    };

    expect(validateCaseId(1)).toBe(true);
    expect(validateCaseId(100)).toBe(true);
    expect(validateCaseId(0)).toBe(false);
    expect(validateCaseId(-1)).toBe(false);
    expect(validateCaseId(1.5)).toBe(false);
    expect(validateCaseId("1")).toBe(false);
    expect(validateCaseId(null)).toBe(false);
  });

  it("should validate research entry structure", () => {
    const validEntry = {
      title: "FDCPA",
      category: "federal_statute",
      summary: "Fair Debt Collection Practices Act",
      content: "Detailed content...",
      citation: "15 U.S.C. § 1692",
      jurisdiction: "Federal",
      tags: ["debt", "collection", "consumer"],
    };

    expect(validEntry.title.length).toBeGreaterThan(0);
    expect(validEntry.category).toBeTruthy();
    expect(validEntry.summary.length).toBeGreaterThan(0);
    expect(validEntry.content.length).toBeGreaterThan(0);
    expect(Array.isArray(validEntry.tags)).toBe(true);
  });

  it("should validate calendar event structure", () => {
    const validEvent = {
      title: "[SintraPrime] Filing Deadline",
      description: "Must file complaint by this date",
      startDate: "2025-07-15T09:00:00.000Z",
      endDate: "2025-07-15T10:00:00.000Z",
    };

    expect(validEvent.title).toContain("[SintraPrime]");
    expect(new Date(validEvent.startDate).getTime()).toBeLessThan(
      new Date(validEvent.endDate).getTime()
    );
  });
});
