import { chromium, Browser, Page } from 'playwright';
import crypto from 'crypto';
import { getDb } from '../db';
import { monitoredSites, siteSnapshots, policyChanges } from '../../drizzle/schema';
import { storagePut } from '../storage';
import { eq } from 'drizzle-orm';

let browser: Browser | null = null;

/**
 * Initialize Playwright browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browser;
}

/**
 * Calculate SHA256 hash of content
 */
function calculateHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Capture website snapshot
 */
export async function captureSnapshot(monitoredSiteId: number, url: string): Promise<{
  success: boolean;
  snapshotId?: number;
  changeDetected?: boolean;
  error?: string;
}> {
  let page: Page | null = null;
  
  try {
    const db = await getDb();
    if (!db) {
      return { success: false, error: 'Database connection failed' };
    }

    const browser = await getBrowser();
    page = await browser.newPage();
    
    // Navigate to URL with timeout
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Extract content
    const htmlContent = await page.content();
    const textContent = await page.evaluate(() => document.body.innerText);
    
    // Take screenshot
    const screenshot = await page.screenshot({ fullPage: true });
    
    // Upload screenshot to S3
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const screenshotKey = `web-snapshots/${monitoredSiteId}/${timestamp}-${randomSuffix}.png`;
    const { url: screenshotUrl } = await storagePut(screenshotKey, screenshot, 'image/png');
    
    // Calculate content hash
    const contentHash = calculateHash(textContent);
    
    // Get previous snapshot for comparison
    const [previousSnapshot] = await db
      .select()
      .from(siteSnapshots)
      .where(eq(siteSnapshots.monitoredSiteId, monitoredSiteId))
      .orderBy(siteSnapshots.capturedAt)
      .limit(1);
    
    // Detect changes
    const changeDetected = previousSnapshot && previousSnapshot.contentHash !== contentHash;
    
    // Insert new snapshot
    const insertResult: any = await db.insert(siteSnapshots).values({
      monitoredSiteId,
      url,
      htmlContent,
      textContent,
      screenshotUrl,
      screenshotKey,
      contentHash,
      changeDetected: changeDetected || false,
      changesSummary: changeDetected ? 'Content changes detected' : null,
      diffFromPrevious: changeDetected ? [] : null, // TODO: Implement detailed diff
      metadata: {
        captureTimestamp: new Date().toISOString(),
        pageTitle: await page.title(),
        viewport: await page.viewportSize()
      }
    });
    
    const snapshotId = insertResult.insertId || insertResult[0]?.insertId || 0;
    
    // If changes detected, create policy change record
    if (changeDetected && snapshotId) {
      await db.insert(policyChanges).values({
        monitoredSiteId,
        snapshotId,
        changeType: 'content_update',
        title: `Content changes detected on ${url}`,
        description: 'Automated change detection identified modifications to the monitored website.',
        severity: 'medium',
        affectedSections: [],
        aiAnalysis: null, // TODO: Implement AI analysis
        isReviewed: false,
        metadata: {
          previousHash: previousSnapshot?.contentHash,
          currentHash: contentHash
        }
      });
    }
    
    // Update monitored site last checked timestamp
    await db
      .update(monitoredSites)
      .set({ 
        lastChecked: new Date(),
        lastChanged: changeDetected ? new Date() : undefined
      })
      .where(eq(monitoredSites.id, monitoredSiteId));
    
    return {
      success: true,
      snapshotId,
      changeDetected: changeDetected || false
    };
    
  } catch (error: any) {
    console.error('[Web Snapshot] Error:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    if (page) {
      await page.close();
    }
  }
}

/**
 * Monitor all active sites
 */
export async function monitorAllSites(): Promise<{
  checked: number;
  changesDetected: number;
  errors: number;
}> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Web Monitoring] Database connection failed');
      return { checked: 0, changesDetected: 0, errors: 0 };
    }

    // Get all active monitored sites
    const sites = await db
      .select()
      .from(monitoredSites)
      .where(eq(monitoredSites.isActive, true));
    
    let checked = 0;
    let changesDetected = 0;
    let errors = 0;
    
    for (const site of sites) {
      const result = await captureSnapshot(site.id, site.url);
      
      if (result.success) {
        checked++;
        if (result.changeDetected) {
          changesDetected++;
        }
      } else {
        errors++;
      }
      
      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`[Web Monitoring] Checked ${checked} sites, ${changesDetected} changes detected, ${errors} errors`);
    
    return { checked, changesDetected, errors };
    
  } catch (error: any) {
    console.error('[Web Monitoring] Error:', error);
    return { checked: 0, changesDetected: 0, errors: 0 };
  }
}

/**
 * Start monitoring scheduler (runs every 6 hours)
 */
export function startWebMonitoring() {
  console.log('[Web Monitoring] Starting scheduler (6-hour interval)');
  
  // Run immediately on startup
  monitorAllSites();
  
  // Then run every 6 hours
  setInterval(() => {
    monitorAllSites();
  }, 6 * 60 * 60 * 1000); // 6 hours
}

/**
 * Cleanup browser on shutdown
 */
export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
