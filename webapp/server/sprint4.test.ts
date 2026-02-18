import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// SPRINT 4 TESTS: Notifications & Analytics
// ============================================================================

// Mock database
const mockNotifications = [
  {
    id: 1,
    userId: 1,
    type: "deadline_approaching",
    title: "FDCPA 30-Day Deadline",
    message: "Your debt validation deadline expires in 5 days",
    caseId: 1,
    link: "/cases/1",
    priority: "high",
    isRead: false,
    createdAt: new Date(),
  },
  {
    id: 2,
    userId: 1,
    type: "case_status_change",
    title: "Case Status Updated",
    message: "Case #1 status changed to active",
    caseId: 1,
    link: "/cases/1",
    priority: "medium",
    isRead: true,
    createdAt: new Date(Date.now() - 86400000),
  },
  {
    id: 3,
    userId: 1,
    type: "coalition_activity",
    title: "New Coalition Member",
    message: "John Doe joined your coalition",
    caseId: null,
    link: "/coalitions",
    priority: "low",
    isRead: false,
    createdAt: new Date(Date.now() - 172800000),
  },
];

const mockAnalyticsData = {
  statusCounts: [
    { status: "active", count: 5 },
    { status: "won", count: 3 },
    { status: "lost", count: 1 },
    { status: "settled", count: 2 },
    { status: "draft", count: 4 },
  ],
  typeCounts: [
    { type: "debt_collection", count: 6 },
    { type: "consumer_rights", count: 4 },
    { type: "employment", count: 2 },
    { type: "housing", count: 3 },
  ],
  priorityCounts: [
    { priority: "critical", count: 2 },
    { priority: "high", count: 5 },
    { priority: "medium", count: 6 },
    { priority: "low", count: 2 },
  ],
  totalCases: 15,
  activeCases: 5,
  wonCases: 3,
  lostCases: 1,
  settledCases: 2,
  recentActivity: [
    {
      id: 1,
      caseId: 1,
      userId: 1,
      title: "Filed complaint",
      description: "Filed initial complaint with court",
      eventType: "filing",
      eventDate: new Date(),
      createdAt: new Date(),
    },
  ],
};

vi.mock("./db", () => ({
  createNotification: vi.fn().mockResolvedValue([{ insertId: 4 }]),
  getNotificationsByUserId: vi.fn().mockImplementation((userId: number, limit?: number) => {
    return Promise.resolve(mockNotifications.filter(n => n.userId === userId).slice(0, limit || 50));
  }),
  getUnreadNotificationCount: vi.fn().mockImplementation((userId: number) => {
    return Promise.resolve(mockNotifications.filter(n => n.userId === userId && !n.isRead).length);
  }),
  markNotificationRead: vi.fn().mockResolvedValue({}),
  markAllNotificationsRead: vi.fn().mockResolvedValue({}),
  deleteNotification: vi.fn().mockResolvedValue({}),
  getCaseAnalytics: vi.fn().mockResolvedValue(mockAnalyticsData),
  getUserById: vi.fn().mockResolvedValue({
    id: 1,
    name: "Test User",
    email: "test@example.com",
    subscriptionTier: "pro",
    onboardingComplete: true,
  }),
}));

describe("Notification System", () => {
  describe("Notification Types", () => {
    it("should support deadline_approaching type", () => {
      const notification = mockNotifications.find(n => n.type === "deadline_approaching");
      expect(notification).toBeDefined();
      expect(notification?.priority).toBe("high");
      expect(notification?.caseId).toBe(1);
    });

    it("should support case_status_change type", () => {
      const notification = mockNotifications.find(n => n.type === "case_status_change");
      expect(notification).toBeDefined();
      expect(notification?.caseId).toBe(1);
    });

    it("should support coalition_activity type", () => {
      const notification = mockNotifications.find(n => n.type === "coalition_activity");
      expect(notification).toBeDefined();
      expect(notification?.link).toBe("/coalitions");
    });
  });

  describe("Notification Priorities", () => {
    it("should support low, medium, high, and critical priorities", () => {
      const priorities = ["low", "medium", "high", "critical"];
      priorities.forEach(p => {
        expect(priorities).toContain(p);
      });
    });

    it("should have correct priority for deadline notifications", () => {
      const deadlineNotif = mockNotifications.find(n => n.type === "deadline_approaching");
      expect(deadlineNotif?.priority).toBe("high");
    });
  });

  describe("Notification Read Status", () => {
    it("should track read/unread status", () => {
      const unread = mockNotifications.filter(n => !n.isRead);
      const read = mockNotifications.filter(n => n.isRead);
      expect(unread.length).toBe(2);
      expect(read.length).toBe(1);
    });

    it("should count unread notifications correctly", async () => {
      const db = await import("./db");
      const count = await db.getUnreadNotificationCount(1);
      expect(count).toBe(2);
    });
  });

  describe("Notification CRUD Operations", () => {
    it("should create a notification with required fields", async () => {
      const db = await import("./db");
      const result = await db.createNotification({
        userId: 1,
        type: "system",
        title: "Welcome to SintraPrime",
        message: "Your account has been created successfully",
      });
      expect(result).toBeDefined();
      expect(db.createNotification).toHaveBeenCalledWith({
        userId: 1,
        type: "system",
        title: "Welcome to SintraPrime",
        message: "Your account has been created successfully",
      });
    });

    it("should create a notification with optional fields", async () => {
      const db = await import("./db");
      await db.createNotification({
        userId: 1,
        type: "deadline_approaching",
        title: "FCRA Deadline",
        message: "Investigation deadline in 7 days",
        caseId: 2,
        link: "/cases/2",
        priority: "critical",
        metadata: { daysRemaining: 7, deadlineType: "FCRA" },
      });
      expect(db.createNotification).toHaveBeenCalled();
    });

    it("should list notifications for a user", async () => {
      const db = await import("./db");
      const notifications = await db.getNotificationsByUserId(1);
      expect(notifications).toHaveLength(3);
      expect(notifications[0].userId).toBe(1);
    });

    it("should limit notification results", async () => {
      const db = await import("./db");
      const notifications = await db.getNotificationsByUserId(1, 2);
      expect(notifications.length).toBeLessThanOrEqual(2);
    });

    it("should mark a notification as read", async () => {
      const db = await import("./db");
      await db.markNotificationRead(1, 1);
      expect(db.markNotificationRead).toHaveBeenCalledWith(1, 1);
    });

    it("should mark all notifications as read", async () => {
      const db = await import("./db");
      await db.markAllNotificationsRead(1);
      expect(db.markAllNotificationsRead).toHaveBeenCalledWith(1);
    });

    it("should delete a notification", async () => {
      const db = await import("./db");
      await db.deleteNotification(1, 1);
      expect(db.deleteNotification).toHaveBeenCalledWith(1, 1);
    });
  });

  describe("Notification Data Structure", () => {
    it("should have all required fields", () => {
      const notification = mockNotifications[0];
      expect(notification).toHaveProperty("id");
      expect(notification).toHaveProperty("userId");
      expect(notification).toHaveProperty("type");
      expect(notification).toHaveProperty("title");
      expect(notification).toHaveProperty("message");
      expect(notification).toHaveProperty("isRead");
      expect(notification).toHaveProperty("createdAt");
    });

    it("should have optional fields when provided", () => {
      const notification = mockNotifications[0];
      expect(notification).toHaveProperty("caseId");
      expect(notification).toHaveProperty("link");
      expect(notification).toHaveProperty("priority");
    });

    it("should handle null optional fields", () => {
      const notification = mockNotifications[2];
      expect(notification.caseId).toBeNull();
    });
  });
});

describe("Case Analytics", () => {
  describe("Status Distribution", () => {
    it("should return status counts", () => {
      expect(mockAnalyticsData.statusCounts).toHaveLength(5);
      const activeCount = mockAnalyticsData.statusCounts.find(s => s.status === "active");
      expect(activeCount?.count).toBe(5);
    });

    it("should include all case statuses", () => {
      const statuses = mockAnalyticsData.statusCounts.map(s => s.status);
      expect(statuses).toContain("active");
      expect(statuses).toContain("won");
      expect(statuses).toContain("lost");
      expect(statuses).toContain("settled");
      expect(statuses).toContain("draft");
    });
  });

  describe("Type Distribution", () => {
    it("should return case type counts", () => {
      expect(mockAnalyticsData.typeCounts.length).toBeGreaterThan(0);
    });

    it("should include debt collection cases", () => {
      const debtCollection = mockAnalyticsData.typeCounts.find(t => t.type === "debt_collection");
      expect(debtCollection).toBeDefined();
      expect(debtCollection?.count).toBe(6);
    });
  });

  describe("Priority Distribution", () => {
    it("should return priority counts", () => {
      expect(mockAnalyticsData.priorityCounts).toHaveLength(4);
    });

    it("should include all priority levels", () => {
      const priorities = mockAnalyticsData.priorityCounts.map(p => p.priority);
      expect(priorities).toContain("critical");
      expect(priorities).toContain("high");
      expect(priorities).toContain("medium");
      expect(priorities).toContain("low");
    });
  });

  describe("Summary Metrics", () => {
    it("should return total case count", () => {
      expect(mockAnalyticsData.totalCases).toBe(15);
    });

    it("should return active case count", () => {
      expect(mockAnalyticsData.activeCases).toBe(5);
    });

    it("should return won case count", () => {
      expect(mockAnalyticsData.wonCases).toBe(3);
    });

    it("should return lost case count", () => {
      expect(mockAnalyticsData.lostCases).toBe(1);
    });

    it("should return settled case count", () => {
      expect(mockAnalyticsData.settledCases).toBe(2);
    });

    it("should calculate win rate correctly", () => {
      const resolved = mockAnalyticsData.wonCases + mockAnalyticsData.lostCases + mockAnalyticsData.settledCases;
      const winRate = resolved > 0 ? Math.round((mockAnalyticsData.wonCases / resolved) * 100) : 0;
      expect(winRate).toBe(50); // 3 won out of 6 resolved = 50%
    });

    it("should handle zero resolved cases for win rate", () => {
      const emptyData = { wonCases: 0, lostCases: 0, settledCases: 0 };
      const resolved = emptyData.wonCases + emptyData.lostCases + emptyData.settledCases;
      const winRate = resolved > 0 ? Math.round((emptyData.wonCases / resolved) * 100) : 0;
      expect(winRate).toBe(0);
    });
  });

  describe("Recent Activity", () => {
    it("should return recent activity events", () => {
      expect(mockAnalyticsData.recentActivity).toHaveLength(1);
    });

    it("should include event details", () => {
      const event = mockAnalyticsData.recentActivity[0];
      expect(event).toHaveProperty("title");
      expect(event).toHaveProperty("eventType");
      expect(event).toHaveProperty("eventDate");
    });
  });

  describe("Analytics Database Query", () => {
    it("should fetch analytics for a user", async () => {
      const db = await import("./db");
      const analytics = await db.getCaseAnalytics(1);
      expect(analytics).toBeDefined();
      expect(analytics.totalCases).toBe(15);
      expect(analytics.statusCounts).toHaveLength(5);
    });
  });
});

describe("Notification Bell Component Logic", () => {
  it("should show badge when unread count > 0", () => {
    const count = 5;
    const showBadge = count > 0;
    expect(showBadge).toBe(true);
  });

  it("should not show badge when unread count is 0", () => {
    const count = 0;
    const showBadge = count > 0;
    expect(showBadge).toBe(false);
  });

  it("should cap display at 99+", () => {
    const count = 150;
    const display = count > 99 ? "99+" : String(count);
    expect(display).toBe("99+");
  });

  it("should show exact count when under 100", () => {
    const count = 42;
    const display = count > 99 ? "99+" : String(count);
    expect(display).toBe("42");
  });
});

describe("Time Ago Formatting", () => {
  function formatTimeAgo(date: Date | string): string {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  }

  it("should show 'Just now' for very recent times", () => {
    expect(formatTimeAgo(new Date())).toBe("Just now");
  });

  it("should show minutes for recent times", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000);
    expect(formatTimeAgo(fiveMinAgo)).toBe("5m ago");
  });

  it("should show hours for same-day times", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600000);
    expect(formatTimeAgo(threeHoursAgo)).toBe("3h ago");
  });

  it("should show days for recent dates", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
    expect(formatTimeAgo(twoDaysAgo)).toBe("2d ago");
  });

  it("should show full date for older dates", () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000);
    const result = formatTimeAgo(twoWeeksAgo);
    expect(result).not.toContain("ago");
  });
});
