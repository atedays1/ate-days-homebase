import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/api-auth"

// POST - Add discovery as competitor or dismiss it
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userAccess } = await requireAuth()
    
    // Only admins can manage discoveries
    if (userAccess?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }
    
    const { id } = await params
    const supabase = await createServiceClient()
    const body = await request.json()
    
    const action = body.action // "add" or "dismiss"
    
    if (!["add", "dismiss"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'add' or 'dismiss'" },
        { status: 400 }
      )
    }
    
    // Get the discovery
    const { data: discovery, error: fetchError } = await supabase
      .from("competitor_discoveries")
      .select("*")
      .eq("id", id)
      .single()
    
    if (fetchError || !discovery) {
      return NextResponse.json(
        { error: "Discovery not found" },
        { status: 404 }
      )
    }
    
    if (action === "dismiss") {
      // Update discovery status to dismissed
      const { error: updateError } = await supabase
        .from("competitor_discoveries")
        .update({
          status: "dismissed",
          dismissed_reason: body.reason || null,
        })
        .eq("id", id)
      
      if (updateError) {
        console.error("Error dismissing discovery:", updateError)
        return NextResponse.json(
          { error: "Failed to dismiss discovery" },
          { status: 500 }
        )
      }
      
      return NextResponse.json({ success: true, action: "dismissed" })
    }
    
    // Action is "add" - create competitor from discovery
    const competitorData = {
      name: body.name || discovery.brand_name,
      description: body.description || discovery.description,
      website_url: body.website_url || discovery.website_url,
      category: body.category || "multi",
      discovered_via: "tavily",
      amazon_url: body.amazon_url || null,
      logo_url: body.logo_url || null,
      instagram_url: body.instagram_url || null,
      tiktok_url: body.tiktok_url || null,
      facebook_url: body.facebook_url || null,
      twitter_url: body.twitter_url || null,
      linkedin_url: body.linkedin_url || null,
      youtube_url: body.youtube_url || null,
      tags: body.tags || null,
      notes: body.notes || `Discovered via Tavily search: "${discovery.scan_query}"`,
    }
    
    // Create the competitor
    const { data: competitor, error: createError } = await supabase
      .from("competitors")
      .insert(competitorData)
      .select()
      .single()
    
    if (createError) {
      console.error("Error creating competitor:", createError)
      return NextResponse.json(
        { error: "Failed to create competitor" },
        { status: 500 }
      )
    }
    
    // Update discovery status to added
    const { error: updateError } = await supabase
      .from("competitor_discoveries")
      .update({
        status: "added",
        added_competitor_id: competitor.id,
      })
      .eq("id", id)
    
    if (updateError) {
      console.error("Error updating discovery status:", updateError)
      // Don't fail - competitor was created successfully
    }
    
    return NextResponse.json({
      success: true,
      action: "added",
      competitor,
    })
  } catch (error) {
    if (error instanceof Response) return error
    console.error("Error:", error)
    return NextResponse.json(
      { error: "Failed to process discovery" },
      { status: 500 }
    )
  }
}
