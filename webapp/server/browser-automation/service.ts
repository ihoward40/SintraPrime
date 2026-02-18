import puppeteer, { Browser, Page } from 'puppeteer';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface BrowserAction {
  type: 'navigate' | 'click' | 'type' | 'scroll' | 'extract' | 'screenshot';
  timestamp: Date;
  description: string;
  selector?: string;
  value?: string;
  url?: string;
  result?: any;
}

export interface ScrapingRule {
  name: string;
  selector: string;
  attribute?: string;
  multiple?: boolean;
}

export class BrowserAutomationService extends EventEmitter {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private recorder: PuppeteerScreenRecorder | null = null;
  private sessionId: string;
  private actions: BrowserAction[] = [];
  private screenshotInterval: NodeJS.Timeout | null = null;
  private recordingPath: string | null = null;

  constructor(sessionId: string) {
    super();
    this.sessionId = sessionId;
  }

  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });

    // Start screenshot streaming
    this.startScreenshotStreaming();

    this.emit('initialized', { sessionId: this.sessionId });
  }

  async startRecording(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    const recordingsDir = path.join(process.cwd(), 'recordings');
    await fs.mkdir(recordingsDir, { recursive: true });

    this.recordingPath = path.join(recordingsDir, `${this.sessionId}.mp4`);

    this.recorder = new PuppeteerScreenRecorder(this.page, {
      followNewTab: false,
      fps: 15,
      videoFrame: {
        width: 1920,
        height: 1080,
      },
      aspectRatio: '16:9',
    });

    await this.recorder.start(this.recordingPath);
    this.emit('recording-started', { path: this.recordingPath });
  }

  async stopRecording(): Promise<string | null> {
    if (this.recorder && this.recordingPath) {
      await this.recorder.stop();
      this.emit('recording-stopped', { path: this.recordingPath });
      return this.recordingPath;
    }
    return null;
  }

  private startScreenshotStreaming(): void {
    this.screenshotInterval = setInterval(async () => {
      if (this.page) {
        try {
          const screenshot = await this.page.screenshot({
            type: 'jpeg',
            quality: 70,
            encoding: 'base64',
          });
          this.emit('screenshot', {
            sessionId: this.sessionId,
            screenshot: `data:image/jpeg;base64,${screenshot}`,
            timestamp: new Date(),
          });
        } catch (error) {
          console.error('[BrowserAutomation] Screenshot error:', error);
        }
      }
    }, 1000); // Update every second
  }

  async navigate(url: string): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    const action: BrowserAction = {
      type: 'navigate',
      timestamp: new Date(),
      description: `Navigating to ${url}`,
      url,
    };

    this.actions.push(action);
    this.emit('action', action);

    await this.page.goto(url, { waitUntil: 'networkidle2' });

    const screenshot = await this.takeScreenshot();
    this.emit('action-complete', { ...action, screenshot });
  }

  async click(selector: string): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    const action: BrowserAction = {
      type: 'click',
      timestamp: new Date(),
      description: `Clicking element: ${selector}`,
      selector,
    };

    this.actions.push(action);
    this.emit('action', action);

    await this.page.waitForSelector(selector, { timeout: 10000 });
    await this.page.click(selector);

    const screenshot = await this.takeScreenshot();
    this.emit('action-complete', { ...action, screenshot });
  }

  async type(selector: string, text: string): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    const action: BrowserAction = {
      type: 'type',
      timestamp: new Date(),
      description: `Typing into ${selector}`,
      selector,
      value: text,
    };

    this.actions.push(action);
    this.emit('action', action);

    await this.page.waitForSelector(selector, { timeout: 10000 });
    await this.page.type(selector, text);

    const screenshot = await this.takeScreenshot();
    this.emit('action-complete', { ...action, screenshot });
  }

  async scroll(direction: 'up' | 'down', distance: number = 500): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    const action: BrowserAction = {
      type: 'scroll',
      timestamp: new Date(),
      description: `Scrolling ${direction} by ${distance}px`,
      value: `${direction}:${distance}`,
    };

    this.actions.push(action);
    this.emit('action', action);

    const scrollAmount = direction === 'down' ? distance : -distance;
    await this.page.evaluate((amount) => {
      window.scrollBy(0, amount);
    }, scrollAmount);

    const screenshot = await this.takeScreenshot();
    this.emit('action-complete', { ...action, screenshot });
  }

  async extract(rules: ScrapingRule[]): Promise<Record<string, any>> {
    if (!this.page) throw new Error('Browser not initialized');

    const action: BrowserAction = {
      type: 'extract',
      timestamp: new Date(),
      description: `Extracting data using ${rules.length} rules`,
    };

    this.actions.push(action);
    this.emit('action', action);

    const results: Record<string, any> = {};

    for (const rule of rules) {
      try {
        if (rule.multiple) {
          results[rule.name] = await this.page.$$eval(
            rule.selector,
            (elements, attr) => {
              return elements.map((el) => {
                if (attr) {
                  return el.getAttribute(attr) || '';
                }
                return el.textContent?.trim() || '';
              });
            },
            rule.attribute
          );
        } else {
          results[rule.name] = await this.page.$eval(
            rule.selector,
            (element, attr) => {
              if (attr) {
                return element.getAttribute(attr) || '';
              }
              return element.textContent?.trim() || '';
            },
            rule.attribute
          );
        }
      } catch (error) {
        results[rule.name] = null;
        console.error(`[BrowserAutomation] Extraction error for ${rule.name}:`, error);
      }
    }

    action.result = results;
    const screenshot = await this.takeScreenshot();
    this.emit('action-complete', { ...action, screenshot, result: results });

    return results;
  }

  async takeScreenshot(): Promise<string> {
    if (!this.page) throw new Error('Browser not initialized');

    const screenshot = await this.page.screenshot({
      type: 'jpeg',
      quality: 85,
      encoding: 'base64',
    });

    return `data:image/jpeg;base64,${screenshot}`;
  }

  async getPageContent(): Promise<string> {
    if (!this.page) throw new Error('Browser not initialized');
    return await this.page.content();
  }

  async evaluateScript(script: string): Promise<any> {
    if (!this.page) throw new Error('Browser not initialized');
    return await this.page.evaluate(script);
  }

  getActions(): BrowserAction[] {
    return this.actions;
  }

  async cleanup(): Promise<void> {
    if (this.screenshotInterval) {
      clearInterval(this.screenshotInterval);
    }

    if (this.recorder) {
      await this.stopRecording();
    }

    if (this.browser) {
      await this.browser.close();
    }

    this.emit('cleanup', { sessionId: this.sessionId });
  }
}

// Session manager to handle multiple concurrent browser sessions
export class BrowserSessionManager {
  private sessions: Map<string, BrowserAutomationService> = new Map();

  async createSession(sessionId: string): Promise<BrowserAutomationService> {
    const service = new BrowserAutomationService(sessionId);
    await service.initialize();
    this.sessions.set(sessionId, service);
    return service;
  }

  getSession(sessionId: string): BrowserAutomationService | undefined {
    return this.sessions.get(sessionId);
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      await session.cleanup();
      this.sessions.delete(sessionId);
    }
  }

  async closeAllSessions(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());
    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (session) {
        await session.cleanup();
        this.sessions.delete(sessionId);
      }
    }
  }
}
