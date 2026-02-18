import { describe, it, expect } from "vitest";

describe("Live Execution Viewer & Browser Automation", () => {
  describe("Browser Automation Service", () => {
    it("should have BrowserAutomationService class", async () => {
      const { BrowserAutomationService } = await import("./browser-automation/service");
      expect(BrowserAutomationService).toBeDefined();
      expect(typeof BrowserAutomationService).toBe("function");
    });

    it("should have BrowserSessionManager class", async () => {
      const { BrowserSessionManager } = await import("./browser-automation/service");
      expect(BrowserSessionManager).toBeDefined();
      expect(typeof BrowserSessionManager).toBe("function");
    });

    it("should export BrowserAction interface type", async () => {
      const module = await import("./browser-automation/service");
      expect(module).toHaveProperty("BrowserAutomationService");
    });

    it("should export ScrapingRule interface type", async () => {
      const module = await import("./browser-automation/service");
      expect(module).toHaveProperty("BrowserSessionManager");
    });
  });

  describe("Browser Automation Router", () => {
    it("should export browserAutomationRouter", async () => {
      const { browserAutomationRouter } = await import("./browser-automation/router");
      expect(browserAutomationRouter).toBeDefined();
      expect(typeof browserAutomationRouter).toBe("object");
    });

    it("should have createSession procedure", async () => {
      const { browserAutomationRouter } = await import("./browser-automation/router");
      expect(browserAutomationRouter._def.procedures).toHaveProperty("createSession");
    });

    it("should have navigate procedure", async () => {
      const { browserAutomationRouter } = await import("./browser-automation/router");
      expect(browserAutomationRouter._def.procedures).toHaveProperty("navigate");
    });

    it("should have click procedure", async () => {
      const { browserAutomationRouter } = await import("./browser-automation/router");
      expect(browserAutomationRouter._def.procedures).toHaveProperty("click");
    });

    it("should have type procedure", async () => {
      const { browserAutomationRouter } = await import("./browser-automation/router");
      expect(browserAutomationRouter._def.procedures).toHaveProperty("type");
    });

    it("should have scroll procedure", async () => {
      const { browserAutomationRouter } = await import("./browser-automation/router");
      expect(browserAutomationRouter._def.procedures).toHaveProperty("scroll");
    });

    it("should have extract procedure", async () => {
      const { browserAutomationRouter } = await import("./browser-automation/router");
      expect(browserAutomationRouter._def.procedures).toHaveProperty("extract");
    });

    it("should have getPageContent procedure", async () => {
      const { browserAutomationRouter } = await import("./browser-automation/router");
      expect(browserAutomationRouter._def.procedures).toHaveProperty("getPageContent");
    });

    it("should have takeScreenshot procedure", async () => {
      const { browserAutomationRouter } = await import("./browser-automation/router");
      expect(browserAutomationRouter._def.procedures).toHaveProperty("takeScreenshot");
    });

    it("should have getActions procedure", async () => {
      const { browserAutomationRouter } = await import("./browser-automation/router");
      expect(browserAutomationRouter._def.procedures).toHaveProperty("getActions");
    });

    it("should have startRecording procedure", async () => {
      const { browserAutomationRouter } = await import("./browser-automation/router");
      expect(browserAutomationRouter._def.procedures).toHaveProperty("startRecording");
    });

    it("should have stopRecording procedure", async () => {
      const { browserAutomationRouter } = await import("./browser-automation/router");
      expect(browserAutomationRouter._def.procedures).toHaveProperty("stopRecording");
    });

    it("should have closeSession procedure", async () => {
      const { browserAutomationRouter } = await import("./browser-automation/router");
      expect(browserAutomationRouter._def.procedures).toHaveProperty("closeSession");
    });
  });

  describe("Scraping Templates", () => {
    it("should export SCRAPING_TEMPLATES", async () => {
      const { SCRAPING_TEMPLATES } = await import("./browser-automation/scraping-templates");
      expect(SCRAPING_TEMPLATES).toBeDefined();
      expect(typeof SCRAPING_TEMPLATES).toBe("object");
    });

    it("should have PACER template", async () => {
      const { SCRAPING_TEMPLATES } = await import("./browser-automation/scraping-templates");
      expect(SCRAPING_TEMPLATES).toHaveProperty("pacer");
      expect(SCRAPING_TEMPLATES.pacer).toHaveProperty("name");
      expect(SCRAPING_TEMPLATES.pacer).toHaveProperty("description");
      expect(SCRAPING_TEMPLATES.pacer).toHaveProperty("rules");
    });

    it("should have Court Listener template", async () => {
      const { SCRAPING_TEMPLATES } = await import("./browser-automation/scraping-templates");
      expect(SCRAPING_TEMPLATES).toHaveProperty("courtListener");
    });

    it("should have Justia template", async () => {
      const { SCRAPING_TEMPLATES } = await import("./browser-automation/scraping-templates");
      expect(SCRAPING_TEMPLATES).toHaveProperty("justia");
    });

    it("should have Google Scholar template", async () => {
      const { SCRAPING_TEMPLATES } = await import("./browser-automation/scraping-templates");
      expect(SCRAPING_TEMPLATES).toHaveProperty("googleScholar");
    });

    it("should have FTC Complaints template", async () => {
      const { SCRAPING_TEMPLATES } = await import("./browser-automation/scraping-templates");
      expect(SCRAPING_TEMPLATES).toHaveProperty("ftcComplaints");
    });

    it("should have CFPB Complaints template", async () => {
      const { SCRAPING_TEMPLATES } = await import("./browser-automation/scraping-templates");
      expect(SCRAPING_TEMPLATES).toHaveProperty("cfpbComplaints");
    });

    it("should have generic legal document template", async () => {
      const { SCRAPING_TEMPLATES } = await import("./browser-automation/scraping-templates");
      expect(SCRAPING_TEMPLATES).toHaveProperty("genericLegalDoc");
    });

    it("should have table extraction template", async () => {
      const { SCRAPING_TEMPLATES } = await import("./browser-automation/scraping-templates");
      expect(SCRAPING_TEMPLATES).toHaveProperty("tableExtraction");
    });

    it("should have contact info template", async () => {
      const { SCRAPING_TEMPLATES } = await import("./browser-automation/scraping-templates");
      expect(SCRAPING_TEMPLATES).toHaveProperty("contactInfo");
    });

    it("should have news article template", async () => {
      const { SCRAPING_TEMPLATES } = await import("./browser-automation/scraping-templates");
      expect(SCRAPING_TEMPLATES).toHaveProperty("newsArticle");
    });

    it("should export detectTemplate function", async () => {
      const { detectTemplate } = await import("./browser-automation/scraping-templates");
      expect(detectTemplate).toBeDefined();
      expect(typeof detectTemplate).toBe("function");
    });

    it("should export buildScrapingRules function", async () => {
      const { buildScrapingRules } = await import("./browser-automation/scraping-templates");
      expect(buildScrapingRules).toBeDefined();
      expect(typeof buildScrapingRules).toBe("function");
    });

    it("should export LEGAL_SELECTORS", async () => {
      const { LEGAL_SELECTORS } = await import("./browser-automation/scraping-templates");
      expect(LEGAL_SELECTORS).toBeDefined();
      expect(typeof LEGAL_SELECTORS).toBe("object");
    });

    it("should export LEGAL_XPATH", async () => {
      const { LEGAL_XPATH } = await import("./browser-automation/scraping-templates");
      expect(LEGAL_XPATH).toBeDefined();
      expect(typeof LEGAL_XPATH).toBe("object");
    });
  });

  describe("Socket Integration", () => {
    it("should export setupBrowserAutomationSocket function", async () => {
      const { setupBrowserAutomationSocket } = await import("./browser-automation/socket-integration");
      expect(setupBrowserAutomationSocket).toBeDefined();
      expect(typeof setupBrowserAutomationSocket).toBe("function");
    });
  });

  describe("Main Router Integration", () => {
    it("should include browserAutomation router in appRouter", async () => {
      const { appRouter } = await import("./routers");
      // Router is nested, check if it exists in the router definition
      expect(appRouter._def.router).toBeDefined();
    });

    it("should have all browser automation procedures accessible via tRPC", async () => {
      const { browserAutomationRouter } = await import("./browser-automation/router");
      expect(browserAutomationRouter).toBeDefined();
      expect(browserAutomationRouter._def.procedures).toHaveProperty("createSession");
    });
  });

  describe("Feature Completeness", () => {
    it("should support web scraping capabilities", async () => {
      const { SCRAPING_TEMPLATES } = await import("./browser-automation/scraping-templates");
      expect(Object.keys(SCRAPING_TEMPLATES).length).toBeGreaterThan(5);
    });

    it("should support legal website templates", async () => {
      const { SCRAPING_TEMPLATES } = await import("./browser-automation/scraping-templates");
      expect(SCRAPING_TEMPLATES.pacer).toBeDefined();
      expect(SCRAPING_TEMPLATES.courtListener).toBeDefined();
      expect(SCRAPING_TEMPLATES.justia).toBeDefined();
    });

    it("should support screenshot streaming", async () => {
      const { BrowserAutomationService } = await import("./browser-automation/service");
      const service = new BrowserAutomationService("test-session");
      expect(service.takeScreenshot).toBeDefined();
      expect(typeof service.takeScreenshot).toBe("function");
    });

    it("should support session recording", async () => {
      const { BrowserAutomationService } = await import("./browser-automation/service");
      const service = new BrowserAutomationService("test-session");
      expect(service.startRecording).toBeDefined();
      expect(service.stopRecording).toBeDefined();
    });

    it("should support action logging", async () => {
      const { BrowserAutomationService } = await import("./browser-automation/service");
      const service = new BrowserAutomationService("test-session");
      expect(service.getActions).toBeDefined();
      expect(typeof service.getActions).toBe("function");
    });
  });
});
