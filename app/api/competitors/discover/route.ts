import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/api-auth"
import { runCompetitorDiscovery, isTavilyConfigured } from "@/lib/tavily"

// POST - Trigger a competitor discovery scan
export async function POST(request: NextRequest) {
  try {
    const { userAccess } = await requireAuth()
    
    // Only admins can trigger discovery
    if (userAccess?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }
    
    if (!isTavilyConfigured()) {
      return NextResponse.json(
        { error: "Tavily API key is not configured" },
        { status: 500 }
      )
    }
    
    const supabase = await createServiceClient()
    
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
    console.log("[Discovery] Starting competitor scan...")
    const discoveries = await runCompetitorDiscovery()
    console.log(`[Discovery] Found ${discoveries.length} potential brands`)
    
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
    
    console.log(`[Discovery] ${newDiscoveries.length} new discoveries after filtering`)
    
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
        console.error("[Discovery] Error inserting discoveries:", insertError)
        return NextResponse.json(
          { error: "Failed to save discoveries" },
          { status: 500 }
        )
      }
    }
    
    return NextResponse.json({
      success: true,
      total_found: discoveries.length,
      new_discoveries: newDiscoveries.length,
      filtered_out: discoveries.length - newDiscoveries.length,
    })
  } catch (error) {
    if (error instanceof Response) return error
    console.error("[Discovery] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Discovery failed" },
      { status: 500 }
    )
  }
}
