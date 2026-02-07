import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-server"
import { runCompetitorDiscovery, isTavilyConfigured } from "@/lib/tavily"

// Verify cron secret to ensure request is from Vercel Cron
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  
  // If no secret is set, allow (for local development)
  if (!cronSecret) {
    console.warn("[Cron] No CRON_SECRET set - allowing request")
    return true
  }
  
  const authHeader = request.headers.get("authorization")
  return authHeader === `Bearer ${cronSecret}`
}

// GET - Called by Vercel Cron (weekly)
export async function GET(request: NextRequest) {
  // Verify this is a legitimate cron request
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }
  
  if (!isTavilyConfigured()) {
    console.log("[Cron] Tavily not configured, skipping discovery")
    return NextResponse.json({
      success: false,
      message: "Tavily API key not configured",
    })
  }
  
  try {
    const supabase = await createServiceClient()
    
    console.log("[Cron] Starting weekly competitor discovery scan...")
    
    // Get existing competitors to filter out known ones
    const { data: existingCompetitors } = await supabase
      .from("competitors")
      .select("website_url, name")
    
    const existingUrls = new Set(
      (existingCompetitors || [])
        .map(c => c.website_url?.toLowerCase().replace(/\/$/, ""))
        .filter(Boolean)
    )
    
    const existingNames = new Set(
      (existingCompetitors || [])
        .map(c => c.name.toLowerCase())
    )
    
    // Get pending discoveries to avoid duplicates
    const { data: pendingDiscoveries } = await supabase
      .from("competitor_discoveries")
      .select("website_url, brand_name")
      .eq("status", "pending")
    
    const pendingUrls = new Set(
      (pendingDiscoveries || [])
        .map(d => d.website_url?.toLowerCase().replace(/\/$/, ""))
        .filter(Boolean)
    )
    
    // Run discovery
    const discoveries = await runCompetitorDiscovery()
    console.log(`[Cron] Found ${discoveries.length} potential brands`)
    
    // Filter out known competitors and pending discoveries
    const newDiscoveries = discoveries.filter(d => {
      const normalizedUrl = d.website_url?.toLowerCase().replace(/\/$/, "")
      const normalizedName = d.brand_name.toLowerCase()
      
      return (
        !existingUrls.has(normalizedUrl) &&
        !existingNames.has(normalizedName) &&
        !pendingUrls.has(normalizedUrl)
      )
    })
    
    console.log(`[Cron] ${newDiscoveries.length} new discoveries after filtering`)
    
    // Insert new discoveries
    if (newDiscoveries.length > 0) {
      const { error: insertError } = await supabase
        .from("competitor_discoveries")
        .insert(
          newDiscoveries.map(d => ({
            brand_name: d.brand_name,
            website_url: d.website_url,
            description: d.description,
            source_url: d.source_url,
            relevance_score: d.relevance_score,
            scan_query: d.scan_query,
            status: "pending",
          }))
        )
      
      if (insertError) {
        console.error("[Cron] Error inserting discoveries:", insertError)
        return NextResponse.json(
          { error: "Failed to save discoveries" },
          { status: 500 }
        )
      }
    }
    
    console.log("[Cron] Discovery scan completed successfully")
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      total_found: discoveries.length,
      new_discoveries: newDiscoveries.length,
    })
  } catch (error) {
    console.error("[Cron] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Discovery failed" },
      { status: 500 }
    )
  }
}
