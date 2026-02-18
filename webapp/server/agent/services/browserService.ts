import puppeteer, { Browser, Page } from "puppeteer";

let browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    });
  }
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

export async function navigateToUrl(url: string, waitFor?: string): Promise<{
  title: string;
  content: string;
  url: string;
}> {
  try {
    const browserInstance = await getBrowser();
    const page = await browserInstance.newPage();

    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    if (waitFor) {
      await page.waitForSelector(waitFor, { timeout: 10000 });
    }

    const title = await page.title();
    const content = await page.evaluate(() => document.body.innerText);

      return {
        title,
        content,
        url: page.url(),
      };
    } finally {
      await page.close();
    }
  } catch (error: any) {
    console.error("Browser navigation error:", error.message);
    throw new Error(`Failed to navigate: ${error.message}`);
  }
}

export async function fillForm(
  url: string,
  formData: Record<string, string>,
  submit: boolean = false
): Promise<{
  filledFields: string[];
  submitted: boolean;
  finalUrl: string;
}> {
  const browserInstance = await getBrowser();
  const page = await browserInstance.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    const filledFields: string[] = [];

    for (const [fieldName, value] of Object.entries(formData)) {
      try {
        // Try different selectors
        const selectors = [
          `input[name="${fieldName}"]`,
          `textarea[name="${fieldName}"]`,
          `select[name="${fieldName}"]`,
          `input[id="${fieldName}"]`,
          `textarea[id="${fieldName}"]`,
          `select[id="${fieldName}"]`,
        ];

        let filled = false;
        for (const selector of selectors) {
          try {
            const element = await page.$(selector);
            if (element) {
              await element.type(value);
              filledFields.push(fieldName);
              filled = true;
              break;
            }
          } catch (e) {
            // Try next selector
          }
        }

        if (!filled) {
          console.warn(`Could not find field: ${fieldName}`);
        }
      } catch (error) {
        console.error(`Error filling field ${fieldName}:`, error);
      }
    }

    if (submit) {
      // Try to find and click submit button
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:contains("Submit")',
        'button:contains("Send")',
      ];

      for (const selector of submitSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            await button.click();
            await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
            break;
          }
        } catch (e) {
          // Try next selector
        }
      }
    }

    return {
      filledFields,
      submitted: submit,
      finalUrl: page.url(),
    };
  } finally {
    await page.close();
  }
}

export async function takeScreenshot(url: string): Promise<Buffer> {
  const browserInstance = await getBrowser();
  const page = await browserInstance.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    const screenshot = await page.screenshot({ fullPage: true });
    return screenshot as Buffer;
  } finally {
    await page.close();
  }
}
