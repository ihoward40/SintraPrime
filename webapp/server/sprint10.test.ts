import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {} as any,
    res: {} as any,
  };
}

describe("Sprint 10: Trust Creation Wizard and Workspace Bookmarks", () => {
  describe("Trust Router", () => {
    it("should create a new trust", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.trusts.create({
        trustName: "Smith Family Living Trust",
        trustType: "revocable_living",
        settlor: "John Smith",
        purpose: "Estate planning and asset protection",
        terms: "This trust shall hold and distribute assets according to the terms...",
        establishedDate: new Date("2026-01-01"),
      });

      expect(result).toBeDefined();
    });

    it("should list trusts for current user", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const trusts = await caller.trusts.list();
      expect(Array.isArray(trusts)).toBe(true);
    });

    it("should add a trustee to a trust", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      
      // Create trust first
      const trustResult = await caller.trusts.create({
        trustName: "Test Trust for Trustees",
        trustType: "irrevocable",
        settlor: "Jane Doe",
        terms: "Trust terms...",
      });

      const trustId = (trustResult as any).insertId || (trustResult as any)[0]?.insertId;

      // Add trustee
      const trusteeResult = await caller.trusts.addTrustee({
        trustId,
        name: "Alice Johnson",
        role: "primary",
        contactInfo: {
          email: "alice@example.com",
          phone: "555-0100",
        },
      });

      expect(trusteeResult).toBeDefined();
    });

    it("should add a beneficiary to a trust", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      
      // Create trust first
      const trustResult = await caller.trusts.create({
        trustName: "Test Trust for Beneficiaries",
        trustType: "charitable",
        settlor: "Bob Wilson",
        terms: "Trust terms...",
      });

      const trustId = (trustResult as any).insertId || (trustResult as any)[0]?.insertId;

      // Add beneficiary
      const beneficiaryResult = await caller.trusts.addBeneficiary({
        trustId,
        name: "Charlie Brown",
        beneficiaryType: "primary",
        relationship: "Son",
        distributionShare: "50%",
      });

      expect(beneficiaryResult).toBeDefined();
    });

    it("should add an asset to a trust", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      
      // Create trust first
      const trustResult = await caller.trusts.create({
        trustName: "Test Trust for Assets",
        trustType: "asset_protection",
        settlor: "David Lee",
        terms: "Trust terms...",
      });

      const trustId = (trustResult as any).insertId || (trustResult as any)[0]?.insertId;

      // Add asset
      const assetResult = await caller.trusts.addAsset({
        trustId,
        assetType: "real_estate",
        description: "Primary residence at 123 Main St",
        estimatedValue: 50000000, // $500,000 in cents
        location: "123 Main St, Anytown, USA",
      });

      expect(assetResult).toBeDefined();
    });

    it("should update trust status", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      
      // Create trust first
      const trustResult = await caller.trusts.create({
        trustName: "Test Trust for Update",
        trustType: "testamentary",
        settlor: "Emma Davis",
        terms: "Trust terms...",
      });

      const trustId = (trustResult as any).insertId || (trustResult as any)[0]?.insertId;

      // Update trust
      const updateResult = await caller.trusts.update({
        id: trustId,
        status: "active",
      });

      expect(updateResult).toBeDefined();
    });
  });

  describe("Workspace Bookmarks Router", () => {
    it("should create a new bookmark", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.workspaceBookmarks.create({
        title: "Cornell Law - Legal Information Institute",
        url: "https://www.law.cornell.edu",
        category: "Legal Info",
        notes: "Comprehensive legal research resource",
        tags: ["case_law", "statutes", "regulations"],
      });

      expect(result).toBeDefined();
    });

    it("should list bookmarks for current user", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const bookmarks = await caller.workspaceBookmarks.list();
      expect(Array.isArray(bookmarks)).toBe(true);
    });

    it("should get bookmarks by category", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      
      // Create bookmark first
      await caller.workspaceBookmarks.create({
        title: "PACER",
        url: "https://pacer.uscourts.gov",
        category: "Court Filings",
      });

      // Get by category
      const bookmarks = await caller.workspaceBookmarks.getByCategory({
        category: "Court Filings",
      });

      expect(Array.isArray(bookmarks)).toBe(true);
    });

    it("should update a bookmark", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      
      // Create bookmark first
      const createResult = await caller.workspaceBookmarks.create({
        title: "Test Bookmark",
        url: "https://example.com",
      });

      const bookmarkId = (createResult as any).insertId || (createResult as any)[0]?.insertId;

      // Update bookmark
      const updateResult = await caller.workspaceBookmarks.update({
        id: bookmarkId,
        notes: "Updated notes",
        tags: ["updated", "test"],
      });

      expect(updateResult).toBeDefined();
    });

    it("should delete a bookmark", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      
      // Create bookmark first
      const createResult = await caller.workspaceBookmarks.create({
        title: "Bookmark to Delete",
        url: "https://example.com/delete",
      });

      const bookmarkId = (createResult as any).insertId || (createResult as any)[0]?.insertId;

      // Delete bookmark
      const deleteResult = await caller.workspaceBookmarks.delete({
        id: bookmarkId,
      });

      expect(deleteResult.success).toBe(true);
    });

    it("should handle multiple bookmarks with different categories", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      
      // Create multiple bookmarks
      await caller.workspaceBookmarks.create({
        title: "Justia",
        url: "https://law.justia.com",
        category: "Case Law",
      });

      await caller.workspaceBookmarks.create({
        title: "Google Scholar",
        url: "https://scholar.google.com",
        category: "Research",
      });

      await caller.workspaceBookmarks.create({
        title: "SEC EDGAR",
        url: "https://www.sec.gov/edgar",
        category: "Corporate",
      });

      // List all bookmarks
      const allBookmarks = await caller.workspaceBookmarks.list();
      expect(allBookmarks.length).toBeGreaterThanOrEqual(3);

      // Get by specific category
      const caseLawBookmarks = await caller.workspaceBookmarks.getByCategory({
        category: "Case Law",
      });
      expect(caseLawBookmarks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Trust and Bookmark Integration", () => {
    it("should create trust with full details (trustees, beneficiaries, assets)", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      
      // Create trust
      const trustResult = await caller.trusts.create({
        trustName: "Complete Family Trust",
        trustType: "revocable_living",
        settlor: "Michael Anderson",
        purpose: "Comprehensive estate planning",
        terms: "This trust shall manage all family assets...",
      });

      const trustId = (trustResult as any).insertId || (trustResult as any)[0]?.insertId;

      // Add primary trustee
      await caller.trusts.addTrustee({
        trustId,
        name: "Sarah Anderson",
        role: "primary",
        contactInfo: { email: "sarah@example.com" },
      });

      // Add successor trustee
      await caller.trusts.addTrustee({
        trustId,
        name: "Tom Anderson",
        role: "successor",
        contactInfo: { email: "tom@example.com" },
      });

      // Add primary beneficiary
      await caller.trusts.addBeneficiary({
        trustId,
        name: "Emily Anderson",
        beneficiaryType: "primary",
        relationship: "Daughter",
        distributionShare: "50%",
      });

      // Add contingent beneficiary
      await caller.trusts.addBeneficiary({
        trustId,
        name: "Ryan Anderson",
        beneficiaryType: "contingent",
        relationship: "Son",
        distributionShare: "50%",
      });

      // Add real estate asset
      await caller.trusts.addAsset({
        trustId,
        assetType: "real_estate",
        description: "Family home",
        estimatedValue: 75000000, // $750,000
      });

      // Add securities asset
      await caller.trusts.addAsset({
        trustId,
        assetType: "securities",
        description: "Investment portfolio",
        estimatedValue: 100000000, // $1,000,000
      });

      // Verify trust was created with all details
      const trust = await caller.trusts.getById({ id: trustId });
      expect(trust).toBeDefined();
      expect(trust?.trustees?.length).toBeGreaterThanOrEqual(2);
      expect(trust?.beneficiaries?.length).toBeGreaterThanOrEqual(2);
      expect(trust?.assets?.length).toBeGreaterThanOrEqual(2);
    });

    it("should create bookmarks for trust-related research", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      
      // Create bookmarks for trust research
      await caller.workspaceBookmarks.create({
        title: "Trust Law Overview",
        url: "https://www.law.cornell.edu/wex/trust",
        category: "Legal Info",
        notes: "Research for Anderson family trust",
        tags: ["trust_law", "estate_planning"],
      });

      await caller.workspaceBookmarks.create({
        title: "Revocable Living Trusts",
        url: "https://www.nolo.com/legal-encyclopedia/living-trusts",
        category: "Legal Info",
        notes: "Guide for revocable trusts",
        tags: ["trust_law", "revocable"],
      });

      const bookmarks = await caller.workspaceBookmarks.list();
      const trustBookmarks = bookmarks.filter(b => 
        b.tags?.includes("trust_law")
      );
      expect(trustBookmarks.length).toBeGreaterThanOrEqual(2);
    });
  });
});
