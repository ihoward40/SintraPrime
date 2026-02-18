/**
 * RSS Intelligence Feed Service
 * Aggregates legal news from multiple sources
 */

import Parser from "rss-parser";

export interface IntelligenceFeedItem {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: Date;
  source: string;
  category: string;
  jurisdiction?: string;
  practiceArea?: string;
  credibilityScore: number;
}

export interface FeedSource {
  name: string;
  url: string;
  category: string;
  credibilityScore: number;
}

// Legal news RSS feeds
const FEED_SOURCES: FeedSource[] = [
  {
    name: "Law360",
    url: "https://www.law360.com/articles.rss",
    category: "Legal News",
    credibilityScore: 0.95,
  },
  {
    name: "Bloomberg Law",
    url: "https://news.bloomberglaw.com/rss/",
    category: "Legal News",
    credibilityScore: 0.95,
  },
  {
    name: "ABA Journal",
    url: "http://www.abajournal.com/news/rss/",
    category: "Legal News",
    credibilityScore: 0.90,
  },
  {
    name: "SCOTUSblog",
    url: "https://www.scotusblog.com/feed/",
    category: "Supreme Court",
    credibilityScore: 0.98,
  },
  {
    name: "Justia",
    url: "https://onward.justia.com/feed/",
    category: "Legal News",
    credibilityScore: 0.85,
  },
  {
    name: "Law.com",
    url: "https://www.law.com/feed/",
    category: "Legal News",
    credibilityScore: 0.90,
  },
  {
    name: "Legal Reader",
    url: "https://www.legalreader.com/feed/",
    category: "Legal News",
    credibilityScore: 0.80,
  },
];

export class RSSIntelligenceService {
  private parser: Parser;
  private cache: Map<string, IntelligenceFeedItem[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  constructor() {
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        "User-Agent": "SintraPrime/1.0",
      },
    });
  }

  /**
   * Fetch intelligence from all sources
   */
  async fetchAllFeeds(): Promise<IntelligenceFeedItem[]> {
    const cacheKey = "all_feeds";
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const results = await Promise.allSettled(
      FEED_SOURCES.map((source) => this.fetchFeed(source))
    );

    const items: IntelligenceFeedItem[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        items.push(...result.value);
      } else {
        console.error(`Failed to fetch feed: ${result.reason}`);
      }
    }

    // Sort by date (newest first)
    items.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

    // Remove duplicates based on title similarity
    const uniqueItems = this.deduplicateItems(items);

    this.setCache(cacheKey, uniqueItems);
    return uniqueItems;
  }

  /**
   * Fetch intelligence from a specific source
   */
  async fetchFeed(source: FeedSource): Promise<IntelligenceFeedItem[]> {
    try {
      const feed = await this.parser.parseURL(source.url);
      
      return (feed.items || []).map((item: any, index: number) => ({
        id: `${source.name}-${index}-${Date.now()}`,
        title: item.title || "Untitled",
        description: this.stripHTML(item.contentSnippet || item.description || ""),
        link: item.link || "",
        pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
        source: source.name,
        category: source.category,
        jurisdiction: this.extractJurisdiction(item.title || ""),
        practiceArea: this.extractPracticeArea(item.title || "", item.contentSnippet || ""),
        credibilityScore: source.credibilityScore,
      }));
    } catch (error) {
      console.error(`Error fetching feed from ${source.name}:`, error);
      return [];
    }
  }

  /**
   * Filter feeds by criteria
   */
  filterFeeds(
    items: IntelligenceFeedItem[],
    filters: {
      jurisdiction?: string;
      practiceArea?: string;
      keywords?: string[];
      minCredibility?: number;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): IntelligenceFeedItem[] {
    return items.filter((item) => {
      // Jurisdiction filter
      if (filters.jurisdiction && item.jurisdiction !== filters.jurisdiction) {
        return false;
      }

      // Practice area filter
      if (filters.practiceArea && item.practiceArea !== filters.practiceArea) {
        return false;
      }

      // Keyword filter
      if (filters.keywords && filters.keywords.length > 0) {
        const text = `${item.title} ${item.description}`.toLowerCase();
        const hasKeyword = filters.keywords.some((keyword) =>
          text.includes(keyword.toLowerCase())
        );
        if (!hasKeyword) {
          return false;
        }
      }

      // Credibility filter
      if (filters.minCredibility && item.credibilityScore < filters.minCredibility) {
        return false;
      }

      // Date range filter
      if (filters.dateFrom && item.pubDate < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && item.pubDate > filters.dateTo) {
        return false;
      }

      return true;
    });
  }

  /**
   * Remove duplicate items based on title similarity
   */
  private deduplicateItems(items: IntelligenceFeedItem[]): IntelligenceFeedItem[] {
    const seen = new Set<string>();
    const unique: IntelligenceFeedItem[] = [];

    for (const item of items) {
      const normalized = this.normalizeTitle(item.title);
      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(item);
      }
    }

    return unique;
  }

  /**
   * Normalize title for duplicate detection
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Extract jurisdiction from title/content
   */
  private extractJurisdiction(text: string): string | undefined {
    const jurisdictions = [
      "Federal",
      "Supreme Court",
      "Circuit",
      "California",
      "New York",
      "Texas",
      "Florida",
      "Illinois",
      "Pennsylvania",
      "Ohio",
      "Georgia",
      "North Carolina",
      "Michigan",
      "New Jersey",
      "Virginia",
    ];

    for (const jurisdiction of jurisdictions) {
      if (text.includes(jurisdiction)) {
        return jurisdiction;
      }
    }

    return undefined;
  }

  /**
   * Extract practice area from title/content
   */
  private extractPracticeArea(title: string, description: string): string | undefined {
    const text = `${title} ${description}`.toLowerCase();
    const practiceAreas = [
      { keywords: ["patent", "trademark", "copyright", "ip"], area: "Intellectual Property" },
      { keywords: ["criminal", "prosecution", "defense"], area: "Criminal Law" },
      { keywords: ["corporate", "merger", "acquisition", "securities"], area: "Corporate Law" },
      { keywords: ["employment", "labor", "discrimination"], area: "Employment Law" },
      { keywords: ["tax", "irs", "revenue"], area: "Tax Law" },
      { keywords: ["real estate", "property", "landlord"], area: "Real Estate Law" },
      { keywords: ["family", "divorce", "custody"], area: "Family Law" },
      { keywords: ["bankruptcy", "insolvency", "creditor"], area: "Bankruptcy Law" },
      { keywords: ["environmental", "epa", "pollution"], area: "Environmental Law" },
      { keywords: ["antitrust", "competition", "monopoly"], area: "Antitrust Law" },
    ];

    for (const { keywords, area } of practiceAreas) {
      if (keywords.some((keyword) => text.includes(keyword))) {
        return area;
      }
    }

    return undefined;
  }

  /**
   * Strip HTML tags from text
   */
  private stripHTML(html: string): string {
    return html.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").trim();
  }

  /**
   * Get items from cache
   */
  private getFromCache(key: string): IntelligenceFeedItem[] | null {
    const expiry = this.cacheExpiry.get(key);
    if (expiry && Date.now() < expiry) {
      return this.cache.get(key) || null;
    }
    return null;
  }

  /**
   * Set items in cache
   */
  private setCache(key: string, items: IntelligenceFeedItem[]): void {
    this.cache.set(key, items);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}

// Singleton instance
export const rssIntelligenceService = new RSSIntelligenceService();
