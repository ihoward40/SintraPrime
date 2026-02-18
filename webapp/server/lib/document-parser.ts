/**
 * Document Parser Service
 * 
 * Handles parsing of various document formats:
 * - PDF files
 * - DOCX files
 * - Web pages (URL scraping)
 * - Plain text
 */

// @ts-ignore - pdf-parse-fork doesn't have types
import pdfParse from "pdf-parse-fork";
import mammoth from "mammoth";
import * as cheerio from "cheerio";

export interface ParsedDocument {
  text: string;
  metadata?: {
    title?: string;
    author?: string;
    pages?: number;
    wordCount?: number;
  };
}

export class DocumentParser {
  /**
   * Parse PDF file from buffer
   */
  async parsePDF(buffer: Buffer): Promise<ParsedDocument> {
    try {
      const data = await pdfParse(buffer);
      
      return {
        text: data.text,
        metadata: {
          title: data.info?.Title,
          author: data.info?.Author,
          pages: data.numpages,
          wordCount: data.text.split(/\s+/).length,
        },
      };
    } catch (error) {
      console.error("[DocumentParser] PDF parsing error:", error);
      throw new Error("Failed to parse PDF document");
    }
  }

  /**
   * Parse DOCX file from buffer
   */
  async parseDOCX(buffer: Buffer): Promise<ParsedDocument> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      
      return {
        text: result.value,
        metadata: {
          wordCount: result.value.split(/\s+/).length,
        },
      };
    } catch (error) {
      console.error("[DocumentParser] DOCX parsing error:", error);
      throw new Error("Failed to parse DOCX document");
    }
  }

  /**
   * Scrape and parse web page from URL
   */
  async parseURL(url: string): Promise<ParsedDocument> {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; SintraPrime/1.0)",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Remove script and style elements
      $("script, style, nav, footer, header").remove();

      // Extract title
      const title = $("title").text() || $("h1").first().text();

      // Extract main content
      // Try common content containers
      let text = "";
      const contentSelectors = [
        "article",
        "main",
        '[role="main"]',
        ".content",
        ".post-content",
        ".article-content",
        "#content",
      ];

      for (const selector of contentSelectors) {
        const content = $(selector).text().trim();
        if (content.length > text.length) {
          text = content;
        }
      }

      // Fallback to body if no content found
      if (!text) {
        text = $("body").text().trim();
      }

      // Clean up whitespace
      text = text.replace(/\s+/g, " ").trim();

      return {
        text,
        metadata: {
          title,
          wordCount: text.split(/\s+/).length,
        },
      };
    } catch (error) {
      console.error("[DocumentParser] URL parsing error:", error);
      throw new Error(`Failed to parse URL: ${url}`);
    }
  }

  /**
   * Parse plain text
   */
  parseText(text: string): ParsedDocument {
    return {
      text,
      metadata: {
        wordCount: text.split(/\s+/).length,
      },
    };
  }

  /**
   * Auto-detect and parse document based on file type
   */
  async parseDocument(
    buffer: Buffer,
    mimeType: string,
    fileName?: string
  ): Promise<ParsedDocument> {
    // Handle URLs
    if (mimeType === "text/url" || fileName?.startsWith("http")) {
      const url = buffer.toString("utf-8");
      return await this.parseURL(url);
    }

    // Handle PDFs
    if (mimeType === "application/pdf" || fileName?.endsWith(".pdf")) {
      return await this.parsePDF(buffer);
    }

    // Handle DOCX
    if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileName?.endsWith(".docx")
    ) {
      return await this.parseDOCX(buffer);
    }

    // Handle plain text
    if (mimeType.startsWith("text/") || fileName?.endsWith(".txt")) {
      return this.parseText(buffer.toString("utf-8"));
    }

    // Unsupported format
    throw new Error(`Unsupported document format: ${mimeType}`);
  }
}

// Export singleton instance
export const documentParser = new DocumentParser();
