import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/api-auth"

export interface Competitor {
  id: string
  name: string
  description: string | null
  website_url: string | null
  amazon_url: string | null
  logo_url: string | null
  instagram_url: string | null
  tiktok_url: string | null
  facebook_url: string | null
  twitter_url: string | null
  linkedin_url: string | null
  youtube_url: string | null
  category: string
  tags: string[] | null
  status: string
  discovered_via: string
  notes: string | null
  founded_year: number | null
  headquarters: string | null
  created_at: string
  updated_at: string
}

// GET - List all competitors
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    
    const supabase = await createServiceClient()
    const { searchParams } = new URL(request.url)
    
    // Optional filters
    const category = searchParams.get("category")
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    
    let query = supabase
      .from("competitors")
      .select("*")
      .order("name", { ascending: true })
    
    if (category && category !== "all") {
      query = query.eq("category", category)
    }
    
    if (status) {
      query = query.eq("status", status)
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }
    
    const { data: competitors, error } = await query
    
    if (error) {
      console.error("Error fetching competitors:", error)
      return NextResponse.json(
        { error: "Failed to fetch competitors" },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ competitors: competitors || [] })
  } catch (error) {
    if (error instanceof Response) return error
    console.error("Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch competitors" },
      { status: 500 }
    )
  }
}

// POST - Create a new competitor
export async function POST(request: NextRequest) {
  try {
    const { userAccess } = await requireAuth()
    
    // Only admins can add competitors
    if (userAccess?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }
    
    const supabase = await createServiceClient()
    const body = await request.json()
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }
    
    const competitorData = {
      name: body.name,
      description: body.description || null,
      website_url: body.website_url || null,
      amazon_url: body.amazon_url || null,
      logo_url: body.logo_url || null,
      instagram_url: body.instagram_url || null,
      tiktok_url: body.tiktok_url || null,
      facebook_url: body.facebook_url || null,
      twitter_url: body.twitter_url || null,
      linkedin_url: body.linkedin_url || null,
      youtube_url: body.youtube_url || null,
      category: body.category || "multi",
      tags: body.tags || null,
      status: body.status || "active",
      discovered_via: body.discovered_via || "manual",
      notes: body.notes || null,
      founded_year: body.founded_year || null,
      headquarters: body.headquarters || null,
    }
    
    const { data: competitor, error } = await supabase
      .from("competitors")
      .insert(competitorData)
      .select()
      .single()
    
    if (error) {
      console.error("Error creating competitor:", error)
      return NextResponse.json(
        { error: "Failed to create competitor" },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ competitor }, { status: 201 })
  } catch (error) {
    if (error instanceof Response) return error
    console.error("Error:", error)
    return NextResponse.json(
      { error: "Failed to create competitor" },
      { status: 500 }
    )
  }
}
