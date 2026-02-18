// Citation Generator for Legal Sources
// Supports Bluebook and APA formats

export type CitationFormat = "bluebook" | "apa";

export interface CitationSource {
  type: "case" | "statute" | "article" | "website" | "book";
  title: string;
  url: string;
  author?: string;
  year?: number;
  court?: string;
  volume?: string;
  reporter?: string;
  page?: string;
  publisher?: string;
  accessDate?: Date;
}

/**
 * Generate citation in Bluebook format
 */
function generateBluebook(source: CitationSource): string {
  switch (source.type) {
    case "case":
      // Format: Case Name, Volume Reporter Page (Court Year)
      // Example: Brown v. Board of Education, 347 U.S. 483 (1954)
      const caseName = source.title;
      const citation = source.volume && source.reporter && source.page
        ? `${source.volume} ${source.reporter} ${source.page}`
        : "";
      const courtYear = source.court && source.year
        ? `(${source.court} ${source.year})`
        : source.year
        ? `(${source.year})`
        : "";
      return `${caseName}${citation ? ", " + citation : ""} ${courtYear}`.trim();

    case "statute":
      // Format: Title U.S.C. § Section (Year)
      // Example: 42 U.S.C. § 1983 (2018)
      return `${source.title}${source.year ? ` (${source.year})` : ""}`;

    case "article":
      // Format: Author, Title, Volume Journal Page (Year)
      // Example: John Doe, Legal Analysis, 50 Harv. L. Rev. 123 (2020)
      const author = source.author || "Unknown Author";
      const volPage = source.volume && source.page
        ? `${source.volume} ${source.page}`
        : "";
      return `${author}, ${source.title}${volPage ? ", " + volPage : ""}${source.year ? ` (${source.year})` : ""}`;

    case "website":
      // Format: Title, URL (last visited Date)
      const accessDate = source.accessDate
        ? source.accessDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
      return `${source.title}, ${source.url} (last visited ${accessDate})`;

    case "book":
      // Format: Author, Title (Publisher Year)
      const bookAuthor = source.author || "Unknown Author";
      const pubInfo = source.publisher && source.year
        ? `(${source.publisher} ${source.year})`
        : source.year
        ? `(${source.year})`
        : "";
      return `${bookAuthor}, ${source.title} ${pubInfo}`.trim();

    default:
      return `${source.title}, ${source.url}`;
  }
}

/**
 * Generate citation in APA format
 */
function generateAPA(source: CitationSource): string {
  switch (source.type) {
    case "case":
      // Format: Case Name, Volume Reporter Page (Court Year)
      // Example: Brown v. Board of Education, 347 U.S. 483 (1954)
      const caseName = source.title;
      const citation = source.volume && source.reporter && source.page
        ? `${source.volume} ${source.reporter} ${source.page}`
        : "";
      const year = source.year ? `(${source.year})` : "";
      return `${caseName}, ${citation} ${year}`.trim();

    case "statute":
      // Format: Title, Code § Section (Year)
      return `${source.title}${source.year ? ` (${source.year})` : ""}`;

    case "article":
      // Format: Author. (Year). Title. Journal, Volume(Issue), Page.
      const author = source.author || "Unknown Author";
      const yearPart = source.year ? `(${source.year}). ` : "";
      const volPart = source.volume ? `, ${source.volume}` : "";
      const pagePart = source.page ? `, ${source.page}` : "";
      return `${author}. ${yearPart}${source.title}${volPart}${pagePart}.`;

    case "website":
      // Format: Author. (Year, Month Day). Title. Retrieved from URL
      const webAuthor = source.author || extractDomainFromUrl(source.url);
      const accessDate = source.accessDate || new Date();
      const datePart = accessDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      return `${webAuthor}. (${datePart}). ${source.title}. Retrieved from ${source.url}`;

    case "book":
      // Format: Author. (Year). Title. Publisher.
      const bookAuthor = source.author || "Unknown Author";
      const yearBook = source.year ? `(${source.year}). ` : "";
      const publisher = source.publisher ? `${source.publisher}.` : "";
      return `${bookAuthor}. ${yearBook}${source.title}. ${publisher}`.trim();

    default:
      return `${source.title}. Retrieved from ${source.url}`;
  }
}

/**
 * Extract domain name from URL for author field
 */
function extractDomainFromUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    // Remove www. and .com/.org/etc
    return domain.replace(/^www\./, "").replace(/\.[^.]+$/, "");
  } catch {
    return "Unknown Source";
  }
}

/**
 * Detect source type from URL
 */
export function detectSourceType(url: string): CitationSource["type"] {
  const urlLower = url.toLowerCase();
  
  if (
    urlLower.includes("courtlistener") ||
    urlLower.includes("justia.com/cases") ||
    urlLower.includes("casetext.com") ||
    urlLower.includes("oyez.org") ||
    urlLower.includes("supremecourt.gov")
  ) {
    return "case";
  }
  
  if (
    urlLower.includes("uscode") ||
    urlLower.includes("law.cornell.edu/uscode") ||
    urlLower.includes("/statutes/")
  ) {
    return "statute";
  }
  
  if (
    urlLower.includes("scholar.google") ||
    urlLower.includes("jstor.org") ||
    urlLower.includes("ssrn.com")
  ) {
    return "article";
  }
  
  return "website";
}

/**
 * Parse case citation from URL or title
 */
export function parseCaseCitation(title: string, url: string): Partial<CitationSource> {
  // Try to extract volume, reporter, and page from title
  // Example: "Brown v. Board of Education, 347 U.S. 483 (1954)"
  const citationPattern = /(\d+)\s+([A-Za-z.]+)\s+(\d+)/;
  const yearPattern = /\((\d{4})\)/;
  
  const citationMatch = title.match(citationPattern);
  const yearMatch = title.match(yearPattern);
  
  return {
    volume: citationMatch?.[1],
    reporter: citationMatch?.[2],
    page: citationMatch?.[3],
    year: yearMatch ? parseInt(yearMatch[1]) : undefined,
  };
}

/**
 * Main citation generator function
 */
export function generateCitation(
  source: CitationSource,
  format: CitationFormat = "bluebook"
): string {
  if (format === "apa") {
    return generateAPA(source);
  }
  return generateBluebook(source);
}

/**
 * Generate citation from URL and title (auto-detect type)
 */
export function generateCitationFromUrl(
  url: string,
  title: string,
  format: CitationFormat = "bluebook"
): string {
  const type = detectSourceType(url);
  const parsedData = type === "case" ? parseCaseCitation(title, url) : {};
  
  const source: CitationSource = {
    type,
    title,
    url,
    accessDate: new Date(),
    ...parsedData,
  };
  
  return generateCitation(source, format);
}
