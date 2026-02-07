// Tavily API integration for competitor discovery

export interface TavilySearchResult {
  title: string
  url: string
  content: string
  score: number
  published_date?: string
}

export interface TavilyResponse {
  query: string
  results: TavilySearchResult[]
  response_time: number
}

export interface DiscoveredCompetitor {
  brand_name: string
  website_url: string | null
  description: string
  source_url: string
  relevance_score: number
  scan_query: string
}

// Search queries optimized for discovering supplement brands
export const DISCOVERY_QUERIES = [
  "new sleep supplement brands DTC 2025 2026",
  "emerging focus nootropic supplement companies startup",
  "calm anxiety supplement brands direct to consumer",
  "adaptogen supplement startup brands wellness",
  "melatonin sleep aid brand new launch",
  "cognitive enhancement supplement company funding",
  "stress relief supplement brand ecommerce",
  "natural sleep supplement brand review",
]

// Check if Tavily is configured
export function isTavilyConfigured(): boolean {
  return Boolean(process.env.TAVILY_API_KEY)
}

// Search Tavily for potential competitors
export async function searchTavily(query: string): Promise<TavilySearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY
  
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured")
  }
  
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "advanced",
      include_domains: [], // No domain restrictions
      exclude_domains: [
        "amazon.com",
        "walmart.com", 
        "target.com",
        "reddit.com",
        "facebook.com",
        "twitter.com",
        "instagram.com",
        "youtube.com",
        "tiktok.com",
        "linkedin.com",
      ],
      max_results: 10,
      include_answer: false,
      include_raw_content: false,
    }),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Tavily API error: ${error}`)
  }
  
  const data: TavilyResponse = await response.json()
  return data.results || []
}

// Extract brand information from search results
export function extractBrandInfo(
  result: TavilySearchResult,
  query: string
): DiscoveredCompetitor | null {
  // Try to extract brand name from title or URL
  let brandName = ""
  let websiteUrl = result.url
  
  // Extract domain as potential brand name
  try {
    const url = new URL(result.url)
    const domain = url.hostname.replace("www.", "")
    const domainParts = domain.split(".")
    
    // Use the main part of domain as brand name (e.g., "ritual" from "ritual.com")
    if (domainParts.length >= 2) {
      brandName = domainParts[0]
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    }
    
    // Clean up the website URL to just the homepage
    websiteUrl = `${url.protocol}//${url.hostname}`
  } catch {
    // If URL parsing fails, try to extract from title
    brandName = result.title.split(/[|\-–—:]/).at(0)?.trim() || result.title.slice(0, 50)
  }
  
  // Skip results that don't look like brand websites
  const skipPatterns = [
    /news/i,
    /blog/i,
    /article/i,
    /review/i,
    /best.*supplements/i,
    /top.*brands/i,
    /healthline/i,
    /webmd/i,
    /mayoclinic/i,
    /wikipedia/i,
    /forbes/i,
    /business.*insider/i,
  ]
  
  if (skipPatterns.some(pattern => pattern.test(result.url) || pattern.test(result.title))) {
    return null
  }
  
  // Create description from content
  const description = result.content?.slice(0, 300) || result.title
  
  return {
    brand_name: brandName,
    website_url: websiteUrl,
    description,
    source_url: result.url,
    relevance_score: result.score,
    scan_query: query,
  }
}

// Run a full competitor discovery scan
export async function runCompetitorDiscovery(): Promise<DiscoveredCompetitor[]> {
  const allDiscoveries: DiscoveredCompetitor[] = []
  const seenUrls = new Set<string>()
  
  for (const query of DISCOVERY_QUERIES) {
    try {
      const results = await searchTavily(query)
      
      for (const result of results) {
        // Skip if we've already seen this URL
        const normalizedUrl = result.url.toLowerCase().replace(/\/$/, "")
        if (seenUrls.has(normalizedUrl)) {
          continue
        }
        seenUrls.add(normalizedUrl)
        
        const brand = extractBrandInfo(result, query)
        if (brand) {
          allDiscoveries.push(brand)
        }
      }
      
      // Add a small delay between requests to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      console.error(`Error searching for "${query}":`, error)
      // Continue with other queries even if one fails
    }
  }
  
  return allDiscoveries
}
