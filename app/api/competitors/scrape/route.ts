import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/api-auth"
import Anthropic from "@anthropic-ai/sdk"

// Extract metadata from HTML using regex
function extractMetadata(html: string, url: string) {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                       html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i)
  
  // Extract description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i)
  const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i)
  
  // Extract og:image for logo
  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                       html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
  
  // Extract favicon/apple-touch-icon as fallback logo
  const appleIconMatch = html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i)
  const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i)
  
  // Extract all links to find social media
  const linkMatches = html.matchAll(/href=["']([^"']+)["']/gi)
  const allLinks = Array.from(linkMatches).map(m => m[1])
  
  // Find social media links
  const socialLinks = {
    instagram: allLinks.find(l => l.includes('instagram.com/') && !l.includes('/p/') && !l.includes('/reel/')),
    tiktok: allLinks.find(l => l.includes('tiktok.com/@')),
    facebook: allLinks.find(l => l.includes('facebook.com/') && !l.includes('/sharer') && !l.includes('/share')),
    twitter: allLinks.find(l => (l.includes('twitter.com/') || l.includes('x.com/')) && !l.includes('/intent') && !l.includes('/share')),
    linkedin: allLinks.find(l => l.includes('linkedin.com/company/')),
    youtube: allLinks.find(l => (l.includes('youtube.com/@') || l.includes('youtube.com/c/') || l.includes('youtube.com/channel/'))),
  }
  
  // Clean up the URL to get domain for name fallback
  let domain = ""
  try {
    const urlObj = new URL(url)
    domain = urlObj.hostname.replace('www.', '')
  } catch {}
  
  // Get logo URL, making it absolute if needed
  let logoUrl = ogImageMatch?.[1] || appleIconMatch?.[1] || faviconMatch?.[1] || null
  if (logoUrl && !logoUrl.startsWith('http')) {
    try {
      const urlObj = new URL(url)
      logoUrl = logoUrl.startsWith('/') 
        ? `${urlObj.protocol}//${urlObj.hostname}${logoUrl}`
        : `${urlObj.protocol}//${urlObj.hostname}/${logoUrl}`
    } catch {}
  }
  
  return {
    title: ogTitleMatch?.[1] || titleMatch?.[1] || domain,
    description: ogDescMatch?.[1] || descMatch?.[1] || null,
    logoUrl,
    socialLinks,
    domain,
  }
}

// Use Claude to enhance and structure the extracted data
async function enhanceWithAI(metadata: ReturnType<typeof extractMetadata>, url: string, category: string) {
  const anthropic = new Anthropic()
  
  const prompt = `You are extracting competitor information from a supplement/wellness brand website.

Website URL: ${url}
Domain: ${metadata.domain}
Page Title: ${metadata.title || "Not found"}
Description: ${metadata.description || "Not found"}

Extracted social links:
- Instagram: ${metadata.socialLinks.instagram || "Not found"}
- TikTok: ${metadata.socialLinks.tiktok || "Not found"}
- Facebook: ${metadata.socialLinks.facebook || "Not found"}
- Twitter/X: ${metadata.socialLinks.twitter || "Not found"}
- LinkedIn: ${metadata.socialLinks.linkedin || "Not found"}
- YouTube: ${metadata.socialLinks.youtube || "Not found"}

Please return a JSON object with the following fields. Clean up and improve the data where needed:
- name: The company/brand name (clean it up, remove taglines, just the brand name)
- description: A brief 1-2 sentence description of what they sell (write one if not found, based on context)
- category: Best category fit from: "sleep", "focus", "calm", "multi", "general" (current suggestion: "${category}")

Return ONLY valid JSON, no markdown or explanation:
{"name": "...", "description": "...", "category": "..."}`

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    })
    
    const text = response.content[0].type === "text" ? response.content[0].text : ""
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (error) {
    console.error("[Scrape] AI enhancement failed:", error)
  }
  
  // Fallback to basic extraction
  return {
    name: metadata.title?.split(/[|\-–—:]/).at(0)?.trim() || metadata.domain.split('.')[0],
    description: metadata.description,
    category,
  }
}

// POST - Scrape a URL and create a competitor
export async function POST(request: NextRequest) {
  try {
    const { access } = await requireAuth()
    
    // Only admins can add competitors
    if (access?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    const { url, category = "multi" } = body
    
    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      )
    }
    
    // Validate URL
    let cleanUrl: string
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      cleanUrl = urlObj.toString()
    } catch {
      return NextResponse.json(
        { error: "Invalid URL" },
        { status: 400 }
      )
    }
    
    console.log(`[Scrape] Fetching ${cleanUrl}...`)
    
    // Fetch the website
    let html: string
    try {
      const response = await fetch(cleanUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      html = await response.text()
    } catch (error) {
      console.error("[Scrape] Fetch failed:", error)
      return NextResponse.json(
        { error: "Failed to fetch website. Please check the URL and try again." },
        { status: 400 }
      )
    }
    
    console.log(`[Scrape] Extracting metadata...`)
    
    // Extract metadata from HTML
    const metadata = extractMetadata(html, cleanUrl)
    
    console.log(`[Scrape] Enhancing with AI...`)
    
    // Enhance with AI
    const enhanced = await enhanceWithAI(metadata, cleanUrl, category)
    
    // Check if competitor already exists
    const supabase = await createServiceClient()
    
    const { data: existing } = await supabase
      .from("competitors")
      .select("id, name")
      .eq("website_url", cleanUrl)
      .single()
    
    if (existing) {
      return NextResponse.json(
        { error: `Competitor "${existing.name}" already exists` },
        { status: 409 }
      )
    }
    
    console.log(`[Scrape] Creating competitor: ${enhanced.name}`)
    
    // Create the competitor
    const competitorData = {
      name: enhanced.name,
      description: enhanced.description,
      website_url: cleanUrl,
      logo_url: metadata.logoUrl,
      instagram_url: metadata.socialLinks.instagram || null,
      tiktok_url: metadata.socialLinks.tiktok || null,
      facebook_url: metadata.socialLinks.facebook || null,
      twitter_url: metadata.socialLinks.twitter || null,
      linkedin_url: metadata.socialLinks.linkedin || null,
      youtube_url: metadata.socialLinks.youtube || null,
      category: enhanced.category || category,
      status: "active",
      discovered_via: "manual",
    }
    
    const { data: competitor, error: insertError } = await supabase
      .from("competitors")
      .insert(competitorData)
      .select()
      .single()
    
    if (insertError) {
      console.error("[Scrape] Insert failed:", insertError)
      return NextResponse.json(
        { error: "Failed to save competitor" },
        { status: 500 }
      )
    }
    
    console.log(`[Scrape] Success: ${competitor.name}`)
    
    return NextResponse.json({ 
      success: true, 
      competitor,
      extracted: {
        name: enhanced.name,
        description: enhanced.description,
        socialLinksFound: Object.values(metadata.socialLinks).filter(Boolean).length,
      }
    })
  } catch (error) {
    if (error instanceof Response) return error
    console.error("[Scrape] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scraping failed" },
      { status: 500 }
    )
  }
}
