/**
 * Pre-built web scraping task templates for Agent Zero
 * These templates provide quick-start tasks for common legal research and data extraction scenarios
 */

export interface ScrapingTemplate {
  id: string;
  title: string;
  description: string;
  category: "legal" | "research" | "compliance" | "general";
  taskPrompt: string;
  estimatedTime: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
}

export const SCRAPING_TEMPLATES: ScrapingTemplate[] = [
  // Legal Website Templates
  {
    id: "pacer-case-search",
    title: "PACER Case Search",
    description: "Search for federal court cases on PACER and extract case details",
    category: "legal",
    taskPrompt: "Visit PACER (pacer.gov) and search for cases related to '[SEARCH_TERM]'. Extract the case number, filing date, parties involved, and case status for the top 10 results.",
    estimatedTime: "2-3 minutes",
    difficulty: "hard",
    tags: ["federal-court", "case-law", "litigation"]
  },
  {
    id: "court-listener-opinions",
    title: "Court Listener Opinions",
    description: "Extract recent court opinions from CourtListener",
    category: "legal",
    taskPrompt: "Visit CourtListener.com and navigate to recent opinions. Extract the case name, court, date, and opinion summary for the 5 most recent opinions in the '[JURISDICTION]' jurisdiction.",
    estimatedTime: "1-2 minutes",
    difficulty: "medium",
    tags: ["opinions", "case-law", "research"]
  },
  {
    id: "justia-case-law",
    title: "Justia Case Law Research",
    description: "Research case law on Justia by topic",
    category: "legal",
    taskPrompt: "Visit Justia.com and search for case law related to '[LEGAL_TOPIC]'. Extract the case name, citation, year, and key holding for the top 5 relevant cases.",
    estimatedTime: "2-3 minutes",
    difficulty: "medium",
    tags: ["case-law", "research", "precedent"]
  },
  {
    id: "google-scholar-legal",
    title: "Google Scholar Legal Search",
    description: "Search Google Scholar for legal articles and cases",
    category: "research",
    taskPrompt: "Visit Google Scholar and search for '[SEARCH_QUERY]' in the legal opinions section. Extract the case name, court, year, and number of citations for the top 10 results.",
    estimatedTime: "1-2 minutes",
    difficulty: "easy",
    tags: ["research", "citations", "case-law"]
  },

  // Compliance & Regulatory Templates
  {
    id: "ftc-complaints",
    title: "FTC Consumer Complaints",
    description: "Extract consumer complaint data from FTC website",
    category: "compliance",
    taskPrompt: "Visit the FTC website (ftc.gov) and navigate to the consumer complaints section. Extract the top 5 complaint categories with their complaint counts and recent trends.",
    estimatedTime: "1-2 minutes",
    difficulty: "easy",
    tags: ["ftc", "complaints", "consumer-protection"]
  },
  {
    id: "cfpb-complaints",
    title: "CFPB Complaint Database",
    description: "Search CFPB complaint database for specific companies or products",
    category: "compliance",
    taskPrompt: "Visit the CFPB Consumer Complaint Database and search for complaints about '[COMPANY_NAME]' or '[PRODUCT_TYPE]'. Extract the complaint date, product, issue, and company response for the 10 most recent complaints.",
    estimatedTime: "2-3 minutes",
    difficulty: "medium",
    tags: ["cfpb", "financial", "complaints"]
  },
  {
    id: "sec-edgar-filings",
    title: "SEC EDGAR Filings",
    description: "Extract SEC filings for a specific company",
    category: "compliance",
    taskPrompt: "Visit SEC EDGAR (sec.gov/edgar) and search for '[COMPANY_NAME]' or ticker '[TICKER]'. Extract the 5 most recent filings including form type, filing date, and description.",
    estimatedTime: "1-2 minutes",
    difficulty: "medium",
    tags: ["sec", "edgar", "financial", "compliance"]
  },

  // Legal Research Templates
  {
    id: "fdcpa-violations",
    title: "FDCPA Violation Cases",
    description: "Research recent FDCPA violation cases and outcomes",
    category: "legal",
    taskPrompt: "Search for recent FDCPA (Fair Debt Collection Practices Act) violation cases. Extract case names, courts, violation types, and outcomes (settlement amounts or judgments) for the 5 most recent cases.",
    estimatedTime: "3-4 minutes",
    difficulty: "hard",
    tags: ["fdcpa", "debt-collection", "consumer-law"]
  },
  {
    id: "fcra-case-law",
    title: "FCRA Case Law Research",
    description: "Research Fair Credit Reporting Act case law",
    category: "legal",
    taskPrompt: "Search for FCRA (Fair Credit Reporting Act) case law related to '[SPECIFIC_ISSUE]'. Extract case names, courts, years, key holdings, and damages awarded for the top 5 relevant cases.",
    estimatedTime: "3-4 minutes",
    difficulty: "hard",
    tags: ["fcra", "credit-reporting", "consumer-law"]
  },
  {
    id: "statute-of-limitations",
    title: "Statute of Limitations by State",
    description: "Extract statute of limitations information for specific claim types",
    category: "research",
    taskPrompt: "Research the statute of limitations for '[CLAIM_TYPE]' claims in '[STATE]'. Extract the time limit, any tolling provisions, and relevant statutes or case law citations.",
    estimatedTime: "2-3 minutes",
    difficulty: "medium",
    tags: ["statute-of-limitations", "state-law", "deadlines"]
  },

  // General Legal Data Extraction
  {
    id: "attorney-directory",
    title: "Attorney Directory Scraping",
    description: "Extract attorney information from legal directories",
    category: "general",
    taskPrompt: "Visit '[DIRECTORY_URL]' and search for attorneys practicing '[PRACTICE_AREA]' in '[LOCATION]'. Extract attorney names, firms, contact information, and years of experience for the top 10 results.",
    estimatedTime: "2-3 minutes",
    difficulty: "medium",
    tags: ["attorneys", "directory", "contact-info"]
  },
  {
    id: "court-docket",
    title: "Court Docket Extraction",
    description: "Extract docket entries from court websites",
    category: "legal",
    taskPrompt: "Access the court docket for case '[CASE_NUMBER]' in '[COURT_NAME]'. Extract all docket entries including date, description, and filing party for the past 30 days.",
    estimatedTime: "2-3 minutes",
    difficulty: "hard",
    tags: ["docket", "court-records", "litigation"]
  },
  {
    id: "legal-news",
    title: "Legal News Aggregation",
    description: "Aggregate recent legal news from multiple sources",
    category: "research",
    taskPrompt: "Visit legal news websites (Law360, Bloomberg Law, etc.) and extract the 10 most recent news articles related to '[TOPIC]'. For each article, extract the headline, publication date, source, and a brief summary.",
    estimatedTime: "2-3 minutes",
    difficulty: "medium",
    tags: ["news", "legal-updates", "research"]
  },
  {
    id: "settlement-database",
    title: "Settlement Database Search",
    description: "Search settlement databases for specific case types",
    category: "legal",
    taskPrompt: "Search settlement databases for '[CASE_TYPE]' settlements. Extract the case name, settlement amount, date, and brief description of the claims for the 10 largest settlements.",
    estimatedTime: "2-3 minutes",
    difficulty: "medium",
    tags: ["settlements", "damages", "litigation"]
  },

  // Compliance Monitoring
  {
    id: "regulatory-updates",
    title: "Regulatory Updates Monitoring",
    description: "Monitor regulatory agency websites for new rules and guidance",
    category: "compliance",
    taskPrompt: "Visit '[REGULATORY_AGENCY]' website and check for new rules, guidance, or enforcement actions published in the last 30 days. Extract the title, publication date, and summary for each update.",
    estimatedTime: "2-3 minutes",
    difficulty: "medium",
    tags: ["regulatory", "compliance", "updates"]
  },
  {
    id: "enforcement-actions",
    title: "Enforcement Actions Tracker",
    description: "Track enforcement actions by regulatory agencies",
    category: "compliance",
    taskPrompt: "Visit '[AGENCY]' enforcement actions page and extract details of the 5 most recent enforcement actions including company name, violation type, penalty amount, and action date.",
    estimatedTime: "1-2 minutes",
    difficulty: "easy",
    tags: ["enforcement", "penalties", "compliance"]
  },

  // Federal Court Templates
  {
    id: "federal-district-court",
    title: "Federal District Court Records",
    description: "Search federal district court records and dockets",
    category: "legal",
    taskPrompt: "Search the '[DISTRICT]' Federal District Court website for case number '[CASE_NUMBER]'. Extract case details, parties, judge assigned, filing date, and recent docket entries.",
    estimatedTime: "3-4 minutes",
    difficulty: "hard",
    tags: ["federal-court", "district-court", "dockets"]
  },
  {
    id: "federal-appeals-court",
    title: "Federal Appeals Court Opinions",
    description: "Extract opinions from federal circuit courts of appeals",
    category: "legal",
    taskPrompt: "Visit the '[CIRCUIT]' Circuit Court of Appeals website. Search for opinions related to '[SEARCH_TERM]' from the last '[TIME_PERIOD]'. Extract case name, docket number, panel judges, and decision summary.",
    estimatedTime: "3-4 minutes",
    difficulty: "hard",
    tags: ["appeals", "circuit-court", "opinions"]
  },
  {
    id: "supreme-court-docket",
    title: "Supreme Court Docket Search",
    description: "Search US Supreme Court docket and case information",
    category: "legal",
    taskPrompt: "Visit the Supreme Court website and search for cases related to '[SEARCH_TERM]'. Extract docket number, case name, lower court, question presented, and current status.",
    estimatedTime: "2-3 minutes",
    difficulty: "medium",
    tags: ["supreme-court", "scotus", "appellate"]
  },

  // International Court Templates
  {
    id: "icc-cases",
    title: "International Criminal Court Cases",
    description: "Search ICC case information and proceedings",
    category: "legal",
    taskPrompt: "Visit the International Criminal Court website and search for cases related to '[COUNTRY_OR_SITUATION]'. Extract case name, situation, charges, current phase, and key dates.",
    estimatedTime: "3-4 minutes",
    difficulty: "medium",
    tags: ["international", "icc", "criminal-law"]
  },
  {
    id: "echr-judgments",
    title: "European Court of Human Rights Judgments",
    description: "Extract ECHR judgments and case law",
    category: "legal",
    taskPrompt: "Search the ECHR HUDOC database for cases involving '[ARTICLE_OR_TOPIC]'. Extract case name, application number, judgment date, articles violated, and key findings for the 5 most relevant cases.",
    estimatedTime: "3-4 minutes",
    difficulty: "medium",
    tags: ["international", "human-rights", "echr"]
  },
  {
    id: "icj-cases",
    title: "International Court of Justice Cases",
    description: "Research ICJ contentious cases and advisory opinions",
    category: "legal",
    taskPrompt: "Visit the ICJ website and search for cases involving '[COUNTRY_OR_TOPIC]'. Extract case name, parties, subject matter, current status, and key rulings or orders.",
    estimatedTime: "2-3 minutes",
    difficulty: "medium",
    tags: ["international", "icj", "public-law"]
  },

  // Legal News Templates
  {
    id: "law360-news",
    title: "Law360 Legal News",
    description: "Extract recent legal news and analysis from Law360",
    category: "research",
    taskPrompt: "Visit Law360.com and search for articles about '[TOPIC]' from the last '[TIME_PERIOD]'. Extract article title, date, author, practice area, and summary for the 5 most relevant articles.",
    estimatedTime: "2-3 minutes",
    difficulty: "medium",
    tags: ["news", "legal-industry", "analysis"]
  },
  {
    id: "bloomberg-law-news",
    title: "Bloomberg Law News",
    description: "Search Bloomberg Law for legal news and updates",
    category: "research",
    taskPrompt: "Search Bloomberg Law for news about '[TOPIC]' from the last '[TIME_PERIOD]'. Extract headline, date, jurisdiction, and key points for the top 5 articles.",
    estimatedTime: "2-3 minutes",
    difficulty: "medium",
    tags: ["news", "legal-industry", "business-law"]
  },
  {
    id: "legal-dive",
    title: "Legal Dive Industry News",
    description: "Extract legal industry news from Legal Dive",
    category: "research",
    taskPrompt: "Visit LegalDive.com and find articles about '[TOPIC]' from the last '[TIME_PERIOD]'. Extract title, date, category, and summary for the 5 most recent articles.",
    estimatedTime: "1-2 minutes",
    difficulty: "easy",
    tags: ["news", "legal-industry", "trends"]
  },

  // Bar Association Templates
  {
    id: "aba-resources",
    title: "American Bar Association Resources",
    description: "Search ABA resources and publications",
    category: "research",
    taskPrompt: "Visit the ABA website and search for resources related to '[PRACTICE_AREA]'. Extract resource title, type, publication date, and description for the top 5 results.",
    estimatedTime: "2-3 minutes",
    difficulty: "easy",
    tags: ["aba", "resources", "professional"]
  },
  {
    id: "state-bar-directory",
    title: "State Bar Attorney Directory",
    description: "Search state bar attorney directories",
    category: "research",
    taskPrompt: "Visit the '[STATE]' State Bar attorney directory and search for attorneys practicing '[PRACTICE_AREA]' in '[CITY]'. Extract attorney name, firm, admission date, and contact information for the first 10 results.",
    estimatedTime: "2-3 minutes",
    difficulty: "easy",
    tags: ["attorneys", "directory", "state-bar"]
  },
  {
    id: "bar-discipline",
    title: "Attorney Discipline Records",
    description: "Search state bar discipline and ethics records",
    category: "research",
    taskPrompt: "Visit the '[STATE]' State Bar discipline database and search for records related to attorney '[ATTORNEY_NAME]' or bar number '[BAR_NUMBER]'. Extract discipline type, date, case number, and disposition.",
    estimatedTime: "2-3 minutes",
    difficulty: "medium",
    tags: ["discipline", "ethics", "professional-conduct"]
  },

  // Legal Job Board Templates
  {
    id: "indeed-legal-jobs",
    title: "Indeed Legal Job Listings",
    description: "Search legal job postings on Indeed",
    category: "general",
    taskPrompt: "Search Indeed.com for '[JOB_TITLE]' positions in '[LOCATION]'. Extract job title, company, location, salary range, and key requirements for the 10 most recent postings.",
    estimatedTime: "2-3 minutes",
    difficulty: "easy",
    tags: ["jobs", "careers", "employment"]
  },
  {
    id: "lawjobs-listings",
    title: "LawJobs Career Opportunities",
    description: "Extract legal career opportunities from specialized job boards",
    category: "general",
    taskPrompt: "Visit LawJobs.com and search for '[POSITION_TYPE]' positions in '[PRACTICE_AREA]'. Extract firm name, position title, location, experience required, and application deadline for the top 10 listings.",
    estimatedTime: "2-3 minutes",
    difficulty: "easy",
    tags: ["jobs", "legal-careers", "opportunities"]
  },

  // Specialized Legal Research Templates
  {
    id: "patent-search",
    title: "USPTO Patent Search",
    description: "Search US Patent and Trademark Office database",
    category: "research",
    taskPrompt: "Visit the USPTO patent database and search for patents related to '[TECHNOLOGY_OR_KEYWORD]'. Extract patent number, title, inventor, filing date, and abstract for the 5 most relevant patents.",
    estimatedTime: "3-4 minutes",
    difficulty: "medium",
    tags: ["patents", "intellectual-property", "uspto"]
  },
  {
    id: "trademark-search",
    title: "USPTO Trademark Search",
    description: "Search federal trademark registrations",
    category: "research",
    taskPrompt: "Search the USPTO TESS database for trademarks containing '[MARK_NAME]' in class '[NICE_CLASS]'. Extract registration number, mark, owner, filing date, and status for the top 10 results.",
    estimatedTime: "2-3 minutes",
    difficulty: "medium",
    tags: ["trademarks", "intellectual-property", "uspto"]
  },
  {
    id: "sec-filings",
    title: "SEC EDGAR Filings",
    description: "Search SEC filings and corporate disclosures",
    category: "research",
    taskPrompt: "Visit SEC EDGAR and search for filings by '[COMPANY_NAME]' or CIK '[CIK_NUMBER]'. Extract filing type, date, description, and document link for the 5 most recent filings.",
    estimatedTime: "2-3 minutes",
    difficulty: "easy",
    tags: ["sec", "corporate", "securities"]
  },
  {
    id: "copyright-search",
    title: "Copyright Office Records",
    description: "Search US Copyright Office registration records",
    category: "research",
    taskPrompt: "Search the Copyright Office database for works titled '[TITLE]' or by author '[AUTHOR]'. Extract registration number, title, author, registration date, and work type for relevant results.",
    estimatedTime: "2-3 minutes",
    difficulty: "medium",
    tags: ["copyright", "intellectual-property", "registration"]
  },

  // Real Estate & Property Templates
  {
    id: "property-records",
    title: "County Property Records",
    description: "Search county assessor property records",
    category: "research",
    taskPrompt: "Visit the '[COUNTY]' County Assessor website and search for property at '[ADDRESS]' or parcel number '[PARCEL_NUMBER]'. Extract owner name, assessed value, square footage, year built, and tax information.",
    estimatedTime: "2-3 minutes",
    difficulty: "medium",
    tags: ["property", "real-estate", "public-records"]
  },
  {
    id: "foreclosure-listings",
    title: "Foreclosure Listings",
    description: "Search foreclosure and auction listings",
    category: "research",
    taskPrompt: "Search foreclosure listings in '[COUNTY]' County for properties matching '[CRITERIA]'. Extract property address, auction date, opening bid, property type, and lender information for the 10 most recent listings.",
    estimatedTime: "2-3 minutes",
    difficulty: "easy",
    tags: ["foreclosure", "real-estate", "auctions"]
  },

  // Corporate & Business Templates
  {
    id: "secretary-of-state-business",
    title: "Secretary of State Business Search",
    description: "Search state business entity registrations",
    category: "research",
    taskPrompt: "Visit the '[STATE]' Secretary of State business search and look up '[BUSINESS_NAME]' or entity number '[ENTITY_NUMBER]'. Extract business name, type, status, registered agent, formation date, and principal address.",
    estimatedTime: "2-3 minutes",
    difficulty: "easy",
    tags: ["corporate", "business-entities", "registration"]
  },
  {
    id: "ucc-filings",
    title: "UCC Financing Statement Search",
    description: "Search Uniform Commercial Code filings",
    category: "research",
    taskPrompt: "Search '[STATE]' UCC filings for debtor '[DEBTOR_NAME]' or secured party '[SECURED_PARTY]'. Extract filing number, filing date, debtor, secured party, and collateral description for relevant filings.",
    estimatedTime: "2-3 minutes",
    difficulty: "medium",
    tags: ["ucc", "secured-transactions", "commercial-law"]
  },

  // Criminal & Public Safety Templates
  {
    id: "sex-offender-registry",
    title: "Sex Offender Registry Search",
    description: "Search state sex offender registries",
    category: "research",
    taskPrompt: "Search the '[STATE]' sex offender registry for individuals named '[NAME]' or in '[CITY/ZIP]'. Extract name, address, photo, offense, conviction date, and risk level for matching results.",
    estimatedTime: "2-3 minutes",
    difficulty: "easy",
    tags: ["criminal", "public-safety", "registry"]
  },
  {
    id: "inmate-locator",
    title: "Federal Bureau of Prisons Inmate Locator",
    description: "Search federal inmate information",
    category: "research",
    taskPrompt: "Visit the BOP inmate locator and search for '[INMATE_NAME]' or register number '[REGISTER_NUMBER]'. Extract name, register number, age, race, release date, and facility location.",
    estimatedTime: "1-2 minutes",
    difficulty: "easy",
    tags: ["criminal", "corrections", "federal"]
  },

  // Immigration Templates
  {
    id: "uscis-case-status",
    title: "USCIS Case Status Check",
    description: "Check immigration case status with USCIS",
    category: "research",
    taskPrompt: "Visit the USCIS case status website and check status for receipt number '[RECEIPT_NUMBER]'. Extract case type, current status, last updated date, and next steps.",
    estimatedTime: "1-2 minutes",
    difficulty: "easy",
    tags: ["immigration", "uscis", "case-status"]
  },
  {
    id: "visa-bulletin",
    title: "State Department Visa Bulletin",
    description: "Extract current visa bulletin priority dates",
    category: "research",
    taskPrompt: "Visit the State Department Visa Bulletin for '[MONTH_YEAR]'. Extract priority dates for '[PREFERENCE_CATEGORY]' in '[COUNTRY]' for both filing and final action dates.",
    estimatedTime: "1-2 minutes",
    difficulty: "easy",
    tags: ["immigration", "visa", "priority-dates"]
  },

  // Additional Compliance Templates
  {
    id: "osha-violations",
    title: "OSHA Violation Search",
    description: "Search OSHA workplace safety violations",
    category: "compliance",
    taskPrompt: "Visit OSHA's establishment search and look up '[COMPANY_NAME]' or inspection number '[INSPECTION_NUMBER]'. Extract inspection date, violation type, citation, penalty amount, and current status.",
    estimatedTime: "2-3 minutes",
    difficulty: "easy",
    tags: ["osha", "workplace-safety", "violations"]
  },
  {
    id: "epa-enforcement",
    title: "EPA Enforcement Actions",
    description: "Search EPA environmental enforcement database",
    category: "compliance",
    taskPrompt: "Search the EPA ECHO database for '[FACILITY_NAME]' or EPA ID '[EPA_ID]'. Extract facility name, violations, enforcement actions, penalties, and compliance status.",
    estimatedTime: "2-3 minutes",
    difficulty: "medium",
    tags: ["epa", "environmental", "enforcement"]
  },

  // Academic & Research Templates
  {
    id: "ssrn-papers",
    title: "SSRN Legal Scholarship",
    description: "Search Social Science Research Network for legal papers",
    category: "research",
    taskPrompt: "Search SSRN for papers about '[TOPIC]' by author '[AUTHOR]' or in subject area '[SUBJECT]'. Extract paper title, author, abstract, publication date, and download count for the 5 most relevant papers.",
    estimatedTime: "2-3 minutes",
    difficulty: "easy",
    tags: ["academic", "scholarship", "research"]
  },
  {
    id: "bepress-law-journals",
    title: "BePress Law Journal Articles",
    description: "Search law journal articles on BePress platforms",
    category: "research",
    taskPrompt: "Search BePress law journals for articles about '[TOPIC]'. Extract article title, author, journal name, volume, issue, publication date, and abstract for the top 5 results.",
    estimatedTime: "2-3 minutes",
    difficulty: "easy",
    tags: ["academic", "journals", "articles"]
  },

  // Additional Specialized Templates
  {
    id: "foia-requests",
    title: "FOIA Request Tracker",
    description: "Track Freedom of Information Act requests and responses",
    category: "research",
    taskPrompt: "Visit '[AGENCY]' FOIA reading room or request tracker. Search for FOIA requests related to '[TOPIC]'. Extract request number, requester (if public), request subject, status, and any released documents.",
    estimatedTime: "2-3 minutes",
    difficulty: "medium",
    tags: ["foia", "transparency", "government"]
  },
  {
    id: "lobbying-disclosure",
    title: "Lobbying Disclosure Database",
    description: "Search federal and state lobbying disclosure records",
    category: "research",
    taskPrompt: "Visit the Senate Lobbying Disclosure database and search for lobbying activity by '[CLIENT_OR_REGISTRANT]' related to '[ISSUE]'. Extract registrant, client, issue, amount spent, and lobbyists involved.",
    estimatedTime: "2-3 minutes",
    difficulty: "medium",
    tags: ["lobbying", "disclosure", "government-relations"]
  },
  {
    id: "campaign-finance",
    title: "Campaign Finance Records",
    description: "Search FEC campaign contribution and expenditure data",
    category: "research",
    taskPrompt: "Visit the FEC website and search for campaign contributions by '[CONTRIBUTOR]' or to '[CANDIDATE/COMMITTEE]'. Extract contributor name, amount, date, recipient, and election cycle.",
    estimatedTime: "2-3 minutes",
    difficulty: "easy",
    tags: ["campaign-finance", "fec", "political"]
  },
  {
    id: "nonprofit-990",
    title: "Nonprofit Tax Returns (Form 990)",
    description: "Search IRS Form 990 filings for nonprofit organizations",
    category: "research",
    taskPrompt: "Visit GuideStar, ProPublica Nonprofit Explorer, or the IRS Tax Exempt Organization Search and look up '[ORGANIZATION_NAME]' or EIN '[EIN]'. Extract organization name, revenue, expenses, key personnel compensation, and mission statement from the most recent Form 990.",
    estimatedTime: "2-3 minutes",
    difficulty: "easy",
    tags: ["nonprofit", "990", "tax-exempt"]
  }
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: ScrapingTemplate["category"]): ScrapingTemplate[] {
  return SCRAPING_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get templates by difficulty
 */
export function getTemplatesByDifficulty(difficulty: ScrapingTemplate["difficulty"]): ScrapingTemplate[] {
  return SCRAPING_TEMPLATES.filter(t => t.difficulty === difficulty);
}

/**
 * Search templates by keyword
 */
export function searchTemplates(keyword: string): ScrapingTemplate[] {
  const lowerKeyword = keyword.toLowerCase();
  return SCRAPING_TEMPLATES.filter(t =>
    t.title.toLowerCase().includes(lowerKeyword) ||
    t.description.toLowerCase().includes(lowerKeyword) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerKeyword))
  );
}

/**
 * Fill template placeholders with actual values
 */
export function fillTemplate(template: ScrapingTemplate, values: Record<string, string>): string {
  let filledPrompt = template.taskPrompt;
  
  Object.entries(values).forEach(([key, value]) => {
    const placeholder = `[${key.toUpperCase().replace(/ /g, "_")}]`;
    filledPrompt = filledPrompt.replace(new RegExp(placeholder, "g"), value);
  });
  
  return filledPrompt;
}
