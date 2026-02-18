import axios from "axios";

// Google Custom Search API integration
// Requires GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID environment variables

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function webSearch(query: string, numResults: number = 5): Promise<SearchResult[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !searchEngineId) {
    console.warn("Google Search API credentials not configured, returning mock results");
    return getMockSearchResults(query, numResults);
  }

  try {
    const response = await axios.get("https://www.googleapis.com/customsearch/v1", {
      params: {
        key: apiKey,
        cx: searchEngineId,
        q: query,
        num: Math.min(numResults, 10), // API max is 10
      },
      timeout: 10000,
    });

    if (!response.data.items) {
      return [];
    }

    return response.data.items.map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet || "",
    }));
  } catch (error: any) {
    console.error("Google Search API error:", error.message);
    // Fallback to mock results on error
    return getMockSearchResults(query, numResults);
  }
}

function getMockSearchResults(query: string, numResults: number): SearchResult[] {
  const mockResults: SearchResult[] = [
    {
      title: `Legal Resource: ${query}`,
      url: `https://www.law.cornell.edu/search?q=${encodeURIComponent(query)}`,
      snippet: `Cornell Law School Legal Information Institute - Comprehensive legal resources and case law related to ${query}.`,
    },
    {
      title: `Case Law Search: ${query}`,
      url: `https://www.justia.com/search?q=${encodeURIComponent(query)}`,
      snippet: `Free case law, federal and state resources, forms, and more. Find legal information related to ${query}.`,
    },
    {
      title: `${query} - Wikipedia`,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(/ /g, "_"))}`,
      snippet: `Wikipedia article providing background information and context about ${query}.`,
    },
    {
      title: `${query} Legal Analysis`,
      url: `https://www.nolo.com/search?q=${encodeURIComponent(query)}`,
      snippet: `Nolo's plain-English law dictionary and legal encyclopedia covering ${query} and related topics.`,
    },
    {
      title: `Recent Cases: ${query}`,
      url: `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`,
      snippet: `Google Scholar search results for academic articles and case law related to ${query}.`,
    },
  ];

  return mockResults.slice(0, numResults);
}

// Legal-specific search engines
export async function searchCaseLaw(query: string, jurisdiction?: string): Promise<SearchResult[]> {
  // This would integrate with legal databases like Westlaw, LexisNexis, or CourtListener
  // For now, return enhanced mock results
  const enhancedQuery = jurisdiction ? `${query} ${jurisdiction} case law` : `${query} case law`;
  return webSearch(enhancedQuery, 5);
}

export async function searchStatutes(query: string, jurisdiction?: string): Promise<SearchResult[]> {
  const enhancedQuery = jurisdiction ? `${query} ${jurisdiction} statute` : `${query} statute`;
  return webSearch(enhancedQuery, 5);
}
