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

// GET - List all competitors with insights
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    
    const supabase = await createServiceClient()
    const { searchParams } = new URL(request.url)
    
    // Optional filters
    const category = searchParams.get("category")
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    const includeInsights = searchParams.get("insights") !== "false"
    
    // Build base query with optional insights
    let query = supabase
      .from("competitors")
      .select(includeInsights ? `
        *,
        competitor_pain_points(
          id,
          severity,
          pain_point:pain_point_categories(
            id,
            name,
            slug,
            color
          )
        ),
        competitor_white_space_scores(
          score
        )
      ` : "*")
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
    
    // Process competitors to flatten pain points and calculate avg score
    const processedCompetitors = (competitors || []).map(comp => {
      // Extract unique pain points (deduplicate by pain_point.id)
      const painPointsMap = new Map()
      if (comp.competitor_pain_points) {
        for (const cpp of comp.competitor_pain_points) {
          if (cpp.pain_point && !painPointsMap.has(cpp.pain_point.id)) {
            painPointsMap.set(cpp.pain_point.id, {
              id: cpp.pain_point.id,
              name: cpp.pain_point.name,
              slug: cpp.pain_point.slug,
              severity: cpp.severity,
              color: cpp.pain_point.color,
            })
          }
        }
      }
      
      // Calculate average white space score
      const scores = comp.competitor_white_space_scores?.map((s: { score: number }) => s.score) || []
      const avgScore = scores.length > 0 
        ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length 
        : 0
      
      // Return cleaned object
      const { competitor_pain_points, competitor_white_space_scores, ...rest } = comp
      return {
        ...rest,
        pain_points: Array.from(painPointsMap.values()),
        avg_white_space_score: Math.round(avgScore * 10) / 10,
      }
    })
    
    return NextResponse.json({ competitors: processedCompetitors })
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
    const { access } = await requireAuth()
    
    // Only admins can add competitors
    if (access?.role !== "admin") {
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
