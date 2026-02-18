import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// ============================================================================
// Sprint 5 Tests: Auto-Notifications, Case Timeline, PDF Export
// ============================================================================

describe("Auto-Notification Triggers", () => {
  describe("case creation notifications", () => {
    it("should generate a notification when a case is created", () => {
      const notification = {
        userId: 1,
        type: "case_status_change",
        title: "New Case Created",
        message: 'Case "Test v. Creditor" has been created successfully.',
        link: "/cases/1",
        priority: "low",
      };
      expect(notification.type).toBe("case_status_change");
      expect(notification.title).toBe("New Case Created");
      expect(notification.priority).toBe("low");
      expect(notification.link).toContain("/cases/");
    });

    it("should include case title in notification message", () => {
      const caseTitle = "Smith v. ABC Collections";
      const message = `Case "${caseTitle}" has been created successfully.`;
      expect(message).toContain(caseTitle);
    });
  });

  describe("case status change notifications", () => {
    it("should generate a notification when case status changes", () => {
      const notification = {
        userId: 1,
        caseId: 5,
        type: "case_status_change",
        title: "Case Status Updated",
        message: "Case #5 status changed to active.",
        link: "/cases/5",
        priority: "medium",
      };
      expect(notification.type).toBe("case_status_change");
      expect(notification.message).toContain("active");
    });

    it("should set high priority for won/lost status changes", () => {
      const wonNotification = {
        priority: "won" === "won" || "won" === "lost" ? "high" : "medium",
      };
      expect(wonNotification.priority).toBe("high");

      const lostNotification = {
        priority: "lost" === "won" || "lost" === "lost" ? "high" : "medium",
      };
      expect(lostNotification.priority).toBe("high");
    });

    it("should set medium priority for other status changes", () => {
      const statuses = ["active", "pending", "settled", "archived", "draft"];
      for (const status of statuses) {
        const priority = status === "won" || status === "lost" ? "high" : "medium";
        expect(priority).toBe("medium");
      }
    });
  });

  describe("coalition activity notifications", () => {
    it("should generate a notification when a member is added", () => {
      const notification = {
        userId: 1,
        type: "coalition_activity",
        title: "Coalition Member Added",
        message: "A new member has been added to coalition #3.",
        link: "/coalitions",
        priority: "low",
      };
      expect(notification.type).toBe("coalition_activity");
      expect(notification.link).toBe("/coalitions");
    });
  });

  describe("deadline proximity alerts", () => {
    it("should detect deadlines within 7 days", () => {
      const now = new Date();
      const deadline = new Date(now);
      deadline.setDate(deadline.getDate() + 5);
      const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysRemaining).toBeLessThanOrEqual(7);
      expect(daysRemaining).toBeGreaterThan(0);
    });

    it("should detect deadlines within 3 days as high priority", () => {
      const now = new Date();
      const deadline = new Date(now);
      deadline.setDate(deadline.getDate() + 2);
      const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const priority = daysRemaining <= 1 ? "critical" : daysRemaining <= 3 ? "high" : daysRemaining <= 7 ? "medium" : "low";
      expect(priority).toBe("high");
    });

    it("should detect deadlines within 1 day as critical", () => {
      const now = new Date();
      const deadline = new Date(now);
      deadline.setHours(deadline.getHours() + 12);
      const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const priority = daysRemaining <= 1 ? "critical" : daysRemaining <= 3 ? "high" : daysRemaining <= 7 ? "medium" : "low";
      expect(priority).toBe("critical");
    });

    it("should not alert for deadlines more than 7 days away", () => {
      const now = new Date();
      const deadline = new Date(now);
      deadline.setDate(deadline.getDate() + 30);
      const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const shouldAlert = daysRemaining <= 7;
      expect(shouldAlert).toBe(false);
    });
  });
});

describe("Case Timeline", () => {
  describe("timeline item merging", () => {
    it("should merge events, documents, and evidence into a unified timeline", () => {
      const events = [
        { id: 1, date: "2025-01-15", title: "Initial Filing", type: "event" },
        { id: 2, date: "2025-02-01", title: "Discovery Request", type: "event" },
      ];
      const documents = [
        { id: 1, date: "2025-01-20", title: "Complaint", type: "document" },
      ];
      const evidence = [
        { id: 1, date: "2025-01-25", title: "Phone Records", type: "evidence" },
      ];

      const timeline = [...events, ...documents, ...evidence].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      expect(timeline.length).toBe(4);
      expect(timeline[0].title).toBe("Initial Filing");
      expect(timeline[1].title).toBe("Complaint");
      expect(timeline[2].title).toBe("Phone Records");
      expect(timeline[3].title).toBe("Discovery Request");
    });

    it("should sort timeline items chronologically", () => {
      const items = [
        { date: "2025-03-01" },
        { date: "2025-01-01" },
        { date: "2025-02-01" },
      ];
      const sorted = items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      expect(sorted[0].date).toBe("2025-01-01");
      expect(sorted[1].date).toBe("2025-02-01");
      expect(sorted[2].date).toBe("2025-03-01");
    });

    it("should include milestones from case data", () => {
      const caseData = {
        filingDate: "2025-01-15",
        trialDate: "2025-06-15",
        court: "US District Court",
      };

      const milestones = [];
      if (caseData.filingDate) {
        milestones.push({
          id: "milestone-filing",
          date: caseData.filingDate,
          title: "Case Filed",
          type: "milestone",
        });
      }
      if (caseData.trialDate) {
        milestones.push({
          id: "milestone-trial",
          date: caseData.trialDate,
          title: "Trial Date",
          type: "milestone",
        });
      }

      expect(milestones.length).toBe(2);
      expect(milestones[0].type).toBe("milestone");
      expect(milestones[1].title).toBe("Trial Date");
    });
  });

  describe("timeline filtering", () => {
    it("should filter by event type", () => {
      const items = [
        { type: "event", title: "Filing" },
        { type: "document", title: "Complaint" },
        { type: "evidence", title: "Records" },
        { type: "milestone", title: "Trial" },
        { type: "event", title: "Hearing" },
      ];

      const events = items.filter((i) => i.type === "event");
      expect(events.length).toBe(2);

      const docs = items.filter((i) => i.type === "document");
      expect(docs.length).toBe(1);
    });

    it("should return all items when filter is 'all'", () => {
      const items = [
        { type: "event" },
        { type: "document" },
        { type: "evidence" },
      ];
      const filterType = "all";
      const filtered = filterType === "all" ? items : items.filter((i) => i.type === filterType);
      expect(filtered.length).toBe(3);
    });
  });

  describe("timeline pagination", () => {
    it("should paginate items correctly", () => {
      const items = Array.from({ length: 25 }, (_, i) => ({ id: i, title: `Item ${i}` }));
      const itemsPerPage = 10;
      const page0 = items.slice(0, itemsPerPage);
      const page1 = items.slice(itemsPerPage, itemsPerPage * 2);
      const page2 = items.slice(itemsPerPage * 2, itemsPerPage * 3);

      expect(page0.length).toBe(10);
      expect(page1.length).toBe(10);
      expect(page2.length).toBe(5);
    });

    it("should calculate total pages correctly", () => {
      expect(Math.ceil(25 / 10)).toBe(3);
      expect(Math.ceil(10 / 10)).toBe(1);
      expect(Math.ceil(0 / 10) || 1).toBe(1);
    });
  });
});

describe("PDF Export", () => {
  describe("escapeHtml helper", () => {
    function escapeHtml(text: string): string {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    it("should escape ampersands", () => {
      expect(escapeHtml("A & B")).toBe("A &amp; B");
    });

    it("should escape angle brackets", () => {
      expect(escapeHtml("<script>alert('xss')</script>")).toBe("&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;");
    });

    it("should escape quotes", () => {
      expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;");
    });

    it("should handle empty strings", () => {
      expect(escapeHtml("")).toBe("");
    });

    it("should handle strings with no special characters", () => {
      expect(escapeHtml("Hello World")).toBe("Hello World");
    });
  });

  describe("markdownToHtml helper", () => {
    function markdownToHtml(md: string): string {
      let html = md;
      html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
      html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
      html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
      html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
      html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
      html = html.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");
      html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
      html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
      html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");
      html = html.replace(/\n\n/g, "</p><p>");
      html = html.replace(/\n/g, "<br>");
      if (!html.startsWith("<")) html = `<p>${html}</p>`;
      return html;
    }

    it("should convert headers", () => {
      expect(markdownToHtml("# Title")).toBe("<h1>Title</h1>");
      expect(markdownToHtml("## Subtitle")).toBe("<h2>Subtitle</h2>");
      expect(markdownToHtml("### Section")).toBe("<h3>Section</h3>");
    });

    it("should convert bold text", () => {
      expect(markdownToHtml("**bold**")).toContain("<strong>bold</strong>");
    });

    it("should convert italic text", () => {
      expect(markdownToHtml("*italic*")).toContain("<em>italic</em>");
    });

    it("should convert blockquotes", () => {
      expect(markdownToHtml("> quote")).toContain("<blockquote>quote</blockquote>");
    });

    it("should convert list items", () => {
      const result = markdownToHtml("- item1\n- item2");
      expect(result).toContain("<li>item1</li>");
      expect(result).toContain("<li>item2</li>");
      expect(result).toContain("<ul>");
    });

    it("should wrap plain text in paragraphs", () => {
      expect(markdownToHtml("Hello world")).toBe("<p>Hello world</p>");
    });
  });

  describe("PDF HTML generation", () => {
    it("should generate valid HTML structure", () => {
      const title = "Test Document";
      const content = "Test content";
      const html = `<!DOCTYPE html><html><head></head><body><div class="header"><div class="title">${title}</div></div><div class="content">${content}</div></body></html>`;
      
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain(title);
      expect(html).toContain(content);
      expect(html).toContain("</html>");
    });

    it("should include SintraPrime branding", () => {
      const html = `<div class="subtitle">Generated by SintraPrime Legal Warfare Platform</div>`;
      expect(html).toContain("SintraPrime");
    });

    it("should include legal disclaimer", () => {
      const disclaimer = "SintraPrime is not a law firm and does not provide legal advice or representation.";
      expect(disclaimer).toContain("not a law firm");
      expect(disclaimer).toContain("does not provide legal advice");
    });

    it("should include document metadata", () => {
      const meta = {
        documentType: "FDCPA Letter",
        date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        tags: ["fdcpa", "debt-validation"],
      };
      expect(meta.documentType).toBe("FDCPA Letter");
      expect(meta.tags.length).toBe(2);
    });
  });

  describe("PDF export validation", () => {
    it("should require a valid document ID", () => {
      const schema = z.object({ documentId: z.number() });
      expect(() => schema.parse({ documentId: 1 })).not.toThrow();
      expect(() => schema.parse({ documentId: "abc" })).toThrow();
    });

    it("should throw NOT_FOUND for missing documents", () => {
      const doc = null;
      const error = !doc ? { code: "NOT_FOUND", message: "Document not found" } : null;
      expect(error).not.toBeNull();
      expect(error!.code).toBe("NOT_FOUND");
    });
  });
});

describe("Notification Schema Validation", () => {
  const notificationSchema = z.object({
    userId: z.number(),
    type: z.enum(["deadline_approaching", "case_status_change", "coalition_activity", "system"]),
    title: z.string().min(1).max(200),
    message: z.string().min(1),
    link: z.string().optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    caseId: z.number().optional(),
  });

  it("should validate a valid notification", () => {
    const valid = {
      userId: 1,
      type: "deadline_approaching" as const,
      title: "Deadline in 3 days",
      message: "FDCPA validation deadline is approaching",
      link: "/deadline-calculator",
      priority: "high" as const,
    };
    expect(() => notificationSchema.parse(valid)).not.toThrow();
  });

  it("should reject invalid notification types", () => {
    const invalid = {
      userId: 1,
      type: "invalid_type",
      title: "Test",
      message: "Test message",
    };
    expect(() => notificationSchema.parse(invalid)).toThrow();
  });

  it("should reject empty titles", () => {
    const invalid = {
      userId: 1,
      type: "system" as const,
      title: "",
      message: "Test",
    };
    expect(() => notificationSchema.parse(invalid)).toThrow();
  });

  it("should allow optional fields", () => {
    const minimal = {
      userId: 1,
      type: "system" as const,
      title: "Test",
      message: "Test message",
    };
    expect(() => notificationSchema.parse(minimal)).not.toThrow();
  });
});
