import { ScrapingRule } from "./service";

/**
 * Pre-built scraping templates for common legal websites
 */

export interface ScrapingTemplate {
  name: string;
  description: string;
  rules: ScrapingRule[];
  urlPattern?: RegExp;
}

export const SCRAPING_TEMPLATES: Record<string, ScrapingTemplate> = {
  // PACER (Public Access to Court Electronic Records)
  pacer: {
    name: "PACER Case Search",
    description: "Extract case information from PACER search results",
    rules: [
      { name: "caseNumber", selector: "td.case-number", multiple: true },
      { name: "caseTitle", selector: "td.case-title", multiple: true },
      { name: "filingDate", selector: "td.filing-date", multiple: true },
      { name: "caseStatus", selector: "td.case-status", multiple: true },
    ],
    urlPattern: /pacer\.uscourts\.gov/,
  },

  // Court Listener
  courtListener: {
    name: "Court Listener Case Law",
    description: "Extract case law information from Court Listener",
    rules: [
      { name: "caseTitle", selector: "h1.case-title" },
      { name: "court", selector: ".court-name" },
      { name: "dateDecided", selector: ".date-decided" },
      { name: "citation", selector: ".citation" },
      { name: "opinion", selector: ".opinion-text" },
      { name: "judges", selector: ".judge-name", multiple: true },
    ],
    urlPattern: /courtlistener\.com/,
  },

  // Justia
  justia: {
    name: "Justia Case Law",
    description: "Extract case information from Justia",
    rules: [
      { name: "caseTitle", selector: "h1" },
      { name: "court", selector: ".court" },
      { name: "date", selector: ".date" },
      { name: "citation", selector: ".citation" },
      { name: "summary", selector: ".summary" },
      { name: "fullText", selector: ".case-text" },
    ],
    urlPattern: /justia\.com/,
  },

  // Google Scholar
  googleScholar: {
    name: "Google Scholar Case Law",
    description: "Extract case information from Google Scholar",
    rules: [
      { name: "titles", selector: "h3.gs_rt a", multiple: true },
      { name: "citations", selector: ".gs_a", multiple: true },
      { name: "snippets", selector: ".gs_rs", multiple: true },
      { name: "links", selector: "h3.gs_rt a", attribute: "href", multiple: true },
    ],
    urlPattern: /scholar\.google\.com/,
  },

  // FTC Consumer Complaints
  ftcComplaints: {
    name: "FTC Consumer Complaints",
    description: "Extract consumer complaint data from FTC website",
    rules: [
      { name: "complaintTypes", selector: ".complaint-type", multiple: true },
      { name: "complaintCounts", selector: ".complaint-count", multiple: true },
      { name: "reportDate", selector: ".report-date" },
      { name: "summary", selector: ".summary-text" },
    ],
    urlPattern: /ftc\.gov/,
  },

  // CFPB Complaint Database
  cfpbComplaints: {
    name: "CFPB Complaint Database",
    description: "Extract complaint information from CFPB database",
    rules: [
      { name: "products", selector: ".product-name", multiple: true },
      { name: "issues", selector: ".issue-name", multiple: true },
      { name: "companies", selector: ".company-name", multiple: true },
      { name: "dates", selector: ".complaint-date", multiple: true },
      { name: "states", selector: ".state-name", multiple: true },
    ],
    urlPattern: /consumerfinance\.gov/,
  },

  // Generic Legal Document
  genericLegalDoc: {
    name: "Generic Legal Document",
    description: "Extract common elements from legal documents",
    rules: [
      { name: "title", selector: "h1, .title, .document-title" },
      { name: "date", selector: ".date, .document-date, time" },
      { name: "parties", selector: ".party, .parties li", multiple: true },
      { name: "content", selector: "article, .content, .document-body" },
      { name: "citations", selector: ".citation, .cite", multiple: true },
    ],
  },

  // Table Extraction
  tableExtraction: {
    name: "Table Data Extraction",
    description: "Extract data from HTML tables",
    rules: [
      { name: "headers", selector: "th", multiple: true },
      { name: "rows", selector: "tr", multiple: true },
      { name: "cells", selector: "td", multiple: true },
    ],
  },

  // Contact Information
  contactInfo: {
    name: "Contact Information",
    description: "Extract contact information from web pages",
    rules: [
      { name: "emails", selector: "a[href^='mailto:']", attribute: "href", multiple: true },
      { name: "phones", selector: "a[href^='tel:']", attribute: "href", multiple: true },
      { name: "addresses", selector: ".address, address", multiple: true },
      { name: "names", selector: ".name, .contact-name", multiple: true },
    ],
  },

  // News Articles
  newsArticle: {
    name: "News Article",
    description: "Extract article content and metadata",
    rules: [
      { name: "headline", selector: "h1, .headline, article h1" },
      { name: "author", selector: ".author, .byline, [rel='author']" },
      { name: "publishDate", selector: "time, .publish-date, .date" },
      { name: "content", selector: "article, .article-body, .content" },
      { name: "summary", selector: ".summary, .excerpt, .description" },
    ],
  },
};

/**
 * Helper function to detect which template to use based on URL
 */
export function detectTemplate(url: string): ScrapingTemplate | null {
  for (const template of Object.values(SCRAPING_TEMPLATES)) {
    if (template.urlPattern && template.urlPattern.test(url)) {
      return template;
    }
  }
  return null;
}

/**
 * Helper function to build custom scraping rules
 */
export function buildScrapingRules(config: {
  selectors: { name: string; selector: string; attribute?: string; multiple?: boolean }[];
}): ScrapingRule[] {
  return config.selectors.map((s) => ({
    name: s.name,
    selector: s.selector,
    attribute: s.attribute,
    multiple: s.multiple || false,
  }));
}

/**
 * Common CSS selectors for legal content
 */
export const LEGAL_SELECTORS = {
  // Case information
  caseNumber: [".case-number", "#case-number", "[data-case-number]"],
  caseTitle: ["h1.case-title", ".case-name", "h1"],
  court: [".court", ".court-name", "[data-court]"],
  judge: [".judge", ".judge-name", "[data-judge]"],
  
  // Dates
  filingDate: [".filing-date", ".date-filed", "[data-filing-date]"],
  decisionDate: [".decision-date", ".date-decided", "[data-decision-date]"],
  
  // Parties
  plaintiff: [".plaintiff", ".party-plaintiff"],
  defendant: [".defendant", ".party-defendant"],
  attorney: [".attorney", ".counsel"],
  
  // Content
  opinion: [".opinion", ".opinion-text", "article"],
  summary: [".summary", ".syllabus", ".headnotes"],
  citation: [".citation", ".cite", "[data-citation]"],
  
  // Docket
  docketEntry: [".docket-entry", "tr.docket-row"],
  documentLink: ["a.document-link", "a[href*='pdf']"],
};

/**
 * XPath expressions for complex extractions
 */
export const LEGAL_XPATH = {
  // Find all paragraphs containing specific legal terms
  paragraphsWithTerm: (term: string) => 
    `//p[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${term.toLowerCase()}')]`,
  
  // Find table cells in a specific column
  tableColumn: (columnIndex: number) => 
    `//table//tr/td[${columnIndex}]`,
  
  // Find links with specific text
  linkWithText: (text: string) => 
    `//a[contains(text(), '${text}')]`,
  
  // Find elements by data attribute
  byDataAttribute: (attr: string, value: string) => 
    `//*[@data-${attr}='${value}']`,
};
